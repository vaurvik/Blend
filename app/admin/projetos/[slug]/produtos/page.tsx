import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { listCatalogProducts } from "@/src/catalog/project-catalog-repository";
import { Panel } from "@/components/base";

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params,
    project = products.get(slug);
  if (!project) notFound();
  const list = listCatalogProducts(project);
  return (
    <main className="admin">
      <Link href={`/admin/projetos/${encodeURIComponent(slug)}`}>
        ← Projeto
      </Link>
      <div className="admin-toolbar">
        <div>
          <span className="eyebrow-label">CATÁLOGO DO PROJETO</span>
          <h1>Produtos</h1>
          <p>Cadastre produtos e variantes para seus temas.</p>
        </div>
        <Link
          className="admin-button"
          href={`/admin/projetos/${encodeURIComponent(slug)}/produtos/novo`}
        >
          Adicionar produto
        </Link>
      </div>
      <Panel>
        {list.map((product) => (
          <div className="product-row" key={product.id}>
            <div>
              <strong>{product.title}</strong>
              <p>
                /{product.slug} · {product.variants.length}{" "}
                {product.variants.length === 1 ? "variante" : "variantes"}
              </p>
            </div>
            <Link
              href={`/admin/projetos/${encodeURIComponent(slug)}/produtos/${product.id}`}
            >
              Editar →
            </Link>
          </div>
        ))}
      </Panel>
    </main>
  );
}
