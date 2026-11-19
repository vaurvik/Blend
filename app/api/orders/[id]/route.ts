import { getOrder } from "@/src/payments/orders";
import { clientIp, rateLimit } from "@/src/security/request";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const ip = clientIp(request);
  if (!ip || !rateLimit(`status:${ip}`, 60, 60_000))
    return new Response(null, { status: 429 });
  const order = getOrder(id);
  if (!order) return new Response(null, { status: 404 });
  return Response.json(
    { id: order.id, status: order.status, copyPaste: order.pix_code },
    { headers: { "Cache-Control": "no-store" } },
  );
}
