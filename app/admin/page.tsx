import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { ProjectSelection } from "@/components/base/project-selection";

export default async function AdminIndex() {
  await requireAdmin();
  const projects = products.list();
  if (!projects.length) redirect("/admin/primeiro-projeto");
  if (projects.length === 1)
    redirect(`/admin/projetos/${encodeURIComponent(projects[0].slug)}`);
  return (
    <ProjectSelection
      projects={projects.map((project) => ({
        slug: project.slug,
        name: project.projectName || project.title,
        logo: project.logo,
        domain: project.domain,
      }))}
    />
  );
}
