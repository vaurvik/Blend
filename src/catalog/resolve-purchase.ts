import type { CatalogProduct } from "./project-catalog";

export interface PurchaseSelection {
  productId: string;
  variantId: string;
  quantity: number;
}
export interface ResolvedPurchase {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
}

/** Calcula a partir do catálogo do projeto; nunca aceita valores monetários do cliente. */
export function resolvePurchase(
  catalog: CatalogProduct[],
  selection: PurchaseSelection,
): ResolvedPurchase | null {
  if (
    !Number.isInteger(selection.quantity) ||
    selection.quantity < 1 ||
    selection.quantity > 100
  )
    return null;
  const product = catalog.find((item) => item.id === selection.productId);
  const variant = product?.variants.find(
    (item) => item.id === selection.variantId,
  );
  if (!product || !variant || !variant.available) return null;
  return {
    productId: product.id,
    variantId: variant.id,
    productName: product.title,
    variantName: variant.title,
    quantity: selection.quantity,
    unitAmount: variant.price,
    totalAmount: variant.price * selection.quantity,
  };
}
