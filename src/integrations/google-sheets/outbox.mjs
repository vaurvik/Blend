import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { GoogleSheetsWriter } from "./writer.mjs";

export function openOutbox(directory) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(join(directory, "shop.sqlite"));
  db.exec(
    "PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS sheets_sync_config (id INTEGER PRIMARY KEY CHECK(id=1), target_hash TEXT NOT NULL)",
  );
  return db;
}
export function setTarget(db, spreadsheetId, tab) {
  const target = createHash("sha256")
    .update(spreadsheetId)
    .update("\0")
    .update(tab)
    .digest("hex");
  const old = db
    .prepare("SELECT target_hash FROM sheets_sync_config WHERE id=1")
    .get();
  if (old?.target_hash === target) return;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "INSERT INTO sheets_sync_config VALUES (1,?) ON CONFLICT(id) DO UPDATE SET target_hash=excluded.target_hash",
    ).run(target);
    if (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='sheets_outbox'",
        )
        .get()
    )
      db.exec(
        "UPDATE sheets_outbox SET synced_revision=0, attempts=0, next_retry=0, last_error=NULL",
      );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export async function processOne(db, writer, now = Date.now()) {
  if (
    !db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='sheets_outbox'",
      )
      .get()
  )
    return false;
  const row = db
    .prepare(
      `SELECT q.id AS sequence,q.order_id,q.revision,q.attempts,o.created_at,o.product_slug,o.product_name,o.amount,o.method,o.provider_id,o.status,o.transaction_id,d.name,d.email,d.document,d.phone,d.cep,d.street,d.house_number,d.complement,d.neighborhood,d.city,d.state FROM sheets_outbox q JOIN orders o ON o.id=q.order_id JOIN order_details d ON d.order_id=o.id WHERE q.revision>q.synced_revision AND q.next_retry<=? ORDER BY q.id LIMIT 1`,
    )
    .get(now);
  if (!row) return false;
  const values = [
    row.order_id,
    row.created_at,
    row.product_slug,
    row.product_name,
    row.amount / 100,
    row.method,
    row.provider_id,
    row.status,
    row.transaction_id ?? "",
    row.name,
    row.email,
    row.document,
    row.phone,
    row.cep,
    row.street,
    row.house_number,
    row.complement,
    row.neighborhood,
    row.city,
    row.state,
  ];
  try {
    await writer.writeOrder(row.sequence + 1, values);
    db.prepare(
      "UPDATE sheets_outbox SET synced_revision=?,attempts=0,next_retry=0,last_error=NULL WHERE order_id=? AND revision=?",
    ).run(row.revision, row.order_id, row.revision);
  } catch {
    const attempts = Math.min(row.attempts + 1, 20),
      delay =
        Math.min(900000, 10000 * 2 ** Math.min(attempts - 1, 7)) +
        Math.floor(Math.random() * 1000);
    db.prepare(
      "UPDATE sheets_outbox SET attempts=?,next_retry=?,last_error=? WHERE order_id=? AND revision=?",
    ).run(
      attempts,
      now + delay,
      "Falha ao sincronizar; confira credenciais, acesso e estrutura da aba.",
      row.order_id,
      row.revision,
    );
  }
  return true;
}
export function startSheetsWorker() {
  if (process.env.GOOGLE_SHEETS_ENABLED !== "true") return;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim(),
    tab = process.env.GOOGLE_SHEETS_TAB?.trim() || "Pedidos";
  if (
    !spreadsheetId ||
    !/^[a-zA-Z0-9_-]{10,200}$/.test(spreadsheetId) ||
    !process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    console.error(
      "Google Sheets não iniciado: verifique as variáveis de configuração.",
    );
    return;
  }
  const db = openOutbox(
    process.env.SHOP_DATA_DIR || join(process.cwd(), "data"),
  );
  setTarget(db, spreadsheetId, tab);
  let busy = false,
    connected;
  const writer = {
    async writeOrder(row, values) {
      connected ??= await GoogleSheetsWriter.connect({ spreadsheetId, tab });
      await connected.writeOrder(row, values);
    },
  };
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await processOne(db, writer);
    } catch {
      console.error("Google Sheets: falha ao acessar fila local.");
    } finally {
      busy = false;
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), 5000);
  timer.unref();
}
