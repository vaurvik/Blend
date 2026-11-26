import { z } from "zod";

export const catalogVariantSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(100),
    price: z.number().int().min(0).max(100000000),
    compareAtPrice: z.number().int().min(0).max(100000000).nullable(),
    available: z.boolean(),
  })
  .refine(
    (variant) =>
      variant.compareAtPrice === null ||
      variant.compareAtPrice >= variant.price,
    "Preço original deve ser maior ou igual ao preço.",
  );
export const catalogProductSchema = z
  .object({
    id: z.uuid(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
    title: z.string().trim().min(1).max(150),
    description: z.string().max(5000),
    variants: z.array(catalogVariantSchema).min(1).max(100),
  })
  .refine(
    (product) =>
      new Set(product.variants.map((variant) => variant.id)).size ===
      product.variants.length,
    "IDs de variantes duplicados.",
  );
export type CatalogProduct = z.infer<typeof catalogProductSchema>;
export type CatalogVariant = z.infer<typeof catalogVariantSchema>;
