import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { floorArrow } from "../src/floor-arrows.js";
import { PRACTICE_HALL_WALLS, contains } from "../shared/world.js";
import { move } from "../shared/movement.js";
import {
  createCasinoPanda,
  animateCasinoPanda,
} from "../src/casino-characters.js";
test("Poker floor arrows lie flat, face the branch and have no protruding geometry", () => {
  const root = new THREE.Group(),
    arrow = floorArrow(root, -7, 26.5, -1);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(arrow);
  assert.ok(bounds.max.y - bounds.min.y < 0.000001);
  assert.ok(Math.abs(bounds.min.y - 0.025) < 0.000001);
  assert.ok(bounds.max.x - bounds.min.x > 1.9);
  assert.ok(bounds.max.z - bounds.min.z < 0.9);
});
test("shared practice hall has a real wall before each opening and head clearance at both branches", () => {
  for (const side of [-1, 1]) {
    const wall = PRACTICE_HALL_WALLS.find(
      (w) => w.x === side * 5.4 && w.h === 6,
    );
    assert.ok(contains(wall, side * 5.4, 20));
    assert.ok(!contains(wall, side * 5.4, 26.5));
    const lintel = PRACTICE_HALL_WALLS.find(
      (w) => w.x === side * 5.4 && w.h === 1,
    );
    assert.ok(lintel.y - lintel.h / 2 > 2.05);
    const blocked = { x: 0, z: 20, y: 0, vx: 0, vz: 0, vy: 0, grounded: true };
    for (let i = 0; i < 30; i++) move(blocked, { x: side }, 0.05, "lobby");
    assert.ok(Math.abs(blocked.x) < 5.1);
    const entry = { x: 0, z: 26.5, y: 0, vx: 0, vz: 0, vy: 0, grounded: true };
    for (let i = 0; i < 65; i++) move(entry, { x: side }, 0.05, "lobby");
    assert.ok(Math.abs(entry.x) > 19);
    assert.equal(entry.respawns || 0, 0);
  }
});
test("casino guests have different silhouettes, and guard head tracking leaves its body planted", () => {
  const root = new THREE.Group(),
    guests = Array.from({ length: 4 }, (_, i) =>
      createCasinoPanda(root, i * 3, 0, "player", 0, i),
    );
  assert.equal(new Set(guests.map((g) => g.kind)).size, 4);
  assert.ok(guests[2].root.scale.y < guests[0].root.scale.y);
  const guard = createCasinoPanda(root, 0, 4, "guard", 1, 7);
  animateCasinoPanda(guard, 3);
  const head = guard.head.rotation.y;
  animateCasinoPanda(guard, 8);
  assert.notEqual(guard.head.rotation.y, head);
  assert.equal(guard.root.rotation.y, 1);
  animateCasinoPanda(guard, 9, true);
  assert.equal(guard.head.rotation.y, 0);
});

test("rounded furniture and indexed props merge into one intact static paint batch", async () => {
  const { RoundedBoxGeometry } =
    await import("three/addons/geometries/RoundedBoxGeometry.js");
  const { batchStatic } = await import("../src/static-batch.js");
  const group = new THREE.Group(),
    mat = new THREE.MeshStandardMaterial({ color: "#222222" });
  group.add(new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.1), mat));
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), mat);
  sphere.position.x = 2;
  group.add(sphere);
  group.updateMatrixWorld(true);
  const before = new THREE.Box3().setFromObject(group);
  batchStatic(group);
  group.updateMatrixWorld(true);
  assert.equal(group.children.length, 1);
  const after = new THREE.Box3().setFromObject(group);
  assert.ok(
    before.min.distanceTo(after.min) < 0.00001 &&
      before.max.distanceTo(after.max) < 0.00001,
  );
});
