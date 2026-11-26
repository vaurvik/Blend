import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "../src/security/vault-crypto.mjs";

test("segredos usam criptografia autenticada e contexto por projeto", () => {
  const key = randomBytes(32),
    context = JSON.stringify(["project", "plugin", "apiKey"]);
  const first = encryptSecret(key, "secret-test-value", context),
    second = encryptSecret(key, "secret-test-value", context);
  assert.notEqual(first.nonce, second.nonce);
  assert.ok(!JSON.stringify(first).includes("secret-test-value"));
  assert.equal(decryptSecret(key, first, context), "secret-test-value");
  assert.throws(() => decryptSecret(key, first, "outro-projeto"));
  assert.throws(() => decryptSecret(randomBytes(32), first, context));
  const tag = Buffer.from(first.tag, "base64");
  tag[0] ^= 1;
  assert.throws(() =>
    decryptSecret(key, { ...first, tag: tag.toString("base64") }, context),
  );
});

test(
  "primeiros passos criam um único administrador local com senha protegida",
  { timeout: 60000 },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "shop-setup-test-"));
    const socket = createServer();
    socket.listen(0, "127.0.0.1");
    await once(socket, "listening");
    const port = socket.address().port;
    await new Promise((r) => socket.close(r));
    const origin = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, ["server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SHOP_DATA_DIR: dir,
        SHOP_KEYS_DIR: join(dir, "keys"),
        ADMIN_USERNAME: "",
        ADMIN_PASSWORD: "",
        SESSION_SECRET: "",
        SHOP_URL: "",
        PORT: String(port),
        SHOP_HOST: "127.0.0.1",
        TLS_KEY_PATH: "",
        TLS_CERT_PATH: "",
        GOOGLE_SHEETS_ENABLED: "false",
      },
      stdio: "ignore",
    });
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          const r = await fetch(origin, { redirect: "manual" });
          if (r.status === 307) {
            ready = true;
            break;
          }
        } catch {}
        if (server.exitCode !== null) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.ok(ready);
      const setup = await fetch(`${origin}/admin/setup`);
      const html = await setup.text();
      assert.equal(setup.status, 200);
      assert.match(html, /Vamos começar/);
      const action = html.match(/\$ACTION_ID_[a-f0-9]+/)?.[0];
      assert.ok(action);
      const foreignHost = await new Promise((done, reject) => {
        const req = httpRequest(
          origin + "/admin/setup",
          { headers: { host: "evil.example" } },
          (res) => {
            res.resume();
            res.on("end", () => done(res.statusCode));
          },
        );
        req.on("error", reject);
        req.end();
      });
      assert.equal(foreignHost, 404);
      const send = (username, password, confirmation, siteOrigin = origin) => {
        const form = new FormData();
        form.set(action, "");
        form.set("username", username);
        form.set("password", password);
        form.set("confirmation", confirmation);
        return fetch(`${origin}/admin/setup`, {
          method: "POST",
          headers: { origin: siteOrigin },
          body: form,
          redirect: "manual",
        });
      };
      const invalid = await send("dono", "curta", "diferente");
      assert.equal(invalid.status, 303);
      assert.match(invalid.headers.get("location"), /error=invalid/);
      const forged = await send(
        "dono",
        "senha-muito-segura",
        "senha-muito-segura",
        "https://evil.example",
      );
      assert.ok(forged.status >= 400);
      const db = new DatabaseSync(join(dir, "shop.sqlite"));
      assert.equal(
        db.prepare("SELECT COUNT(*) AS n FROM admin_account").get().n,
        0,
      );
      db.close();
      const [a, b] = await Promise.all([
        send("dono", "senha-muito-segura", "senha-muito-segura"),
        send("outro", "outra-senha-segura", "outra-senha-segura"),
      ]);
      assert.deepEqual([a.status, b.status], [303, 303]);
      const success = [a, b].find(
        (r) => r.headers.get("location") === "/admin",
      );
      assert.ok(success);
      const cookie = success.headers.get("set-cookie")?.split(";")[0];
      assert.ok(cookie?.startsWith("shop_admin="));
      assert.equal(
        (await fetch(`${origin}/admin/dashboard`, { headers: { cookie } }))
          .status,
        200,
      );
      const firstProject = await fetch(`${origin}/admin/primeiro-projeto`, {
        headers: { cookie },
      });
      assert.match(await firstProject.text(), /Dê um nome à sua ideia/);
      const dashboardRedirect = await fetch(`${origin}/admin/dashboard`, {
        headers: { cookie },
        redirect: "manual",
      });
      assert.equal(
        dashboardRedirect.headers.get("location"),
        "/admin/primeiro-projeto",
      );
      const uploadForm = new FormData();
      uploadForm.set(
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
            headers: { cookie, origin },
            body: uploadForm,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await fetch(`${origin}/admin/setup`, { redirect: "manual" })
        ).headers.get("location"),
        "/admin/login",
      );
      const check = new DatabaseSync(join(dir, "shop.sqlite"));
      const accounts = check
        .prepare(
          "SELECT username,password_hash,password_salt FROM admin_account",
        )
        .all();
      assert.equal(accounts.length, 1);
      assert.ok(!accounts[0].password_hash.includes("senha"));
      assert.equal(accounts[0].password_salt.length, 32);
      check.close();
      const sessionKey = readFileSync(join(dir, "keys", "session.key")),
        vaultKey = readFileSync(join(dir, "keys", "vault.key"));
      assert.equal(sessionKey.length, 32);
      assert.equal(vaultKey.length, 32);
      assert.notDeepEqual(sessionKey, vaultKey);
      const loginPage = await (await fetch(`${origin}/admin/login`)).text();
      const loginAction = loginPage.match(/\$ACTION_ID_[a-f0-9]+/)?.[0];
      assert.ok(loginAction);
      const loginForm = new FormData();
      loginForm.set(loginAction, "");
      loginForm.set("username", accounts[0].username);
      loginForm.set(
        "password",
        accounts[0].username === "dono"
          ? "senha-muito-segura"
          : "outra-senha-segura",
      );
      const login = await fetch(`${origin}/admin/login`, {
        method: "POST",
        headers: { origin },
        body: loginForm,
        redirect: "manual",
      });
      assert.equal(login.headers.get("location"), "/admin");
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

test("cofre persiste segredos cifrados e não recria chave perdida", () => {
  const dir = mkdtempSync(join(tmpdir(), "shop-vault-test-"));
  try {
    const child = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--conditions=react-server",
        "tests/helpers/vault-worker.mjs",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SHOP_DATA_DIR: dir,
          SHOP_KEYS_DIR: join(dir, "keys"),
        },
        encoding: "utf8",
      },
    );
    assert.equal(child.status, 0, child.stderr);
  } finally {
    const safe = resolve(dir),
      base = resolve(tmpdir());
    if (!safe.startsWith(base + sep))
      throw new Error("Diretório temporário inválido");
    rmSync(safe, { recursive: true, force: true });
  }
});
