import test from "node:test";
import assert from "node:assert/strict";
import { TrafficBudget } from "../server/traffic.js";
import { Game } from "../server/game.js";
import { frontPatch, frontPath, teamPositions } from "../shared/battlefield.js";
test("20Hz movement and normal checkout traffic coexist for a minute", () => {
  const b = new TrafficBudget(0);
  for (let t = 0; t < 60000; t += 50) {
    assert.equal(b.accept("input", t), true);
    if (t % 1000 === 0)
      for (let i = 0; i < 4; i++) assert.equal(b.accept("action", t), true);
  }
  assert.equal(b.abusive, false);
});
test("action flood is bounded independently of movement and error replies", () => {
  const b = new TrafficBudget(0);
  let allowed = 0;
  for (let i = 0; i < 1000; i++) allowed += b.accept("action", 0);
  assert.equal(allowed, 30);
  assert.equal(b.abusive, true);
  assert.equal(b.accept("input", 0), true);
  let errors = 0;
  for (let i = 0; i < 1000; i++) errors += b.reportError(0);
  assert.equal(errors, 4);
  assert.equal(b.reportError(500), true);
});
test("budget recovers after a brief burst without permanently penalizing a client", () => {
  const b = new TrafficBudget(0);
  for (let i = 0; i < 40; i++) b.accept("action", 0);
  assert.equal(b.accept("action", 2000), true);
  assert.equal(b.abusive, false);
});
test("reusing the public frame does not mutate it or another player acknowledgement", () => {
  const g = new Game();
  const a = g.join(null, "One"),
    b = g.join(null, "Two");
  a.inputAck = 12;
  b.inputAck = 4;
  const base = g.snapshot(),
    one = g.snapshotFor(a.id, base),
    two = g.snapshotFor(b.id, base);
  assert.equal(base.prediction, undefined);
  assert.equal(one.prediction.ack, 12);
  assert.equal(two.prediction.ack, 4);
  assert.equal(one.players, base.players);
  assert.ok(!one.players.some((p) => p.token || p.input));
});
test("two-base demo connects three distinct patches symmetrically without crossings", () => {
  const teams = [{ id: "a" }, { id: "b" }],
    positions = teamPositions(teams);
  const paths = [0, 1, 2].map((lane) =>
    frontPath(teams, { a: "a", b: "b", lane }),
  );
  assert.equal(paths[0].length, 2);
  assert.equal(paths[1].length, 4);
  assert.equal(paths[2].length, 4);
  for (let lane = 0; lane < 3; lane++) {
    const f = { a: "a", b: "b", lane },
      a = frontPatch(teams, f, "a"),
      b = frontPatch(teams, f, "b");
    assert.ok(Math.abs(a.x - b.x) < 1e-9);
    assert.ok(Math.abs(a.z + b.z) < 1e-9);
    for (const [p, base] of [
      [a, positions[0]],
      [b, positions[1]],
    ])
      assert.ok(Math.hypot(p.x - base.x, p.z - base.z) < 28);
  }
  assert.equal(paths[1][1].x, -paths[2][1].x);
});

test("shared Battlefield frames preserve private orders, wallets and team messages", () => {
  const game = new Game();
  const players = Array.from({ length: 12 }, (_, i) =>
    game.join(null, "Privacy" + i),
  );
  game.command("battlefield");
  game.command("battle:match");
  game.command("battle:tutorial");
  game.command("battle:forceStart");
  const battle = game.battlefield;
  const own = players[0].id,
    team = battle.teamOf(own),
    enemy = battle.teams.find((t) => t.id !== team.id);
  battle.orders[
    `${enemy.id}:${battle.fronts.find((f) => f.a === enemy.id || f.b === enemy.id).id}`
  ].tank = 2;
  battle.phase = "final";
  battle.messages.push({ team: enemy.id, text: "secret" });
  const base = game.snapshot(),
    a = game.snapshotFor(own, base),
    b = game.snapshotFor(enemy.members[0], base);
  assert.equal(Object.keys(base.battlefield.orders).length, 0);
  assert.ok(
    Object.keys(a.battlefield.orders).every((k) => k.startsWith(team.id + ":")),
  );
  assert.ok(
    Object.keys(b.battlefield.orders).every((k) =>
      k.startsWith(enemy.id + ":"),
    ),
  );
  assert.deepEqual(
    Object.keys(a.battlefield.wallets).sort(),
    [...team.members].sort(),
  );
  assert.equal(a.battlefield.messages.length, 0);
  assert.equal(b.battlefield.messages.length, 1);
  assert.equal(base.battlefield.team, null);
  assert.deepEqual(base.battlefield.wallets, {});
});
