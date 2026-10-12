import WebSocket from "ws";
import assert from "node:assert/strict";
import fs from "node:fs";
const url = process.env.TEST_URL || "ws://localhost:3015",
  key = process.env.HOST_KEY || "clean-pass-local";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clients = [];
async function connect(name, options) {
  const ws = new WebSocket(url, options),
    c = { ws, state: null, id: null, frames: [], errors: [], closed: null };
  clients.push(c);
  ws.on("error", () => {});
  ws.on("close", (code) => (c.closed = code));
  ws.on("message", (raw) => {
    const m = JSON.parse(raw);
    if (m.type === "state") {
      c.state = m.state;
      c.frames.push(performance.now());
    }
    if (m.type === "identity") c.id = m.id;
    if (m.type === "error") c.errors.push(m.message);
    if (m.type === "auth") c.auth = m.ok;
  });
  await new Promise((r) => ws.once("open", r));
  ws.send(
    JSON.stringify(name ? { type: "join", name } : { type: "hostAuth", key }),
  );
  return c;
}
const send = (c, m) => c.ws.send(JSON.stringify(m));
try {
  const host = await connect();
  await sleep(150);
  assert.equal(host.auth, true);
  send(host, { type: "host", action: "lobby" });
  const players = await Promise.all(
    Array.from({ length: 40 }, (_, i) => connect("Stress" + i)),
  );
  await sleep(400);
  assert.ok(players.every((p) => p.id));
  let seq = 0;
  const moving = setInterval(() => {
    seq++;
    for (const p of players)
      if (p.ws.readyState === WebSocket.OPEN)
        send(p, { type: "input", x: 0.4, z: 0.2, jump: seq % 20 === 0, seq });
  }, 50);
  await sleep(2000);
  const start = performance.now();
  players.forEach((p) => (p.frames = []));
  const flood = await connect("Flood");
  await sleep(150);
  for (let i = 0; i < 2500; i++)
    if (flood.ws.readyState === WebSocket.OPEN)
      send(flood, { type: "input", x: 1, z: 1 });
  await sleep(300);
  assert.equal(flood.closed, 4008);
  const malformed = await connect("Malformed");
  await sleep(150);
  for (let i = 0; i < 1000; i++) malformed.ws.send("{");
  await sleep(300);
  assert.equal(malformed.closed, 4008);
  assert.ok(malformed.errors.length <= 4);
  const actions = await connect("ActionFlood");
  await sleep(150);
  for (let i = 0; i < 1000; i++)
    send(actions, {
      type: "battle",
      action: "purchase",
      data: { hint: { type: "input" } },
    });
  await sleep(300);
  assert.equal(actions.closed, 4008);
  assert.ok(actions.errors.length <= 4);
  const oversized = await connect("Oversize");
  await sleep(150);
  oversized.ws.send("x".repeat(5000));
  await sleep(300);
  assert.equal(oversized.closed, 1009);
  const slow = await connect("SlowReader", { perMessageDeflate: false });
  await sleep(200);
  slow.ws._socket.pause();
  // Allow the OS TCP receive window to fill before checking server backpressure.
  await sleep(25000);
  slow.ws._socket.resume();
  await sleep(1000);
  clearInterval(moving);
  await sleep(100);
  const intervals = players
    .flatMap((p) => p.frames.slice(1).map((t, i) => t - p.frames[i]))
    .sort((a, b) => a - b);
  const report = {
    clients: 40,
    inputHz: 20,
    seconds: (performance.now() - start) / 1000,
    normalErrors: players.flatMap((p) => p.errors),
    normalDisconnects: players.filter((p) => p.closed !== null).length,
    frameIntervalP50Ms: intervals[Math.floor(intervals.length * 0.5)],
    frameIntervalP95Ms: intervals[Math.floor(intervals.length * 0.95)],
    frameIntervalP99Ms: intervals[Math.floor(intervals.length * 0.99)],
    maxFrameIntervalMs: intervals.at(-1),
    floodClose: flood.closed,
    malformedErrors: malformed.errors.length,
    actionErrors: actions.errors.length,
    oversizedClose: oversized.closed,
    slowReaderClose: slow.closed,
  };
  assert.ok(
    [4009, 1006].includes(report.slowReaderClose),
    "backed-up reader is disconnected by queue protection or heartbeat",
  );
  assert.equal(report.normalErrors.length, 0);
  assert.equal(report.normalDisconnects, 0);
  assert.ok(report.frameIntervalP95Ms < 150);
  fs.writeFileSync(
    "/tmp/clean-pass-traffic-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const c of clients) c.ws.terminate();
}
