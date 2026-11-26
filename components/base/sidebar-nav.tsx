"use client";
import Link from "next/link";
import { useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import type { IconType } from "react-icons";

export interface SidebarNavLink {
  label: string;
  href: string;
  active?: boolean;
}
export interface SidebarNavItem {
  id: string;
  label: string;
  icon: IconType;
  href?: string;
  active?: boolean;
  children?: SidebarNavLink[];
}
export function SidebarNav({
  items,
  onNavigate,
  collapsed = false,
  onExpandSidebar,
  search = "",
}: {
  items: SidebarNavItem[];
  onNavigate?: () => void;
  collapsed?: boolean;
  onExpandSidebar?: () => void;
  search?: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const query = normalize(search.trim());
  const filteredItems = query
    ? items.flatMap((item) => {
        if (normalize(item.label).includes(query)) return [item];
        const children = item.children?.filter((child) =>
          normalize(child.label).includes(query),
        );
        return children?.length ? [{ ...item, children }] : [];
      })
    : items;
  return (
    <nav className="admin-sidebar__nav" aria-label="Menu principal">
      <ul className="admin-sidebar__list">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          if (item.children?.length) {
            const open =
              Boolean(query) ||
              (expanded[item.id] ??
                Boolean(
                  item.active || item.children.some((child) => child.active),
                ));
            return (
              <li key={item.id} className="admin-sidebar__group">
                <button
                  type="button"
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                  className={`admin-sidebar__link${item.active ? " is-active" : ""}`}
                  aria-expanded={open && !collapsed}
                  aria-controls={`sidebar-group-${item.id}`}
                  onClick={() => {
                    if (collapsed) onExpandSidebar?.();
                    setExpanded((current) => ({
                      ...current,
                      [item.id]: collapsed || !open,
                    }));
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                  <LuChevronDown
                    className={`admin-sidebar__chevron${open ? " is-open" : ""}`}
                    size={14}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`sidebar-group-${item.id}`}
                  className={`admin-sidebar__subnav${open && !collapsed ? " is-open" : ""}`}
                  inert={!open || collapsed}
                >
                  <ul className="admin-sidebar__subnav-inner">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className={`admin-sidebar__sublink${child.active ? " is-active" : ""}`}
                          aria-current={child.active ? "page" : undefined}
                          onClick={onNavigate}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          }
          if (!item.href) return null;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
                className={`admin-sidebar__link${item.active ? " is-active" : ""}`}
                aria-current={item.active ? "page" : undefined}
                onClick={onNavigate}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {query && filteredItems.length === 0 && (
        <p className="sidebar-search__empty">Nenhum resultado.</p>
      )}
    </nav>
  );
}
