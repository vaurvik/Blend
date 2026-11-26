import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { getPublishedTheme, listThemes } from "@/src/themes/repository";
import { ThemeCreateButton } from "@/components/base/theme-create-button";
import { Panel } from "@/components/base";
import { ThemePublishButton } from "@/components/base/theme-publish-button";

export default async function ThemesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const project = products.get(slug);
  if (!project) notFound();
  const themes = listThemes(project.mediaId);
  const published = getPublishedTheme(project.mediaId);
  return (
    <main className="admin">
      <Link href={`/admin/projetos/${encodeURIComponent(slug)}`}>
        ← Projeto
      </Link>
      <div className="admin-toolbar">
        <div>
          <span className="eyebrow-label">LOJA VIRTUAL</span>
          <h1>Temas</h1>
          <p>
            Crie e desenvolva temas para {project.projectName || project.title}.
          </p>
          <p>
            A primeira página do tema publicado será exibida na loja. Alterações
            posteriores exigem republicação. Nesta versão, scripts, formulários
            e checkout não funcionam no tema publicado.
          </p>
        </div>
        <ThemeCreateButton slug={slug} />
      </div>
      <Panel>
        {themes.length ? (
          themes.map((theme) => (
            <div className="product-row" key={theme.id}>
              <div>
                <strong>{theme.name}</strong>
                <p>
                  {published?.id === theme.id ? "Publicado" : "Rascunho"} ·{" "}
                  {theme.pages.length}{" "}
                  {theme.pages.length === 1 ? "página" : "páginas"}
                </p>
              </div>
              <div>
                <Link
                  href={`/admin/projetos/${encodeURIComponent(slug)}/temas/${theme.id}`}
                >
                  Abrir editor →
                </Link>
                <ThemePublishButton
                  slug={slug}
                  themeId={theme.id}
                  active={published?.id === theme.id}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <h3>Seu primeiro tema começa aqui.</h3>
            <p>Crie um rascunho e comece com o elemento Page.</p>
          </div>
        )}
      </Panel>
    </main>
  );
}
