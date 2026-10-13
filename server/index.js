import {StateStore} from "./storage.js";
import {createAccess} from "./access.js";
import {SnapshotStream} from "../shared/snapshot-stream.js";
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
const store = new StateStore(file);
const game = new Game({ saved: store.saved });
const access = createAccess({eventCode:process.env.EVENT_CODE, hostKey:process.env.HOST_KEY,
  spectatorKey:process.env.SPECTATOR_KEY, production:process.env.NODE_ENV === "production"});
const stream = new SnapshotStream();
const entranceState = new Game().snapshot();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({
  server,
  maxPayload: 4096,
  verifyClient: info => {
    const role = access.role(info.req);
    return !!role && allowUpgrade(info.req, wss.clients.size, role === 'host' ? 100 : 96);
  },
  // Frames are repetitive JSON. Bound compression work and avoid per-client retained contexts.
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 4,
    serverNoContextTakeover: true,
    clientNoContextTakeover: true,
    zlibDeflateOptions: { level: 1 },
  },
});
app.get('/health', (_req,res) => res.status(store.error ? 503 : 200).json({ok:!store.error}));
app.post('/access', express.urlencoded({extended:false, limit:'1kb'}), access.login);
app.use(access.gate);
if (process.env.NODE_ENV === "production") app.use(express.static(process.env.CLIENT_DIST || "dist", {
  setHeaders(res, file) { if (/[/\\]assets[/\\].*-[-\w]{8}\.(js|css)$/.test(file)) res.setHeader('Cache-Control','public, max-age=31536000, immutable'); }
}));
else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const flush = () => store.flush(game.save());
if (!flush()) throw Error('Score storage is not writable; refusing to start.');
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
  const saved = flush();
  writeMetrics();
  process.exit(saved ? 0 : 1);
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

let usageAt=Date.now(),usageBytes=0;
setInterval(()=>{const at=Date.now();metrics.rawMbps=(metrics.bytes-usageBytes)*8/(at-usageAt)/1000;usageBytes=metrics.bytes;usageAt=at;},5000).unref();
const equal = (a, b) => {
  const x = Buffer.from(String(a || "")),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
wss.on("connection", (ws, req) => {
  ws.accessRole = access.role(req);
  ws.host = ws.accessRole === 'host' && new URL(req.url, 'http://local').searchParams.get('view') === 'host';
  ws.joinBy = Date.now() + 20000;
  ws.snapshotVersion = -1;
  ws.alive = true;
  ws.on("pong", () => (ws.alive = true));
  if (ws.host) send(ws, {type:'auth', ok:true});
  else send(ws, {type:'welcome'});
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
      if (m.type === 'preview') {
        if (!ws.preview) { ws.preview = true; ws.joinBy = Date.now() + 10 * 60 * 1000; }
        if (!ws.player && !ws.host && !ws.spectator) send(ws, {type:'state', state:entranceState});
        return;
      }
      if (m.type === 'observe') {
        if (!['host','spectator','local'].includes(ws.accessRole)) throw Error('Use the projector key to observe.');
        if (!ws.spectator && [...wss.clients].filter(c => c.spectator).length >= 4) throw Error('The projector limit has been reached.');
        ws.spectator = true;
        return;
      }
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
            if (client.player === m.data?.id) {
              client.removedByHost = true;
              client.close(
                m.action === "kickPlayer" ? 4002 : 4001,
                "Removed by host",
              );
            }
        if(m.action!=="broadcast") persist();
        return;
      }
      if (m.type === "join") {
        if (ws.player) return;
        if (ws.accessRole === 'spectator') throw Error('Projector access cannot join as a player.');
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
        ws.snapshotVersion = -1;
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
      if (m.type === "practiceSeat") game.practiceSeat(p, m.kind);
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
      game.disconnect(p, !ws.removedByHost);
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
  stream.update(base.players);
  for (const ws of wss.clients) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    if (!ws.host && !ws.player && !ws.spectator) {
      if (now >= ws.joinBy) ws.close(4003, 'Join or authenticate to continue');
      continue;
    }
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
    const wireState = stream.encode(recipientState, ws.snapshotVersion);
    if (ws.host) wireState.serverHealth = {connections:wss.clients.size, rawMbps:metrics.rawMbps||0,
      meanTickMs:metrics.tickMs/Math.max(1,metrics.ticks), persistenceError:store.error};
    if (ws.host && ws.historyVersion !== game.roundHistory.length) {
      send(ws, {type:"history", rounds:game.roundHistory});
      ws.historyVersion = game.roundHistory.length;
    }
    if (ws.host) {
      const messages=game.battlefield?.messages || [], chatVersion=`${game.round}:${game.battlefield?.teams.map(t=>t.id).join(',')||''}:${messages.length}:${messages.at(-1)?.id||0}`;
      if(chatVersion!==ws.chatVersion){send(ws,{type:"teamChats",messages});ws.chatVersion=chatVersion;}
    }
    const data = JSON.stringify({type:'state', state:wireState});
    ws.snapshotVersion = stream.version;
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
    `Crowd Rush: http://localhost:${server.address().port} | /?view=host | /?view=projector`,
  ),
);
