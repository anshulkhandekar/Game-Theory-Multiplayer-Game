import { LOBBY_TANK } from "../shared/lobby-showcase.js";
import test from "node:test";
import assert from "node:assert/strict";
import { ADVISORS, nearbyAdvisor } from "../shared/lobby-advisors.js";
import { move } from "../shared/movement.js";
import { Predictor } from "../shared/prediction.js";
const player = () => ({
  id: "test",
  x: 0,
  y: 0,
  z: LOBBY_TANK.z + 2,
  grounded: true,
  eligible: true,
  connected: true,
});
test("three distinct advisers are reachable only in their local lounge radius", () => {
  assert.equal(ADVISORS.length, 3);
  for (const a of ADVISORS) {
    assert.equal(
      nearbyAdvisor({ x: a.x * 1.35, z: a.z * 1.35, y: 0 }).id,
      a.id,
    );
    assert.deepEqual(
      [...new Set(a.tips.map((t) => t[0]))],
      ["Basics", "Strategy", "Advanced"],
    );
  }
  assert.equal(nearbyAdvisor({ x: 22, z: 41, y: 0 }), null);
});
test("toy tank bumps outward, bounded by cooldown even with repeated approach inputs", () => {
  const p = player();
  move(p, { z: -1 }, 0.05, "lobby", 0.05);
  assert.ok(p.vz > 0);
  assert.ok(p.vy > 0);
  const first = p.lobbyTankAt;
  for (let i = 2; i <= 50; i++) {
    p.x = 0;
    p.z = LOBBY_TANK.z + 2;
    p.y = 0;
    move(p, { z: -1, jump: true }, 0.05, "lobby", i * 0.05);
    assert.equal(p.lobbyTankAt, first);
  }
  p.x = 0;
  p.z = LOBBY_TANK.z + 2;
  p.y = 0;
  move(p, {}, 0.05, "lobby", 3.2);
  assert.ok(p.lobbyTankAt > first);
  assert.equal(p.earnings, undefined);
});
test("tank never affects scored games or the positive-z practice hallway", () => {
  for (const world of ["arena1", "parkour2", "battlefield1"]) {
    const p = player();
    move(p, {}, 0.05, world, 1);
    assert.equal(p.lobbyTankAt, undefined);
  }
  const p = { ...player(), z: 26 };
  move(p, {}, 0.05, "lobby", 1);
  assert.equal(p.lobbyTankAt, undefined);
});
test("tank prediction and authority agree, including acknowledgement replay", () => {
  const p = player(),
    state = { world: "lobby", phase: "lobby", worldTime: 0, paused: false };
  const prediction = new Predictor();
  prediction.reconcile(p, state);
  prediction.input(1, { z: -1 }, 0.05);
  move(p, { z: -1 }, 0.05, "lobby", 0.05);
  assert.deepEqual(prediction.player, p);
  prediction.reconcile(p, { ...state, worldTime: 0.05 }, 1);
  prediction.input(2, { z: -1 }, 0.05);
  move(p, { z: -1 }, 0.05, "lobby", 0.1);
  assert.deepEqual(prediction.player, p);
});

test("toy-shot timers do not persist or change workshop scores", async () => {
  const { Game } = await import("../server/game.js");
  const game = new Game();
  const p = game.join(null, "ToyCheck", { bear: "panda" });
  p.earnings = 123;
  p.battlefieldScore = 7;
  Object.assign(p, { x: 0, y: 0, z: LOBBY_TANK.z + 2, grounded: true });
  move(p, {}, 0.05, "lobby", 0.05);
  assert.ok(p.lobbyTankAt != null);
  assert.equal(p.earnings, 123);
  assert.equal(p.battlefieldScore, 7);
  assert.equal(game.save().players[0].lobbyTankAt, undefined);
  move(p, {}, 0.05, "arena1", 0);
  assert.equal(p.lobbyTankAt, undefined);
});
