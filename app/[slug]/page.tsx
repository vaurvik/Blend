import { shopOrigin } from "@/src/security/request";
import { notFound } from "next/navigation";
import { products } from "@/src/catalog/sqlite-repository";
import { Storefront } from "@/components/base/storefront/storefront";
import "../theme.css";
import { settings } from "@/src/payments/config";
import { headers } from "next/headers";
import { productVisibleOnHost, siteMetadata } from "@/src/catalog/sites";
import { getPublishedTheme } from "@/src/themes/repository";
import { listCatalogProducts } from "@/src/catalog/project-catalog-repository";
import { createTemplateContext } from "@/src/themes/template-context";
import { PublishedTheme } from "@/components/base/published-theme";
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
  const published = getPublishedTheme(product.mediaId);
  if (published)
    return (
      <PublishedTheme
        theme={published}
        context={createTemplateContext(
          product,
          listCatalogProducts(product),
          product.mediaId,
        )}
      />
    );
  return (
    <Storefront
      product={product}
      checkoutEnabled={settings().enabled && !!shopOrigin()}
      supportsCard={false}
    />
  );
}
