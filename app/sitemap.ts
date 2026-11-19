import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteForHost } from "@/src/catalog/sites";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteForHost((await headers()).get("host"));
  return site?.domain && site.indexable
    ? [{ url: `https://${site.domain}/` }]
    : [];
}
