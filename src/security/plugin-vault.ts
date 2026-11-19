import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { dataDirectory } from "@/src/projects/storage";
import { createLocalKey, readLocalKey } from "./keys";
import {
  encryptSecret,
  decryptSecret,
  type EncryptedSecret,
} from "./vault-crypto.mjs";

const directory = dataDirectory();
mkdirSync(directory, { recursive: true });
const db = new DatabaseSync(join(directory, "shop.sqlite"));
db.exec(
  "PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS plugin_secrets (project_id TEXT NOT NULL, plugin_id TEXT NOT NULL, field TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(project_id,plugin_id,field))",
);

export interface SecretScope {
  projectId: string;
  pluginId: string;
  field: string;
}
function context(scope: SecretScope): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      scope.projectId,
    ) ||
    !/^[a-z0-9][a-z0-9._-]{0,99}$/.test(scope.pluginId) ||
    !/^[a-zA-Z][a-zA-Z0-9_]{0,99}$/.test(scope.field)
  )
    throw new Error("Identificador inválido");
  return JSON.stringify([scope.projectId, scope.pluginId, scope.field]);
}

/** Somente para uso no backend; a interface não devolve o segredo salvo. */
export function savePluginSecret(scope: SecretScope, value: string): void {
  const aad = context(scope);
  if (!value || Buffer.byteLength(value, "utf8") > 16384)
    throw new Error("Segredo inválido");
  db.exec("BEGIN IMMEDIATE");
  try {
    let key: Buffer;
    try {
      key = readLocalKey("vault");
    } catch (error) {
      const count = (
        db.prepare("SELECT COUNT(*) AS count FROM plugin_secrets").get() as {
          count: number;
        }
      ).count;
      if (count || (error as NodeJS.ErrnoException).code !== "ENOENT")
        throw error;
      createLocalKey("vault");
      key = readLocalKey("vault");
    }
    const payload = JSON.stringify(encryptSecret(key, value, aad));
    db.prepare(
      "INSERT INTO plugin_secrets (project_id,plugin_id,field,payload) VALUES (?,?,?,?) ON CONFLICT(project_id,plugin_id,field) DO UPDATE SET payload=excluded.payload",
    ).run(scope.projectId, scope.pluginId, scope.field, payload);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getPluginSecret(scope: SecretScope): string | null {
  const aad = context(scope);
  const row = db
    .prepare(
      "SELECT payload FROM plugin_secrets WHERE project_id=? AND plugin_id=? AND field=?",
    )
    .get(scope.projectId, scope.pluginId, scope.field) as
    { payload: string } | undefined;
  return row
    ? decryptSecret(
        readLocalKey("vault"),
        JSON.parse(row.payload) as EncryptedSecret,
        aad,
      )
    : null;
}
export function hasPluginSecret(scope: SecretScope): boolean {
  context(scope);
  return !!db
    .prepare(
      "SELECT 1 FROM plugin_secrets WHERE project_id=? AND plugin_id=? AND field=?",
    )
    .get(scope.projectId, scope.pluginId, scope.field);
}
export function deletePluginSecret(scope: SecretScope): void {
  context(scope);
  db.prepare(
    "DELETE FROM plugin_secrets WHERE project_id=? AND plugin_id=? AND field=?",
  ).run(scope.projectId, scope.pluginId, scope.field);
}
