import type {
  PageElement,
  TextElement,
  ThemeElement,
  LeafElement,
} from "./model";

function escapeStatic(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("{", "&#123;")
    .replaceAll("}", "&#125;");
}
function compileText(element: TextElement): string {
  const content =
    element.binding === "static"
      ? escapeStatic(element.text)
      : element.binding === "product.price"
        ? "{{ product.price | money }}"
        : `{{ ${element.binding} }}`;
  return `<${element.tag} data-blend-element="${element.id}" style="color:${element.color};font-size:${element.fontSize}px">${content}</${element.tag}>`;
}
function compileElement(element: ThemeElement): string {
  if (element.type !== "container") return compileLeaf(element);
  const children = element.children.map(compileLeaf).join("\n");
  const mobile =
    element.mobileDirection && element.mobileDirection !== "inherit"
      ? `<style>@media (max-width: 600px){[data-blend-element="${element.id}"]{flex-direction:${element.mobileDirection}!important}}</style>`
      : "";
  return `${mobile}<${element.tag} data-blend-element="${element.id}" style="display:flex;flex-direction:${element.direction};flex-wrap:wrap;gap:${element.gap}px;padding:${element.padding}px;background:${element.background};min-height:40px;box-sizing:border-box">${children}</${element.tag}>`;
}
function compileLeaf(element: LeafElement): string {
  if (element.type === "text") return compileText(element);
  if (element.type === "image") {
    if (!element.src)
      return `<div data-blend-element="${element.id}" style="width:${element.width}px;max-width:100%;padding:24px;box-sizing:border-box;background:#f3faff">Adicione uma imagem</div>`;
    return `<img data-blend-element="${element.id}" src="${escapeStatic(element.src)}" alt="${escapeStatic(element.alt)}" style="display:block;width:${element.width}px;max-width:100%;height:auto">`;
  }
  if (element.type === "link") {
    const href =
      element.target === "product.url"
        ? "{{ product.url }}"
        : escapeStatic(element.href || "#");
    return `<a data-blend-element="${element.id}" href="${href}" style="display:inline-flex;padding:12px 24px;border-radius:9999px;background:${element.background};color:${element.color};text-decoration:none">${escapeStatic(element.text)}</a>`;
  }
  const price = element.showPrice ? "<p>{{ product.price | money }}</p>" : "";
  return `<section data-blend-element="${element.id}" style="display:flex;flex-wrap:wrap;gap:16px;min-height:48px">{% for product in products %}<article style="padding:16px;border:1px solid #e4e4e7;border-radius:12px"><a href="{{ product.url }}">{{ product.title }}</a>${price}</article>{% endfor %}</section>`;
}
export function compilePageTemplate(page: PageElement): string {
  const elements = page.elements.map(compileElement);
  return [page.template, ...elements].filter(Boolean).join("\n");
}
