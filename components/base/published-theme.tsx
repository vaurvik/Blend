import type { ThemeDocument } from "@/src/themes/model";
import type { TemplateContext } from "@/src/themes/template-context";
import { renderThemeTemplate } from "@/src/themes/template-engine";
import { compilePageTemplate } from "@/src/themes/compile-page";

export function PublishedTheme({
  theme,
  context,
}: {
  theme: ThemeDocument;
  context: TemplateContext;
}) {
  const page = theme.pages[0];
  const html = renderThemeTemplate(compilePageTemplate(page), context);
  const source = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: http: data:; base-uri 'none'; form-action 'none'"><style>html,body{min-height:100%;margin:0;background:${page.background}}</style></head><body>${html}</body></html>`;
  return (
    <iframe
      title={context.shop.name}
      sandbox=""
      srcDoc={source}
      style={{
        display: "block",
        width: "100%",
        height: `max(100dvh, ${page.height}px)`,
        border: 0,
      }}
    />
  );
}
