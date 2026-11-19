import "server-only";

export function localSetupAccess(headers: Headers, mutation = false): boolean {
  const ip = headers.get("x-products-shop-ip");
  if (ip !== "127.0.0.1" && ip !== "::1") return false;
  const host = headers.get("host");
  if (!host) return false;
  try {
    const local = new URL(`http://${host}`);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(local.hostname) ||
      local.host !== host.toLowerCase()
    )
      return false;
    if (!mutation) return true;
    const origin = headers.get("origin");
    if (!origin) return false;
    const source = new URL(origin);
    return (
      source.host === local.host &&
      (source.protocol === "http:" || source.protocol === "https:")
    );
  } catch {
    return false;
  }
}
