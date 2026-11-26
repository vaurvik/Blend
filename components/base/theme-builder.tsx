"use client";

import Link from "next/link";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  LuArrowLeft,
  LuFilePlus,
  LuMousePointer2,
  LuType,
  LuTag,
  LuPanelsTopLeft,
  LuImage,
  LuMousePointerClick,
  LuLayoutGrid,
} from "react-icons/lu";
import { saveProjectTheme } from "@/app/admin/theme-actions";
import {
  newPage,
  type PageElement,
  type ThemeDocument,
  type TextElement,
  type ContainerElement,
  type LinkElement,
  type LeafElement,
} from "@/src/themes/model";
import { BaseCanvas, type CanvasCamera, type CanvasPoint } from "./base-canvas";
import { Button } from "./button";
import { Field, Input, Select } from "./fields";
import { MediaUpload } from "./media-upload";
import type { TemplateContext } from "@/src/themes/template-context";
import { renderThemeTemplate } from "@/src/themes/template-engine";
import { compilePageTemplate } from "@/src/themes/compile-page";
import { moveThemeElement, shiftThemeElement } from "@/src/themes/element-tree";

function ElementIcon({ type }: { type: LeafElement["type"] | "container" }) {
  const Icon =
    type === "container"
      ? LuPanelsTopLeft
      : type === "image"
        ? LuImage
        : type === "link"
          ? LuMousePointerClick
          : type === "product-list"
            ? LuLayoutGrid
            : LuType;
  return <Icon size={14} aria-hidden="true" />;
}

function PagePreview({
  page,
  context,
  selectedElementId,
  onSelectElement,
}: {
  page: PageElement;
  context: TemplateContext;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const [bounds, setBounds] = useState<
    {
      id: string;
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[]
  >([]);
  const result = useMemo(() => {
    try {
      return {
        html: renderThemeTemplate(compilePageTemplate(page), context),
        error: "",
      };
    } catch (error) {
      return {
        html: "",
        error: error instanceof Error ? error.message : "Erro no template.",
      };
    }
  }, [page, context]);
  useEffect(() => () => observer.current?.disconnect(), []);
  function measure() {
    const document = frame.current?.contentDocument;
    if (!document?.body) return;
    const allowed = new Map(
      page.elements.flatMap((item) =>
        item.type === "container"
          ? [
              [item.id, item.name] as const,
              ...item.children.map((child) => [child.id, child.name] as const),
            ]
          : [[item.id, item.name] as const],
      ),
    );
    const seen = new Set<string>();
    const next = Array.from(
      document.querySelectorAll<HTMLElement>("[data-blend-element]"),
    ).flatMap((node) => {
      const id = node.dataset.blendElement || "",
        name = allowed.get(id);
      if (!name || seen.has(id)) return [];
      seen.add(id);
      const rect = node.getBoundingClientRect();
      return rect.width && rect.height
        ? [
            {
              id,
              name,
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
            },
          ]
        : [];
    });
    setBounds(next);
  }
  return (
    <>
      <iframe
        title={`Prévia de ${page.name}`}
        tabIndex={-1}
        ref={frame}
        sandbox="allow-same-origin"
        className="theme-builder__preview-frame"
        onLoad={() => {
          observer.current?.disconnect();
          measure();
          const body = frame.current?.contentDocument?.body;
          if (body) {
            observer.current = new ResizeObserver(measure);
            observer.current.observe(body);
          }
        }}
        srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: http: data:; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${result.html}</body></html>`}
      />
      {bounds.map((box) => (
        <button
          key={box.id}
          type="button"
          className={`theme-builder__element-hit${box.id === selectedElementId ? " is-selected" : ""}`}
          style={{
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
          }}
          aria-label={`Selecionar ${box.name}`}
          onPointerDown={(event) => {
            if (event.button === 0) event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onSelectElement(box.id);
          }}
        />
      ))}
      {result.error && (
        <div className="theme-builder__template-error">
          Template inválido: {result.error}
        </div>
      )}
    </>
  );
}

export function ThemeBuilder({
  initial,
  slug,
  context,
  siteId,
}: {
  initial: ThemeDocument;
  slug: string;
  context: TemplateContext;
  siteId: string;
}) {
  const [theme, setTheme] = useState(initial);
  const [previewProductId, setPreviewProductId] = useState(context.product.id);
  const previewContext = useMemo(
    () => ({
      ...context,
      product:
        context.products.find((item) => item.id === previewProductId) ||
        context.product,
    }),
    [context, previewProductId],
  );
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [selected, setSelected] = useState<string | null>(
    initial.pages[0]?.id || null,
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const draggedElement = useRef<string | null>(null);
  const [camera, setCamera] = useState<CanvasCamera>({
    x: 80,
    y: 80,
    zoom: 0.7,
  });
  const [error, setError] = useState("");
  const [uploadsPending, setUploadsPending] = useState(0);
  const [pending, start] = useTransition();
  const drag = useRef<{
    id: string;
    start: CanvasPoint;
    x: number;
    y: number;
  } | null>(null);
  const page = theme.pages.find((item) => item.id === selected);
  const element = page?.elements
    .flatMap((item) =>
      item.type === "container" ? [item, ...item.children] : [item],
    )
    .find((item) => item.id === selectedElementId);
  const elementCount =
    page?.elements.reduce(
      (count, item) =>
        count + 1 + (item.type === "container" ? item.children.length : 0),
      0,
    ) || 0;
  const parentContainer =
    page && element
      ? page.elements.find(
          (item) =>
            item.type === "container" &&
            item.children.some((child) => child.id === element.id),
        )
      : undefined;
  const siblings =
    parentContainer?.type === "container"
      ? parentContainer.children
      : page?.elements || [];
  const siblingIndex = element
    ? siblings.findIndex((item) => item.id === element.id)
    : -1;
  const dirty = JSON.stringify(theme) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function updatePage(id: string, changes: Partial<PageElement>) {
    setTheme((current) => ({
      ...current,
      pages: current.pages.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    }));
  }
  function addPage() {
    if (theme.pages.length >= 20) return;
    const next = newPage(crypto.randomUUID(), theme.pages.length + 1);
    setTheme((current) => ({ ...current, pages: [...current.pages, next] }));
    setSelected(next.id);
    setSelectedElementId(null);
  }
  function addElement(binding: TextElement["binding"]) {
    if (!page || elementCount >= 40) return;
    const next: TextElement = {
      id: crypto.randomUUID(),
      type: "text",
      name:
        binding === "product.price"
          ? "Preço do produto"
          : binding === "product.title"
            ? "Título do produto"
            : "Texto",
      tag: binding === "product.title" ? "h1" : "p",
      binding,
      text: "Seu texto",
      color: "#000000",
      fontSize: binding === "product.title" ? 40 : 20,
    };
    insertLeaf(next);
  }
  function insertLeaf(next: LeafElement) {
    if (!page || elementCount >= 40) return;
    updatePage(page.id, {
      elements:
        element?.type === "container"
          ? page.elements.map((item) =>
              item.id === element.id && item.type === "container"
                ? { ...item, children: [...item.children, next] }
                : item,
            )
          : [...page.elements, next],
    });
    setSelectedElementId(next.id);
  }
  function addMediaElement(type: "image" | "link" | "product-list") {
    if (type === "image")
      insertLeaf({
        id: crypto.randomUUID(),
        type,
        name: "Imagem",
        src: "",
        alt: "",
        width: 480,
      });
    else if (type === "link")
      insertLeaf({
        id: crypto.randomUUID(),
        type,
        name: "Botão",
        text: "Ver produto",
        href: "",
        target: "product.url",
        color: "#ffffff",
        background: "#000000",
      });
    else
      insertLeaf({
        id: crypto.randomUUID(),
        type,
        name: "Lista de produtos",
        showPrice: true,
      });
  }
  function addContainer(tag: ContainerElement["tag"]) {
    if (!page || elementCount >= 40) return;
    const next: ContainerElement = {
      id: crypto.randomUUID(),
      type: "container",
      name:
        tag === "header" ? "Header" : tag === "footer" ? "Footer" : "Container",
      tag,
      direction: "column",
      mobileDirection: "column",
      gap: 16,
      padding: 24,
      background: "#ffffff",
      children: [],
    };
    updatePage(page.id, { elements: [...page.elements, next] });
    setSelectedElementId(next.id);
  }
  function updateElement(changes: Partial<TextElement>) {
    if (!page || element?.type !== "text") return;
    updatePage(page.id, {
      elements: page.elements.map((item) =>
        item.type === "text" && item.id === element.id
          ? { ...item, ...changes, type: "text" }
          : item.type === "container"
            ? {
                ...item,
                children: item.children.map((child) =>
                  child.type === "text" && child.id === element.id
                    ? { ...child, ...changes, type: "text" }
                    : child,
                ),
              }
            : item,
      ),
    });
  }
  function replaceLeaf(replacement: LeafElement) {
    if (!page) return;
    updatePage(page.id, {
      elements: page.elements.map((item) =>
        item.type === "container"
          ? {
              ...item,
              children: item.children.map((child) =>
                child.id === replacement.id ? replacement : child,
              ),
            }
          : item.id === replacement.id
            ? replacement
            : item,
      ),
    });
  }
  function setImageSource(pageId: string, elementId: string, src: string) {
    const update = (item: LeafElement): LeafElement =>
      item.type === "image" && item.id === elementId ? { ...item, src } : item;
    setTheme((current) => ({
      ...current,
      pages: current.pages.map((item) =>
        item.id !== pageId
          ? item
          : {
              ...item,
              elements: item.elements.map((entry) =>
                entry.type === "container"
                  ? { ...entry, children: entry.children.map(update) }
                  : update(entry),
              ),
            },
      ),
    }));
  }
  function updateContainer(changes: Partial<ContainerElement>) {
    if (!page || element?.type !== "container") return;
    updatePage(page.id, {
      elements: page.elements.map((item) =>
        item.type === "container" && item.id === element.id
          ? { ...item, ...changes, type: "container" }
          : item,
      ),
    });
  }
  function removeElement() {
    if (!page || !element) return;
    updatePage(page.id, {
      elements: page.elements
        .filter((item) => item.id !== element.id)
        .map((item) =>
          item.type === "container"
            ? {
                ...item,
                children: item.children.filter(
                  (child) => child.id !== element.id,
                ),
              }
            : item,
        ),
    });
    setSelectedElementId(null);
  }
  function moveLeaf(containerId: string) {
    if (!page || !element || element.type === "container") return;
    const without = page.elements
      .filter((item) => item.id !== element.id)
      .map((item) =>
        item.type === "container"
          ? {
              ...item,
              children: item.children.filter(
                (child) => child.id !== element.id,
              ),
            }
          : item,
      );
    updatePage(page.id, {
      elements: containerId
        ? without.map((item) =>
            item.type === "container" && item.id === containerId
              ? { ...item, children: [...item.children, element] }
              : item,
          )
        : [...without, element],
    });
  }
  function dropLayer(targetId: string | null) {
    if (page && draggedElement.current)
      updatePage(page.id, {
        elements: moveThemeElement(
          page.elements,
          draggedElement.current,
          targetId,
        ),
      });
    draggedElement.current = null;
    setDragTarget(null);
  }
  function save() {
    const snapshot = theme;
    setError("");
    start(async () => {
      const result = await saveProjectTheme(slug, snapshot);
      if (result.error) setError(result.error);
      else setSaved(JSON.stringify(snapshot));
    });
  }
  return (
    <div className="theme-builder">
      <header className="theme-builder__bar">
        <Link
          href={`/admin/projetos/${encodeURIComponent(slug)}/temas`}
          aria-label="Voltar para temas"
          onClick={(event) => {
            if (
              dirty &&
              !window.confirm("Há alterações não salvas. Deseja sair?")
            )
              event.preventDefault();
          }}
        >
          <LuArrowLeft size={18} />
        </Link>
        <Input
          aria-label="Nome do tema"
          value={theme.name}
          maxLength={100}
          onChange={(event) => setTheme({ ...theme, name: event.target.value })}
        />
        <span className="theme-builder__status">
          {dirty ? "Alterações não salvas" : "Rascunho salvo"}
        </span>
        <label className="theme-builder__preview-select">
          Produto da prévia{" "}
          <select
            value={previewProductId}
            onChange={(event) => setPreviewProductId(event.target.value)}
          >
            {context.products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <div
          className="theme-builder__viewport"
          role="group"
          aria-label="Largura da prévia"
        >
          <button
            type="button"
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            Celular
          </button>
        </div>
        <Button
          className="theme-builder__save"
          onClick={save}
          disabled={pending || uploadsPending > 0 || !dirty}
        >
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </header>
      {error && (
        <p className="theme-builder__error" role="alert">
          {error}
        </p>
      )}
      <div className="theme-builder__workspace">
        <aside className="theme-builder__toolbox">
          <span className="eyebrow-label">ELEMENTOS</span>
          <h2>Toolbox</h2>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            onClick={addPage}
            disabled={theme.pages.length >= 20}
          >
            <LuFilePlus size={17} /> Page <span>+</span>
          </Button>
          <p>Adicione uma página ao canvas.</p>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            disabled={!page || elementCount >= 40}
            onClick={() => addElement("product.title")}
          >
            <LuType size={17} /> Título do produto <span>+</span>
          </Button>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            disabled={!page || elementCount >= 40}
            onClick={() => addElement("product.price")}
          >
            <LuTag size={17} /> Preço do produto <span>+</span>
          </Button>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            disabled={!page || elementCount >= 40}
            onClick={() => addElement("static")}
          >
            <LuType size={17} /> Texto <span>+</span>
          </Button>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            disabled={!page || elementCount >= 40}
            onClick={() => addMediaElement("image")}
          >
            <LuImage size={17} /> Imagem <span>+</span>
          </Button>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            disabled={!page || elementCount >= 40}
            onClick={() => addMediaElement("link")}
          >
            <LuMousePointerClick size={17} /> Botão <span>+</span>
          </Button>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            disabled={!page || elementCount >= 40}
            onClick={() => addMediaElement("product-list")}
          >
            <LuLayoutGrid size={17} /> Lista de produtos <span>+</span>
          </Button>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            disabled={!page || elementCount >= 40}
            onClick={() => addContainer("section")}
          >
            <LuPanelsTopLeft size={17} /> Container <span>+</span>
          </Button>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            disabled={!page || elementCount >= 40}
            onClick={() => addContainer("header")}
          >
            <LuPanelsTopLeft size={17} /> Header <span>+</span>
          </Button>
          <Button
            className="theme-builder__tool"
            variant="secondary"
            disabled={!page || elementCount >= 40}
            onClick={() => addContainer("footer")}
          >
            <LuPanelsTopLeft size={17} /> Footer <span>+</span>
          </Button>
          <p>Selecione um container para adicionar elementos dentro dele.</p>
          <div className="theme-builder__layers">
            <span className="eyebrow-label">CAMADAS</span>
            <small>Arraste as camadas para reorganizar.</small>
            {theme.pages.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === selected ? "is-selected" : ""}
                onDragOver={(event) => {
                  if (item.id === selected && draggedElement.current)
                    event.preventDefault();
                }}
                onDrop={(event) => {
                  if (item.id === selected) {
                    event.preventDefault();
                    dropLayer(null);
                  }
                }}
                onClick={() => {
                  setSelected(item.id);
                  setSelectedElementId(null);
                }}
              >
                <LuMousePointer2 size={14} />
                {item.name}
              </button>
            ))}
            {page &&
              page.elements.map((item) => (
                <Fragment key={item.id}>
                  <button
                    type="button"
                    draggable
                    className={`theme-builder__layer-child${item.id === selectedElementId ? " is-selected" : ""}${dragTarget === item.id ? " is-drop-target" : ""}`}
                    onDragStart={(event) => {
                      draggedElement.current = item.id;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.id);
                    }}
                    onDragOver={(event) => {
                      if (
                        draggedElement.current &&
                        draggedElement.current !== item.id
                      ) {
                        event.preventDefault();
                        setDragTarget(item.id);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      dropLayer(item.id);
                    }}
                    onDragEnd={() => {
                      draggedElement.current = null;
                      setDragTarget(null);
                    }}
                    onClick={() => setSelectedElementId(item.id)}
                  >
                    <ElementIcon type={item.type} />
                    {item.name}
                  </button>
                  {item.type === "container" &&
                    item.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        draggable
                        className={`theme-builder__layer-nested${child.id === selectedElementId ? " is-selected" : ""}${dragTarget === child.id ? " is-drop-target" : ""}`}
                        onDragStart={(event) => {
                          draggedElement.current = child.id;
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", child.id);
                        }}
                        onDragOver={(event) => {
                          if (
                            draggedElement.current &&
                            draggedElement.current !== child.id
                          ) {
                            event.preventDefault();
                            setDragTarget(child.id);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          dropLayer(child.id);
                        }}
                        onDragEnd={() => {
                          draggedElement.current = null;
                          setDragTarget(null);
                        }}
                        onClick={() => setSelectedElementId(child.id)}
                      >
                        <ElementIcon type={child.type} />
                        {child.name}
                      </button>
                    ))}
                </Fragment>
              ))}
          </div>
        </aside>
        <div className="theme-builder__canvas-wrap">
          <BaseCanvas
            onCameraChange={setCamera}
            onPointerDown={(event, point) => {
              const target = (event.target as HTMLElement).closest<HTMLElement>(
                "[data-page-id]",
              );
              if (event.button !== 0) return;
              if (!target) {
                setSelected(null);
                setSelectedElementId(null);
                return;
              }
              const item = theme.pages.find(
                (value) => value.id === target.dataset.pageId,
              );
              if (!item) return;
              setSelected(item.id);
              setSelectedElementId(null);
              drag.current = {
                id: item.id,
                start: point,
                x: item.x,
                y: item.y,
              };
              target.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event, point) => {
              if (drag.current && event.buttons & 1) {
                const item = drag.current;
                updatePage(item.id, {
                  x: Math.round(item.x + point.x - item.start.x),
                  y: Math.round(item.y + point.y - item.start.y),
                });
              }
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            {() =>
              theme.pages.map((item) => (
                <div
                  key={item.id}
                  data-page-id={item.id}
                  className={`theme-builder__page${selected === item.id ? " is-selected" : ""}`}
                  style={{
                    left: item.x,
                    top: item.y,
                    width:
                      viewport === "mobile"
                        ? Math.min(390, item.width)
                        : item.width,
                  }}
                >
                  <div className="theme-builder__page-label">
                    {item.name}{" "}
                    <span>
                      {viewport === "mobile"
                        ? Math.min(390, item.width)
                        : item.width}{" "}
                      × {item.height}
                    </span>
                  </div>
                  <main
                    className="theme-builder__page-body"
                    style={{
                      width:
                        viewport === "mobile"
                          ? Math.min(390, item.width)
                          : item.width,
                      height: item.height,
                      backgroundColor: item.background,
                    }}
                    aria-label={item.name}
                  >
                    <PagePreview
                      page={item}
                      context={previewContext}
                      selectedElementId={
                        selected === item.id ? selectedElementId : null
                      }
                      onSelectElement={(id) => {
                        setSelected(item.id);
                        setSelectedElementId(id);
                      }}
                    />
                  </main>
                </div>
              ))
            }
          </BaseCanvas>
          <div className="theme-builder__hint">
            Arraste com o botão central ou direito · Scroll para zoom ·{" "}
            {Math.round(camera.zoom * 100)}%
          </div>
        </div>
        <aside className="theme-builder__properties">
          <span className="eyebrow-label">PROPRIEDADES</span>
          <h2>{element ? element.name : page ? "Page" : "Nenhum elemento"}</h2>
          {element && page && (
            <div
              className="theme-builder__order"
              role="group"
              aria-label="Ordem da camada"
            >
              <Button
                variant="secondary"
                disabled={siblingIndex <= 0}
                onClick={() =>
                  updatePage(page.id, {
                    elements: shiftThemeElement(page.elements, element.id, -1),
                  })
                }
              >
                ↑ Subir
              </Button>
              <Button
                variant="secondary"
                disabled={
                  siblingIndex < 0 || siblingIndex >= siblings.length - 1
                }
                onClick={() =>
                  updatePage(page.id, {
                    elements: shiftThemeElement(page.elements, element.id, 1),
                  })
                }
              >
                ↓ Descer
              </Button>
            </div>
          )}
          {element && element.type !== "container" && page && (
            <div className="theme-builder__fields theme-builder__parent">
              <Field label="Dentro de">
                <Select
                  value={parentContainer?.id || ""}
                  onChange={(event) => moveLeaf(event.target.value)}
                >
                  <option value="">Página</option>
                  {page.elements
                    .filter((item) => item.type === "container")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
          )}
          {element?.type === "container" && page ? (
            <div className="theme-builder__fields">
              <Field label="Nome">
                <Input
                  value={element.name}
                  maxLength={100}
                  onChange={(event) =>
                    updateContainer({ name: event.target.value })
                  }
                />
              </Field>
              <Field label="Elemento HTML">
                <Select
                  value={element.tag}
                  onChange={(event) =>
                    updateContainer({
                      tag: event.target.value as ContainerElement["tag"],
                    })
                  }
                >
                  <option value="section">Section</option>
                  <option value="header">Header</option>
                  <option value="footer">Footer</option>
                </Select>
              </Field>
              <Field label="Direção">
                <Select
                  value={element.direction}
                  onChange={(event) =>
                    updateContainer({
                      direction: event.target
                        .value as ContainerElement["direction"],
                    })
                  }
                >
                  <option value="column">Vertical</option>
                  <option value="row">Horizontal</option>
                </Select>
              </Field>
              <Field
                label="Direção no celular"
                hint="Aplicada em telas de até 600 px."
              >
                <Select
                  value={element.mobileDirection}
                  onChange={(event) =>
                    updateContainer({
                      mobileDirection: event.target
                        .value as ContainerElement["mobileDirection"],
                    })
                  }
                >
                  <option value="inherit">Igual ao desktop</option>
                  <option value="column">Vertical</option>
                  <option value="row">Horizontal</option>
                </Select>
              </Field>
              <Field label="Espaçamento (px)">
                <Input
                  type="number"
                  min={0}
                  max={128}
                  value={element.gap}
                  onChange={(event) =>
                    updateContainer({ gap: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Margem interna (px)">
                <Input
                  type="number"
                  min={0}
                  max={128}
                  value={element.padding}
                  onChange={(event) =>
                    updateContainer({ padding: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Cor de fundo">
                <Input
                  type="color"
                  value={element.background}
                  onChange={(event) =>
                    updateContainer({ background: event.target.value })
                  }
                />
              </Field>
              <Button variant="secondary" onClick={removeElement}>
                Remover container
              </Button>
            </div>
          ) : element?.type === "text" && page ? (
            <div className="theme-builder__fields">
              <Field label="Nome">
                <Input
                  value={element.name}
                  maxLength={100}
                  onChange={(event) =>
                    updateElement({ name: event.target.value })
                  }
                />
              </Field>
              <Field label="Conteúdo">
                <Select
                  value={element.binding}
                  onChange={(event) =>
                    updateElement({
                      binding: event.target.value as TextElement["binding"],
                    })
                  }
                >
                  <option value="static">Texto fixo</option>
                  <option value="product.title">Nome do produto</option>
                  <option value="product.description">
                    Descrição do produto
                  </option>
                  <option value="product.price">Preço do produto</option>
                </Select>
              </Field>
              {element.binding === "static" && (
                <Field label="Texto">
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={element.text}
                    onChange={(event) =>
                      updateElement({ text: event.target.value })
                    }
                  />
                </Field>
              )}
              <Field label="Elemento HTML">
                <Select
                  value={element.tag}
                  onChange={(event) =>
                    updateElement({
                      tag: event.target.value as TextElement["tag"],
                    })
                  }
                >
                  <option value="h1">Título principal (h1)</option>
                  <option value="h2">Subtítulo (h2)</option>
                  <option value="p">Parágrafo (p)</option>
                </Select>
              </Field>
              <Field label="Tamanho (px)">
                <Input
                  type="number"
                  min={10}
                  max={120}
                  value={element.fontSize}
                  onChange={(event) =>
                    updateElement({ fontSize: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Cor">
                <Input
                  type="color"
                  value={element.color}
                  onChange={(event) =>
                    updateElement({ color: event.target.value })
                  }
                />
              </Field>
              <Button variant="secondary" onClick={removeElement}>
                Remover elemento
              </Button>
            </div>
          ) : element?.type === "image" && page ? (
            <div className="theme-builder__fields">
              <Field label="Nome">
                <Input
                  value={element.name}
                  maxLength={100}
                  onChange={(event) =>
                    replaceLeaf({ ...element, name: event.target.value })
                  }
                />
              </Field>
              <Field
                label="Endereço da imagem"
                hint="Caminho local ou URL HTTPS."
              >
                <Input
                  value={element.src}
                  maxLength={2048}
                  onChange={(event) =>
                    replaceLeaf({ ...element, src: event.target.value })
                  }
                />
              </Field>
              <MediaUpload
                siteId={siteId}
                accept="image/png,image/jpeg,image/webp"
                onBusyChange={(busy) =>
                  setUploadsPending((count) =>
                    Math.max(0, count + (busy ? 1 : -1)),
                  )
                }
                onUploaded={(url) => setImageSource(page.id, element.id, url)}
              />
              <Field
                label="Texto alternativo"
                hint="Descreva a imagem para leitores de tela."
              >
                <Input
                  value={element.alt}
                  maxLength={200}
                  onChange={(event) =>
                    replaceLeaf({ ...element, alt: event.target.value })
                  }
                />
              </Field>
              <Field label="Largura máxima (px)">
                <Input
                  type="number"
                  min={40}
                  max={2400}
                  value={element.width}
                  onChange={(event) =>
                    replaceLeaf({
                      ...element,
                      width: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Button variant="secondary" onClick={removeElement}>
                Remover imagem
              </Button>
            </div>
          ) : element?.type === "link" && page ? (
            <div className="theme-builder__fields">
              <Field label="Nome">
                <Input
                  value={element.name}
                  maxLength={100}
                  onChange={(event) =>
                    replaceLeaf({ ...element, name: event.target.value })
                  }
                />
              </Field>
              <Field label="Texto do botão">
                <Input
                  value={element.text}
                  maxLength={100}
                  onChange={(event) =>
                    replaceLeaf({ ...element, text: event.target.value })
                  }
                />
              </Field>
              <Field label="Destino">
                <Select
                  value={element.target}
                  onChange={(event) =>
                    replaceLeaf({
                      ...element,
                      target: event.target.value as LinkElement["target"],
                    })
                  }
                >
                  <option value="product.url">Página do produto atual</option>
                  <option value="custom">Endereço personalizado</option>
                </Select>
              </Field>
              {element.target === "custom" && (
                <Field label="Endereço" hint="Caminho local ou URL HTTPS.">
                  <Input
                    value={element.href}
                    maxLength={2048}
                    onChange={(event) =>
                      replaceLeaf({ ...element, href: event.target.value })
                    }
                  />
                </Field>
              )}
              <Field label="Cor do texto">
                <Input
                  type="color"
                  value={element.color}
                  onChange={(event) =>
                    replaceLeaf({ ...element, color: event.target.value })
                  }
                />
              </Field>
              <Field label="Cor do botão">
                <Input
                  type="color"
                  value={element.background}
                  onChange={(event) =>
                    replaceLeaf({ ...element, background: event.target.value })
                  }
                />
              </Field>
              <Button variant="secondary" onClick={removeElement}>
                Remover botão
              </Button>
            </div>
          ) : element?.type === "product-list" && page ? (
            <div className="theme-builder__fields">
              <Field label="Nome">
                <Input
                  value={element.name}
                  maxLength={100}
                  onChange={(event) =>
                    replaceLeaf({ ...element, name: event.target.value })
                  }
                />
              </Field>
              <label className="theme-builder__check">
                <input
                  type="checkbox"
                  checked={element.showPrice}
                  onChange={(event) =>
                    replaceLeaf({ ...element, showPrice: event.target.checked })
                  }
                />{" "}
                Mostrar preços
              </label>
              <p>
                Exibe os produtos deste projeto com links para suas páginas.
              </p>
              <Button variant="secondary" onClick={removeElement}>
                Remover lista
              </Button>
            </div>
          ) : page ? (
            <div className="theme-builder__fields">
              <Field label="Nome">
                <Input
                  value={page.name}
                  maxLength={100}
                  onChange={(event) =>
                    updatePage(page.id, { name: event.target.value })
                  }
                />
              </Field>
              <div className="field-row">
                <Field label="Largura">
                  <Input
                    type="number"
                    min={320}
                    max={4000}
                    value={page.width}
                    onChange={(event) =>
                      updatePage(page.id, { width: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="Altura">
                  <Input
                    type="number"
                    min={320}
                    max={8000}
                    value={page.height}
                    onChange={(event) =>
                      updatePage(page.id, {
                        height: Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </div>
              <div className="field-row">
                <Field label="X">
                  <Input
                    type="number"
                    value={page.x}
                    onChange={(event) =>
                      updatePage(page.id, { x: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="Y">
                  <Input
                    type="number"
                    value={page.y}
                    onChange={(event) =>
                      updatePage(page.id, { y: Number(event.target.value) })
                    }
                  />
                </Field>
              </div>
              <Field label="Cor de fundo">
                <Input
                  type="color"
                  value={page.background}
                  onChange={(event) =>
                    updatePage(page.id, { background: event.target.value })
                  }
                />
              </Field>
              <Field
                label="Template da página"
                hint="Liquid: use product, products e shop. A prévia usa os dados do projeto atual."
              >
                <textarea
                  rows={12}
                  maxLength={20000}
                  spellCheck={false}
                  value={page.template}
                  onChange={(event) =>
                    updatePage(page.id, { template: event.target.value })
                  }
                />
              </Field>
              {theme.pages.length > 1 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTheme((current) => ({
                      ...current,
                      pages: current.pages.filter(
                        (item) => item.id !== page.id,
                      ),
                    }));
                    setSelected(null);
                  }}
                >
                  Remover página
                </Button>
              )}
            </div>
          ) : (
            <p>Selecione uma página para editar suas propriedades.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
