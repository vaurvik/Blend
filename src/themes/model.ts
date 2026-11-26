import { z } from "zod";

export const textElementSchema = z.object({
  id: z.uuid(),
  type: z.literal("text"),
  name: z.string().trim().min(1).max(100),
  tag: z.enum(["h1", "h2", "p"]),
  binding: z.enum([
    "static",
    "product.title",
    "product.description",
    "product.price",
  ]),
  text: z.string().max(500),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  fontSize: z.number().int().min(10).max(120),
});
const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) =>
      !value ||
      /^\/(?!\/)[^\s]*$/.test(value) ||
      /^https:\/\/[^\s]+$/.test(value),
    "Use um caminho local ou URL HTTPS.",
  );
export const imageElementSchema = z.object({
  id: z.uuid(),
  type: z.literal("image"),
  name: z.string().trim().min(1).max(100),
  src: safeUrl,
  alt: z.string().max(200),
  width: z.number().int().min(40).max(2400),
});
export const linkElementSchema = z.object({
  id: z.uuid(),
  type: z.literal("link"),
  name: z.string().trim().min(1).max(100),
  text: z.string().trim().min(1).max(100),
  href: safeUrl,
  target: z.enum(["custom", "product.url"]),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  background: z.string().regex(/^#[a-fA-F0-9]{6}$/),
});
export const productListElementSchema = z.object({
  id: z.uuid(),
  type: z.literal("product-list"),
  name: z.string().trim().min(1).max(100),
  showPrice: z.boolean(),
});
export const leafElementSchema = z.discriminatedUnion("type", [
  textElementSchema,
  imageElementSchema,
  linkElementSchema,
  productListElementSchema,
]);
export const containerElementSchema = z.object({
  id: z.uuid(),
  type: z.literal("container"),
  name: z.string().trim().min(1).max(100),
  tag: z.enum(["section", "header", "footer"]),
  direction: z.enum(["column", "row"]),
  mobileDirection: z.enum(["inherit", "column", "row"]).default("inherit"),
  gap: z.number().int().min(0).max(128),
  padding: z.number().int().min(0).max(128),
  background: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  children: z.array(leafElementSchema).max(40),
});
export const themeElementSchema = z.discriminatedUnion("type", [
  textElementSchema,
  imageElementSchema,
  linkElementSchema,
  productListElementSchema,
  containerElementSchema,
]);
export const pageElementSchema = z.object({
  id: z.uuid(),
  type: z.literal("page"),
  name: z.string().trim().min(1).max(100),
  x: z.number().finite().min(-100000).max(100000),
  y: z.number().finite().min(-100000).max(100000),
  width: z.number().int().min(320).max(4000),
  height: z.number().int().min(320).max(8000),
  background: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  template: z.string().max(20000).default(""),
  elements: z.array(themeElementSchema).max(40).default([]),
});
export const themeDocumentSchema = z
  .object({
    version: z.literal(1),
    id: z.uuid(),
    name: z.string().trim().min(1).max(100),
    pages: z.array(pageElementSchema).min(1).max(20),
  })
  .refine(
    (theme) =>
      new Set(theme.pages.map((page) => page.id)).size === theme.pages.length,
    "IDs de páginas duplicados",
  )
  .refine(
    (theme) =>
      theme.pages.every((page) => {
        const ids = page.elements.flatMap((element) =>
          element.type === "container"
            ? [element.id, ...element.children.map((child) => child.id)]
            : [element.id],
        );
        return ids.length <= 40 && new Set(ids).size === ids.length;
      }),
    "IDs de elementos duplicados",
  );
export type PageElement = z.infer<typeof pageElementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type LinkElement = z.infer<typeof linkElementSchema>;
export type ProductListElement = z.infer<typeof productListElementSchema>;
export type LeafElement = z.infer<typeof leafElementSchema>;
export type ContainerElement = z.infer<typeof containerElementSchema>;
export type ThemeElement = z.infer<typeof themeElementSchema>;
export type ThemeDocument = z.infer<typeof themeDocumentSchema>;

export function newPage(id: string, index: number): PageElement {
  return {
    id,
    type: "page",
    name: `Página ${index}`,
    x: (index - 1) * 1500,
    y: 0,
    width: 1200,
    height: 900,
    background: "#ffffff",
    template: "",
    elements: [],
  };
}
