import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { Editor } from "@/src/admin/editor";
import "../../../theme.css";
export default async function EditProduct({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const product = products.get(slug);
  if (!product) notFound();
  return <Editor initial={product} originalSlug={slug} />;
}
