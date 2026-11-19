import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  GoogleSheetsWriter,
  HEADERS,
  MANUAL_HEADERS,
} from "../src/integrations/google-sheets/writer.mjs";
import {
  processOne,
  setTarget,
} from "../src/integrations/google-sheets/outbox.mjs";

class FakeSheets {
  constructor() {
    this.rows = new Map();
    this.rows.set(2, [...Array(20).fill(""), "Compra na Shopee", "BR123"]);
    this.failAfterWrite = false;
    this.onWrite = null;
    this.rawWrites = 0;
  }
  async request(req) {
    if (req.url.endsWith(":batchUpdate")) return { data: {} };
    if (!req.url.includes("/values/"))
      return {
        data: {
          sheets: [
            {
              properties: {
                sheetId: 1,
                title: "Pedidos",
                gridProperties: { rowCount: 1000, columnCount: 26 },
              },
            },
          ],
        },
      };
    const range = decodeURIComponent(req.url.split("/values/")[1]);
    const cells = range.split("!")[1];
    if (req.method === "PUT") {
      assert.equal(req.params.valueInputOption, "RAW");
      this.rawWrites++;
      const n = Number(cells.match(/\d+/)[0]);
      const prev = this.rows.get(n) ?? [];
      const values = req.data.values[0];
      this.rows.set(
        n,
        cells.startsWith("U")
          ? [
              ...Array.from({ length: 20 }, (_, i) => prev[i] ?? ""),
              ...values,
              ...prev.slice(24),
            ]
          : [...values, ...prev.slice(values.length)],
      );
      if (n === 2 && this.onWrite) {
        const callback = this.onWrite;
        this.onWrite = null;
        callback();
      }
      if (n === 2 && this.failAfterWrite) {
        this.failAfterWrite = false;
        throw new Error("tempo esgotado após escrita");
      }
      return { data: {} };
    }
    if (cells === "U1:X1") {
      const values = (this.rows.get(1) ?? []).slice(20, 24);
      return { data: { values: values.length ? [values] : [] } };
    }
    const match = /^A(\d+):(A|T)(\d+)$/.exec(cells);
    assert.ok(match);
    const begin = Number(match[1]),
      end = Number(match[3]),
      width = match[2] === "A" ? 1 : 20;
    const rows = [];
    for (let n = begin; n <= end; n++)
      rows.push((this.rows.get(n) ?? []).slice(0, width));
    while (rows.length && rows.at(-1).length === 0) rows.pop();
    return { data: { values: rows } };
  }
}
function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    `CREATE TABLE orders(id TEXT PRIMARY KEY,created_at TEXT,product_slug TEXT,product_name TEXT,amount INTEGER,method TEXT,provider_id TEXT,status TEXT,transaction_id TEXT);CREATE TABLE order_details(order_id TEXT PRIMARY KEY,name TEXT,email TEXT,document TEXT,phone TEXT,cep TEXT,street TEXT,house_number TEXT,complement TEXT,neighborhood TEXT,city TEXT,state TEXT);CREATE TABLE sheets_outbox(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id TEXT UNIQUE,revision INTEGER DEFAULT 1,synced_revision INTEGER DEFAULT 0,attempts INTEGER DEFAULT 0,next_retry INTEGER DEFAULT 0,last_error TEXT);CREATE TABLE sheets_sync_config(id INTEGER PRIMARY KEY,target_hash TEXT);`,
  );
  db.prepare("INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?)").run(
    "order-1",
    "2026-01-01T00:00:00Z",
    "produto",
    "Produto",
    5999,
    "pix",
    "provider-teste",
    "pending",
    "tx-1",
  );
  db.prepare("INSERT INTO order_details VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(
    "order-1",
    "=2+2",
    "cliente@example.com",
    "01234567890",
    "11999999999",
    "01001000",
    "Rua A",
    "1",
    "",
    "Centro",
    "São Paulo",
    "SP",
  );
  db.prepare("INSERT INTO sheets_outbox (order_id) VALUES (?)").run("order-1");
  return db;
}

test("Sheets synchronization retries safely, preserves manual cells, and handles concurrent updates", async () => {
  const db = setup(),
    client = new FakeSheets(),
    writer = new GoogleSheetsWriter({
      spreadsheetId: "test-sheet-id",
      tab: "Pedidos",
      client,
    });
  try {
    setTarget(db, "test-sheet-id", "Pedidos");
    client.failAfterWrite = true;
    assert.equal(await processOne(db, writer, 1000), true);
    let q = db.prepare("SELECT * FROM sheets_outbox").get();
    assert.equal(q.synced_revision, 0);
    assert.equal(q.attempts, 1);
    assert.deepEqual(client.rows.get(1).slice(0, 20), HEADERS);
    assert.deepEqual(client.rows.get(1).slice(20, 24), MANUAL_HEADERS);
    assert.equal(client.rows.get(2)[9], "=2+2");
    assert.equal(client.rows.get(2)[11], "01234567890");
    assert.equal(client.rows.get(2)[20], "Compra na Shopee");
    assert.equal(client.rows.get(2)[21], "BR123");
    client.onWrite = () => {
      db.exec(
        "UPDATE orders SET status='paid' WHERE id='order-1';UPDATE sheets_outbox SET revision=revision+1 WHERE order_id='order-1'",
      );
    };
    assert.equal(await processOne(db, writer, q.next_retry), true);
    q = db.prepare("SELECT * FROM sheets_outbox").get();
    assert.equal(q.revision, 2);
    assert.equal(q.synced_revision, 0);
    assert.equal(await processOne(db, writer, q.next_retry), true);
    q = db.prepare("SELECT * FROM sheets_outbox").get();
    assert.equal(q.synced_revision, 2);
    assert.equal(client.rows.get(2)[7], "paid");
    assert.equal(client.rows.get(2)[20], "Compra na Shopee");
    assert.equal(client.rows.size, 2);
    setTarget(db, "another-sheet-id", "Pedidos");
    assert.equal(
      db.prepare("SELECT synced_revision FROM sheets_outbox").get()
        .synced_revision,
      0,
    );
    client.rows.set(2, ["other-order"]);
    await processOne(db, writer, Date.now());
    q = db.prepare("SELECT * FROM sheets_outbox").get();
    assert.equal(q.attempts, 1);
    assert.equal(client.rows.get(2)[0], "other-order");
  } finally {
    db.close();
  }
});
