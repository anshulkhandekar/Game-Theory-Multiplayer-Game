import {allowUpgrade} from "./admission.js";
import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { timingSafeEqual, randomBytes } from "node:crypto";
import fs from "node:fs";
import { TrafficBudget, MAX_QUEUED_BYTES } from "./traffic.js";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
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
const wss = new WebSocketServer({
  server,
  maxPayload: 4096,
  verifyClient: info=>allowUpgrade(info.req,wss.clients.size),
  // Frames are repetitive JSON. Bound compression work and avoid per-client retained contexts.
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 4,
    serverNoContextTakeover: true,
    clientNoContextTakeover: true,
    zlibDeflateOptions: { level: 1 },
  },
});
if (process.env.NODE_ENV === "production") app.use(express.static(process.env.CLIENT_DIST || "dist"));
else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const flush = () => {
  fs.mkdirSync(file.slice(0, file.lastIndexOf("/")) || ".", {
    recursive: true,
  });
  fs.writeFileSync(file + ".tmp", JSON.stringify(game.save()));
  fs.renameSync(file + ".tmp", file);
};
let saveTimer;
const persist = () => {
  saveTimer ||= setTimeout(() => {
    saveTimer = null;
    flush();
  }, 250);
};
const metrics = {
  ticks: 0,
  maxTickMs: 0,
  tickMs: 0,
  dropped: 0,
  slowFrames: 0,
  bytes: 0,
};
const delay = process.env.PERF_FILE
  ? monitorEventLoopDelay({ resolution: 10 })
  : null;
delay?.enable();
function send(ws, message) {
  if (ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > MAX_QUEUED_BYTES)
    return;
  ws.send(JSON.stringify(message));
}
process.on("SIGTERM", () => {
  if (saveTimer) clearTimeout(saveTimer);
  flush();
  writeMetrics();
  process.exit(0);
});
function writeMetrics() {
  if (!process.env.PERF_FILE) return;
  fs.writeFileSync(
    process.env.PERF_FILE,
    JSON.stringify(
      {
        ...metrics,
        meanTickMs: metrics.tickMs / Math.max(1, metrics.ticks),
        eventLoopP99Ms: delay.percentile(99) / 1e6,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      null,
      2,
    ),
  );
}
if (delay) setInterval(writeMetrics, 5000).unref();
app.get("/health",(_req,res)=>res.json({ok:true,connections:wss.clients.size,players:[...game.players.values()].filter(p=>p.connected&&!p.demo).length}));
let usageAt=Date.now(),usageBytes=0;
setInterval(()=>{const at=Date.now();metrics.rawMbps=(metrics.bytes-usageBytes)*8/(at-usageAt)/1000;usageBytes=metrics.bytes;usageAt=at;},5000).unref();
const equal = (a, b) => {
  const x = Buffer.from(String(a || "")),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
wss.on("connection", (ws) => {
  ws.alive = true;
  ws.on("pong", () => (ws.alive = true));
  ws.send(JSON.stringify({ type: "state", state: game.snapshot() }));
  const traffic = new TrafficBudget();
  ws.on("error", () => {});
  ws.on("message", (raw) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      // Payloads are capped at 4KB and abusive sockets close after a bounded burst.
      // Classify the parsed envelope, so a nested "type: input" cannot disguise purchases.
      let m;
      try {
        m = JSON.parse(raw);
      } catch {
        m = null;
      }
      if (!traffic.accept(m?.type === "input" ? "input" : "action")) {
        metrics.dropped++;
        if (traffic.abusive) ws.close(4008, "Too many requests");
        return;
      }
      if (!m || typeof m !== "object") throw Error("Invalid request");
      if (m.type === "hostAuth") {
        ws.host = equal(m.key, hostKey);
        // A refreshed host page starts its input counter again. Its disposable
        // demo pilot must accept that new stream rather than ignore movement.
        if (ws.host) {
          const pilot = game.players.get(game.poker?.demo?.pilot || game.battlefield?.demo?.pilot);
          if (pilot) {
            pilot.inputSequence = pilot.inputAck = 0;
            pilot.input = {};
          }
        }
        send(ws, { type: "auth", ok: ws.host });
        return;
      }
      if (m.type === "host") {
        if (!ws.host) throw Error("Unauthorized host action");
        game.command(m.action, m.data);
        if (["disconnectPlayer", "kickPlayer"].includes(m.action))
          for (const client of wss.clients)
            if (client.player === m.data?.id)
              client.close(
                m.action === "kickPlayer" ? 4002 : 4001,
                "Removed by host",
              );
        if(m.action!=="broadcast") persist();
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
          {
            pageId:
              typeof m.pageId === "string" && /^[a-f0-9-]{36}$/i.test(m.pageId)
                ? m.pageId
                : randomBytes(18).toString("hex"),
            resume: m.resume === true,
          },
        );
        p.name = game.name(m.name);
        p.appearance = game.appearance(m.appearance || {});
        for (const old of wss.clients)
          if (old !== ws && old.player === p.id) {
            old.player = null;
            old.close(4000, "Session opened elsewhere");
          }
        p.inputSequence = p.inputAck = 0;
        ws.player = p.id;
        send(ws, { type: "identity", id: p.id, token: p.token });
        persist();
        return;
      }
      const p = game.players.get(
        ws.host && game.poker?.demo
          ? game.poker.demo.pilot
          : ws.host && game.battlefield?.demo
          ? game.battlefield.demo.pilot
          : ws.player,
      );
      if (!p) {
        if (ws.host && m.type === "input") return;
        throw Error("Join first");
      }
      if (m.type === "customize") {
        const appearance = game.customize(p, m.appearance);
        persist();
        send(ws, { type: "customized", appearance });
      }
      if (m.type === "poker") {
        if (!game.poker) throw Error("Poker is unavailable");
        game.poker.act(p.id,m.action,m.data);
      }
      if (m.type === "battle") {
        if (!game.battlefield) throw Error("Battlefield is unavailable");
        const receipt = game.battlefield.act(p.id, m.action, m.data);
        if (receipt) send(ws, { type: "battleAck", receipt });
      }
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
        if (m.seq !== undefined) {
          if (!Number.isSafeInteger(m.seq) || m.seq < 1)
            throw Error("Invalid input sequence");
          if (m.seq <= (p.inputSequence || 0)) return;
          p.inputSequence = m.seq;
        }
        if (m.x || m.z || m.jump) game.stopEmote(p);
        p.input = { x: m.x, z: m.z, jump: !!m.jump };
        p.lastInput = Date.now();
      }
    } catch (e) {
      if (traffic.reportError())
        send(ws, { type: "error", message: e.message });
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
  lastPhase = game.phase,
  lastBattleSerial = game.battlefieldSerial,
  lastPokerSerial = game.pokerSerial;
setInterval(() => {
  const started = performance.now();
  const now = Date.now();
  for (const p of game.players.values())
    if (now - (p.lastInput || 0) > 1000) p.input = {};
  game.tick(Math.min((now - previous) / 1000, 0.1));
  previous = now;
  if (game.phase !== lastPhase || game.battlefieldSerial !== lastBattleSerial || game.pokerSerial !== lastPokerSerial) {
    lastPokerSerial = game.pokerSerial;
    lastBattleSerial = game.battlefieldSerial;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    flush();
    lastPhase = game.phase;
  }
  const base = game.snapshot();
  const payload = JSON.stringify({ type: "state", state: base });
  for (const ws of wss.clients) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    if (ws.bufferedAmount > MAX_QUEUED_BYTES) {
      metrics.slowFrames++;
      ws.slowSince ||= now;
      if (now - ws.slowSince > 5000)
        ws.close(4009, "Connection too slow; reconnect");
      continue;
    }
    ws.slowSince = 0;
    const actor =
      ws.host && game.poker?.demo
        ? game.poker.demo.pilot
        : ws.host && game.battlefield?.demo
        ? game.battlefield.demo.pilot
        : ws.player;
    const recipientState=actor?game.snapshotFor(actor,base):base;
    const data = ws.host ? JSON.stringify({type:"state",state:{...recipientState,serverHealth:{connections:wss.clients.size,rawMbps:metrics.rawMbps||0,meanTickMs:metrics.tickMs/Math.max(1,metrics.ticks)}}}) : actor ? JSON.stringify({type:"state",state:recipientState}) : payload;
    ws.send(data);
    metrics.bytes += Buffer.byteLength(data);
  }
  const took = performance.now() - started;
  metrics.ticks++;
  metrics.tickMs += took;
  metrics.maxTickMs = Math.max(metrics.maxTickMs, took);
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
