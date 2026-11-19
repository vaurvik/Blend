"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isIP } from "node:net";
import { revalidatePath } from "next/cache";
import { productSchema } from "@/src/catalog/model";
import { products } from "@/src/catalog/sqlite-repository";
import { shopOrigin } from "@/src/security/request";
import { allowLogin } from "@/src/security/rate-limit";
import {
  createSession,
  endSession,
  requireAdmin,
  validCredentials,
  createAdmin,
  hasAdmin,
} from "@/src/security/auth";
import { localSetupAccess } from "@/src/security/setup-access";

export async function setupAdmin(form: FormData) {
  const requestHeaders = await headers();
  if (!localSetupAccess(requestHeaders, true)) redirect("/admin/login");
  if (hasAdmin()) redirect("/admin/login");
  const ip = requestHeaders.get("x-products-shop-ip");
  if (!allowLogin(ip)) redirect("/admin/setup?error=limit");
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");
  if (
    username.length < 3 ||
    username.length > 64 ||
    /[\u0000-\u001f\u007f]/.test(username) ||
    password.length < 12 ||
    password.length > 1024 ||
    password !== confirmation
  )
    redirect("/admin/setup?error=invalid");
  let created: boolean;
  try {
    created = createAdmin(username, password);
  } catch {
    redirect("/admin/setup?error=server");
  }
  if (!created) redirect("/admin/login");
  await createSession();
  redirect("/admin");
}
export async function login(form: FormData) {
  if (!hasAdmin()) redirect("/admin/setup");
  const username = String(form.get("username") ?? "").slice(0, 256),
    password = String(form.get("password") ?? "").slice(0, 1024);
  const candidate = (await headers()).get("x-products-shop-ip")?.trim();
  const ip = candidate && isIP(candidate) ? candidate : null;
  if (!allowLogin(ip) || !validCredentials(username, password))
    redirect("/admin/login?error=1");
  await createSession();
  redirect("/admin");
}
export async function logout() {
  await endSession();
  redirect("/admin/login");
}
export async function saveProduct(
  input: unknown,
  originalSlug?: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  if (
    parsed.data.domain &&
    shopOrigin() &&
    new URL(shopOrigin()!).hostname === parsed.data.domain
  )
    return {
      error:
        "O domínio principal do painel não pode ser atribuído a um produto.",
    };
  try {
    if (originalSlug && !products.get(originalSlug))
      return { error: "Produto não encontrado." };
    products.save(parsed.data, originalSlug);
  } catch {
    return {
      error:
        "Não foi possível salvar. Verifique se a rota ou o domínio já está em uso.",
    };
  }
  revalidatePath("/");
  revalidatePath(`/${parsed.data.slug}`);
  if (originalSlug) revalidatePath(`/${originalSlug}`);
  return {};
}
