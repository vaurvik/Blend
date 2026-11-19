import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function encryptSecret(key, value, context) {
  if (key.length !== 32) throw new Error("Chave inválida");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    nonce: nonce.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(key, record, context) {
  if (key.length !== 32 || record.version !== 1)
    throw new Error("Formato inválido");
  const nonce = Buffer.from(record.nonce, "base64"),
    tag = Buffer.from(record.tag, "base64");
  if (nonce.length !== 12 || tag.length !== 16)
    throw new Error("Formato inválido");
  const cipher = createDecipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(context, "utf8"));
  cipher.setAuthTag(tag);
  return Buffer.concat([
    cipher.update(Buffer.from(record.ciphertext, "base64")),
    cipher.final(),
  ]).toString("utf8");
}
