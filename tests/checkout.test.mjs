import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { once } from "node:events";

test(
  "projetos e uploads funcionam com pagamentos desativados",
  { timeout: 60000 },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "products-shop-test-"));
    const projectId = randomUUID();
    const db = new DatabaseSync(join(dir, "shop.sqlite"));
    db.exec(
      "CREATE TABLE products (slug TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE gateway_selection (id INTEGER PRIMARY KEY, provider TEXT); INSERT INTO gateway_selection VALUES (1,'old-provider');",
    );
    const item = {
      slug: "example",
      mediaId: projectId,
      title: "Example",
      domain: "example-store.test",
      seoTitle: "Loja Exemplo",
      seoDescription: "Descrição exclusiva",
      favicon: "/assets/product-placeholder.svg",
      announcement: "",
      logo: "",
      color: "#e54b55",
      rating: 5,
      reviewCount: 1,
      images: ["/assets/product-placeholder.svg"],
      video: "",
      benefits: [],
      options: [
        {
          name: "Example",
          detail: "",
          badge: "",
          price: 5999,
          originalPrice: 7999,
        },
      ],
      routineTitle: "",
      routineText: "",
      buttonText: "Comprar",
    };
    db.prepare("INSERT INTO products VALUES (?,?)").run(
      item.slug,
      JSON.stringify(item),
    );
    db.prepare("INSERT INTO products VALUES (?,?)").run(
      "other",
      JSON.stringify({
        ...item,
        mediaId: randomUUID(),
        slug: "other",
        domain: "other-store.test",
        title: "Other",
        indexable: false,
      }),
    );
    db.close();
    const portServer = createServer();
    portServer.listen(0, "127.0.0.1");
    await once(portServer, "listening");
    const port = portServer.address().port;
    await new Promise((r) => portServer.close(r));
    const origin = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, ["server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SHOP_DATA_DIR: dir,
        GOOGLE_SHEETS_ENABLED: "false",
        TLS_KEY_PATH: "",
        TLS_CERT_PATH: "",
        SESSION_SECRET: "a-test-secret-with-at-least-32-characters",
        ADMIN_USERNAME: "test-admin",
        ADMIN_PASSWORD: "test-password-long",
        SHOP_URL: origin,
        PORT: String(port),
        SHOP_HOST: "127.0.0.1",
      },
      stdio: "ignore",
    });
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(origin)).ok) {
            ready = true;
            break;
          }
        } catch {}
        if (server.exitCode !== null) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.ok(ready, "Next server did not start");
      assert.ok(existsSync(join(dir, "projects", projectId, "project.json")));
      const getOnHost = (path, host) =>
        new Promise((done, reject) => {
          const req = httpRequest(
            origin + path,
            { headers: { host } },
            (res) => {
              const chunks = [];
              res.on("data", (chunk) => chunks.push(chunk));
              res.on("end", () =>
                done({
                  status: res.statusCode,
                  headers: res.headers,
                  text: Buffer.concat(chunks).toString(),
                }),
              );
            },
          );
          req.on("error", reject);
          req.end();
        });
      const page = await getOnHost("/", "example-store.test");
      assert.equal(page.status, 200);
      assert.match(page.text, /Loja Exemplo/);
      assert.match(page.text, /Descrição exclusiva/);
      assert.match(
        page.text,
        /<link rel="icon" href="\/assets\/product-placeholder\.svg"/,
      );
      assert.equal(
        (await getOnHost("/other", "example-store.test")).status,
        404,
      );
      assert.match(
        (await getOnHost("/robots.txt", "other-store.test")).text,
        /Disallow: \//,
      );
      assert.equal(
        (await getOnHost("/favicon.ico", "example-store.test")).headers
          .location,
        "/assets/product-placeholder.svg",
      );
      assert.equal(
        (await fetch(`${origin}/admin`, { redirect: "manual" })).status,
        307,
      );
      const loginPage = await (await fetch(`${origin}/admin/login`)).text();
      assert.doesNotMatch(loginPage, /Navegação administrativa/);
      assert.match(
        loginPage,
        /<link rel="icon" href="\/api\/branding\/icon\?v=blend-5" type="image\/png"/,
      );
      const iconResponse = await fetch(`${origin}/api/branding/icon?v=blend-5`);
      assert.equal(iconResponse.status, 200);
      assert.match(iconResponse.headers.get("content-type"), /image\/png/);
      const icon = Buffer.from(await iconResponse.arrayBuffer());
      assert.equal(icon.readUInt32BE(16), 64);
      assert.equal(icon.readUInt32BE(20), 64);
      const action = loginPage.match(/\$ACTION_ID_[a-f0-9]+/)?.[0];
      assert.ok(action);
      const loginData = new FormData();
      loginData.set(action, "");
      loginData.set("username", "test-admin");
      loginData.set("password", "test-password-long");
      const login = await fetch(`${origin}/admin/login`, {
        method: "POST",
        headers: { origin },
        body: loginData,
        redirect: "manual",
      });
      const cookie = login.headers.get("set-cookie")?.split(";")[0];
      assert.ok(cookie?.startsWith("shop_admin="));
      const selection = await fetch(`${origin}/admin`, { headers: { cookie } });
      const selectionHtml = await selection.text();
      assert.match(selectionHtml, /Qual projeto vamos cuidar/);
      assert.match(selectionHtml, /\/admin\/projetos\/example/);
      assert.match(selectionHtml, /\/admin\/projetos\/other/);
      const dashboard = await fetch(`${origin}/admin/dashboard`, {
        headers: { cookie },
      });
      const dashboardHtml = await dashboard.text();
      assert.match(dashboardHtml, /Nenhum provedor instalado/);
      assert.match(dashboardHtml, /Navegação administrativa/);
      const project = await fetch(`${origin}/admin/projetos/example`, {
        headers: { cookie },
      });
      assert.equal(project.status, 200);
      const projectHtml = await project.text();
      assert.match(projectHtml, /Nenhum provedor instalado/);
      assert.match(projectHtml, /sidebar-group-store/);
      assert.match(projectHtml, /\/admin\/editar\/example#site-products/);
      assert.match(projectHtml, /\/admin\/gateway\?project=example/);
      assert.doesNotMatch(projectHtml, /Todos os projetos/);
      const manifest = JSON.parse(
        readFileSync(
          join(
            process.cwd(),
            ".next",
            "server",
            "server-reference-manifest.json",
          ),
          "utf8",
        ),
      );
      const actionId = (name) =>
        Object.entries(manifest.node).find(
          ([, action]) => action.exportedName === name,
        )?.[0];
      const themeUrl = `${origin}/admin/projetos/example/temas`;
      const actionHeaders = {
        origin,
        cookie,
        "content-type": "text/plain;charset=UTF-8",
        "next-action": actionId("createProjectTheme"),
      };
      const catalogProduct = {
        id: randomUUID(),
        slug: "novo",
        title: "Produto Novo",
        description: "Outro produto",
        variants: [
          {
            id: randomUUID(),
            title: "Pequeno",
            price: 1000,
            compareAtPrice: null,
            available: true,
          },
          {
            id: randomUUID(),
            title: "Grande",
            price: 2000,
            compareAtPrice: 2500,
            available: false,
          },
        ],
      };
      const catalogHeaders = {
        ...actionHeaders,
        "next-action": actionId("saveProjectCatalogProduct"),
      };
      const catalogUrl = `${origin}/admin/projetos/example/produtos/novo`;
      const savedCatalog = await fetch(catalogUrl, {
        method: "POST",
        headers: catalogHeaders,
        body: JSON.stringify(["example", catalogProduct]),
      });
      assert.equal(savedCatalog.status, 200);
      assert.match(await savedCatalog.text(), /^1:\{\}$/m);
      const catalogHtml = await (
        await fetch(`${origin}/admin/projetos/example/produtos`, {
          headers: { cookie },
        })
      ).text();
      assert.match(catalogHtml, /Produto Novo/);
      assert.match(catalogHtml, /Example/);
      const catalogPublic = await getOnHost(
        "/lojas/example/produtos/novo",
        "example-store.test",
      );
      assert.equal(catalogPublic.status, 200);
      assert.match(catalogPublic.text, /Produto Novo/);
      assert.match(catalogPublic.text, /Indisponível/);
      assert.equal(
        (await getOnHost("/lojas/example/produtos/novo", "other-store.test"))
          .status,
        404,
      );
      const otherCatalog = await (
        await fetch(`${origin}/admin/projetos/other/produtos`, {
          headers: { cookie },
        })
      ).text();
      assert.doesNotMatch(otherCatalog, /Produto Novo/);
      const invalidProduct = {
        ...catalogProduct,
        id: randomUUID(),
        slug: "invalido",
        variants: [{ ...catalogProduct.variants[0], price: -1 }],
      };
      const invalidCatalog = await fetch(catalogUrl, {
        method: "POST",
        headers: catalogHeaders,
        body: JSON.stringify(["example", invalidProduct]),
      });
      assert.match(await invalidCatalog.text(), /^1:\{"error":/m);
      const catalogDb = new DatabaseSync(join(dir, "shop.sqlite"));
      const primary = JSON.parse(
        catalogDb
          .prepare(
            "SELECT data FROM project_catalog_products WHERE project_id=? AND id=?",
          )
          .get(projectId, projectId).data,
      );
      catalogDb.close();
      primary.title = "Example atualizado";
      primary.variants[0].price = 3990;
      const primarySave = await fetch(catalogUrl, {
        method: "POST",
        headers: catalogHeaders,
        body: JSON.stringify(["example", primary, projectId]),
      });
      assert.match(await primarySave.text(), /^1:\{\}$/m);
      const legacyStore = await getOnHost("/", "example-store.test");
      assert.match(legacyStore.text, /Example atualizado/);
      assert.match(legacyStore.text, /39,90/);
      const staleProject = {
        ...item,
        title: "Nome antigo",
        options: [{ ...item.options[0], price: 100 }],
      };
      const staleSave = await fetch(`${origin}/admin/editar/example`, {
        method: "POST",
        headers: { ...actionHeaders, "next-action": actionId("saveProduct") },
        body: JSON.stringify([staleProject, "example"]),
      });
      assert.match(await staleSave.text(), /^1:\{\}$/m);
      const afterStaleSave = await getOnHost("/", "example-store.test");
      assert.match(afterStaleSave.text, /Example atualizado/);
      assert.match(afterStaleSave.text, /39,90/);
      const createTheme = await fetch(themeUrl, {
        method: "POST",
        headers: actionHeaders,
        body: JSON.stringify(["example"]),
      });
      assert.equal(createTheme.status, 200);
      const created = (await createTheme.text()).match(
        /"id":"([0-9a-f-]{36})"/,
      );
      assert.ok(created, "A criação deve retornar o identificador do tema");
      const themeId = created[1];
      const builderHtml = await (
        await fetch(`${themeUrl}/${themeId}`, { headers: { cookie } })
      ).text();
      assert.match(builderHtml, /Produto Novo/);
      assert.match(builderHtml, /Grande/);
      const themeFile = join(
        dir,
        "projects",
        projectId,
        "themes",
        themeId,
        "theme.json",
      );
      const theme = JSON.parse(readFileSync(themeFile, "utf8"));
      assert.equal(theme.pages[0].type, "page");
      theme.pages[0].name = "Página inicial";
      theme.pages[0].template = "<h1>{{ product.title }}</h1>";
      theme.pages[0].elements = [
        {
          id: randomUUID(),
          type: "text",
          name: "Preço",
          tag: "p",
          binding: "product.price",
          text: "",
          color: "#000000",
          fontSize: 20,
        },
        {
          id: randomUUID(),
          type: "container",
          name: "Header",
          tag: "header",
          direction: "column",
          gap: 16,
          padding: 24,
          background: "#ffffff",
          children: [
            {
              id: randomUUID(),
              type: "text",
              name: "Saudação",
              tag: "p",
              binding: "static",
              text: "Boas vindas",
              color: "#000000",
              fontSize: 20,
            },
          ],
        },
      ];
      const saveTheme = await fetch(`${themeUrl}/${themeId}`, {
        method: "POST",
        headers: {
          ...actionHeaders,
          "next-action": actionId("saveProjectTheme"),
        },
        body: JSON.stringify(["example", theme]),
      });
      assert.equal(saveTheme.status, 200);
      assert.equal(
        JSON.parse(readFileSync(themeFile, "utf8")).pages[0].name,
        "Página inicial",
      );
      const templatePath = join(
        dir,
        "projects",
        projectId,
        "themes",
        themeId,
        "pages",
        `${theme.pages[0].id}.liquid`,
      );
      assert.match(readFileSync(templatePath, "utf8"), /{{ product.title }}/);
      assert.match(
        readFileSync(templatePath, "utf8"),
        /{{ product.price \| money }}/,
      );
      const publish = await fetch(themeUrl, {
        method: "POST",
        headers: {
          ...actionHeaders,
          "next-action": actionId("publishProjectTheme"),
        },
        body: JSON.stringify(["example", themeId]),
      });
      assert.equal(publish.status, 200);
      assert.match(await publish.text(), /^1:\{\}$/m);
      const publishedProduct = await getOnHost(
        "/lojas/example/produtos/novo",
        "example-store.test",
      );
      assert.equal(publishedProduct.status, 200);
      assert.match(publishedProduct.text, /Produto Novo/);
      assert.match(publishedProduct.text, /Boas vindas/);
      assert.match(publishedProduct.text, /sandbox=""/);
      theme.pages[0].template =
        "<h1>Rascunho atualizado: {{ product.title }}</h1>";
      const saveDraft = await fetch(`${themeUrl}/${themeId}`, {
        method: "POST",
        headers: {
          ...actionHeaders,
          "next-action": actionId("saveProjectTheme"),
        },
        body: JSON.stringify(["example", theme]),
      });
      assert.equal(saveDraft.status, 200);
      const unchangedPublication = await getOnHost(
        "/lojas/example/produtos/novo",
        "example-store.test",
      );
      assert.doesNotMatch(unchangedPublication.text, /Rascunho atualizado/);
      const wrongProject = await fetch(
        `${origin}/admin/projetos/other/temas/${themeId}`,
        { headers: { cookie }, redirect: "manual" },
      );
      assert.equal(wrongProject.status, 404);
      const gateways = await fetch(`${origin}/admin/gateway?project=example`, {
        headers: { cookie },
      });
      const gatewayHtml = await gateways.text();
      assert.match(gatewayHtml, /Nenhum provedor instalado/);
      assert.match(gatewayHtml, /Projetos e conta: Example atualizado/);
      assert.match(gatewayHtml, /\/admin\/editar\/example#site-products/);
      const form = new FormData();
      form.set("site", projectId);
      form.set(
        "file",
        new File(
          [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
          "image.png",
          { type: "image/png" },
        ),
      );
      assert.equal(
        (
          await fetch(`${origin}/api/admin/media`, {
            method: "POST",
            headers: { origin },
            body: form,
          })
        ).status,
        401,
      );
      const upload = await fetch(`${origin}/api/admin/media`, {
        method: "POST",
        headers: { origin, cookie },
        body: form,
      });
      assert.equal(upload.status, 200);
      const url = (await upload.json()).url;
      assert.ok(url.startsWith(`/media/${projectId}/`));
      assert.equal((await fetch(origin + url)).status, 200);
      assert.ok(
        existsSync(
          join(
            dir,
            "projects",
            projectId,
            "public",
            "assets",
            url.split("/").pop(),
          ),
        ),
      );
      const checkoutPage = await fetch(`${origin}/checkout/example`);
      assert.match(await checkoutPage.text(), /Pagamento indisponível/);
      const post = (siteOrigin) =>
        fetch(`${origin}/api/checkout`, {
          method: "POST",
          headers: { origin: siteOrigin, "content-type": "application/json" },
          body: JSON.stringify({ slug: "example" }),
        });
      assert.equal((await post("https://evil.example")).status, 403);
      const unavailable = await post(origin);
      assert.equal(unavailable.status, 503);
      assert.match((await unavailable.json()).error, /Nenhum provedor/);
      const checkDb = new DatabaseSync(join(dir, "shop.sqlite"));
      assert.equal(
        checkDb.prepare("SELECT COUNT(*) AS count FROM orders").get().count,
        0,
      );
      checkDb.close();
    } finally {
      if (server.exitCode === null) {
        server.kill();
        await once(server, "exit").catch(() => {});
      }
      const safe = resolve(dir),
        base = resolve(tmpdir());
      if (!safe.startsWith(base + sep))
        throw new Error("Diretório temporário inválido");
      rmSync(safe, { recursive: true, force: true });
    }
  },
);
