import { test } from "node:test";
import assert from "node:assert/strict";
import { renderThemeTemplate } from "../src/themes/template-engine.ts";
import { compilePageTemplate } from "../src/themes/compile-page.ts";
import { themeDocumentSchema, newPage } from "../src/themes/model.ts";
import { randomUUID } from "node:crypto";
import {
  moveThemeElement,
  shiftThemeElement,
} from "../src/themes/element-tree.ts";

test("templates exibem dados públicos, variantes e valores sem interpretar HTML dos produtos", () => {
  const product = {
    id: "a",
    title: "<script>alert(1)</script>",
    url: "/a",
    available: true,
    variants: [
      {
        id: "v1",
        title: "Unidade",
        price: 5990,
        compare_at_price: 7000,
        available: true,
      },
      {
        id: "v2",
        title: "Kit",
        price: 9990,
        compare_at_price: 11000,
        available: true,
      },
    ],
  };
  const context = {
    shop: { name: "Loja" },
    product,
    products: [product, { ...product, id: "b", title: "Outro" }],
  };
  const html = renderThemeTemplate(
    "<h1>{{ product.title }}</h1>{% if product.available %}sim{% endif %}{% for variant in product.variants %}{{ variant.title }}: {{ variant.price | money }};{% endfor %}{% for product in products %}{{ product.id }}{% endfor %}",
    context,
  );
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Unidade: R\$/);
  assert.match(html, /Kit: R\$/);
  assert.match(html, /ab$/);
  assert.throws(() => renderThemeTemplate('{% include "secret" %}', context));
  assert.throws(() => renderThemeTemplate("x".repeat(50001), context));
});

test("containers mantêm hierarquia e rejeitam IDs repetidos", () => {
  const page = newPage(randomUUID(), 1);
  const text = {
    id: randomUUID(),
    type: "text",
    name: "Título",
    tag: "h1",
    binding: "product.title",
    text: "",
    color: "#000000",
    fontSize: 32,
  };
  page.elements = [
    {
      id: randomUUID(),
      type: "container",
      name: "Cabeçalho",
      tag: "header",
      direction: "row",
      mobileDirection: "column",
      gap: 16,
      padding: 24,
      background: "#ffffff",
      children: [text],
    },
  ];
  const theme = { version: 1, id: randomUUID(), name: "Tema", pages: [page] };
  assert.equal(themeDocumentSchema.safeParse(theme).success, true);
  const html = compilePageTemplate(page);
  assert.match(
    html,
    /<header[^>]*>[\s\S]*<h1[^>]*>{{ product.title }}<\/h1>[\s\S]*<\/header>/,
  );
  assert.match(html, /flex-direction:row/);
  assert.match(html, /@media \(max-width: 600px\)/);
  assert.match(html, /flex-direction:column!important/);
  page.elements[0].children.push({ ...text });
  assert.equal(themeDocumentSchema.safeParse(theme).success, false);
});

test("camadas podem ser reordenadas e movidas entre página e container", () => {
  const a = { id: "a", type: "text" },
    b = { id: "b", type: "text" },
    container = { id: "c", type: "container", children: [] };
  let items = moveThemeElement([a, b, container], "b", "a");
  assert.deepEqual(
    items.map((item) => item.id),
    ["b", "a", "c"],
  );
  items = moveThemeElement(items, "a", "c");
  assert.deepEqual(
    items.map((item) => item.id),
    ["b", "c"],
  );
  assert.deepEqual(
    items[1].children.map((item) => item.id),
    ["a"],
  );
  const blocked = moveThemeElement(items, "c", "a");
  assert.deepEqual(blocked, items);
  items = moveThemeElement(items, "a", null);
  assert.deepEqual(
    items.map((item) => item.id),
    ["b", "c", "a"],
  );
  assert.equal(items[1].children.length, 0);
  assert.deepEqual(
    shiftThemeElement(items, "a", -1).map((item) => item.id),
    ["b", "a", "c"],
  );
});

test("imagem, botão e lista geram HTML seguro e usam o catálogo do projeto", () => {
  const page = newPage(randomUUID(), 1);
  const image = {
    id: randomUUID(),
    type: "image",
    name: "Foto",
    src: "/media/foto.png",
    alt: 'Imagem <teste> "',
    width: 480,
  };
  const link = {
    id: randomUUID(),
    type: "link",
    name: "Botão",
    text: "Ver produto",
    href: "",
    target: "product.url",
    color: "#ffffff",
    background: "#000000",
  };
  const list = {
    id: randomUUID(),
    type: "product-list",
    name: "Produtos",
    showPrice: true,
  };
  page.elements = [
    {
      id: randomUUID(),
      type: "container",
      name: "Seção",
      tag: "section",
      direction: "column",
      mobileDirection: "column",
      gap: 16,
      padding: 24,
      background: "#ffffff",
      children: [image, link, list],
    },
  ];
  const theme = { version: 1, id: randomUUID(), name: "Tema", pages: [page] };
  assert.equal(themeDocumentSchema.safeParse(theme).success, true);
  const context = {
    shop: { name: "Loja" },
    product: {
      id: "a",
      title: "Primeiro",
      price: 1200,
      url: "/produtos/a",
      variants: [],
      available: true,
    },
    products: [
      { id: "a", title: "Primeiro", price: 1200, url: "/produtos/a" },
      { id: "b", title: "Outro", price: 2300, url: "/produtos/b" },
    ],
  };
  const html = renderThemeTemplate(compilePageTemplate(page), context);
  assert.match(html, /src="\/media\/foto.png"/);
  assert.match(html, /alt="Imagem &lt;teste&gt; &quot;"/);
  assert.match(html, /href="\/produtos\/a"/);
  assert.match(html, /Outro/);
  assert.match(html, /23,00/);
  link.href = "javascript:alert(1)";
  assert.equal(themeDocumentSchema.safeParse(theme).success, false);
  const moved = moveThemeElement(page.elements, image.id, null);
  assert.equal(moved[1].type, "image");
});

test("elementos visuais usam os dados do produto e preservam texto fixo como texto", () => {
  const base = {
    id: "e",
    type: "text",
    name: "Título",
    tag: "h1",
    binding: "product.title",
    text: "",
    color: "#000000",
    fontSize: 40,
  };
  const page = {
    template: "",
    elements: [
      base,
      { ...base, id: "p", tag: "p", binding: "product.price" },
      {
        ...base,
        id: "s",
        tag: "p",
        binding: "static",
        text: "<script>{{ shop.name }}</script>",
      },
    ],
  };
  const template = compilePageTemplate(page);
  const product = {
    id: "a",
    title: "Primeiro",
    price: 5990,
    available: true,
    variants: [],
  };
  const html = renderThemeTemplate(template, {
    shop: { name: "Segredo" },
    product,
    products: [product],
  });
  assert.match(html, /Primeiro/);
  assert.match(html, /59,90/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /Segredo/);
  const other = renderThemeTemplate(template, {
    shop: { name: "Loja" },
    product: { ...product, title: "Outro", price: 9990 },
    products: [],
  });
  assert.match(other, /Outro/);
  assert.match(other, /99,90/);
});
