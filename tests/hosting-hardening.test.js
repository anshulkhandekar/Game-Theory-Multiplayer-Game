import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Game } from "../server/game.js";
import { StateStore } from "../server/storage.js";
import { createAccess } from "../server/access.js";
import { SnapshotStream, snapshotDecoder } from "../shared/snapshot-stream.js";
import { reconnectDelay } from "../shared/reconnect.js";
import { terminalPosition } from "../shared/battlefield.js";

function battlefield() {
  let now = 0;
  const game = new Game({ now: () => now });
  const players = Array.from({ length: 6 }, (_, i) =>
    game.join(null, `Hardening${i}`),
  );
  for (const a of [
    "battlefield",
    "battle:match",
    "battle:tutorial",
    "battle:forceStart",
  ])
    game.command(a);
  return {
    game,
    players,
    b: game.battlefield,
    advance: (ms) => {
      now = ms;
      game.tick(0.05);
    },
  };
}
test("purchase exhaustion is per actor; absent fallback remains safe and exactly once", () => {
  const { game, b, players, advance } = battlefield();
  for (const p of players.slice(0, 4)) {
    const team = b.teamOf(p.id),
      front = b.fronts.find((f) => [f.a, f.b].includes(team.id));
    Object.assign(p, terminalPosition(b.teams, team.id, front.lane), { y: 0 });
    const order = (i) => ({
      front: front.id,
      unit: "troop",
      quantity: 1,
      nonce: `hardening-${i}`,
      volley: game.round,
    });
    for (let i = 0; i < 120; i++)
      b.act(p.id, i % 2 ? "refund" : "purchase", order(i));
    assert.throws(
      () => b.act(p.id, "purchase", order(120)),
      /Your purchase limit/,
    );
    assert.equal(b.act(p.id, "purchase", order(0)).nonce, "hardening-0");
    game.disconnect(p);
  }
  advance(45001);
  assert.equal(b.phase, "final");
  assert.doesNotThrow(() => advance(55001));
  for (const p of players.slice(0, 4)) assert.equal(b.wallets[p.id], 0);
  const orders = JSON.stringify(b.orders);
  advance(55500);
  assert.equal(JSON.stringify(b.orders), orders);
  assert.equal(b.transactionCounts.get(players[4].id), undefined);
});
test("duplicate/team transfer requests cannot exhaust other teams; history stays bounded", () => {
  const { b } = battlefield(),
    [a, c] = b.teams;
  b.act(a.members[0], "request", { from: a.members[1], amount: 1 });
  assert.throws(
    () => b.act(a.members[0], "request", { from: a.members[1], amount: 1 }),
    /pending request/,
  );
  assert.doesNotThrow(() =>
    b.act(c.members[0], "request", { from: c.members[1], amount: 1 }),
  );
  for (let i = 0; i < 150; i++) {
    const pending = b.transfers.find(
      (t) => t.to === a.members[0] && t.status === "pending",
    );
    b.act(a.members[1], "transfer", { id: pending.id, accept: false });
    b.act(a.members[0], "request", { from: a.members[1], amount: 1 });
  }
  assert.ok(b.transfers.length <= 103);
  assert.ok(b.transfers.some((t) => t.team === c.id && t.status === "pending"));
});
test("offline identities obey capacity; 30-second reservations protect reconnects", () => {
  let now = 0;
  const g = new Game({ now: () => now });
  const old = g.join(null, "Old");
  g.disconnect(old, false);
  const ps = Array.from({ length: 40 }, (_, i) => g.join(null, `Seat${i}`));
  assert.throws(() => g.join(old.token, old.name), /40 players/);
  g.disconnect(ps[0]);
  assert.throws(() => g.join(null, "New"), /40 players/);
  assert.equal(g.join(ps[0].token, ps[0].name).id, ps[0].id);
  g.disconnect(ps[0]);
  now = 30001;
  assert.ok(g.join(old.token, old.name));
  assert.throws(() => g.join(ps[0].token, ps[0].name), /40 players/);
});
test("closed registration preserves existing identities and customization is throttled", () => {
  let now = 0;
  const g = new Game({ now: () => now }),
    p = g.join(null, "Existing");
  g.command("registration", { locked: true });
  assert.throws(() => g.join(null, "New"), /Registration is closed/);
  assert.equal(g.join(p.token, p.name), p);
  assert.equal(new Game({ saved: g.save() }).registrationOpen, false);
  g.customize(p, {});
  assert.throws(() => g.customize(p, {}), /two seconds/);
  now = 2000;
  g.customize(p, {});
  assert.ok(!JSON.stringify(g.save()).includes("customizedAt"));
});
test("storage refuses corrupt files, preserves previous good backup and reports write failures", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "game-storage-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "scores.json"),
    g = new Game(),
    p = g.join(null, "Save");
  const store = new StateStore(file);
  assert.equal(store.saved, undefined);
  p.earnings = 123;
  assert.ok(store.flush(g.save()));
  p.earnings = 456;
  assert.ok(store.flush(g.save()));
  assert.equal(
    JSON.parse(fs.readFileSync(file + ".bak")).players[0].earnings,
    123,
  );
  assert.equal(new StateStore(file).saved.players[0].earnings, 456);
  const atomic = store.atomic;
  store.atomic = () => {
    throw Error("Disk unavailable");
  };
  p.earnings = 789;
  assert.equal(store.flush(g.save()), false);
  assert.ok(store.error);
  assert.equal(JSON.parse(fs.readFileSync(file)).players[0].earnings, 456);
  store.atomic = atomic;
  assert.ok(store.flush(g.save()));
  assert.equal(store.error, null);
  fs.writeFileSync(file, "{broken");
  assert.throws(() => new StateStore(file), /Cannot load score file/);
  assert.equal(fs.readFileSync(file, "utf8"), "{broken");
});
test("access cookies are signed, expiring, role scoped and secrets are required in production", () => {
  const config = {
    eventCode: "event-code-123",
    hostKey: "host-secret-123456789",
    spectatorKey: "screen-secret-123456789",
    production: true,
  };
  let now = 0;
  const a = createAccess({ ...config, now: () => now });
  const cookie = a.issue("player"),
    req = { headers: { cookie: `workshop-access=${cookie}` } };
  assert.equal(a.role(req), "player");
  assert.equal(
    a.role({
      headers: {
        cookie: `workshop-access=${cookie.replace("player", "host")}`,
      },
    }),
    null,
  );
  assert.equal(
    a.role({ headers: { "x-workshop-code": config.spectatorKey } }),
    "spectator",
  );
  assert.equal(a.role({ headers: {} }), null);
  now = 43200001;
  assert.equal(a.role(req), null);
  assert.throws(() => createAccess({ production: true }), /requires/);
  assert.throws(
    () => createAccess({ ...config, eventCode: config.hostKey }),
    /distinct/,
  );
});
test("compact snapshots retain private owner fields, send metadata on change, omit offline movement", () => {
  const g = new Game(),
    p = g.join(null, "Live"),
    q = g.join(null, "Offline");
  g.disconnect(q, false);
  const stream = new SnapshotStream(),
    decode = snapshotDecoder();
  let base = g.snapshot();
  stream.update(base.players);
  const first = stream.encode(g.snapshotFor(p.id, base), -1),
    v = stream.version;
  assert.equal(first.actors.length, 1);
  assert.ok(first.prediction);
  assert.ok(!JSON.stringify(first).includes(p.token));
  assert.equal(decode(first).players.length, 2);
  p.x = 12;
  base = g.snapshot();
  stream.update(base.players);
  const second = stream.encode(g.snapshotFor(p.id, base), v);
  assert.equal(second.roster, undefined);
  assert.equal(decode(second).players.find((q) => q.id === p.id).x, 12);
  p.earnings = 88;
  base = g.snapshot();
  stream.update(base.players);
  const third = stream.encode(base, v);
  assert.ok(third.roster);
  assert.equal(decode(third).players.find((q) => q.id === p.id).earnings, 88);
  assert.throws(() => snapshotDecoder()(second), /Missing roster/);
});
test("retries back off with jitter and remain bounded", () => {
  assert.equal(reconnectDelay(0, 0.5), 1000);
  assert.equal(reconnectDelay(3, 0.5), 8000);
  assert.equal(reconnectDelay(100, 1), 18000);
  assert.notEqual(reconnectDelay(2, 0), reconnectDelay(2, 1));
});
