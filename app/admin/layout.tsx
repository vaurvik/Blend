import type { ReactNode } from "react";
import { AdminShell } from "@/components/base/admin-shell";
import { isAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const projects = (await isAdmin())
    ? products.list().map((project) => ({
        slug: project.slug,
        name: project.projectName || project.title,
      }))
    : [];
  return <AdminShell projects={projects}>{children}</AdminShell>;
}
