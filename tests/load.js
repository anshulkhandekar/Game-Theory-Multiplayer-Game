import { readMessage } from "./socket-messages.js";
import WebSocket from "ws";
import assert from "node:assert/strict";
const url = process.env.TEST_URL || "ws://localhost:3000",
  key = process.env.HOST_KEY;
const clients = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function client() {
  const w = new WebSocket(url, {
    headers: { "x-workshop-code": process.env.EVENT_CODE || "" },
  });
  w.messages = [];
  w.on("message", (raw) => {
    const m = readMessage(w, raw);
    if (m.type !== "state") w.messages.push(m);
    if (m.type === "state") {
      w.state = m.state;
      (w.frameTimes ||= []).push(performance.now());
    }
    if (m.type === "identity") {
      w.id = m.id;
      w.token = m.token;
    }
  });
  await new Promise((r, j) => {
    w.on("open", r);
    w.on("error", j);
  });
  clients.push(w);
  return w;
}
const send = (w, m) => w.send(JSON.stringify(m));
async function loadCountdown(host, players) {
  await sleep(250);
  const round = host.state.round;
  assert.equal(host.state.phase, "loading");
  for (const w of players) {
    send(w, { type: "sceneLoaded", round });
    send(w, { type: "loadReady", round });
  }
  await sleep(200);
  send(host, { type: "host", action: "countdown" });
  await sleep(8300);
}
const host = await client();
send(host, { type: "hostAuth", key });
await sleep(100);
assert.ok(
  host.messages.some((m) => m.type === "auth" && m.ok),
  "host authentication",
);
send(host, { type: "host", action: "lobby" });
const players = await Promise.all(
  Array.from({ length: 40 }, async (_, i) => {
    const w = await client();
    send(w, { type: "join", name: "Load" + i, appearance: { bear: "panda" } });
    return w;
  }),
);
await sleep(500);
assert.equal(new Set(players.map((p) => p.id)).size, 40);
send(players[0], { type: "host", action: "start" });
await sleep(100);
assert.ok(
  players[0].messages.some(
    (m) => m.type === "error" && m.message.includes("Unauthorized"),
  ),
);
send(host, { type: "host", action: "configure", data: { duration: 5 } });
send(host, { type: "host", action: "ready" });
send(host, { type: "host", action: "start" });
await loadCountdown(host, players);
const input = setInterval(() => {
  players.forEach((w, i) =>
    send(w, { type: "input", x: i < 20 ? -1 : 1, z: -0.55, jump: false }),
  );
}, 50);
await sleep(1700);
clearInterval(input);
players.forEach((w) => send(w, { type: "input", x: 0, z: 0, jump: false }));
await sleep(3600);
assert.equal(host.state.phase, "results");
assert.equal(host.state.results.length, 40);
const total = host.state.results.reduce((s, r) => s + r.payout, 0);
assert.ok(total > 0, "some players reached vaults");
const p = players[0],
  pid = p.id,
  earn = host.state.players.find((x) => x.id === pid).earnings;
p.close();
await sleep(100);
const re = await client();
send(re, { type: "join", id: p.token, name: "Replacement" });
await sleep(200);
assert.equal(re.id, pid);
assert.equal(re.state.players.filter((x) => x.id === pid).length, 1);
assert.equal(re.state.players.find((x) => x.id === pid).earnings, earn);
send(host, { type: "host", action: "results" });
await sleep(100);
assert.equal(re.state.players.find((x) => x.id === pid).earnings, earn);
const livePlayers = players.map((w) => (w === p ? re : w)),
  roundChecks = [];
for (const stage of [2, 3, 4, 5]) {
  send(host, {
    type: "host",
    action: "configure",
    data: { stage, duration: 5 },
  });
  send(host, { type: "host", action: "ready" });
  send(host, { type: "host", action: "start" });
  await loadCountdown(host, livePlayers);
  assert.equal(host.state.phase, "active");
  if (stage === 4) {
    send(host, { type: "host", action: "pause" });
    await sleep(150);
    const frozen = host.state.worldTime,
      remaining = host.state.remaining;
    await sleep(300);
    assert.equal(host.state.worldTime, frozen);
    assert.equal(host.state.remaining, remaining);
    send(host, { type: "host", action: "resume" });
  }
  const before = host.state.players.reduce((n, p) => n + (p.respawns || 0), 0);
  const inputs = setInterval(
    () =>
      livePlayers.forEach((w, i) =>
        send(w, { type: "input", x: i % 2 ? 1 : -1, z: 0, jump: false }),
      ),
    50,
  );
  await sleep(2200);
  clearInterval(inputs);
  livePlayers.forEach((w) =>
    send(w, { type: "input", x: 0, z: 0, jump: false }),
  );
  await sleep(3200);
  assert.equal(host.state.world, `arena${stage}`);
  assert.equal(host.state.phase, "results");
  assert.equal(host.state.results.length, 40);
  assert.ok(
    host.state.players.every(
      (p) =>
        Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
    ),
  );
  const respawns =
    host.state.players.reduce((n, p) => n + (p.respawns || 0), 0) - before;
  assert.ok(respawns > 0, "server respawned falls");
  roundChecks.push({ stage, results: 40, respawns });
}
const intervals = host.frameTimes
  .slice(1)
  .map((t, i) => t - host.frameTimes[i]);
const averageSnapshotIntervalMs =
  intervals.reduce((a, b) => a + b, 0) / intervals.length;
const maxSnapshotIntervalMs = Math.max(...intervals);
console.log(
  JSON.stringify({
    clients: 40,
    parkour: "passed",
    roundChecks,
    averageSnapshotIntervalMs,
    maxSnapshotIntervalMs,
    phase: host.state.phase,
    totalPayout: total,
    authorization: "passed",
    reconnect: "passed",
    exactlyOnce: "passed",
    results: host.state.results.length,
  }),
);
for (const w of clients) w.close();
