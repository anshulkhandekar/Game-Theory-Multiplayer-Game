import test from "node:test";
import assert from "node:assert/strict";
import { soundDistance, audibleStructures } from "../shared/sound.js";
import { move, MOVEMENT } from "../shared/movement.js";
test("sound falls off with distance and elevation and caps nearby machine voices", () => {
  const listener = { x: 0, y: 0, z: 0 };
  assert.equal(soundDistance(listener, listener), 1);
  assert.equal(soundDistance({ x: 12, y: 0, z: 0 }, listener), 0);
  assert.equal(soundDistance({ x: 0, y: 20, z: 0 }, listener), 0);
  const structures = [
    { id: "far", x: 9, z: 0 },
    { id: "near", x: 1, z: 0 },
    { id: "middle", x: 4, z: 0 },
  ];
  assert.deepEqual(
    audibleStructures(structures, listener).map((p) => p.id),
    ["near", "middle"],
  );
});
test("Griddy physically advances at one-fifth walking speed and respects lobby boundaries", () => {
  const p = {
    x: 0,
    y: 0,
    z: 0,
    grounded: true,
    emoteActive: true,
    emoteName: "griddy",
    emoteFacing: 0,
  };
  for (let i = 0; i < 60; i++) move(p, {}, 1 / 60, "lobby", i / 60);
  assert.ok(p.z > 1 && p.z < 1.5);
  assert.ok(Math.abs(p.vz - MOVEMENT.speed * 0.2) < 0.01);
  p.x = 18.8;
  p.z = 0;
  p.emoteFacing = Math.PI / 2;
  for (let i = 0; i < 120; i++) move(p, {}, 1 / 60, "lobby", i / 60);
  assert.ok(p.x <= 19);
  p.x = 0;
  p.z = 0;
  p.emoteActive = false;
  for (let i = 0; i < 30; i++) move(p, { x: 1, z: 0 }, 1 / 60, "lobby", i / 60);
  assert.ok(p.vx > MOVEMENT.speed * 0.8);
});
