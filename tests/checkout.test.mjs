import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
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
      const dashboard = await fetch(`${origin}/admin`, { headers: { cookie } });
      assert.match(await dashboard.text(), /Nenhum provedor instalado/);
      const project = await fetch(`${origin}/admin/projetos/example`, {
        headers: { cookie },
      });
      assert.equal(project.status, 200);
      assert.match(await project.text(), /Nenhum provedor instalado/);
      const gateways = await fetch(`${origin}/admin/gateway?project=example`, {
        headers: { cookie },
      });
      assert.match(await gateways.text(), /Nenhum provedor instalado/);
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
