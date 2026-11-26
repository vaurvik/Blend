import { siteForHost } from "@/src/catalog/sites";
export async function GET(request: Request) {
  const site = siteForHost(request.headers.get("host"));
  const target = site?.favicon || "/api/branding/icon?v=blend-5";
  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store" },
  });
}
