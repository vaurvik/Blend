"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuLogOut, LuCirclePlus } from "react-icons/lu";
import { logout } from "@/app/admin/actions";

export interface ProjectSwitcherProject {
  slug: string;
  name: string;
}

export function ProjectSwitcher({
  projects,
  currentSlug,
}: {
  projects: ProjectSwitcherProject[];
  currentSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = projects.find((project) => project.slug === currentSlug);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="project-switcher" ref={root}>
      <button
        type="button"
        className="project-switcher__trigger"
        aria-label={`Projetos e conta: ${current?.name || "Blend"}`}
        aria-expanded={open}
        aria-controls="project-switcher-menu"
        onClick={() => setOpen(!open)}
      >
        <span className="project-switcher__avatar">
          {(current?.name || "Blend").slice(0, 1).toUpperCase()}
        </span>
        <span className="project-switcher__name">
          {current?.name || "Blend"}
        </span>
        <LuChevronDown size={14} aria-hidden="true" />
      </button>
      <div
        className={`project-switcher__menu${open ? " is-open" : ""}`}
        id="project-switcher-menu"
        aria-label="Projetos e conta"
        inert={!open}
      >
        <div className="project-switcher__projects">
          {projects.length > 1 && (
            <Link
              className="project-switcher__item"
              href="/admin"
              onClick={() => setOpen(false)}
            >
              Ver todos os projetos
            </Link>
          )}
          {projects.map((project) => (
            <Link
              key={project.slug}
              className={`project-switcher__item${project.slug === currentSlug ? " is-current" : ""}`}
              href={`/admin/projetos/${encodeURIComponent(project.slug)}`}
              onClick={() => setOpen(false)}
            >
              <span className="project-switcher__avatar">
                {project.name.slice(0, 1).toUpperCase()}
              </span>
              <span>{project.name}</span>
            </Link>
          ))}
          <Link
            className="project-switcher__item"
            href="/admin/novo"
            onClick={() => setOpen(false)}
          >
            <LuCirclePlus size={16} aria-hidden="true" /> Criar projeto
          </Link>
        </div>
        <div className="project-switcher__account">
          <div className="project-switcher__account-label">
            Conta de administrador
          </div>
          <form action={logout}>
            <button className="project-switcher__item" type="submit">
              <LuLogOut size={16} aria-hidden="true" /> Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
