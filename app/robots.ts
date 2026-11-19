import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteForHost } from "@/src/catalog/sites";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = siteForHost((await headers()).get("host"));
  return {
    rules: {
      userAgent: "*",
      ...(site && !site.indexable
        ? { disallow: "/" }
        : { allow: "/", disallow: ["/admin", "/api", "/checkout"] }),
    },
    ...(site?.domain && site.indexable
      ? { sitemap: `https://${site.domain}/sitemap.xml` }
      : {}),
  };
}
