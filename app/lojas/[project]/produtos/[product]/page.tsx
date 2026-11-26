import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { products } from "@/src/catalog/sqlite-repository";
import { listCatalogProducts } from "@/src/catalog/project-catalog-repository";
import { productVisibleOnHost } from "@/src/catalog/sites";
import { getPublishedTheme } from "@/src/themes/repository";
import { createTemplateContext } from "@/src/themes/template-context";
import { PublishedTheme } from "@/components/base/published-theme";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string; product: string }>;
}) {
  const route = await params,
    project = products.get(route.project);
  if (!project || !productVisibleOnHost(project, (await headers()).get("host")))
    return {};
  const catalog = listCatalogProducts(project);
  const product = catalog.find((item) => item.slug === route.product);
  return product
    ? { title: product.title, description: product.description || undefined }
    : {};
}

export default async function CatalogProductPage({
  params,
}: {
  params: Promise<{ project: string; product: string }>;
}) {
  const route = await params,
    project = products.get(route.project);
  if (!project || !productVisibleOnHost(project, (await headers()).get("host")))
    notFound();
  const catalog = listCatalogProducts(project);
  const product = catalog.find((item) => item.slug === route.product);
  if (!product) notFound();
  const published = getPublishedTheme(project.mediaId);
  if (published)
    return (
      <PublishedTheme
        theme={published}
        context={createTemplateContext(project, catalog, product.id)}
      />
    );
  return (
    <main className="catalog-public">
      <p>{project.brandName || project.projectName}</p>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <ul>
        {product.variants.map((variant) => (
          <li key={variant.id}>
            <strong>{variant.title}</strong> ·{" "}
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(variant.price / 100)}
            {!variant.available && " · Indisponível"}
          </li>
        ))}
      </ul>
      <p>Checkout indisponível no momento.</p>
    </main>
  );
}
