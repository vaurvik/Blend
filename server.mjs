import { createServer as httpServer } from "node:http";
import { createServer as httpsServer } from "node:https";
import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import next from "next";

const dev = process.argv.includes("--dev");
if (!dev) process.env.NODE_ENV = "production";
const app = next({ dev });
await app.prepare();
const { startSheetsWorker } =
  await import("./src/integrations/google-sheets/outbox.mjs");
startSheetsWorker();
const handler = app.getRequestHandler();
const port = Number(process.env.PORT || 3000),
  host = process.env.SHOP_HOST || "0.0.0.0";
const keyPath = process.env.TLS_KEY_PATH,
  certPath = process.env.TLS_CERT_PATH;
if (Boolean(keyPath) !== Boolean(certPath))
  throw new Error("Configure TLS_KEY_PATH e TLS_CERT_PATH juntos.");
const listener = (req, res) => {
  const remote = (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
  delete req.headers["x-products-shop-ip"];
  if (isIP(remote)) req.headers["x-products-shop-ip"] = remote;
  handler(req, res).catch((error) => {
    console.error("Erro ao processar requisição", error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
};
const server =
  keyPath && certPath
    ? httpsServer(
        { key: readFileSync(keyPath), cert: readFileSync(certPath) },
        listener,
      )
    : httpServer(listener);
server.headersTimeout = 15000;
server.requestTimeout = 120000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 100;
server.maxRequestsPerSocket = 1000;
server.on("upgrade", (req, socket, head) =>
  app.getUpgradeHandler()(req, socket, head),
);
server.listen(port, host, () =>
  console.log(`Products Shop: ${keyPath ? "https" : "http"}://${host}:${port}`),
);
