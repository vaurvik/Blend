import { Liquid } from "liquidjs";
import type { TemplateContext } from "./template-context";

const engine = new Liquid({
  outputEscape: "escape",
  strictFilters: true,
  ownPropertyOnly: true,
  parseLimit: 100000,
  renderLimit: 100,
  memoryLimit: 1000000,
});
for (const name of ["include", "render", "layout"])
  engine.registerTag(name, {
    parse() {
      throw new Error(`A tag ${name} não está disponível.`);
    },
    render() {
      return "";
    },
  });
engine.registerFilter("money", (cents: unknown) => {
  if (typeof cents !== "number" || !Number.isSafeInteger(cents)) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
});

export function renderThemeTemplate(
  template: string,
  context: TemplateContext,
): string {
  if (template.length > 50000)
    throw new Error("O template excede o tamanho permitido.");
  return engine.parseAndRenderSync(template, context);
}
