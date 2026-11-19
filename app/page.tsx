import Link from "next/link";
import { products } from "@/src/catalog/sqlite-repository";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { siteForHost, siteMetadata } from "@/src/catalog/sites";
import { shopOrigin } from "@/src/security/request";
import { Storefront } from "@/src/storefront/storefront";
import { settings } from "@/src/payments/config";
import "./theme.css";
import { Brand } from "@/components/base";
import { hasAdmin } from "@/src/security/auth";
import { localSetupAccess } from "@/src/security/setup-access";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const site = siteForHost((await headers()).get("host"));
  return site ? siteMetadata(site) : {};
}
export default async function Home() {
  const requestHeaders = await headers();
  if (!hasAdmin() && localSetupAccess(requestHeaders)) redirect("/admin/setup");
  const host = requestHeaders.get("host");
  const site = siteForHost(host);
  if (site)
    return (
      <Storefront
        product={site}
        checkoutEnabled={settings().enabled && !!shopOrigin()}
        supportsCard={false}
      />
    );
  if (
    shopOrigin() &&
    host?.toLowerCase() !== new URL(shopOrigin()!).host.toLowerCase()
  )
    notFound();
  const items = products.list();
  return (
    <main className="home">
      <header className="app-topbar">
        <Brand />
        <Link className="admin-button" href="/admin">
          Administração ↗
        </Link>
      </header>
      <span className="eyebrow-label">BLEND</span>
      <h1>Produtos</h1>
      {items.length ? (
        <ul>
          {items.map((p) => (
            <li key={p.slug}>
              <Link href={`/${p.slug}`}>{p.title}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum produto publicado.</p>
      )}
    </main>
  );
}
