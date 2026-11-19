import { shopOrigin } from "@/src/security/request";
import { notFound } from "next/navigation";
import { products } from "@/src/catalog/sqlite-repository";
import { Storefront } from "@/src/storefront/storefront";
import "../theme.css";
import { settings } from "@/src/payments/config";
import { headers } from "next/headers";
import { productVisibleOnHost, siteMetadata } from "@/src/catalog/sites";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = products.get((await params).slug);
  return product && productVisibleOnHost(product, (await headers()).get("host"))
    ? siteMetadata(product)
    : {};
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.get(slug);
  if (!product || !productVisibleOnHost(product, (await headers()).get("host")))
    notFound();
  return (
    <Storefront
      product={product}
      checkoutEnabled={settings().enabled && !!shopOrigin()}
      supportsCard={false}
    />
  );
}
