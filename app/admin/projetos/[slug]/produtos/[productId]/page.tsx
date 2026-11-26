import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { listCatalogProducts } from "@/src/catalog/project-catalog-repository";
import { CatalogProductForm } from "@/components/base/catalog-product-form";

export default async function CatalogEditPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  await requireAdmin();
  const { slug, productId } = await params,
    project = products.get(slug);
  if (!project) notFound();
  const initial =
    productId === "novo"
      ? undefined
      : listCatalogProducts(project).find((item) => item.id === productId);
  if (productId !== "novo" && !initial) notFound();
  return (
    <main className="admin">
      <Link href={`/admin/projetos/${encodeURIComponent(slug)}/produtos`}>
        ← Produtos
      </Link>
      <div className="page-intro">
        <span className="eyebrow-label">CATÁLOGO</span>
        <h1>{initial ? "Editar produto" : "Novo produto"}</h1>
        <p>As variantes podem ter preços e disponibilidade próprios.</p>
      </div>
      <CatalogProductForm projectSlug={slug} initial={initial} />
    </main>
  );
}
