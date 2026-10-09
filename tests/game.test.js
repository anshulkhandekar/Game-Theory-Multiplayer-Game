import { loadAndCountdown } from "./lifecycle-helper.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../server/game.js";
function fixture() {
  let now = 0;
  const g = new Game({ now: () => now, duration: 5 });
  return {
    g,
    advance: (n) => {
      now += n;
      g.tick(0.05);
    },
  };
}
test("equal splitting, empty vault, outside, exactly once", () => {
  const { g, advance } = fixture();
  const a = g.join(null, "A"),
    b = g.join(null, "B"),
    c = g.join(null, "C");
  g.command("ready");
  g.command("start");
  loadAndCountdown(g);
  advance(8000);
  a.x = b.x = -9;
  a.z = b.z = -5;
  c.x = 0;
  c.z = 0;
  advance(5000);
  assert.equal(a.earnings, 60);
  assert.equal(b.earnings, 60);
  assert.equal(c.earnings, 0);
  g.finish();
  assert.equal(a.earnings, 60);
  assert.equal(g.scoredRound, 1);
});
test("practice does not award; pause freezes deadline and movement", () => {
  const { g, advance } = fixture();
  const p = g.join(null, "P");
  g.command("practice");
  loadAndCountdown(g);
  advance(8000);
  p.x = 9;
  p.z = -5;
  g.command("pause");
  advance(50000);
  assert.equal(g.phase, "practice");
  g.command("resume");
  advance(20000);
  assert.equal(g.phase, "results");
  assert.equal(p.earnings, 0);
  assert.equal(g.results[0].payout, 360);
});
test("reconnect keeps identity and earnings; late join waits until next round", () => {
  const { g, advance } = fixture();
  const p = g.join(null, "P");
  p.earnings = 123;
  g.command("ready");
  g.command("start");
  loadAndCountdown(g);
  advance(8000);
  const late = g.join(null, "Late");
  assert.equal(late.eligible, false);
  p.connected = false;
  assert.equal(g.join(p.token, "Changed").id, p.id);
  assert.equal(g.players.size, 2);
  assert.equal(p.name, "P");
  assert.equal(p.earnings, 123);
});
test("server restart preserves score, name and appearance", () => {
  const g = new Game();
  const p = g.join(null, "<script>", { bear: "panda" });
  p.earnings = 42;
  const next = new Game({ saved: g.save() });
  const q = next.join(p.token, "Other");
  assert.equal(q.earnings, 42);
  assert.equal(q.appearance.bear, "panda");
  assert.equal(next.phase, "lobby");
});
test("invalid transitions and movement boundary", () => {
  const g = new Game();
  assert.throws(() => g.command("start"));
  const p = g.join(null, "A".repeat(50));
  assert.equal(p.name.length, 24);
  p.input = { x: 1, z: 1 };
  for (let i = 0; i < 1000; i++) g.tick(0.05);
  assert.ok(Math.hypot(p.x, p.z) <= 19.00001);
});
test("public ids cannot reclaim sessions and private tokens never enter snapshots", () => {
  const g = new Game();
  const p = g.join(null, "Owner");
  assert.equal(g.snapshot().players[0].token, undefined);
  assert.notEqual(g.join(p.id, "Imposter").id, p.id);
  assert.equal(g.join(p.token, "Owner").id, p.id);
});
test("disconnect at deadline earns zero; reconnect before deadline retains eligibility", () => {
  const { g, advance } = fixture();
  const p = g.join(null, "P");
  g.command("ready");
  g.command("start");
  loadAndCountdown(g);
  advance(8000);
  p.x = 9;
  p.z = -5;
  p.connected = false;
  assert.equal(g.occupancy().diamond, 0);
  g.join(p.token, "P");
  assert.equal(g.occupancy().diamond, 1);
  p.connected = false;
  advance(5000);
  assert.equal(p.earnings, 0);
  assert.equal(g.results[0].disconnected, true);
});
test("lobby return separates bears and clears stale momentum", () => {
  const g = new Game();
  const a = g.join(null, "A"),
    b = g.join(null, "B");
  a.vx = 6;
  a.input = { x: 1 };
  g.command("lobby");
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 1);
  assert.equal(a.vx, 0);
  assert.deepEqual(a.input, {});
});
