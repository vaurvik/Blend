import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { FirstProjectWizard } from "@/components/base/first-project-wizard";

export default async function FirstProjectPage() {
  await requireAdmin();
  if (products.list().length) redirect("/admin/dashboard");
  return <FirstProjectWizard />;
}
