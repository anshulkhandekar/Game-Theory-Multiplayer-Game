import test from "node:test";
import assert from "node:assert/strict";
import { move, MOVEMENT } from "../shared/movement.js";
const player = () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
test("accelerates to a capped speed and brakes promptly", () => {
  const p = player();
  move(p, { x: 1, z: 0 }, 0.05);
  assert.ok(p.vx > 0 && p.vx < MOVEMENT.speed);
  for (let i = 0; i < 20; i++) move(p, { x: 1, z: 0 }, 0.05);
  assert.equal(p.vx, MOVEMENT.speed);
  const x = p.x;
  for (let i = 0; i < 5; i++) move(p, {}, 0.05);
  assert.equal(p.vx, 0);
  assert.ok(p.x - x < 1);
});
test("diagonal speed stays capped; arena boundary blocks outward velocity", () => {
  const p = player();
  for (let i = 0; i < 20; i++) move(p, { x: 1, z: 1 }, 0.05);
  assert.ok(Math.hypot(p.vx, p.vz) <= MOVEMENT.speed + 0.00001);
  p.x = 14;
  p.z = 0;
  p.vx = MOVEMENT.speed;
  p.vz = 0;
  move(p, { x: 1, z: 0 }, 0.05);
  assert.equal(p.x, 14);
  assert.equal(p.vx, 0);
});
test("holding Space produces one jump; releasing enables the next jump", () => {
  const p = player();
  move(p, { jump: true }, 0.05);
  assert.ok(p.y > 0);
  for (let i = 0; i < 40; i++) move(p, { jump: true }, 0.05);
  assert.equal(p.y, 0);
  move(p, { jump: false }, 0.05);
  move(p, { jump: true }, 0.05);
  assert.ok(p.y > 0);
});
test("landing absorbs airborne horizontal momentum on a platform", () => {
  const p = { x: 0, z: 0, y: 1, vy: -8, vx: 5, vz: 0, grounded: false };
  for (let i = 0; i < 120 && !p.grounded; i++)
    move(p, {}, 1 / 120, "arena2", i / 120);
  assert.equal(p.grounded, true);
  assert.equal(p.vx, 0);
  assert.equal(p.vz, 0);
});
