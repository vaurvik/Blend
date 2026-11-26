"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { catalogProductSchema } from "@/src/catalog/project-catalog";
import {
  ensureProjectCatalog,
  saveCatalogProduct,
} from "@/src/catalog/project-catalog-repository";

export async function saveProjectCatalogProduct(
  slug: string,
  input: unknown,
  originalId?: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  const project = products.get(slug),
    parsed = catalogProductSchema.safeParse(input);
  if (!project || !parsed.success)
    return {
      error:
        "Confira os dados: informe nome, rota válida, ao menos uma variante e preços válidos.",
    };
  try {
    ensureProjectCatalog(project);
    saveCatalogProduct(project, parsed.data, originalId);
  } catch {
    return {
      error:
        "Não foi possível salvar. Verifique se a rota já está em uso neste projeto.",
    };
  }
  revalidatePath(`/admin/projetos/${slug}/produtos`);
  revalidatePath(`/admin/editar/${slug}`);
  revalidatePath(`/${slug}`);
  revalidatePath("/");
  return {};
}
