import "server-only";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { projectDirectory } from "@/src/projects/storage";
import { newPage, themeDocumentSchema, type ThemeDocument } from "./model";
import { compilePageTemplate } from "./compile-page";

function themeDirectory(projectId: string, themeId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      themeId,
    )
  )
    throw new Error("Tema inválido");
  return join(projectDirectory(projectId), "themes", themeId);
}
export function getTheme(
  projectId: string,
  themeId: string,
): ThemeDocument | null {
  const path = join(themeDirectory(projectId, themeId), "theme.json");
  if (!existsSync(path)) return null;
  const parsed = themeDocumentSchema.parse(
    JSON.parse(readFileSync(path, "utf8")),
  );
  if (parsed.id !== themeId) throw new Error("Tema inválido");
  return parsed;
}
export function listThemes(projectId: string): ThemeDocument[] {
  const root = join(projectDirectory(projectId), "themes");
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          entry.name,
        ),
    )
    .map((entry) => getTheme(projectId, entry.name))
    .filter((theme): theme is ThemeDocument => theme !== null);
}
export function getPublishedTheme(projectId: string): ThemeDocument | null {
  const path = join(projectDirectory(projectId), "themes", "published.json");
  if (!existsSync(path)) return null;
  return themeDocumentSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
export function publishTheme(projectId: string, theme: ThemeDocument): void {
  const validated = themeDocumentSchema.parse(theme);
  const root = join(projectDirectory(projectId), "themes");
  mkdirSync(root, { recursive: true });
  const temp = join(root, `.published-${randomUUID()}.tmp`);
  writeFileSync(temp, JSON.stringify(validated, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  renameSync(temp, join(root, "published.json"));
}
export function createTheme(projectId: string, name: string): ThemeDocument {
  const theme: ThemeDocument = {
    version: 1,
    id: randomUUID(),
    name,
    pages: [newPage(randomUUID(), 1)],
  };
  const dir = themeDirectory(projectId, theme.id);
  for (const path of ["assets", "pages", "styles"])
    mkdirSync(join(dir, path), { recursive: true });
  writeFileSync(join(dir, "styles", "global.css"), "/* Estilos do tema */\n", {
    flag: "wx",
  });
  saveTheme(projectId, theme);
  return theme;
}
export function saveTheme(projectId: string, input: unknown): ThemeDocument {
  const theme = themeDocumentSchema.parse(input);
  const dir = themeDirectory(projectId, theme.id);
  if (!existsSync(dir)) throw new Error("Tema não encontrado");
  const pagesDirectory = join(dir, "pages");
  mkdirSync(pagesDirectory, { recursive: true });
  for (const page of theme.pages) {
    const temporaryPage = join(pagesDirectory, `.${randomUUID()}.tmp`);
    writeFileSync(temporaryPage, compilePageTemplate(page), {
      flag: "wx",
      mode: 0o600,
    });
    renameSync(temporaryPage, join(pagesDirectory, `${page.id}.liquid`));
  }
  const temp = join(dir, `.${randomUUID()}.tmp`);
  writeFileSync(temp, JSON.stringify(theme, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  renameSync(temp, join(dir, "theme.json"));
  const keep = new Set(theme.pages.map((page) => `${page.id}.liquid`));
  for (const file of readdirSync(pagesDirectory)) {
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.liquid$/i.test(
        file,
      ) &&
      !keep.has(file)
    )
      unlinkSync(join(pagesDirectory, file));
  }
  return theme;
}
