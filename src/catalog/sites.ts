import "server-only";
import type { Metadata } from "next";
import type { Product } from "./model";
import { products } from "./sqlite-repository";
import { shopOrigin } from "@/src/security/request";

export function siteForHost(host: string | null): Product | null {
  if (!host || !/^[a-zA-Z0-9.:-]+$/.test(host.replaceAll("-", ""))) return null;
  const hostname = host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  return products.list().find((product) => product.domain === hostname) ?? null;
}

export function productVisibleOnHost(
  product: Product,
  host: string | null,
): boolean {
  const site = siteForHost(host);
  if (site) return site.slug === product.slug;
  const origin = shopOrigin();
  return !origin || host?.toLowerCase() === new URL(origin).host.toLowerCase();
}

export function siteMetadata(product: Product): Metadata {
  const title = product.seoTitle || product.title;
  const description = product.seoDescription || undefined;
  const canonical = product.domain ? `https://${product.domain}/` : undefined;
  const socialImage =
    product.socialImage && canonical
      ? new URL(product.socialImage, canonical).toString()
      : product.socialImage;
  return {
    title,
    description,
    robots: { index: product.indexable, follow: product.indexable },
    ...(canonical ? { alternates: { canonical } } : {}),
    ...(product.favicon ? { icons: { icon: product.favicon } } : {}),
    openGraph: {
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(socialImage ? { images: [socialImage] } : {}),
    },
  };
}
