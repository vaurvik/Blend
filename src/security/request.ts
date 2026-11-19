import "server-only";
import { isIP } from "node:net";
import { localSetupAccess } from "./setup-access";
export function shopOrigin(): string | null {
  try {
    const value = process.env.SHOP_URL;
    if (!value) return null;
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      )
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin"),
    expected = shopOrigin();
  if (!expected)
    return !process.env.SHOP_URL && localSetupAccess(request.headers, true);
  if (!origin) return false;
  try {
    return new URL(origin).origin === expected;
  } catch {
    return false;
  }
}
/** Only the bundled server may set this header; it overwrites any client-supplied value. */
export function clientIp(request: Request): string | null {
  const ip = request.headers.get("x-products-shop-ip")?.trim();
  return ip && isIP(ip) ? ip : null;
}
const buckets = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  if (buckets.size > 20000 && !buckets.has(key)) return false;
  const b = buckets.get(key);
  if (!b || b.until <= now) {
    buckets.set(key, { count: 1, until: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= max;
}

export async function readBody(request: Request, max: number): Promise<string> {
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw new Error("too large");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new Error("too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}
