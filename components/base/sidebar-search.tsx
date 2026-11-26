"use client";

import { useRef } from "react";
import { LuSearch } from "react-icons/lu";

export function SidebarSearch({
  value,
  onChange,
  collapsed,
  onExpand,
}: {
  value: string;
  onChange: (value: string) => void;
  collapsed: boolean;
  onExpand: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="sidebar-search">
      {collapsed ? (
        <button
          type="button"
          className="sidebar-search__expand"
          aria-label="Pesquisar na navegação"
          title="Pesquisar"
          onClick={() => {
            onExpand();
            requestAnimationFrame(() => input.current?.focus());
          }}
        >
          <LuSearch size={16} aria-hidden="true" />
        </button>
      ) : (
        <LuSearch
          className="sidebar-search__icon"
          size={16}
          aria-hidden="true"
        />
      )}
      <input
        ref={input}
        className="sidebar-search__input"
        type="search"
        aria-label="Pesquisar na navegação"
        placeholder="Pesquisar"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={collapsed ? -1 : undefined}
      />
    </div>
  );
}
