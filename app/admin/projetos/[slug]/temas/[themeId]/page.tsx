import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { getTheme } from "@/src/themes/repository";
import { ThemeBuilder } from "@/components/base/theme-builder";
import { createTemplateContext } from "@/src/themes/template-context";
import { listCatalogProducts } from "@/src/catalog/project-catalog-repository";

export default async function ThemeBuilderPage({
  params,
}: {
  params: Promise<{ slug: string; themeId: string }>;
}) {
  await requireAdmin();
  const { slug, themeId } = await params;
  const project = products.get(slug);
  if (!project) notFound();
  let theme;
  try {
    theme = getTheme(project.mediaId, themeId);
  } catch {
    notFound();
  }
  if (!theme) notFound();
  return (
    <ThemeBuilder
      initial={theme}
      slug={slug}
      siteId={project.mediaId}
      context={createTemplateContext(project, listCatalogProducts(project))}
    />
  );
}
