import test from "node:test";
import assert from "node:assert/strict";
import { frontReport } from "../shared/battlefield-results.js";
import { aircraftAt, weaponCycle } from "../shared/battlefield-ambience.js";
import {
  compareOrders,
  emptyOrder,
  battlefieldBounds,
  teamPositions,
} from "../shared/battlefield.js";

test("result language uses the viewer’s side for wins, losses, strength gaps and territory", () => {
  const r = {
    a: "red",
    b: "blue",
    ...compareOrders(
      { ...emptyOrder(), tank: 2 },
      { ...emptyOrder(), tank: 1 },
      1,
      2,
    ),
  };
  assert.deepEqual(frontReport(r, "red"), {
    enemyId: "blue",
    mine: 20,
    enemy: 10,
    margin: 10,
    points: 2,
    verdict: "win",
  });
  assert.equal(frontReport(r, "blue").verdict, "loss");
  assert.equal(frontReport(r, "blue").margin, -10);
  assert.equal(frontReport(r, "blue").points, 0);
  const tie = {
    a: "red",
    b: "blue",
    ...compareOrders(
      { ...emptyOrder(), troop: 2 },
      { ...emptyOrder(), troop: 2 },
      1,
      1,
    ),
  };
  assert.equal(frontReport(tie, "blue").verdict, "tie");
  assert.equal(frontReport(tie, "blue").points, 0.5);
  const empty = {
    a: "red",
    b: "blue",
    ...compareOrders(emptyOrder(), emptyOrder(), 1, 1),
  };
  assert.equal(frontReport(empty, "red").verdict, "empty");
  assert.throws(() => frontReport(r, "other"), /not on/);
});
test("fleet covers both sides of each layout with bounded trajectories and distinct weapon cadence", () => {
  for (const n of [2, 4, 6, 14, 20]) {
    const teams = Array.from({ length: n }, (_, i) => ({ id: "t" + i })),
      positions = teamPositions(teams),
      bounds = battlefieldBounds(teams);
    for (const time of [0, 25, 60, 120]) {
      const fleet = aircraftAt(time, positions);
      assert.equal(fleet.length, 8);
      assert.ok(fleet.some((p) => p.z > bounds.z));
      assert.ok(fleet.some((p) => p.z < -bounds.z));
      assert.equal(fleet.filter((p) => p.kind === "helicopter").length, 2);
      assert.ok(
        fleet.every((p) => [p.x, p.y, p.z, p.angle].every(Number.isFinite)),
      );
    }
  }
  assert.notEqual(weaponCycle(1, "tank"), weaponCycle(1, "heavy"));
});
