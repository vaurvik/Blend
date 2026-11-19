import "server-only";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
const dir = process.env.SHOP_DATA_DIR || join(process.cwd(), "data");
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(join(dir, "shop.sqlite"));
db.exec(
  "PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS login_attempts (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)",
);
function consume(bucket: string, max: number, now: number): boolean {
  const row = db
    .prepare("SELECT count,expires FROM login_attempts WHERE bucket=?")
    .get(bucket) as { count: number; expires: number } | undefined;
  if (!row || row.expires <= now) {
    db.prepare("INSERT OR REPLACE INTO login_attempts VALUES (?,1,?)").run(
      bucket,
      now + 15 * 60_000,
    );
    return true;
  }
  if (row.count >= max) return false;
  db.prepare("UPDATE login_attempts SET count=count+1 WHERE bucket=?").run(
    bucket,
  );
  return true;
}
export function allowLogin(ip: string | null): boolean {
  const now = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM login_attempts WHERE expires<?").run(now);
    const global = consume("global", ip ? 100 : 10, now);
    const specific = ip
      ? consume(createHash("sha256").update(ip).digest("hex"), 10, now)
      : true;
    db.exec("COMMIT");
    return global && specific;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
