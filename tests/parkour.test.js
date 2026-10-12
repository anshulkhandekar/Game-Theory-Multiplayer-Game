import { loadAndCountdown } from "./lifecycle-helper.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../server/game.js";
import { move } from "../shared/movement.js";
import {
  platforms,
  vaultsFor,
  toWorld,
  hazards,
  insideVault,
  STAGES,
} from "../shared/world.js";
test("round 2 transition, height-aware payout and pause freeze", () => {
  let now = 0;
  const g = new Game({ now: () => now, duration: 5 });
  const a = g.join(null, "A"),
    b = g.join(null, "B");
  g.command("configure", { stage: 2, duration: 5 });
  g.command("ready");
  g.command("start");
  assert.equal(g.phase, "loading");
  assert.equal(g.world, "arena2");
  now = 1500;
  g.tick(0.05);
  assert.equal(g.phase, "loading");
  loadAndCountdown(g);
  assert.equal(g.phase, "countdown");
  now = 9500;
  g.tick(0.05);
  assert.equal(g.phase, "active");
  const v = g.vaults[2];
  Object.assign(a, { x: v.x, z: v.z, y: v.y });
  Object.assign(b, { x: v.x, z: v.z, y: 0 });
  assert.equal(g.occupancy().diamond, 1);
  g.command("pause");
  const time = g.worldTime;
  now += 10000;
  g.tick(0.05);
  assert.equal(g.worldTime, time);
  assert.equal(g.snapshot().remaining, 5);
  g.command("resume");
  now += 5000;
  g.tick(0.05);
  assert.equal(a.earnings, 360);
  assert.equal(b.earnings, 0);
  g.finish();
  assert.equal(a.earnings, 360);
});
test("falls respawn, elevated landing, and moving platform carries its rider", () => {
  const p = { x: 20, z: 0, y: 0, vy: 0 };
  for (let i = 0; i < 60; i++) move(p, {}, 0.05, "arena2", i * 0.05);
  assert.ok(p.respawns >= 1);
  assert.equal(p.y, 0);
  const top = platforms().find((p) => p.id === "gold");
  Object.assign(p, { x: top.x, z: top.z, y: top.y + 0.8, vy: -1 });
  for (let i = 0; i < 15; i++) move(p, {}, 0.05, "arena2", 0);
  assert.equal(p.y, top.y);
  assert.equal(p.grounded, true);
  const stone = platforms(0).find((p) => p.moving);
  Object.assign(p, {
    x: stone.x,
    z: stone.z,
    y: stone.y,
    vy: 0,
    grounded: true,
    support: stone.id,
  });
  move(p, {}, 0.05, "arena2", 0.05);
  assert.ok(Math.abs(p.x - platforms(0.05).find((p) => p.moving).x) < 0.001);
  assert.equal(p.support, stone.id);
});
test("jump can reach the next elevated stone using only valid inputs", () => {
  const p = { x: 0, z: -4.4, y: 0, vy: 0, grounded: true, support: "spawn" };
  for (let i = 0; i < 15; i++)
    move(
      p,
      { x: 0, z: i < 10 ? -1 : 0, jump: i === 0 },
      0.05,
      "arena2",
      i * 0.05,
    );
  assert.ok(p.z < -2.5);
  assert.ok(p.support?.startsWith("gold-"));
  assert.equal(p.respawns, undefined);
});

test("solid platform sides block walking and their undersides stop rising heads", () => {
  const stone = platforms(0, 2).find((p) => p.id === "bronze-2");
  const p = {
    x: stone.x - stone.w / 2 - 0.7,
    z: stone.z,
    y: stone.y - 0.35,
    vy: 0,
  };
  for (let i = 0; i < 12; i++) move(p, { x: 1 }, 0.01, "arena2", i * 0.01);
  assert.ok(p.x <= stone.x - stone.w / 2 - 0.31);
  const q = { x: stone.x, z: stone.z, y: stone.y - 0.7 - 2.05 - 0.2, vy: 7 };
  for (let i = 0; i < 8; i++) move(q, {}, 0.01, "arena2", i * 0.01);
  assert.ok(q.y + 2.05 <= stone.y - 0.7 + 0.001);
  assert.ok(q.vy <= 0);
});
test("rotated chambers block their walls but admit the front door and clear occupancy on exit", () => {
  const v = vaultsFor(1)[0];
  const p = { ...toWorld({ x: 0, z: 4 }, v), y: 0, vy: 0, grounded: true };
  const toward = { x: -Math.sin(v.angle), z: -Math.cos(v.angle) };
  for (let i = 0; i < 35; i++) move(p, toward, 0.02, "arena1", i * 0.02);
  assert.ok(insideVault(p, v), "walked through door");
  for (let i = 0; i < 70; i++) move(p, toward, 0.02, "arena1", i * 0.02);
  assert.ok(insideVault(p, v), "back wall stops movement");
  for (let i = 0; i < 80; i++)
    move(p, { x: -toward.x, z: -toward.z }, 0.02, "arena1", i * 0.02);
  assert.equal(insideVault(p, v), false, "exit clears occupancy");
});
test("spike warning precedes activation and active spikes cause a server-compatible respawn", () => {
  const safe = hazards(0, 5).find((h) => h.kind === "spikes"),
    warn = hazards(1, 5).find((h) => h.kind === "spikes"),
    hot = hazards(2, 5).find((h) => h.kind === "spikes");
  assert.equal(safe.state, "safe");
  assert.equal(warn.state, "warning");
  assert.equal(hot.state, "active");
  const p = { x: hot.x, z: hot.z, y: hot.y, grounded: true, vy: 0 };
  move(p, {}, 0.02, "arena5", 2);
  assert.equal(p.respawns, 1);
  assert.equal(p.lastRespawn, "spikes");
  assert.equal(p.y, 0);
});
test("host progresses through all five rounds and practice cannot advance the scored sequence", () => {
  let now = 0;
  const g = new Game({ now: () => now });
  const p = g.join(null, "A");
  for (let stage = 1; stage <= 5; stage++) {
    assert.equal(g.stage, stage);
    if (g.phase !== "ready") g.command("ready");
    g.command("start");
    loadAndCountdown(g);
    now += 8000;
    g.tick(0.05);
    const v = g.vaults[0];
    Object.assign(p, { x: v.x, z: v.z, y: v.y });
    g.command("results");
    assert.equal(g.results[0].payout, 120);
    assert.equal(p.earnings, 120 * stage);
    if (stage < 5) {
      g.command("next");
      assert.equal(g.phase, "ready");
    }
  }
  assert.throws(() => g.command("next"));
  assert.equal(g.scoredRound, 5);
  g.command("practice");
  loadAndCountdown(g);
  now += 8000;
  g.tick(0.05);
  g.command("results");
  assert.throws(() => g.command("next"));
  assert.equal(p.earnings, 600);
});

for (const stage of [2, 3, 4, 5])
  test(`round ${stage}: all three routes are reachable with actual collision and hazard rules`, () => {
    for (const route of ["bronze", "gold", "diamond"]) {
      const p = { x: 0, z: 1, y: 0, vy: 0, grounded: true, support: "spawn" };
      const first = platforms(0, stage).find(s=>s.route===route);
      const factor = 5.6 / Math.max(Math.abs(first.x),Math.abs(first.z-1));
      // Walk to the launch edge on the enlarged spawn before jumping the gap.
      for(let n=0;n<300 && Math.hypot(p.x-first.x*factor,p.z-(1+(first.z-1)*factor))>.12;n++) {
        const dx=first.x*factor-p.x,dz=1+(first.z-1)*factor-p.z,d=Math.hypot(dx,dz);
        move(p,{x:dx/d*Math.min(1,d),z:dz/d*Math.min(1,d)},.02,`arena${stage}`,0);
      }
      let time = 0;
      const stones = platforms(0, stage)
        .filter((s) => s.route === route)
        .map((s) => s.id);
      const v = vaultsFor(stage).find((v) => v.id === route);
      for (const targetId of [...stones, route]) {
        // Time jumps for both a safe hazard interval and a reachable moving landing.
        for (let wait = 0; wait < 350; wait++) {
          const target =
            targetId === route
              ? { ...toWorld({ x: 0, z: 2.1 }, v), y: v.y }
              : platforms(time + 0.55, stage).find((s) => s.id === targetId);
          const targetHazards = hazards(time, stage).filter(
            (h) => h.platform === targetId,
          );
          const clear = targetHazards.every((h) =>
            Array.from({ length: 9 }, (_, i) =>
              hazards(time + 0.3 + i * 0.1, stage).find((x) => x.id === h.id),
            ).every((x) => x.extension <= 0.45),
          );
          if (clear && Math.hypot(target.x - p.x, target.z - p.z) < 4.1) break;
          time += 0.02;
          move(p, {}, 0.02, `arena${stage}`, time);
        }
        let reached = false;
        for (let frame = 0; frame < 180; frame++) {
          time += 0.02;
          const target =
            targetId === route
              ? { ...toWorld({ x: 0, z: 2.1 }, v), y: v.y }
              : platforms(time, stage).find((s) => s.id === targetId);
          const dx = target.x - p.x,
            dz = target.z - p.z,
            dist = Math.hypot(dx, dz),
            strength = Math.min(1, dist * 0.75);
          move(
            p,
            {
              x: dist ? (dx / dist) * strength : 0,
              z: dist ? (dz / dist) * strength : 0,
              jump: frame === 0,
            },
            0.02,
            `arena${stage}`,
            time,
          );
          if (
            p.grounded &&
            (p.support === targetId ||
              (stage === 2 &&
                Number(p.support?.split("-")[1]) >
                  Number(targetId.split("-")[1]))) &&
            (dist < 0.45 || (stage === 2 && targetId !== route))
          ) {
            reached = true;
            break;
          }
        }
        assert.ok(
          reached,
          `stage ${stage} ${route}: ${targetId} at ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}, support ${p.support}`,
        );
        assert.equal(p.respawns, undefined, `${route}: no falls/spike hits`);
        for (let frame = 0; frame < 15; frame++) {
          time += 0.02;
          move(p, {}, 0.02, `arena${stage}`, time);
        }
      }
      assert.ok(insideVault(p, v), `${route}: final position earns a share`);
      assert.ok(
        time < STAGES[stage - 1].duration,
        `${route}: within this round’s deadline`,
      );
    }
  });

test("round 2 assists adjacent rising ledges without Space; round 3 requires a jump", () => {
  const stone = platforms(0,2).find(s=>s.id==="gold-1");
  const p = { x: stone.x, z: stone.z, y: stone.y, vy: 0, grounded: true, support: stone.id };
  let highest = 0;
  for (let i = 1; i <= 120; i++) {
    move(p, { z: -1 }, 0.02, "arena2", i * 0.02);
    highest = Math.max(highest, p.y);
  }
  assert.ok(
    highest > 0.6,
    "walking automatically hops small neighboring ledges",
  );
  const q = { x: 0, z: -1.7, y: 0, vy: 0, grounded: true, support: "spawn" };
  let jumped = false;
  for (let i = 1; i <= 80; i++) {
    move(q, { z: -1 }, 0.02, "arena3", i * 0.02);
    jumped ||= q.vy > 0;
  }
  assert.equal(jumped, false, "assist is limited to round 2");
});

test("punchers warn, strike continuously, launch sideways once, and permit dodging", () => {
  const h = hazards(4, 4)[0];
  assert.equal(h.kind, "puncher");
  const warnA = hazards(2.9, 4)[0],
    warnB = hazards(3.05, 4)[0];
  assert.equal(warnA.state, "warning");
  assert.notEqual(warnA.extension, warnB.extension, "wind-up visibly flutters");
  const p = { x: h.x, z: h.z, y: h.y - 0.6, grounded: true, vy: 0 };
  move(p, {}, 0.02, "arena4", 4);
  assert.ok(p.vx * h.nx + p.vz * h.nz > 8, "server applies outward impulse");
  assert.ok(p.vy > 4);
  assert.equal(p.respawns, undefined, "launch precedes falling/respawning");
  const cooldown = p.hazardCooldown;
  move(p, {}, 0.02, "arena4", 4.02);
  assert.equal(
    p.hazardCooldown,
    cooldown,
    "contact does not repeatedly launch",
  );
  const q = { x: h.x, z: h.z, y: h.y + 2, vy: 0 };
  move(q, {}, 0.02, "arena4", 4);
  assert.equal(q.launchedUntil, undefined, "jump clear avoids contact");
});

test("round 3 vaults form an equilateral triangle around spawn and rounds differ", () => {
  const v = vaultsFor(3).filter((v) => v.id !== "sky");
  const distances = v.map((p, i) =>
    Math.hypot(p.x - v[(i + 1) % 3].x, p.z - v[(i + 1) % 3].z),
  );
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.001);
  assert.ok(v.some((p) => p.z > 1) && v.some((p) => p.z < 1));
  assert.ok(hazards(0, 4).every((h) => h.kind === "puncher"));
  assert.ok(hazards(0, 5).some((h) => h.kind === "spikes"));
  const a = platforms(0, 5).find((p) => p.moving);
  const positions = Array.from({ length: 70 }, (_, i) =>
    platforms(i * 0.05, 5).find((p) => p.id === a.id),
  );
  const travel = Math.max(
    ...positions.map((p) => Math.hypot(p.x - a.x, p.z - a.z)),
  );
  assert.ok(travel > 2, "moving landing covers a visibly wider range");
});

test("players may overlap without blocking; a new round clears launch momentum", () => {
  let now = 0;
  const g = new Game({ now: () => now });
  const a = g.join(null, "A"),
    b = g.join(null, "B");
  g.command("ready");
  g.command("start");
  loadAndCountdown(g);
  now = 8000;
  g.tick(0.02);
  for (const p of [a, b])
    Object.assign(p, {
      x: 0,
      z: 0,
      y: 0,
      vx: 0,
      vz: 0,
      input: { x: 1 },
      lastInput: now,
    });
  g.tick(0.02);
  assert.equal(a.x, b.x);
  assert.equal(a.z, b.z);
  assert.ok(a.x > 0);
  a.launchedUntil = 100;
  a.hazardCooldown = 100;
  g.command("results");
  g.command("next");
  g.command("start");
  loadAndCountdown(g);
  assert.equal(a.launchedUntil, 0);
  assert.equal(a.hazardCooldown, 0);
  assert.equal(a.vx, 0);
});
