import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { dataDirectory } from "@/src/projects/storage";

function keyPath(name: "session" | "vault"): string {
  return join(
    process.env.SHOP_KEYS_DIR || join(dataDirectory(), "keys"),
    `${name}.key`,
  );
}

export function createLocalKey(name: "session" | "vault"): void {
  const path = keyPath(name);
  mkdirSync(process.env.SHOP_KEYS_DIR || join(dataDirectory(), "keys"), {
    recursive: true,
    mode: 0o700,
  });
  try {
    writeFileSync(path, randomBytes(32), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  readLocalKey(name);
}

export function readLocalKey(name: "session" | "vault"): Buffer {
  const key = readFileSync(keyPath(name));
  if (key.length !== 32) throw new Error("Chave local inválida");
  return key;
}
