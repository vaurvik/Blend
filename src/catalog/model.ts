import { z } from "zod";

const media = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (v) => !v || /^\/(?!\/)[^\s]*$/.test(v) || /^https:\/\/[^\s]+$/.test(v),
    "Use uma URL HTTPS ou um caminho local.",
  );
export const optionSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    detail: z.string().max(200),
    badge: z.string().max(50),
    price: z.number().int().min(0).max(100000000),
    originalPrice: z.number().int().min(0).max(100000000),
    available: z.boolean().default(true),
  })
  .refine(
    (v) => v.originalPrice >= v.price,
    "Preço original deve ser maior ou igual ao preço promocional.",
  );
const faqSchema = z.object({
  question: z.string().max(200),
  answer: z.string().max(1000),
});
const reviewSchema = z.object({
  title: z.string().max(150),
  text: z.string().max(1000),
  author: z.string().max(100),
  rating: z.number().int().min(1).max(5),
  image: media,
});
const routineBenefitSchema = z.object({
  title: z.string().max(150),
  text: z.string().max(500),
});
export const productSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .refine(
      (v) => !["admin", "api", "_next", "checkout", "media"].includes(v),
      "Rota reservada",
    ),
  title: z.string().trim().min(1).max(150),
  projectName: z.string().trim().max(150).default(""),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .refine(
      (v) =>
        !v ||
        /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
          v,
        ),
      "Informe apenas o domínio, por exemplo loja.com.br",
    )
    .default(""),
  mediaId: z.union([z.literal(""), z.uuid()]).default(""),
  seoTitle: z.string().max(150).default(""),
  seoDescription: z.string().max(300).default(""),
  favicon: media.default(""),
  socialImage: media.default(""),
  indexable: z.boolean().default(true),
  announcement: z.string().max(200),
  campaignSupport: z.string().max(150).default(""),
  campaignImage: media.default(""),
  marqueeItems: z.array(z.string().max(120)).max(8).default([]),
  brandName: z.string().max(120).default("Sua loja"),
  facebookUrl: z
    .string()
    .max(2048)
    .refine((v) => !v || /^https:\/\//.test(v))
    .default(""),
  logo: media,
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0).max(10000000),
  images: z.array(media.refine(Boolean)).min(1).max(8),
  video: media,
  benefits: z.array(z.string().max(200)).max(4),
  options: z.array(optionSchema).min(1).max(2),
  routineTitle: z.string().max(200),
  routineText: z.string().max(500),
  buttonText: z.string().min(1).max(80),
  navigation: z
    .object({
      home: z.string().max(50),
      product: z.string().max(50),
      routine: z.string().max(50),
      reviews: z.string().max(50),
      faq: z.string().max(50),
    })
    .default({
      home: "Início",
      product: "Produto",
      routine: "Como funciona",
      reviews: "Opiniões",
      faq: "Perguntas",
    }),
  headerColor: z
    .string()
    .regex(/^#[a-fA-F0-9]{6}$/)
    .default("#000000"),
  backgroundColor: z
    .string()
    .regex(/^#[a-fA-F0-9]{6}$/)
    .default("#ffffff"),
  textColor: z
    .string()
    .regex(/^#[a-fA-F0-9]{6}$/)
    .default("#000000"),
  trustItems: z
    .array(z.object({ title: z.string().max(100), text: z.string().max(200) }))
    .max(3)
    .default([
      { title: "Pagamento seguro", text: "Seus dados protegidos." },
      { title: "Envio para todo o Brasil", text: "Com rastreamento." },
      { title: "Suporte especializado", text: "Tire suas dúvidas." },
    ]),
  faq: z.array(faqSchema).max(12).default([]),
  reviews: z.array(reviewSchema).max(12).default([]),
  reviewTitle: z.string().max(150).default("Avaliações do produto"),
  reviewText: z.string().max(300).default(""),
  routineBenefits: z.array(routineBenefitSchema).max(4).default([]),
  footerText: z.string().max(200).default(""),
  offerEndsAt: z
    .string()
    .max(40)
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Data inválida")
    .default(""),
  offerTimerMode: z.enum(["date", "duration"]).default("date"),
  offerDurationMinutes: z.number().int().min(1).max(10080).default(120),
});
export type Product = z.infer<typeof productSchema>;
export interface ProductRepository {
  list(): Product[];
  get(slug: string): Product | null;
  save(product: Product, originalSlug?: string): void;
}
export const defaultProduct: Product = {
  slug: "meu-produto",
  title: "Seu produto",
  projectName: "",
  domain: "",
  mediaId: "",
  seoTitle: "",
  seoDescription: "",
  favicon: "",
  socialImage: "",
  indexable: true,
  announcement: "FRETE GRÁTIS",
  campaignSupport: "",
  campaignImage: "",
  marqueeItems: [],
  brandName: "Sua loja",
  facebookUrl: "",
  logo: "",
  color: "#F79516",
  rating: 0,
  reviewCount: 0,
  images: ["/assets/product-placeholder.svg"],
  video: "",
  benefits: [],
  options: [
    {
      name: "Seu produto",
      detail: "",
      badge: "",
      price: 1000,
      originalPrice: 1000,
      available: true,
    },
  ],
  routineTitle: "Conheça seu produto",
  routineText: "",
  buttonText: "COMPRAR AGORA",
  navigation: {
    home: "Início",
    product: "Produto",
    routine: "Como funciona",
    reviews: "Opiniões",
    faq: "Perguntas",
  },
  headerColor: "#000000",
  backgroundColor: "#ffffff",
  textColor: "#000000",
  trustItems: [
    { title: "Pagamento seguro", text: "Seus dados protegidos." },
    { title: "Envio para todo o Brasil", text: "Com rastreamento." },
    { title: "Suporte especializado", text: "Tire suas dúvidas." },
  ],
  faq: [],
  reviews: [],
  reviewTitle: "Avaliações do produto",
  reviewText: "",
  routineBenefits: [],
  footerText: "",
  offerEndsAt: "",
  offerTimerMode: "date",
  offerDurationMinutes: 120,
};
