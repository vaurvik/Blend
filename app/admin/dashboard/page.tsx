import Link from "next/link";
import { requireAdmin } from "@/src/security/auth";
import { products } from "@/src/catalog/sqlite-repository";
import { listOrders, getSheetsSyncSummary } from "@/src/payments/orders";
import { Panel } from "@/components/base";
import { OrderDetails } from "@/components/base/order-details";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Admin() {
  await requireAdmin();
  const list = products.list(),
    orders = listOrders(),
    sheetSync = getSheetsSyncSummary();
  if (!list.length) redirect("/admin/primeiro-projeto");
  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <p className="eyebrow-label">
            VISÃO GERAL <span aria-hidden="true">/</span> SEUS SITES
          </p>
          <h1>
            Seu negócio,
            <br />
            <span>do seu jeito.</span>
          </h1>
          <p className="admin-intro">
            Crie, personalize e acompanhe seus sites de produto em um só lugar.
          </p>
        </div>
        <span className="overview-orb" aria-hidden="true">
          ✳
        </span>
      </header>
      <div className="admin-toolbar" id="projetos">
        <div>
          <span className="eyebrow-label">SUA LOJA</span>
          <h2>
            Projetos <span className="count-badge">{list.length}</span>
          </h2>
        </div>
        <Link className="admin-button" href="/admin/novo">
          Criar projeto <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <Panel className="products-panel">
        {list.length ? (
          list.map((p) => (
            <div className="product-row" key={p.slug}>
              <div>
                <strong>{p.projectName || p.title}</strong>
                <p>{p.domain || `/${p.slug}`}</p>
              </div>
              <div>
                <Link
                  href={p.domain ? `https://${p.domain}/` : `/${p.slug}`}
                  target="_blank"
                >
                  Ver página
                </Link>{" "}
                · <Link href={`/admin/projetos/${p.slug}`}>Abrir projeto</Link>{" "}
                ·{" "}
                <Link
                  href={`/admin/gateway?project=${encodeURIComponent(p.slug)}`}
                >
                  Pagamentos
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">
              ✳
            </span>
            <h3>O começo de algo bom.</h3>
            <p>Seu primeiro site de produto começa aqui.</p>
            <Link className="admin-button" href="/admin/novo">
              Criar meu primeiro projeto <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )}
      </Panel>
      <div className="dashboard-grid">
        <Panel className="dashboard-card">
          <span className="eyebrow-label">SUA OPERAÇÃO</span>
          <h2>Pagamentos</h2>
          <p>Nenhum provedor instalado.</p>
          <Link href="/admin/gateway">Ver integrações →</Link>
        </Panel>
        <Panel className="dashboard-card" id="integracoes">
          <span className="eyebrow-label">INTEGRAÇÕES</span>
          <h2>Google Sheets</h2>
          <p>
            {process.env.GOOGLE_SHEETS_ENABLED === "true"
              ? process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
                process.env.GOOGLE_APPLICATION_CREDENTIALS
                ? "Sincronização habilitada"
                : "Configuração incompleta"
              : "Sincronização desativada"}{" "}
            · {sheetSync.pending} pendente(s)
            {sheetSync.failed > 0
              ? ` · ${sheetSync.failed} com falha aguardando nova tentativa`
              : ""}
          </p>
        </Panel>
      </div>
      <Panel className="orders-panel" id="pedidos">
        <span className="eyebrow-label">ACOMPANHAMENTO</span>
        <h2>Últimos pedidos</h2>
        {orders.length ? (
          orders.map((o) => (
            <div className="product-row" key={o.id}>
              <div>
                <strong>{o.product_name}</strong>
                <p>
                  {o.id} · {o.provider_id} ·{" "}
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </p>
                <OrderDetails id={o.id} />
              </div>
              <div>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(o.amount / 100)}{" "}
                · {o.status}
              </div>
            </div>
          ))
        ) : (
          <p>Nenhum pedido registrado.</p>
        )}
      </Panel>
    </main>
  );
}
