import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/base";
import { hasAdmin } from "@/src/security/auth";
import { localSetupAccess } from "@/src/security/setup-access";
import { setupAdmin } from "../actions";

export const dynamic = "force-dynamic";
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (hasAdmin()) redirect("/admin/login");
  if (!localSetupAccess(await headers())) notFound();
  const { error } = await searchParams;
  return (
    <main className="login">
      <form action={setupAdmin} className="panel">
        <Brand />
        <div className="login-intro">
          <span className="eyebrow-label">PRIMEIROS PASSOS</span>
          <h1>Vamos começar.</h1>
          <p>Crie sua conta de administrador para configurar seus projetos.</p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error === "limit"
              ? "Muitas tentativas. Tente novamente mais tarde."
              : error === "server"
                ? "Não foi possível concluir a configuração. Verifique as permissões dos arquivos e a configuração do servidor."
                : "Confira o usuário e as senhas. Use pelo menos 3 caracteres no usuário e 12 na senha."}
          </p>
        )}
        <label>
          Usuário
          <input
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={64}
          />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={1024}
          />
        </label>
        <label>
          Confirme a senha
          <input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={1024}
          />
        </label>
        <button>
          Criar conta e continuar <span aria-hidden="true">↗</span>
        </button>
        <p className="login-footnote">
          Disponível apenas no computador onde o servidor está rodando.
        </p>
      </form>
    </main>
  );
}
