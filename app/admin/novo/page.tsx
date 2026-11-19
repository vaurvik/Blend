import { requireAdmin } from "@/src/security/auth";
import { defaultProduct } from "@/src/catalog/model";
import { Editor } from "@/src/admin/editor";
import "../../theme.css";
export default async function NewProduct() {
  await requireAdmin();
  return <Editor initial={defaultProduct} />;
}
