import "server-only";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { catalogProductSchema, type CatalogProduct } from "./project-catalog";
import type { Product } from "./model";

const dir = process.env.SHOP_DATA_DIR || join(process.cwd(), "data");
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(join(dir, "shop.sqlite"));
db.exec(
  "PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS project_catalog_products (project_id TEXT NOT NULL, id TEXT NOT NULL, slug TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(project_id, id), UNIQUE(project_id, slug));",
);

export function ensureProjectCatalog(project: Product): void {
  const existing = db
    .prepare(
      "SELECT 1 FROM project_catalog_products WHERE project_id=? LIMIT 1",
    )
    .get(project.mediaId);
  if (existing) return;
  const initial: CatalogProduct = {
    id: project.mediaId,
    slug: project.slug,
    title: project.title,
    description: "",
    variants: project.options.map((option) => ({
      id: randomUUID(),
      title: option.name,
      price: option.price,
      compareAtPrice: option.originalPrice,
      available: option.available,
    })),
  };
  db.prepare(
    "INSERT OR IGNORE INTO project_catalog_products (project_id,id,slug,data) VALUES (?,?,?,?)",
  ).run(
    project.mediaId,
    initial.id,
    initial.slug,
    JSON.stringify(catalogProductSchema.parse(initial)),
  );
}
export function listCatalogProducts(project: Product): CatalogProduct[] {
  ensureProjectCatalog(project);
  return (
    db
      .prepare(
        "SELECT data FROM project_catalog_products WHERE project_id=? ORDER BY slug",
      )
      .all(project.mediaId) as { data: string }[]
  ).map((row) => catalogProductSchema.parse(JSON.parse(row.data)));
}
export function saveCatalogProduct(
  project: Product,
  input: unknown,
  originalId?: string,
): CatalogProduct {
  const product = catalogProductSchema.parse(input);
  if (originalId && product.id !== originalId)
    throw new Error("Produto inválido");
  if (originalId) {
    const result = db
      .prepare(
        "UPDATE project_catalog_products SET slug=?,data=? WHERE project_id=? AND id=?",
      )
      .run(product.slug, JSON.stringify(product), project.mediaId, originalId);
    if (!result.changes) throw new Error("Produto não encontrado");
  } else
    db.prepare(
      "INSERT INTO project_catalog_products (project_id,id,slug,data) VALUES (?,?,?,?)",
    ).run(project.mediaId, product.id, product.slug, JSON.stringify(product));
  return product;
}
