import { z } from "zod";
import { isValidCpf } from "@/src/payments/customer";
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "Caractere inválido");
export const shippingSchema = z
  .object({
    cep: z.string().regex(/^\d{8}$/),
    street: text(150),
    number: text(30),
    complement: z
      .string()
      .trim()
      .max(100)
      .refine((v) => !/[\u0000-\u001f\u007f]/.test(v)),
    neighborhood: text(100),
    city: text(100),
    state: z.enum([
      "AC",
      "AL",
      "AP",
      "AM",
      "BA",
      "CE",
      "DF",
      "ES",
      "GO",
      "MA",
      "MT",
      "MS",
      "MG",
      "PA",
      "PB",
      "PR",
      "PE",
      "PI",
      "RJ",
      "RN",
      "RS",
      "RO",
      "RR",
      "SC",
      "SP",
      "SE",
      "TO",
    ]),
  })
  .strict();
export const customerSchema = z
  .object({
    name: text(100).refine((v) => v.length >= 3),
    email: z.email().max(200),
    document: z.string().refine(isValidCpf),
    phone: z.string().regex(/^\d{10,13}$/),
  })
  .strict();
export type ShippingAddress = z.infer<typeof shippingSchema>;
export type CustomerDetails = z.infer<typeof customerSchema>;
