"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import {
  createTheme,
  getTheme,
  publishTheme,
  saveTheme,
} from "@/src/themes/repository";
import { themeDocumentSchema } from "@/src/themes/model";
import { listCatalogProducts } from "@/src/catalog/project-catalog-repository";
import { createTemplateContext } from "@/src/themes/template-context";
import { renderThemeTemplate } from "@/src/themes/template-engine";
import { compilePageTemplate } from "@/src/themes/compile-page";

export async function createProjectTheme(
  slug: string,
): Promise<{ id?: string; error?: string }> {
  await requireAdmin();
  const project = products.get(slug);
  if (!project) return { error: "Projeto não encontrado." };
  try {
    const theme = createTheme(project.mediaId, "Novo tema");
    revalidatePath(`/admin/projetos/${slug}/temas`);
    return { id: theme.id };
  } catch {
    return { error: "Não foi possível criar o tema." };
  }
}
export async function saveProjectTheme(
  slug: string,
  input: unknown,
): Promise<{ error?: string }> {
  await requireAdmin();
  const project = products.get(slug),
    parsed = themeDocumentSchema.safeParse(input);
  if (!project || !parsed.success) return { error: "Dados do tema inválidos." };
  try {
    if (!getTheme(project.mediaId, parsed.data.id))
      return { error: "Tema não encontrado." };
    saveTheme(project.mediaId, parsed.data);
    revalidatePath(`/admin/projetos/${slug}/temas`);
    return {};
  } catch {
    return { error: "Não foi possível salvar o tema." };
  }
}
export async function publishProjectTheme(
  slug: string,
  themeId: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  const project = products.get(slug);
  if (!project) return { error: "Projeto não encontrado." };
  try {
    const theme = getTheme(project.mediaId, themeId);
    if (!theme) return { error: "Tema não encontrado." };
    const catalog = listCatalogProducts(project);
    for (const product of catalog)
      renderThemeTemplate(
        compilePageTemplate(theme.pages[0]),
        createTemplateContext(project, catalog, product.id),
      );
    publishTheme(project.mediaId, theme);
    revalidatePath(`/admin/projetos/${slug}/temas`);
    revalidatePath("/");
    return {};
  } catch {
    return {
      error:
        "Não foi possível publicar. Confira o template da primeira página e tente novamente.",
    };
  }
}
