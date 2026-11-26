"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  LuHouse,
  LuPanelsTopLeft,
  LuCreditCard,
  LuShoppingBag,
  LuMenu,
  LuX,
  LuPanelLeftClose,
  LuPanelLeftOpen,
} from "react-icons/lu";
import { SidebarNav, type SidebarNavItem } from "./sidebar-nav";
import { SidebarSearch } from "./sidebar-search";
import { editorSections } from "./editor-sections";
import {
  ProjectSwitcher,
  type ProjectSwitcherProject,
} from "./project-switcher";

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function AdminShell({
  children,
  projects,
}: {
  children: ReactNode;
  projects: ProjectSwitcherProject[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/setup" ||
    pathname === "/admin/primeiro-projeto" ||
    pathname === "/admin" ||
    /^\/admin\/projetos\/[^/]+\/temas\/[^/]+$/.test(pathname)
  )
    return children;
  const pathSlug = pathname.match(
    /^\/admin\/(?:projetos|editar)\/([^/]+)/,
  )?.[1];
  const querySlug =
    pathname === "/admin/gateway" ? searchParams.get("project") : null;
  const currentProject = projects.find(
    (project) => project.slug === (pathSlug || querySlug),
  );
  const slug = currentProject?.slug;
  const projectUrl = slug
    ? `/admin/projetos/${encodeURIComponent(slug)}`
    : "/admin";
  const editorUrl = slug ? `/admin/editar/${encodeURIComponent(slug)}` : "";
  const isEditor = Boolean(slug && pathname === editorUrl);
  const isPayments = Boolean(
    slug && pathname === "/admin/gateway" && querySlug === slug,
  );
  const items: SidebarNavItem[] = slug
    ? [
        {
          id: "home",
          label: "Visão geral",
          icon: LuHouse,
          href: projectUrl,
          active: pathname === projectUrl,
        },
        {
          id: "store",
          label: "Loja virtual",
          icon: LuPanelsTopLeft,
          active: isEditor,
          children: editorSections.map((section, index) => ({
            label: section.label,
            href: `${editorUrl}#${section.id}`,
            active:
              isEditor && (hash === `#${section.id}` || (!hash && index === 0)),
          })),
        },
        {
          id: "catalog",
          label: "Produtos",
          icon: LuShoppingBag,
          href: `${projectUrl}/produtos`,
          active: pathname.startsWith(`${projectUrl}/produtos`),
        },
        {
          id: "themes",
          label: "Temas",
          icon: LuPanelsTopLeft,
          href: `${projectUrl}/temas`,
          active: pathname === `${projectUrl}/temas`,
        },
        {
          id: "payments",
          label: "Pagamentos",
          icon: LuCreditCard,
          href: `/admin/gateway?project=${encodeURIComponent(slug)}`,
          active: isPayments,
        },
      ]
    : [
        {
          id: "home",
          label: "Selecionar projeto",
          icon: LuHouse,
          href: "/admin",
        },
      ];
  const current = isPayments
    ? "Pagamentos"
    : pathname.startsWith("/admin/editar") || pathname === "/admin/novo"
      ? "Editor de projeto"
      : pathname.startsWith("/admin/projetos")
        ? "Projeto"
        : "Visão geral";
  return (
    <div
      className={`admin-shell${collapsed ? " is-collapsed" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      {open && (
        <button
          type="button"
          className="admin-shell__backdrop"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="admin-navigation"
        className={`admin-sidebar${open ? " is-open" : ""}`}
        aria-label="Navegação administrativa"
      >
        <div className="admin-sidebar__header">
          <Link
            href={projectUrl}
            className="admin-sidebar__brand"
            aria-label="Blend: visão geral"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/branding/logo.png"
              width={22}
              height={28}
              alt=""
              priority
            />
          </Link>
          <button
            type="button"
            className="admin-sidebar__collapse"
            aria-label={
              collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
            }
            aria-expanded={!collapsed}
            aria-controls="admin-navigation"
            title={
              collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
            }
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <LuPanelLeftOpen size={16} aria-hidden="true" />
            ) : (
              <LuPanelLeftClose size={16} aria-hidden="true" />
            )}
          </button>
        </div>
        <SidebarSearch
          value={search}
          onChange={setSearch}
          collapsed={collapsed}
          onExpand={() => setCollapsed(false)}
        />
        <SidebarNav
          items={items}
          search={search}
          collapsed={collapsed}
          onExpandSidebar={() => setCollapsed(false)}
          onNavigate={() => setOpen(false)}
        />
        <div className="admin-sidebar__footer">
          <ProjectSwitcher projects={projects} currentSlug={slug} />
        </div>
      </aside>
      <div className="admin-shell__content">
        <header className="admin-shell__topbar">
          <button
            type="button"
            className="admin-shell__menu"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="admin-navigation"
            onClick={() => {
              setCollapsed(false);
              setOpen(!open);
            }}
          >
            {open ? (
              <LuX size={19} aria-hidden="true" />
            ) : (
              <LuMenu size={19} aria-hidden="true" />
            )}
          </button>
          <span className="admin-shell__crumb">
            Blend <span>/</span> <strong>{current}</strong>
          </span>
          <span className="admin-shell__toplabel">PAINEL ADMINISTRATIVO</span>
        </header>
        <div className="admin-shell__body">{children}</div>
      </div>
    </div>
  );
}
