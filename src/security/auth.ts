import "server-only";
import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  createHash,
  scryptSync,
} from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createLocalKey, readLocalKey } from "./keys";
const cookieName = "shop_admin";
const dir = process.env.SHOP_DATA_DIR || join(process.cwd(), "data");
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(join(dir, "shop.sqlite"));
db.exec(
  "PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS admin_account (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL)",
);
function secret(): string | Buffer {
  const value = process.env.SESSION_SECRET;
  if (value) {
    if (value.length < 32)
      throw new Error("SESSION_SECRET deve ter pelo menos 32 caracteres");
    return value;
  }
  return readLocalKey("session");
}
function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}
function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function equal(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
type Account = {
  username: string;
  password_salt: string;
  password_hash: string;
};
function account(): Account | undefined {
  return db
    .prepare(
      "SELECT username,password_salt,password_hash FROM admin_account WHERE id=1",
    )
    .get() as Account | undefined;
}
export function hasAdmin(): boolean {
  return (
    !!account() ||
    !!(
      process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_PASSWORD.length >= 12 &&
      process.env.SESSION_SECRET &&
      process.env.SESSION_SECRET.length >= 32
    )
  );
}
export function createAdmin(username: string, password: string): boolean {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  db.exec("BEGIN IMMEDIATE");
  try {
    if (hasAdmin()) {
      db.exec("ROLLBACK");
      return false;
    }
    if (!process.env.SESSION_SECRET) createLocalKey("session");
    else if (process.env.SESSION_SECRET.length < 32)
      throw new Error("SESSION_SECRET inválido");
    const vaultTable = db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='plugin_secrets'",
      )
      .get();
    const storedSecrets = vaultTable
      ? (
          db.prepare("SELECT COUNT(*) AS count FROM plugin_secrets").get() as {
            count: number;
          }
        ).count
      : 0;
    if (storedSecrets) readLocalKey("vault");
    else createLocalKey("vault");
    db.prepare(
      "INSERT INTO admin_account (id,username,password_salt,password_hash) VALUES (1,?,?,?)",
    ).run(username, salt, passwordHash);
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function validCredentials(user: string, password: string) {
  const saved = account();
  if (saved) {
    const candidate = scryptSync(password, saved.password_salt, 64);
    const expected = Buffer.from(saved.password_hash, "hex");
    return (
      expected.length === candidate.length &&
      timingSafeEqual(candidate, expected) &&
      equal(user, saved.username)
    );
  }
  const expectedUser = process.env.ADMIN_USERNAME,
    expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword || expectedPassword.length < 12)
    return false;
  const userMatches = equal(user, expectedUser);
  const passwordMatches = equal(password, expectedPassword);
  return userMatches && passwordMatches;
}
export async function createSession() {
  const expires = Date.now() + 8 * 60 * 60 * 1000,
    nonce = randomBytes(32).toString("base64url"),
    payload = `${expires}.${nonce}`;
  db.prepare("DELETE FROM admin_sessions WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO admin_sessions VALUES (?,?)").run(
    hash(nonce),
    expires,
  );
  (await cookies()).set(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}
export async function isAdmin() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return false;
  const [expires, nonce, signature, ...rest] = value.split(".");
  if (
    rest.length ||
    !expires ||
    !nonce ||
    !signature ||
    !/^\d+$/.test(expires) ||
    Number(expires) < Date.now() ||
    !equal(signature, sign(`${expires}.${nonce}`))
  )
    return false;
  return !!db
    .prepare(
      "SELECT token_hash FROM admin_sessions WHERE token_hash=? AND expires>?",
    )
    .get(hash(nonce), Date.now());
}
export async function requireAdmin() {
  if (!(await isAdmin()))
    redirect(hasAdmin() ? "/admin/login" : "/admin/setup");
}
export async function endSession() {
  const jar = await cookies();
  const value = jar.get(cookieName)?.value;
  const nonce = value?.split(".")[1];
  if (nonce)
    db.prepare("DELETE FROM admin_sessions WHERE token_hash=?").run(
      hash(nonce),
    );
  jar.delete(cookieName);
}
