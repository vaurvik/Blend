import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { Brand, Panel } from "@/components/base";

export default async function GatewayPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const project = query.project ? products.get(query.project) : null;
  if (query.project && !project) notFound();
  return (
    <main className="admin">
      <header className="app-topbar">
        <Brand />
        <span className="topbar-label">CONFIGURAÇÕES</span>
      </header>
      <Link href={project ? `/admin/projetos/${project.slug}` : "/admin"}>
        ← {project ? "Projeto" : "Projetos"}
      </Link>
      <div className="page-intro">
        <span className="eyebrow-label">
          PAGAMENTOS
          {project ? ` / ${project.projectName || project.title}` : ""}
        </span>
        <h1>Provedores de pagamento.</h1>
        <p>Gerencie as integrações de pagamento dos seus projetos.</p>
      </div>
      <Panel>
        <h2>Nenhum provedor instalado</h2>
        <p>
          O checkout ficará indisponível até que uma integração seja adicionada
          à plataforma.
        </p>
      </Panel>
    </main>
  );
}
