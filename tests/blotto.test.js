import test from "node:test";
import assert from "node:assert/strict";
import { blottoResult, inBlottoRoom } from "../shared/blotto.js";
import { move } from "../shared/movement.js";
import { lobbyRegion } from "../shared/world.js";
test("Blotto requires three distinct cards and scores front wins, including draws", () => {
  assert.equal(blottoResult([1, 2, 3], [3, 1, 2]).outcome, "You win");
  assert.equal(blottoResult([3, 1, 2], [1, 2, 3]).outcome, "Bot wins");
  assert.equal(blottoResult([1, 2, 3], [1, 2, 3]).outcome, "Tie");
  assert.throws(() => blottoResult([1, 1, 3], [1, 2, 3]), /each card/);
});
test("lobby practice branch is reachable on solid ground and bounded independently of parkour", () => {
  const p = { x: 0, z: 27, y: 0, vx: 0, vz: 0, vy: 0, grounded: true };
  for (let i = 0; i < 65; i++) move(p, { x: 1 }, 0.05, "lobby");
  assert.ok(p.x > 19);
  assert.ok(lobbyRegion(p.x, p.z));
  assert.equal(p.y, 0);
  for (let i = 0; i < 45; i++) move(p, { z: 1 }, 0.05, "lobby");
  assert.ok(inBlottoRoom(p));
  assert.equal(p.y, 0);
  assert.equal(p.lastRespawn, undefined);
  for (let i = 0; i < 100; i++) move(p, { x: 1 }, 0.05, "lobby");
  assert.ok(p.x <= 30);
  assert.ok(inBlottoRoom(p));
});
