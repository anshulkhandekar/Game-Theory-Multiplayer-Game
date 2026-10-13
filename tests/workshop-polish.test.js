import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../server/game.js";
import { appropriateText } from "../server/moderation.js";
import { canEmote } from "../shared/emotes.js";
import { broadcastCamera, defaultBroadcast } from "../shared/broadcast.js";
import { loadAndCountdown } from "./lifecycle-helper.js";
import { move, canMove } from "../shared/movement.js";
import { validateState } from "../server/storage.js";

test("decorated, confusable and spaced slurs are rejected in names and chat without blocking ordinary words", () => {
  for (const text of [
    "nllgger",
    "xxNllgger99",
    "n1gg3r",
    "n.i.g.g.e.r",
    "n і g g е r",
    "n\u200digg\u200ber",
    "nïgger",
    "F@gg0t",
  ]) {
    const g = new Game(),
      p = g.join(null, "Tester");
    assert.throws(() => g.join(null, text), /appropriate/);
    assert.throws(() => g.chat(p, text), /appropriate/);
  }
  for (const text of [
    "Class of 2027",
    "Knight",
    "Nigeria",
    "Niggle",
    "Dickens",
    "Scunthorpe",
    "Assassin",
    "Helpful classmate",
  ])
    assert.equal(appropriateText(text), text);
});
test("repeated scored arenas add once each, retain vault history after restart, and clear round events", () => {
  let now = 0;
  const g = new Game({ now: () => now }),
    p = g.join(null, "Tester");
  for (let i = 0; i < 2; i++) {
    g.command("ready");
    g.command("start");
    assert.equal(g.snapshot().messages.length, 0);
    loadAndCountdown(g);
    now += 8000;
    g.tick(0.05);
    Object.assign(p, { x: -9, z: -5, y: 0 });
    g.message(p, "event", "entered the bronze vault");
    g.finish();
    g.finish();
  }
  assert.equal(p.earnings, 240);
  assert.equal(g.roundHistory.length, 2);
  assert.deepEqual(
    g.roundHistory.map((r) => r.round),
    [1, 1],
  );
  assert.deepEqual(
    g.roundHistory.map((r) => r.players[0].vault),
    ["bronze", "bronze"],
  );
  const saved = validateState(g.save()),
    restored = new Game({ saved });
  assert.deepEqual(restored.roundHistory, g.roundHistory);
  assert.equal(restored.players.get(p.id).earnings, 240);
  assert.equal(g.snapshot().roundHistory, undefined);
  g.command("practice");
  loadAndCountdown(g);
  now += 8000;
  g.tick(0.05);
  g.finish();
  assert.equal(g.roundHistory.length, 2);
});
test("emotes respect tutorial completion, game phase, pauses and expiry in Poker", () => {
  let now = 0;
  const g = new Game({ now: () => now }),
    p = g.join(null, "Tester");
  g.command("ready");
  g.command("start");
  assert.equal(canEmote(g, p), false);
  g.acknowledgeLoad(p, g.round);
  g.acknowledgeLoad(p, g.round, true);
  g.emote(p, "scuba");
  assert.equal(g.messages.at(-1).text, "scuba-ed");
  g.command("countdown");
  assert.equal(p.emoteActive, false);
  assert.equal(canEmote(g, p), false);
  g.command("lobby");
  now += 3000;
  g.command("poker");
  g.emote(p, "wave");
  now += 2400;
  g.tick(0.01);
  assert.equal(p.emoteActive, false);
  for (const phase of ["countdown", "playing"]) {
    g.poker.phase = phase;
    assert.equal(canEmote(g, p), false);
  }
  for (const phase of ["instructions", "results"]) {
    g.poker.phase = phase;
    assert.equal(canEmote(g, p), true);
  }
  g.poker.paused = true;
  assert.equal(canEmote(g, p), false);
  assert.equal(
    canEmote(
      { phase: "battlefield", battlefield: { phase: "planning" } },
      { connected: true },
    ),
    true,
  );
});
test("practice seating requires the correct room, freezes movement, exits and survives no disconnect/restart", () => {
  const g = new Game(),
    p = g.join(null, "Tester");
  assert.throws(() => g.practiceSeat(p, "poker"), /Walk/);
  p.x = -22;
  p.z = 41;
  g.practiceSeat(p, "poker");
  assert.equal(p.z, 43.15);
  assert.equal(canMove(g.snapshot(), p), false);
  move(p, { x: 1, z: 1, jump: true }, 0.1, "lobby", 0);
  assert.equal(p.x, -22);
  assert.equal(p.y, 0);
  g.practiceSeat(p, null);
  assert.equal(canMove(g.snapshot(), p), true);
  move(p, { x: 1 }, 0.1, "lobby", 0);
  assert.ok(p.x > -22);
  p.x = 22;
  p.z = 40;
  g.practiceSeat(p, "blotto");
  assert.equal(p.z, 40.85);
  g.disconnect(p);
  assert.equal(p.practiceSeat, null);
});
test("kick prevents saved identity from rejoining, including after restart, until allowed", () => {
  const g = new Game(),
    p = g.join(null, "Tester"),
    token = p.token;
  g.command("kickPlayer", { id: p.id });
  assert.throws(() => g.join(token, "AnotherName"), /Removed/);
  const restored = new Game({ saved: g.save() });
  assert.throws(() => restored.join(token, "AnotherName"), /Removed/);
  restored.command("allowPlayer", { id: p.id });
  assert.equal(restored.join(token, "Tester").id, p.id);
});
test("broadcast follows the direction of movement and offers a fixed overhead arena shot", () => {
  const s = {
    world: "arena1",
    stage: 1,
    players: [{ id: "p", connected: true, x: 10, z: 12, y: 0, vx: 6, vz: 0 }],
    broadcast: { ...defaultBroadcast(), mode: "player", target: "p" },
  };
  const shot = broadcastCamera(s, 1);
  assert.ok(shot.position.x < 10);
  assert.ok(shot.target.x > 10);
  assert.equal(shot.position.z, 12);
  s.broadcast.mode = "sky";
  assert.deepEqual(broadcastCamera(s, 1), broadcastCamera(s, 99));
  assert.equal(broadcastCamera(s, 1).position.x, 0);
  s.broadcast.mode = "auto";
  assert.notDeepEqual(broadcastCamera(s, 1), broadcastCamera(s, 9));
});
test("automatic Battlefield begins combat wide and base shots circle the open barracks frontage", () => {
  const s = {
    world: "battlefield1",
    worldTime: 10,
    players: [],
    broadcast: defaultBroadcast(),
    battlefield: {
      phase: "countdown",
      teams: [{ id: "a" }, { id: "b" }],
      fronts: [{ id: "f", a: "a", b: "b", lane: 1 }],
      remaining: 10,
    },
  };
  let shot = broadcastCamera(s, 10);
  assert.ok(shot.position.z > shot.target.z + 18);
  assert.notDeepEqual(shot.position, broadcastCamera(s, 11).position);
  s.battlefield.phase = "reveal";
  shot = broadcastCamera(s, 10);
  assert.equal(shot.target.x, 0);
  assert.equal(shot.target.z, 0);
  assert.ok(shot.position.y >= 65);
  s.battlefield.remaining = 5;
  assert.equal(broadcastCamera(s, 10).position.y, 27);
});

test("completed Battlefield and Poker records preserve each player result without duplicate awards", () => {
  let now = 0;
  const g = new Game({ now: () => now }),
    a = g.join(null, "Alpha"),
    b = g.join(null, "Bravo");
  g.command("battlefield");
  g.command("battle:match");
  g.command("battle:tutorial");
  g.command("battle:forceStart");
  g.command("battle:final");
  g.command("battle:fight");
  now += 8000;
  g.tick(0.01);
  assert.equal(g.roundHistory.length, 0);
  now += 10000;
  g.tick(0.01);
  g.command("battle:next");
  g.command("battle:tutorial");
  g.command("battle:forceStart");
  g.command("battle:final");
  g.command("battle:fight");
  now += 5000;
  g.tick(0.01);
  assert.equal(g.roundHistory.length, 1);
  const field = g.roundHistory[0];
  assert.equal(field.kind, "battlefield");
  assert.equal(field.players.length, 2);
  assert.equal(field.players[0].fronts.length, 3);
  g.command("lobby");
  g.command("poker");
  g.command("poker:forceStart");
  now += 5000;
  g.tick(0.01);
  for (let i = 0; i < 16 && g.poker.phase !== "results"; i++) {
    now += 13000;
    g.tick(0.01);
  }
  assert.equal(g.poker.phase, "results");
  const poker = g.roundHistory[1];
  assert.equal(poker.kind, "poker");
  assert.equal(poker.players.length, 2);
  assert.equal(
    poker.players.reduce((n, p) => n + p.net, 0),
    0,
  );
  for (const p of poker.players) {
    assert.equal(p.won, p.net > 0);
    assert.equal(p.hands.length, 2);
  }
  g.tick(0.01);
  assert.equal(g.roundHistory.length, 2);
  assert.equal(
    new Game({ saved: validateState(g.save()) }).roundHistory.length,
    2,
  );
});
