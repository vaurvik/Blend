import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { Panel } from "@/components/base";

export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const project = products.get((await params).slug);
  if (!project) notFound();
  return (
    <main className="admin">
      <Link href="/admin">← Trocar projeto</Link>
      <div className="page-intro">
        <span className="eyebrow-label">PROJETO</span>
        <h1>{project.projectName || project.title}</h1>
        <p>{project.domain || `/${project.slug}`}</p>
      </div>
      <div className="dashboard-grid">
        <Panel className="dashboard-card">
          <span className="eyebrow-label">CATÁLOGO</span>
          <h2>Produtos</h2>
          <p>Gerencie os produtos e variantes deste projeto.</p>
          <Link
            href={`/admin/projetos/${encodeURIComponent(project.slug)}/produtos`}
          >
            Gerenciar produtos →
          </Link>
        </Panel>
        <Panel className="dashboard-card">
          <span className="eyebrow-label">LOJA</span>
          <h2>Site e conteúdo</h2>
          <p>Personalize domínio, produtos, imagens, cores e SEO.</p>
          <Link href={`/admin/editar/${project.slug}`}>
            Configurar projeto →
          </Link>
        </Panel>
        <Panel className="dashboard-card">
          <span className="eyebrow-label">TEMPLATE</span>
          <h2>Temas</h2>
          <p>Crie rascunhos e construa páginas no editor visual.</p>
          <Link
            href={`/admin/projetos/${encodeURIComponent(project.slug)}/temas`}
          >
            Gerenciar temas →
          </Link>
        </Panel>
        <Panel className="dashboard-card">
          <span className="eyebrow-label">PLUGIN DE PAGAMENTO</span>
          <h2>Nenhum provedor instalado</h2>
          <p>O checkout fica indisponível até adicionar uma integração.</p>
          <Link
            href={`/admin/gateway?project=${encodeURIComponent(project.slug)}`}
          >
            Configurar pagamentos →
          </Link>
        </Panel>
        <Panel className="dashboard-card">
          <span className="eyebrow-label">ARQUIVOS</span>
          <h2>Arquivos do projeto</h2>
          <p>Imagens e vídeos podem ser enviados na configuração do projeto.</p>
          <Link href={`/admin/editar/${project.slug}#page-content`}>
            Gerenciar arquivos →
          </Link>
        </Panel>
      </div>
    </main>
  );
}
