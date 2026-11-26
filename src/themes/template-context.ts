import type { Product } from "@/src/catalog/model";
import type { CatalogProduct } from "@/src/catalog/project-catalog";

export interface TemplateVariant {
  id: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  available: boolean;
}
export interface TemplateProduct {
  id: string;
  title: string;
  description: string;
  price: number | null;
  url: string;
  available: boolean;
  variants: TemplateVariant[];
}
export interface TemplateContext {
  shop: { name: string };
  product: TemplateProduct;
  products: TemplateProduct[];
}

/** Contexto contém exclusivamente campos públicos do catálogo do projeto. */
export function createTemplateContext(
  project: Product,
  catalog: CatalogProduct[],
  selectedId?: string,
): TemplateContext {
  if (!catalog.length) throw new Error("Catálogo vazio");
  const publicProducts: TemplateProduct[] = catalog.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    price:
      (
        product.variants.find((variant) => variant.available) ||
        product.variants[0]
      )?.price ?? null,
    url: `/lojas/${encodeURIComponent(project.slug)}/produtos/${encodeURIComponent(product.slug)}`,
    available: product.variants.some((variant) => variant.available),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      price: variant.price,
      compare_at_price: variant.compareAtPrice,
      available: variant.available,
    })),
  }));
  const current =
    publicProducts.find((product) => product.id === selectedId) ||
    publicProducts[0];
  return {
    shop: { name: project.brandName || project.projectName || project.title },
    product: current,
    products: publicProducts,
  };
}
