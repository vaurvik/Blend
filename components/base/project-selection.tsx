import Link from "next/link";
import Image from "next/image";
import { Brand } from "./brand";

export interface ProjectSelectionItem {
  slug: string;
  name: string;
  logo: string;
  domain: string;
}

export function ProjectSelection({
  projects,
}: {
  projects: ProjectSelectionItem[];
}) {
  return (
    <main className="project-selection">
      <header className="project-selection__header">
        <Brand href="/admin" />
      </header>
      <section
        className="project-selection__content"
        aria-labelledby="project-selection-title"
      >
        <span className="eyebrow-label">SEUS PROJETOS</span>
        <h1 id="project-selection-title">Qual projeto vamos cuidar?</h1>
        <p>Escolha um projeto para acessar seu painel.</p>
        <div className="project-selection__grid">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/admin/projetos/${encodeURIComponent(project.slug)}`}
              className="project-selection__item"
            >
              <span className="project-selection__image">
                {project.logo ? (
                  <Image src={project.logo} alt="" width={160} height={160} unoptimized />
                ) : (
                  <span aria-hidden="true">
                    {project.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <strong>{project.name}</strong>
              <small>{project.domain || "Domínio não configurado"}</small>
              <small>/{project.slug}</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
