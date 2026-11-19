import { login } from "../actions";
import { Brand } from "@/components/base";
import { hasAdmin } from "@/src/security/auth";
import { redirect } from "next/navigation";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!hasAdmin()) redirect("/admin/setup");
  return (
    <main className="login">
      <form action={login} className="panel">
        <Brand />
        <div className="login-intro">
          <span className="eyebrow-label">ÁREA ADMINISTRATIVA</span>
          <h1>Bem-vindo de volta.</h1>
          <p>Entre para cuidar dos seus produtos e acompanhar seus pedidos.</p>
        </div>
        {error && (
          <p className="error" role="alert">
            Credenciais inválidas ou limite de tentativas atingido. Tente
            novamente mais tarde.
          </p>
        )}
        <label>
          Usuário
          <input
            name="username"
            autoComplete="username"
            required
            maxLength={256}
          />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
          />
        </label>
        <button>
          Entrar no painel <span aria-hidden="true">↗</span>
        </button>
        <p className="login-footnote">Sua operação, em um só lugar.</p>
      </form>
    </main>
  );
}
