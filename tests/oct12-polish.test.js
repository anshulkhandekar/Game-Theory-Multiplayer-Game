import test from "node:test";
import assert from "node:assert/strict";
import { platforms, vaultsFor } from "../shared/world.js";
import { MOVEMENT, move } from "../shared/movement.js";
import {
  WARDROBE,
  randomAppearance,
  normalizeAppearance,
} from "../shared/wardrobe.js";
test("round-two diamond moving landing matches the round-five lateral motion", () => {
  const lateral = (stage, t) => {
    const v = vaultsFor(stage).find((v) => v.id === "diamond"),
      d = Math.hypot(v.x, v.z - 1),
      p = platforms(t, stage).find((p) => p.route === "diamond" && p.moving);
    return (-p.x * (v.z - 1)) / d + ((p.z - 1) * v.x) / d;
  };
  for (let i = 0; i < 30; i++) {
    const t = i * 0.13;
    assert.ok(
      Math.abs(
        lateral(2, t + 0.02) -
          lateral(2, t) -
          (lateral(5, t + 0.02) - lateral(5, t)),
      ) < 1e-9,
    );
  }
});
test("diamond height bridge cannot be bypassed with a direct jump between its fixed neighbors", () => {
  const stones = platforms(0, 2).filter((p) => p.route === "diamond"),
    mover = stones.findIndex((p) => p.moving),
    before = stones[mover - 1],
    after = stones[mover + 1];
  assert.ok(after.y - before.y > MOVEMENT.jump ** 2 / (2 * MOVEMENT.gravity));
  for (let phase = 0; phase < 2; phase += 0.1) {
    const p = {
        x: before.x,
        z: before.z,
        y: before.y,
        vy: 0,
        grounded: true,
        support: before.id,
      },
      dx = after.x - before.x,
      dz = after.z - before.z,
      d = Math.hypot(dx, dz);
    let usedMover = false;
    for (let frame = 0; frame < 70; frame++) {
      move(
        p,
        { x: dx / d, z: dz / d, jump: frame === 0 },
        0.02,
        "arena2",
        phase + frame * 0.02,
      );
      if (p.support === stones[mover].id) usedMover = true;
      if (p.support === after.id)
        assert.ok(
          usedMover,
          "must touch the moving bridge before the next fixed landing",
        );
    }
  }
});
test("new outfit options remain valid through randomization", () => {
  assert.ok(WARDROBE.hat.some(([v]) => v === "helmet"));
  assert.ok(WARDROBE.shirt.some(([v]) => v === "army"));
  for (let i = 0; i < 500; i++)
    assert.deepEqual(
      normalizeAppearance(randomAppearance(() => i / 500)),
      randomAppearance(() => i / 500),
    );
});
