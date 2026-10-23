import { readMessage } from "./socket-messages.js";
import WebSocket from "ws";
import assert from "node:assert/strict";
const url = process.env.TEST_URL || "ws://localhost:3016",
  key = process.env.HOST_KEY || "battlefield-local";
const clients = [];
let movement;
const began = performance.now();
function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
        headers: { "x-workshop-code": process.env.EVENT_CODE || "" },
      }),
      client = { ws, state: null, id: null, errors: [] };
    clients.push(client);
    ws.on("error", reject);
    ws.on("open", () =>
      ws.send(
        JSON.stringify(
          name
            ? { type: "join", name, pageId: crypto.randomUUID() }
            : { type: "hostAuth", key },
        ),
      ),
    );
    ws.on("message", (raw) => {
      const m = readMessage(ws, raw);
      if (m.type === "state") {
        client.state = m.state;
        (client.frames ||= []).push(performance.now());
      }
      if (m.type === "identity") {
        client.id = m.id;
        resolve(client);
      }
      if (m.type === "auth") {
        assert.equal(m.ok, true);
        resolve(client);
      }
      if (m.type === "error") client.errors.push(m.message);
    });
  });
}
async function wait(client, predicate) {
  const until = Date.now() + 15000;
  while (!predicate(client.state)) {
    assert.equal(client.errors.length, 0, client.errors.join(";"));
    if (Date.now() > until)
      throw Error("Timed out waiting for Battlefield state");
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}
const command = (c, action) =>
  c.ws.send(JSON.stringify({ type: "host", action }));
try {
  const host = await connect();
  const players = await Promise.all(
    Array.from({ length: 40 }, (_, i) => connect(`BattleLoad${i}`)),
  );
  let seq = 0;
  movement = setInterval(() => {
    seq++;
    for (const p of players)
      if (p.ws.readyState === WebSocket.OPEN)
        p.ws.send(
          JSON.stringify({ type: "input", x: 0, z: 0, jump: false, seq }),
        );
  }, 50);
  command(host, "battlefield");
  await wait(host, (s) => s?.battlefield?.phase === "matching");
  command(host, "battle:match");
  await wait(host, (s) => s?.battlefield?.phase === "staging");
  assert.equal(
    host.state.battlefield.teams.flatMap((t) => t.members).length,
    40,
  );
  for (let round = 0; round <= 5; round++) {
    command(host, "battle:tutorial");
    await wait(host, (s) => s?.battlefield?.phase === "instructions");
    command(host, "battle:forceStart");
    await wait(host, (s) => s?.battlefield?.phase === "planning");
    const b = host.state.battlefield;
    for (const t of b.teams)
      for (const [i, id] of t.members.entries()) {
        const fronts = b.fronts.filter((f) => [f.a, f.b].includes(t.id)),
          front = fronts[i % 3],
          p = players.find((p) => p.id === id);
        for (const [unit, quantity] of [
          ["troop", 5],
          ["heavy", 1],
          ["tank", 1],
        ])
          p.ws.send(
            JSON.stringify({
              type: "battle",
              action: "purchase",
              data: {
                front: front.id,
                unit,
                quantity,
                nonce: crypto.randomUUID(),
                volley: host.state.round,
              },
            }),
          );
      }
    await wait(
      host,
      (s) =>
        Object.values(s.battlefield.orders).reduce(
          (sum, o) =>
            sum +
            o.troop +
            o.heavy * 5 +
            o.tank * 10 +
            (o.artillery || 0) * 8 +
            o.fort * 5,
          0,
        ) === 800,
    );
    command(host, "battle:final");
    await wait(host, (s) => s?.battlefield?.phase === "final");
    assert.equal(Object.keys(host.state.battlefield.orders).length, 0);
    for (const p of players) {
      await wait(p, (s) => s?.battlefield?.phase === "final");
      assert.equal(Object.keys(p.state.battlefield.orders).length, 3);
    }
    command(host, "battle:fight");
    await wait(host, (s) => s?.battlefield?.phase === "reveal");
    await wait(host, (s) => s?.battlefield?.phase === "results");
    assert.equal(host.state.battlefield.results.length, b.fronts.length);
    for (const t of host.state.battlefield.teams)
      for (const id of t.members)
        assert.equal(
          host.state.players.find((p) => p.id === id).battlefieldScore || 0,
          t.score,
        );
    console.log(
      `${round === 0 ? "Practice" : `Round ${round}`} passed: ${b.teams.length} teams, ${b.fronts.length} simultaneous fronts`,
    );
    if (round < 5) {
      command(host, "battle:next");
      await wait(host, (s) => s?.battlefield?.phase === "staging");
    }
  }
  command(host, "lobby");
  await wait(host, (s) => s?.phase === "lobby" && !s.battlefield);
  assert.ok(
    host.state.players
      .filter((p) => players.some((x) => x.id === p.id))
      .every((p) => p.earnings === 0 && Number.isFinite(p.battlefieldScore)),
  );
  console.log(
    "40-player Battlefield protocol rehearsal passed; visual/GPU performance is not measured.",
  );
  const intervals = players
    .flatMap((p) => p.frames.slice(1).map((t, i) => t - p.frames[i]))
    .sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      clients: 40,
      seconds: (performance.now() - began) / 1000,
      inputHz: 20,
      p95: intervals[Math.floor(intervals.length * 0.95)],
      p99: intervals[Math.floor(intervals.length * 0.99)],
      max: intervals.at(-1),
      wireBytes: clients.reduce((sum, p) => sum + p.ws._socket.bytesRead, 0),
      compression: players.every((p) =>
        p.ws.extensions.includes("permessage-deflate"),
      ),
    }),
  );
} finally {
  clearInterval(movement);
  for (const c of clients) c.ws.close();
}
