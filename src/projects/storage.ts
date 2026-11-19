import "server-only";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Product } from "@/src/catalog/model";

export function dataDirectory(): string {
  return process.env.SHOP_DATA_DIR || join(process.cwd(), "data");
}

export function projectDirectory(id: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    throw new Error("Identificador de projeto inválido");
  return join(dataDirectory(), "projects", id);
}

export function ensureProjectDirectories(id: string): void {
  const root = projectDirectory(id);
  for (const path of [
    "public/assets",
    "plugins/payments",
    "plugins/ui",
    "templates",
  ])
    mkdirSync(join(root, path), { recursive: true });
}

export function writeProjectPaymentSnapshot(
  id: string,
  provider: string | null,
): void {
  ensureProjectDirectories(id);
  const path = join(
    projectDirectory(id),
    "plugins",
    "payments",
    "selection.json",
  );
  const data =
    JSON.stringify(
      {
        schemaVersion: 1,
        activeProvider: provider,
        credentials: "environment",
      },
      null,
      2,
    ) + "\n";
  try {
    if (readFileSync(path, "utf8") === data) return;
  } catch {
    /* Primeiro salvamento. */
  }
  const tmp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(tmp, data, { flag: "wx", mode: 0o600 });
  renameSync(tmp, path);
}

/** SQLite é a fonte de verdade; o arquivo é uma cópia legível das configurações. */
export function writeProjectSnapshot(product: Product): void {
  ensureProjectDirectories(product.mediaId);
  const path = join(projectDirectory(product.mediaId), "project.json");
  const data =
    JSON.stringify(
      {
        schemaVersion: 1,
        id: product.mediaId,
        name: product.projectName || product.title,
        template: "shopify-one-product",
        site: product,
      },
      null,
      2,
    ) + "\n";
  try {
    if (readFileSync(path, "utf8") === data) return;
  } catch {
    /* Primeiro salvamento. */
  }
  const tmp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(tmp, data, { flag: "wx", mode: 0o600 });
  renameSync(tmp, path);
}
