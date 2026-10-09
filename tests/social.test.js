import { loadAndCountdown } from "./lifecycle-helper.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../server/game.js";
import { move } from "../shared/movement.js";
import { hazards, platforms } from "../shared/world.js";

test("airborne release preserves momentum while ground movement brakes", () => {
  const p = { x: 0, z: 0, y: 0, vx: 6.8, vz: 0, vy: 0, grounded: true };
  move(p, { jump: true }, 0.05, "arena1", 0.05);
  const takeoff = p.vx;
  for (let i = 2; i <= 7; i++) move(p, {}, 0.05, "arena1", i * 0.05);
  assert.ok(p.y > 0 && p.vx > takeoff * 0.9);
  assert.ok(p.x > 2);
  Object.assign(p, { y: 0, vy: 0, grounded: true });
  for (let i = 0; i < 8; i++) move(p, {}, 0.05, "arena1", 1 + i * 0.05);
  assert.equal(p.vx, 0);
});
test("lobby chat validates text, limits rate, remains separate from round events", () => {
  let now = 0;
  const g = new Game({ now: () => now });
  const p = g.join(null, "A");
  g.chat(p, "  Hi\n<script>alert(1)</script>  ");
  assert.equal(g.snapshot().messages[0].text, "Hi<script>alert(1)</script>");
  assert.throws(() => g.chat(p, "Again"), /Wait/);
  now = 2000;
  assert.throws(() => g.chat(p, " "), /characters/);
  assert.throws(() => g.chat(p, "x".repeat(161)), /characters/);
  assert.throws(() => g.chat(p, {}), /Invalid/);
  g.emote(p, "wave");
  assert.equal(g.snapshot().players[0].emoteAge, 0);
  assert.throws(() => g.emote(p, "scuba"), /Wait/);
  now = 5000;
  assert.throws(() => g.emote(p, "unknown"), /Invalid/);
  g.command("ready");
  g.command("start");
  loadAndCountdown(g);
  now += 8000;
  g.tick(0.02);
  assert.throws(() => g.chat(p, "round chat"), /lobby/);
  assert.throws(() => g.emote(p, "dance"), /Invalid/);
  g.message(p, "event", "fell");
  assert.ok(g.snapshot().messages.every((m) => m.kind === "event"));
  for (let i = 0; i < 100; i++) g.message(p, "event", "fell");
  assert.equal(g.messages.length, 80);
  assert.equal(g.save().messages, undefined, "social history is not persisted");
});
test("spikes cover the full landing and remain harmless during warning", () => {
  const h = hazards(1, 5).find((h) => h.kind === "spikes");
  const platform = platforms(1, 5).find((p) => p.id === h.platform);
  assert.equal(h.w, platform.w);
  assert.equal(h.d, platform.d);
  const p = {
    x: h.x + h.w / 2 - 0.2,
    z: h.z,
    y: h.y,
    vy: 0,
    grounded: true,
    support: h.platform,
  };
  move(p, {}, 0.02, "arena5", 1);
  assert.equal(p.respawns, undefined);
  move(p, {}, 0.02, "arena5", 2);
  assert.equal(p.lastRespawn, "spikes");
  assert.equal(p.respawns, 1);
  assert.equal(hazards(0, 4).filter((h) => h.kind === "puncher").length, 6);
  assert.equal(hazards(0, 5).filter((h) => h.kind === "puncher").length, 9);
});
test("round event feed records authoritative falls and vault entry", () => {
  let now = 0;
  const g = new Game({ now: () => now });
  const p = g.join(null, "A");
  g.command("configure", { stage: 2 });
  g.command("ready");
  g.command("start");
  loadAndCountdown(g);
  now = 8000;
  g.tick(0.02);
  p.y = -7;
  g.tick(0.02);
  assert.equal(g.snapshot().messages.at(-1).text, "fell");
  const v = g.vaults[0];
  Object.assign(p, { x: v.x, z: v.z, y: v.y + 1, vy: -3, grounded: false });
  for (let i = 0; i < 20; i++) g.tick(0.02);
  assert.ok(
    g.snapshot().messages.some((m) => m.text === "entered the bronze vault"),
  );
});
