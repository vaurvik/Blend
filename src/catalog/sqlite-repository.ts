import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { writeProjectSnapshot } from "@/src/projects/storage";
import { productSchema, type Product, type ProductRepository } from "./model";
const dir = process.env.SHOP_DATA_DIR || join(process.cwd(), "data");
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(join(dir, "shop.sqlite"));
db.exec(
  "PRAGMA busy_timeout=5000; PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS products (slug TEXT PRIMARY KEY, data TEXT NOT NULL)",
);
db.exec(
  "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, product_slug TEXT NOT NULL UNIQUE, template_id TEXT NOT NULL)",
);
class SqliteProductRepository implements ProductRepository {
  private migrated = false;
  private migrate(): void {
    if (this.migrated) return;
    db.exec("BEGIN IMMEDIATE");
    try {
      const rows = db.prepare("SELECT slug, data FROM products").all() as {
        slug: string;
        data: string;
      }[];
      const seen = new Set<string>();
      for (const row of rows) {
        const product = productSchema.parse(JSON.parse(row.data));
        if (!product.mediaId || seen.has(product.mediaId)) {
          product.mediaId = randomUUID();
          db.prepare("UPDATE products SET data=? WHERE slug=?").run(
            JSON.stringify(product),
            row.slug,
          );
        }
        seen.add(product.mediaId);
        db.prepare(
          "INSERT OR IGNORE INTO projects (id,name,product_slug,template_id) VALUES (?,?,?,'shopify-one-product')",
        ).run(
          product.mediaId,
          product.projectName || product.title,
          product.slug,
        );
      }
      db.exec("COMMIT");
      this.migrated = true;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    for (const row of db.prepare("SELECT data FROM products").all() as {
      data: string;
    }[]) {
      try {
        writeProjectSnapshot(productSchema.parse(JSON.parse(row.data)));
      } catch {
        console.error(
          "Não foi possível atualizar o arquivo de configuração do projeto.",
        );
      }
    }
  }
  list(): Product[] {
    this.migrate();
    return (
      db.prepare("SELECT data FROM products ORDER BY slug").all() as {
        data: string;
      }[]
    ).map((row) => productSchema.parse(JSON.parse(row.data)));
  }
  get(slug: string): Product | null {
    this.migrate();
    const row = db
      .prepare("SELECT data FROM products WHERE slug = ?")
      .get(slug) as { data: string } | undefined;
    return row ? productSchema.parse(JSON.parse(row.data)) : null;
  }
  save(product: Product, originalSlug?: string): void {
    this.migrate();
    db.exec("BEGIN IMMEDIATE");
    try {
      const rows = db.prepare("SELECT slug, data FROM products").all() as {
        slug: string;
        data: string;
      }[];
      const existingProduct = originalSlug
        ? rows.find((r) => r.slug === originalSlug)
        : undefined;
      if (existingProduct)
        product.mediaId = productSchema.parse(
          JSON.parse(existingProduct.data),
        ).mediaId;
      else if (!product.mediaId) product.mediaId = randomUUID();
      if (
        rows.some(
          (r) =>
            r.slug !== originalSlug &&
            productSchema.parse(JSON.parse(r.data)).mediaId === product.mediaId,
        )
      )
        throw new Error("project ID already assigned");
      if (product.domain) {
        const existing = rows
          .map((row) => productSchema.parse(JSON.parse(row.data)))
          .find((p) => p.domain === product.domain && p.slug !== originalSlug);
        if (existing) throw new Error("domain already assigned");
      }
      if (originalSlug && originalSlug !== product.slug) {
        db.prepare("DELETE FROM products WHERE slug = ?").run(originalSlug);
      }
      if (originalSlug === product.slug) {
        db.prepare("UPDATE products SET data = ? WHERE slug = ?").run(
          JSON.stringify(product),
          product.slug,
        );
      } else {
        db.prepare("INSERT INTO products (slug,data) VALUES (?,?)").run(
          product.slug,
          JSON.stringify(product),
        );
      }
      db.prepare(
        "INSERT INTO projects (id,name,product_slug,template_id) VALUES (?,?,?,'shopify-one-product') ON CONFLICT(id) DO UPDATE SET name=excluded.name, product_slug=excluded.product_slug",
      ).run(
        product.mediaId,
        product.projectName || product.title,
        product.slug,
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    try {
      writeProjectSnapshot(product);
    } catch {
      console.error(
        "Não foi possível atualizar o arquivo de configuração do projeto.",
      );
    }
  }
}
export const products: ProductRepository = new SqliteProductRepository();
