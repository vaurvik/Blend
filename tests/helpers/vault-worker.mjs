import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier.startsWith("@/"))
      return next(
        pathToFileURL(resolve(process.cwd(), `${specifier.slice(2)}.ts`)).href,
        context,
      );
    if (specifier === "./keys")
      return next(
        new URL("../../src/security/keys.ts", import.meta.url).href,
        context,
      );
    return next(specifier, context);
  },
});
const vault = await import("../../src/security/plugin-vault.ts");
const scope = {
  projectId: randomUUID(),
  pluginId: "plugin-teste",
  field: "apiKey",
};
assert.equal(vault.hasPluginSecret(scope), false);
vault.savePluginSecret(scope, "secret-value-never-plaintext");
assert.equal(vault.getPluginSecret(scope), "secret-value-never-plaintext");
assert.equal(vault.hasPluginSecret(scope), true);
assert.equal(
  vault.getPluginSecret({ ...scope, projectId: randomUUID() }),
  null,
);
const db = new DatabaseSync(resolve(process.env.SHOP_DATA_DIR, "shop.sqlite"));
const raw = db
  .prepare("SELECT payload FROM plugin_secrets WHERE project_id=?")
  .get(scope.projectId).payload;
assert.ok(!raw.includes("secret-value-never-plaintext"));
const record = JSON.parse(raw);
const tag = Buffer.from(record.tag, "base64");
tag[0] ^= 1;
record.tag = tag.toString("base64");
db.prepare("UPDATE plugin_secrets SET payload=? WHERE project_id=?").run(
  JSON.stringify(record),
  scope.projectId,
);
assert.throws(() => vault.getPluginSecret(scope));
vault.savePluginSecret(scope, "new-value");
assert.equal(vault.getPluginSecret(scope), "new-value");
unlinkSync(resolve(process.env.SHOP_KEYS_DIR, "vault.key"));
assert.throws(() => vault.getPluginSecret(scope));
assert.throws(() =>
  vault.savePluginSecret({ ...scope, field: "other" }, "value"),
);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM plugin_secrets").get().n, 1);
vault.deletePluginSecret(scope);
assert.equal(vault.hasPluginSecret(scope), false);
db.close();
