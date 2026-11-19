import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { products } from "@/src/catalog/sqlite-repository";
import { productVisibleOnHost } from "@/src/catalog/sites";
import { Panel } from "@/components/base";

export const dynamic = "force-dynamic";
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = products.get((await params).slug);
  if (!product || !productVisibleOnHost(product, (await headers()).get("host")))
    notFound();
  return (
    <main className="checkout">
      <Link href={`/${product.slug}`}>← Voltar ao produto</Link>
      <div className="checkout-intro">
        <h1>Pagamento indisponível.</h1>
        <p>A loja ainda não possui um provedor de pagamento ativo.</p>
      </div>
      <Panel>Não é possível concluir compras no momento.</Panel>
    </main>
  );
}
