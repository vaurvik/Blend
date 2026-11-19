import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CustomerDetails, ShippingAddress } from "@/src/orders/customer";
import type { GatewayId, PaymentMethod, PaymentResult } from "./gateway";
import { builtinPaymentProviders } from "@/src/plugins/catalog";
const dir = process.env.SHOP_DATA_DIR || join(process.cwd(), "data");
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(join(dir, "shop.sqlite"));
db.exec(
  `PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, product_slug TEXT NOT NULL, product_name TEXT NOT NULL, amount INTEGER NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL, transaction_id TEXT UNIQUE, pix_code TEXT, created_at TEXT NOT NULL)`,
);
db.exec(`CREATE TABLE IF NOT EXISTS order_details (order_id TEXT PRIMARY KEY REFERENCES orders(id), name TEXT NOT NULL, email TEXT NOT NULL, document TEXT NOT NULL, phone TEXT NOT NULL, cep TEXT NOT NULL, street TEXT NOT NULL, house_number TEXT NOT NULL, complement TEXT NOT NULL, neighborhood TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sheets_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id), revision INTEGER NOT NULL DEFAULT 1, synced_revision INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, next_retry INTEGER NOT NULL DEFAULT 0, last_error TEXT);
`);
function enqueue(orderId: string) {
  db.prepare(
    "INSERT INTO sheets_outbox (order_id) SELECT order_id FROM order_details WHERE order_id=? ON CONFLICT(order_id) DO UPDATE SET revision=revision+1,attempts=0,next_retry=0,last_error=NULL",
  ).run(orderId);
}
const columns = db.prepare("PRAGMA table_info(orders)").all() as unknown as {
  name: string;
}[];
if (!columns.some((c) => c.name === "provider_id")) {
  try {
    db.exec(
      "ALTER TABLE orders ADD COLUMN provider_id TEXT NOT NULL DEFAULT 'legacy'",
    );
  } catch (error) {
    const after = db.prepare("PRAGMA table_info(orders)").all() as unknown as {
      name: string;
    }[];
    if (!after.some((c) => c.name === "provider_id")) throw error;
  }
}
function addColumnIfMissing(name: string, sql: string): void {
  if (columns.some((c) => c.name === name)) return;
  try {
    db.exec(sql);
  } catch (error) {
    const current = db
      .prepare("PRAGMA table_info(orders)")
      .all() as unknown as { name: string }[];
    if (!current.some((c) => c.name === name)) throw error;
  }
}
addColumnIfMissing(
  "project_id",
  "ALTER TABLE orders ADD COLUMN project_id TEXT",
);
addColumnIfMissing(
  "provider_version",
  "ALTER TABLE orders ADD COLUMN provider_version TEXT NOT NULL DEFAULT '1.0.0'",
);
export interface Order {
  id: string;
  provider_id: GatewayId;
  project_id: string | null;
  provider_version: string;
  product_slug: string;
  product_name: string;
  amount: number;
  method: PaymentMethod;
  status: string;
  transaction_id: string | null;
  pix_code: string | null;
  created_at: string;
}
export function createOrder(
  id: string,
  slug: string,
  name: string,
  amount: number,
  method: PaymentMethod,
  providerId: GatewayId,
  customer: CustomerDetails,
  shipping: ShippingAddress,
  projectId: string,
): boolean {
  db.exec("BEGIN IMMEDIATE");
  try {
    const providerVersion = builtinPaymentProviders.find(
      (provider) => provider.id === providerId,
    )?.version;
    if (!providerVersion) throw new Error("Provider não registrado");
    if (db.prepare("SELECT id FROM orders WHERE id=?").get(id)) {
      db.exec("ROLLBACK");
      return false;
    }
    db.prepare(
      "INSERT INTO orders (id,product_slug,product_name,amount,method,status,created_at,provider_id,project_id,provider_version) VALUES (?,?,?,?,?,'creating',?,?,?,?)",
    ).run(
      id,
      slug,
      name,
      amount,
      method,
      new Date().toISOString(),
      providerId,
      projectId,
      providerVersion,
    );
    db.prepare(
      "INSERT INTO order_details VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      customer.name,
      customer.email,
      customer.document,
      customer.phone,
      shipping.cep,
      shipping.street,
      shipping.number,
      shipping.complement,
      shipping.neighborhood,
      shipping.city,
      shipping.state,
    );
    enqueue(id);
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function getOrder(id: string): Order | null {
  return (
    (db.prepare("SELECT * FROM orders WHERE id=?").get(id) as unknown as
      Order | undefined) ?? null
  );
}
export function getOrderByTransaction(
  id: string,
  providerId: GatewayId,
): Order | null {
  return (
    (db
      .prepare("SELECT * FROM orders WHERE transaction_id=? AND provider_id=?")
      .get(id, providerId) as unknown as Order | undefined) ?? null
  );
}
export function markUnknown(id: string) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = db
      .prepare(
        "UPDATE orders SET status='unknown' WHERE id=? AND status='creating'",
      )
      .run(id);
    if (result.changes) enqueue(id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function updateOrder(id: string, result: PaymentResult) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const order = getOrder(id);
    if (
      !order ||
      result.amountCents !== order.amount ||
      result.externalRef !== order.id ||
      (!!order.transaction_id &&
        result.transactionId.toLowerCase() !==
          order.transaction_id.toLowerCase())
    )
      throw new Error("Transação não corresponde ao pedido");
    const nextStatus =
      order.status === "paid" && result.status === "pending"
        ? "paid"
        : result.status;
    db.prepare(
      "UPDATE orders SET transaction_id=?,status=?,pix_code=COALESCE(?,pix_code) WHERE id=?",
    ).run(result.transactionId, nextStatus, result.copyPaste ?? null, id);
    if (
      order.status !== nextStatus ||
      order.transaction_id !== result.transactionId
    )
      enqueue(id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function listOrders(): Order[] {
  return db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100")
    .all() as unknown as Order[];
}

export interface StoredOrderDetails {
  name: string;
  email: string;
  document: string;
  phone: string;
  cep: string;
  street: string;
  house_number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}
export function getOrderDetails(id: string): StoredOrderDetails | null {
  return (
    (db
      .prepare(
        "SELECT name,email,document,phone,cep,street,house_number,complement,neighborhood,city,state FROM order_details WHERE order_id=?",
      )
      .get(id) as unknown as StoredOrderDetails | undefined) ?? null
  );
}
export function getSheetsSyncSummary(): { pending: number; failed: number } {
  return db
    .prepare(
      "SELECT COUNT(*) AS pending, COALESCE(SUM(CASE WHEN attempts>0 THEN 1 ELSE 0 END),0) AS failed FROM sheets_outbox WHERE revision>synced_revision",
    )
    .get() as unknown as { pending: number; failed: number };
}
