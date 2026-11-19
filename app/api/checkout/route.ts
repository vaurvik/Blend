import { siteForHost } from "@/src/catalog/sites";
import { clientIp, rateLimit, sameOrigin } from "@/src/security/request";

export async function POST(request: Request) {
  const site = siteForHost(request.headers.get("host"));
  const origin = request.headers.get("origin");
  const siteOrigin =
    site &&
    origin === `https://${site.domain}` &&
    request.headers.get("host")?.toLowerCase() === site.domain;
  if (!sameOrigin(request) && !siteOrigin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const ip = clientIp(request);
  if (
    !ip ||
    !rateLimit("payment:global", 100, 60_000) ||
    !rateLimit(`payment:${ip}`, 6, 60_000)
  )
    return Response.json({ error: "Checkout indisponível." }, { status: 429 });
  return Response.json(
    { error: "Nenhum provedor de pagamento disponível." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
