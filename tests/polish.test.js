import { loadAndCountdown } from "./lifecycle-helper.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../server/game.js";
import { move } from "../shared/movement.js";
import {
  platforms,
  timedPlatform,
  jumpPads,
  vaultsFor,
  insideVault,
  practicePlatforms,
  hazards,
} from "../shared/world.js";
test("names and chat reject profanity, obfuscation and slurs before broadcast", () => {
  const g = new Game();
  for (const name of ["fuck", "sh1t", "f u c k", "nigger"])
    assert.throws(() => g.join(null, name), /appropriate/);
  const p = g.join(null, "Class Captain");
  for (const text of ["fuck this", "sh1t", "f.u.c.k"])
    assert.throws(() => g.chat(p, text), /appropriate/);
  assert.equal(g.messages.length, 0);
  g.chat(p, "Hello classmates");
  assert.equal(g.messages.length, 1);
});
test("fourth vault exists only in later rounds and splits configurable rewards exactly once", () => {
  let now = 0;
  const g = new Game({ now: () => now });
  const a = g.join(null, "A"),
    b = g.join(null, "B");
  g.command("configure", { stage: 3, rewards: [120, 240, 360, 600] });
  g.command("ready");
  g.command("start");
  loadAndCountdown(g);
  now = 8000;
  g.tick(0.01);
  const v = g.vaults.find((v) => v.id === "sky");
  for (const p of [a, b]) Object.assign(p, { x: v.x, z: v.z, y: v.y });
  g.finish();
  assert.equal(a.earnings, 300);
  assert.equal(b.earnings, 300);
  g.finish();
  assert.equal(a.earnings, 300);
  g.command("lobby");
  g.command("configure", { stage: 1 });
  g.command("ready");
  g.command("start");
  loadAndCountdown(g);
  assert.equal(g.vaults.length, 3);
});
for (const stage of [3, 4, 5])
  test(`Sky route ${stage} is reachable through authoritative jump pads`, () => {
    const pads = jumpPads(`arena${stage}`),
      v = vaultsFor(stage).find((v) => v.id === "sky");
    let successful = false;
    // Search launch timing, not positions: every attempt still traverses all legs
    // using bounded inputs, timed colliders and automatic pad launches.
    for (let start = 0; start < 6.4 && !successful; start += 0.08) {
      const p = { x: pads[0].x, z: pads[0].z, y: 0, vy: 0, grounded: true };
      let time = start,
        failed = false;
      for (let leg = 0; leg < pads.length; leg++) {
        let arrived = false;
        for (let i = 0; i < 180; i++) {
          time += 0.01;
          const target = jumpPads(`arena${stage}`, time)[leg + 1] || {
            x: 0,
            z: 3.2,
            y: v.y,
          };
          const dx = target.x - p.x,
            dz = target.z - p.z,
            d = Math.hypot(dx, dz),
            k = Math.min(1, d * 0.95);
          move(
            p,
            { x: d ? (dx / d) * k : 0, z: d ? (dz / d) * k : 0 },
            0.01,
            `arena${stage}`,
            time,
          );
          if (
            (p.padCooldown || 0) > time &&
            p.y >= target.y - 0.05 &&
            d < target.w / 2 + 0.1
          ) {
            arrived = true;
            break;
          }
          if (leg === pads.length - 1 && insideVault(p, v)) {
            arrived = true;
            break;
          }
          if (p.respawns) {
            break;
          }
        }
        if (!arrived) {
          failed = true;
          break;
        }
      }
      successful = !failed && insideVault(p, v) && !p.respawns;
    }
    assert.ok(
      successful,
      "a complete timed bounce route reaches the Sky chamber",
    );
  });
test("lobby course landings are solid and punch cadence becomes much faster", () => {
  const b = practicePlatforms()[0],
    p = { x: b.x, z: b.z, y: b.y + 0.5, vy: -1 };
  for (let i = 0; i < 40; i++) move(p, {}, 0.01, "lobby", i * 0.01);
  assert.equal(p.y, b.y);
  const strikes = (stage) =>
    Array.from(
      { length: 1000 },
      (_, i) => hazards(i * 0.02, stage)[0].state,
    ).filter((s, i, a) => s === "active" && a[i - 1] !== "active").length;
  assert.ok(strikes(5) > strikes(4));
});

test("opposite airborne input reverses promptly while release retains momentum", () => {
  const p = { x: 0, z: 0, y: 8, vy: 0, vz: 6.8, vx: 0, grounded: false };
  move(p, { z: -1 }, 0.18, "arena2", 0.18);
  assert.ok(p.vz < -0.5);
  const q = { x: 0, z: 0, y: 8, vy: 0, vz: 6.8, vx: 0, grounded: false };
  move(q, {}, 0.18, "arena2", 0.18);
  assert.ok(q.vz > 6.5);
});
test("descending onto a vault floor corner lands before lateral resolution", () => {
  const v = vaultsFor(2)[1],
    p = { x: v.x + 3.55, z: v.z + 3.55, y: v.y + 0.03, vy: -2, vx: 0, vz: 0 };
  move(p, { x: -1, z: -1 }, 0.03, "arena2", 0.03);
  assert.equal(p.y, v.y);
  assert.equal(p.grounded, true);
  for (let i = 1; i < 50; i++)
    move(p, { x: -1, z: -1 }, 0.01, "arena2", i * 0.01);
  assert.ok(p.y >= v.y);
  assert.equal(p.respawns, undefined);
});

test("round-three diamond has two moving landings while gold has one", () => {
  const ps = platforms(0, 3);
  assert.equal(ps.filter((p) => p.route === "gold" && p.moving).length, 1);
  assert.equal(ps.filter((p) => p.route === "diamond" && p.moving).length, 2);
});
test("flipping face and edge match collider extents; shrinking center is fixed", () => {
  const base = {
    id: "test",
    x: 0,
    z: 0,
    y: 3,
    w: 3,
    d: 3,
    h: 0.5,
    flipping: true,
  };
  const flat = timedPlatform(base, 0),
    vertical = timedPlatform(base, 2.2),
    turning = timedPlatform(base, 1.8);
  assert.equal(flat.d, 3);
  assert.ok(Math.abs(vertical.d - 0.5) < 0.001);
  assert.ok(Math.abs(vertical.h - 3) < 0.001);
  assert.equal(turning.walkable, false);
  const shrink = timedPlatform(
    { ...base, flipping: false, shrinking: true },
    1.2,
  );
  assert.equal(shrink.x, 0);
  assert.equal(shrink.z, 0);
  assert.ok(shrink.w < 1.2);
});
test("practice hall is reachable on foot and a gym fall returns to lobby center", () => {
  const p = { x: 0, z: 15, y: 0, vy: 0, grounded: true };
  for (let i = 1; i <= 150; i++) move(p, { z: 1 }, 0.02, "lobby", i * 0.02);
  assert.ok(p.z > 30);
  Object.assign(p, { x: 8, z: 40, y: 3, vy: -4 });
  for (let i = 1; i <= 80; i++) move(p, {}, 0.02, "lobby", i * 0.02);
  assert.equal(p.respawns, 1);
  assert.equal(p.z, 1);
  assert.equal(p.x, 0);
});

test("each practice-course jump has a valid timing with live hazards and colliders", () => {
  const ids = practicePlatforms(0).map((p) => p.id);
  for (let leg = 1; leg < ids.length; leg++) {
    let reachable = false;
    for (let start = 0; start < 6.4 && !reachable; start += 0.12) {
      const previous = practicePlatforms(start)[leg - 1];
      if (previous.walkable === false) continue;
      const p = {
        x: previous.x,
        z: previous.z,
        y: previous.y,
        vy: 0,
        vx: 0,
        vz: 0,
        grounded: true,
        support: previous.id,
      };
      let time = start;
      for (let frame = 0; frame < 120; frame++) {
        time += 0.01;
        const target = practicePlatforms(time)[leg];
        const dx = target.x - p.x,
          dz = target.z - p.z,
          d = Math.hypot(dx, dz),
          k = Math.min(1, d * 0.95);
        move(
          p,
          {
            x: d ? (dx / d) * k : 0,
            z: d ? (dz / d) * k : 0,
            jump: frame === 0,
          },
          0.01,
          "lobby",
          time,
        );
        if (p.grounded && p.support === ids[leg]) {
          reachable = true;
          break;
        }
        if (p.respawns) break;
      }
    }
    assert.ok(reachable, `practice jump ${leg} can be timed`);
  }
});
