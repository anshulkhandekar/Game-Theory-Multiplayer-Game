import test from "node:test";
import assert from "node:assert/strict";
import {
  WARDROBE,
  normalizeAppearance,
  randomAppearance,
} from "../shared/wardrobe.js";
import { Game } from "../server/game.js";
import { move } from "../shared/movement.js";
test("all wardrobe choices survive validation and saved-session recovery", () => {
  for (const [key, options] of Object.entries(WARDROBE))
    for (const [value] of options) {
      const game = new Game();
      const appearance = normalizeAppearance({ [key]: value });
      const player = game.join(null, "Bear", appearance);
      const restored = new Game({ saved: game.save() });
      assert.deepEqual(
        restored.join(player.token, "Bear").appearance,
        appearance,
      );
    }
  assert.equal(
    normalizeAppearance({ shirt: "<script>", hat: "unknown" }).shirt,
    "none",
  );
  assert.equal(
    normalizeAppearance({ bear: "panda", color: "mint" }).shirt,
    "none",
  );
  assert.deepEqual(
    normalizeAppearance(randomAppearance(() => 0)),
    randomAppearance(() => 0),
  );
});
test("clothing has no effect on movement, collision or jump", () => {
  const bare = {
    x: 0,
    y: 0,
    z: 0,
    grounded: true,
    appearance: normalizeAppearance({}),
  };
  const dressed = {
    ...bare,
    appearance: normalizeAppearance({
      shirt: "adsc",
      hat: "headphones",
      color: "tie",
      glasses: "money",
    }),
  };
  for (let i = 0; i < 120; i++) {
    const input = { x: 1, z: 0.2, jump: i === 20 };
    move(bare, input, 1 / 60, "lobby", i / 60);
    move(dressed, input, 1 / 60, "lobby", i / 60);
  }
  for (const field of ["x", "y", "z", "vx", "vy", "vz", "grounded", "support"])
    assert.equal(bare[field], dressed[field]);
});
