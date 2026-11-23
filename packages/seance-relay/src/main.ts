import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { createRelay } from "./server.js";

const PORT = Number(process.env["PORT"] ?? 4000);

const ALLOWED_ORIGINS = process.env["ALLOWED_ORIGINS"]
  ? process.env["ALLOWED_ORIGINS"].split(",").map((s) => s.trim())
  : [];

const relay = createRelay({
  port: PORT,
  allowedOrigins: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : undefined,
});

const server = createServer((req, res) => {
  const origin = req.headers.origin ?? "";
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health" || req.url === "/healthz") {
    const health = relay.healthz();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(health));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const origin = req.headers.origin;
  wss.handleUpgrade(req, socket, head, (ws) => {
    relay.handleUpgrade(ws as unknown as WebSocket, origin);
  });
});

const PING_INTERVAL_MS = 20_000;
const pingTimer = setInterval(() => {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.ping();
    }
  }
}, PING_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`Séance Relay listening on port ${PORT}`);
  if (ALLOWED_ORIGINS.length > 0) {
    console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  } else {
    console.log("No origin restriction (dev mode)");
  }
});

function shutdown(): void {
  clearInterval(pingTimer);
  relay.close();
  wss.close();
  server.close();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
