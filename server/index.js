import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { timingSafeEqual, randomBytes } from "node:crypto";
import fs from "node:fs";
import { Game } from "./game.js";
const port = Number(process.env.PORT || 3000),
  hostKey = process.env.HOST_KEY || randomBytes(18).toString("hex");
if (!process.env.HOST_KEY) console.log("Temporary host key:", hostKey);
const file = process.env.STATE_FILE || "data/state.json";
let saved;
try {
  saved = JSON.parse(fs.readFileSync(file));
} catch {}
const game = new Game({ saved });
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 4096 });
if (process.env.NODE_ENV === "production") app.use(express.static("dist"));
else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const persist = () => {
  fs.mkdirSync(file.slice(0, file.lastIndexOf("/")) || ".", {
    recursive: true,
  });
  fs.writeFileSync(file + ".tmp", JSON.stringify(game.save()));
  fs.renameSync(file + ".tmp", file);
};
const equal = (a, b) => {
  const x = Buffer.from(String(a || "")),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
wss.on("connection", (ws) => {
  ws.alive = true;
  ws.on("pong", () => (ws.alive = true));
  ws.send(JSON.stringify({ type: "state", state: game.snapshot() }));
  let count = 0,
    last = Date.now();
  ws.on("message", (raw) => {
    try {
      if (Date.now() - last > 1000) {
        count = 0;
        last = Date.now();
      }
      if (++count > 80) throw Error("Too many requests");
      const m = JSON.parse(raw);
      if (m.type === "hostAuth") {
        ws.host = equal(m.key, hostKey);
        ws.send(JSON.stringify({ type: "auth", ok: ws.host }));
        return;
      }
      if (m.type === "host") {
        if (!ws.host) throw Error("Unauthorized host action");
        game.command(m.action, m.data);
        if (["disconnectPlayer", "kickPlayer"].includes(m.action))
          for (const client of wss.clients) if (client.player === m.data?.id)
            client.close(m.action === "kickPlayer" ? 4002 : 4001, "Removed by host");
        persist();
        return;
      }
      if (m.type === "join") {
        if (ws.player) return;
        if (typeof m.name !== "string" || !/^[A-Za-z0-9]{1,24}$/.test(m.name))
          throw Error("Use 1–24 letters and numbers for your username.");
        const p = game.join(
          typeof m.id === "string" ? m.id : null,
          m.name,
          m.appearance,
          { pageId: typeof m.pageId === "string" && /^[a-f0-9-]{36}$/i.test(m.pageId) ? m.pageId : randomBytes(18).toString("hex"), resume: m.resume === true },
        );
        p.name = game.name(m.name);
        p.appearance = game.appearance(m.appearance || {});
        for (const old of wss.clients)
          if (old !== ws && old.player === p.id) {
            old.player = null;
            old.close(4000, "Session opened elsewhere");
          }
        ws.player = p.id;
        ws.send(JSON.stringify({ type: "identity", id: p.id, token: p.token }));
        persist();
        return;
      }
      const p = game.players.get(ws.player);
      if (!p) throw Error("Join first");
      if (m.type === "sceneLoaded") game.acknowledgeLoad(p, m.round);
      if (m.type === "loadReady") game.acknowledgeLoad(p, m.round, true);
      if (m.type === "chat") game.chat(p, m.text);
      if (m.type === "emote") game.emote(p, m.emote);
      if (m.type === "ready") p.ready = !!m.ready;
      if (m.type === "input") {
        if (
          !Number.isFinite(m.x) ||
          !Number.isFinite(m.z) ||
          Math.abs(m.x) > 1 ||
          Math.abs(m.z) > 1
        )
          throw Error("Invalid input");
        if (m.x || m.z || m.jump) game.stopEmote(p);
        p.input = { x: m.x, z: m.z, jump: !!m.jump };
        p.lastInput = Date.now();
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", message: e.message }));
    }
  });
  ws.on("close", () => {
    const p = game.players.get(ws.player);
    if (p) {
      game.stopEmote(p);
      p.connected = false;
      p.input = {};
      persist();
    }
  });
});
let previous = Date.now(),
  lastPhase = game.phase;
setInterval(() => {
  const now = Date.now();
  for (const p of game.players.values())
    if (now - (p.lastInput || 0) > 250) p.input = {};
  game.tick(Math.min((now - previous) / 1000, 0.1));
  previous = now;
  if (game.phase !== lastPhase) {
    persist();
    lastPhase = game.phase;
  }
  const payload = JSON.stringify({ type: "state", state: game.snapshot() });
  for (const ws of wss.clients)
    if (ws.readyState === WebSocket.OPEN) ws.send(ws.player ? JSON.stringify({ type: "state", state: game.snapshotFor(ws.player) }) : payload);
}, 50);
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) {
      ws.terminate();
      continue;
    }
    ws.alive = false;
    ws.ping();
  }
}, 10000);
server.listen(port, "0.0.0.0", () =>
  console.log(
    `Crowd Rush: http://localhost:${port} | /?view=host | /?view=projector`,
  ),
);
