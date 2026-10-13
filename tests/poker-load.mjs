const decoders = new WeakMap();
const readMessage = (ws, raw) => { const m = JSON.parse(raw); if(m.type === "state") { if(!decoders.has(ws)) decoders.set(ws, snapshotDecoder()); m.state = decoders.get(ws)(m.state); } return m; };
import {snapshotDecoder} from "../shared/snapshot-stream.js";
// Disposable room only. Never point this script at the workshop officer room.
import WebSocket from "ws";
import assert from "node:assert/strict";
const url = process.env.TEST_URL || "ws://localhost:3020";
const key = process.env.HOST_KEY || "poker-load";
const clients = [],
  errors = [],
  sent = new Map();
let hostState;
let count = 40;
function connect(host = false, index = 0) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {headers:{"x-workshop-code":process.env.EVENT_CODE || ""}});
    ws.on("open", () =>
      ws.send(
        JSON.stringify(
          host
            ? { type: "hostAuth", key }
            : {
                type: "join",
                name: "PokerLoad" + index,
                pageId: crypto.randomUUID(),
              },
        ),
      ),
    );
    let identity;
    ws.on("error", reject);
    ws.on("message", (raw) => {
      const m = readMessage(ws, raw);
      if (m.type === "error") {
        errors.push(m.message);
        if (!identity && !host) reject(Error(m.message));
      }
      if (m.type === "identity") {
        identity = m.id;
        resolve(ws);
      }
      if (m.type === "auth") {
        assert.ok(m.ok);
        resolve(ws);
      }
      if (m.type === "state") {
        if (host) {
          hostState = m.state;
          for (const t of m.state.poker?.tables || [])
            assert.equal(t.ownCard, undefined);
        } else if (identity && m.state.poker) {
          const b = m.state.poker,
            own = b.tables.find((t) => t.players.includes(identity));
          for (const t of b.tables)
            if (t !== own) assert.equal(t.ownCard, undefined);
          if (b.phase === "instructions" && !b.ready.includes(identity))
            ws.send(JSON.stringify({ type: "poker", action: "ready" }));
          if (
            b.phase === "playing" &&
            own?.turn === identity &&
            own.legal.length
          ) {
            const token =
              m.state.round +
              ":" +
              b.round +
              ":" +
              own.hand +
              ":" +
              own.actions.length;
            if (sent.get(identity) !== token) {
              sent.set(identity, token);
              ws.send(
                JSON.stringify({
                  type: "poker",
                  action: own.legal.includes("call")
                    ? "call"
                    : own.hand % 2
                      ? "bet"
                      : "check",
                  data: {
                    session: m.state.round,
                    round: b.round,
                    hand: own.hand,
                    step: own.actions.length,
                  },
                }),
              );
            }
          }
        }
      }
    });
  });
}
const wait = async (fn) => {
  const deadline = Date.now() + 20000;
  while (!fn()) {
    if (Date.now() > deadline) throw Error("Timed out");
    await new Promise((r) => setTimeout(r, 100));
  }
};
let host;
try {
  host = await connect(true);
  for (let i = 0; i < count; i++) clients.push(await connect(false, i));
  await wait(
    () => hostState?.players.filter((p) => p.connected).length === count,
  );
  host.send(JSON.stringify({ type: "host", action: "poker" }));
  await wait(() => hostState?.poker?.ready.length === count);
  const seen = new Set();
  for (let round = 1; round <= 5; round++) {
    for (const t of hostState.poker.tables) {
      const key = t.players.slice().sort().join(":");
      assert.ok(!seen.has(key));
      seen.add(key);
    }
    host.send(JSON.stringify({ type: "host", action: "poker:start" }));
    await wait(() => hostState?.poker?.phase === "playing");
    await wait(() => hostState?.poker?.phase === "results");
    assert.equal(hostState.poker.tables.length, 20);
    assert.ok(
      hostState.poker.tables.every((t) => t.hand === 2 && t.log.length === 2),
    );
    const total = hostState.players.reduce(
      (n, p) => n + (p.pokerScore || 0),
      0,
    );
    assert.equal(total, 0);
    console.log(
      "Round",
      round,
      "passed:",
      count,
      "players, 20 tables, private cards, conserved chips",
    );
    if (round < 5) {
      host.send(JSON.stringify({ type: "host", action: "poker:next" }));
      await wait(
        () =>
          hostState?.poker?.round === round + 1 &&
          hostState.poker.ready.length === count,
      );
    }
  }
  assert.deepEqual(errors, []);
  host.send(JSON.stringify({ type: "host", action: "lobby" }));
  await wait(() => hostState?.phase === "lobby");
  assert.ok(
    hostState.players.every(
      (p) => p.tournament.total >= 0 && p.tournament.total <= 100,
    ),
  );
  console.log(
    "PASS: all five Poker rounds, unique opponents, owner privacy, final lobby scores",
  );
} finally {
  for (const ws of clients) ws.close();
  host?.close();
}
