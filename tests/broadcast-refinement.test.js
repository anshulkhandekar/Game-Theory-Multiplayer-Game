import test from "node:test";
import assert from "node:assert/strict";
import {
  broadcastCamera,
  createBroadcastDirector,
  defaultBroadcast,
  updateBroadcast,
} from "../shared/broadcast.js";
import { createProjectorEmoteSelector } from "../shared/sound.js";
import { arenaBounds, vaultsFor } from "../shared/world.js";
import { teamPositions } from "../shared/battlefield.js";
import { Game } from "../server/game.js";
import { validateState } from "../server/storage.js";
const arena = (stage) => ({
  world: "arena" + stage,
  stage,
  round: 1,
  phase: "active",
  worldTime: 0,
  broadcast: defaultBroadcast(),
  messages: [],
  vaults: [
    { id: "gold", x: 20, z: 20, y: 8 },
    { id: "diamond", x: -20, z: 20, y: 2 },
  ],
  players: [
    {
      id: "a",
      connected: true,
      eligible: true,
      x: 20,
      z: 20,
      vx: 2,
      vz: 0,
      grounded: true,
    },
  ],
});
test("automatic arenas never select overhead and first arena never selects a vault", () => {
  for (let stage = 1; stage <= 5; stage++) {
    const s = arena(stage),
      camera = createBroadcastDirector();
    for (let time = 0; time < 55; time += 0.5) {
      const shot = camera(s, time);
      assert.ok(
        Math.hypot(
          shot.position.x - shot.target.x,
          shot.position.z - shot.target.z,
        ) > 10,
      );
      if (stage === 1) assert.equal(shot.key, "crowd-overview");
    }
    s.broadcast.mode = "sky";
    assert.equal(camera(s, 60).key, "sky");
  }
  const shot = broadcastCamera(arena(3), 0);
  assert.equal(shot.position.y, 35);
  assert.equal(Math.hypot(shot.position.x, shot.position.z + 6), 52);
});
test("vault spotlight pins its target for six seconds, then gives eight seconds to the overview", () => {
  const s = arena(3),
    camera = createBroadcastDirector();
  assert.equal(camera(s, 0).key, "crowd-overview");
  assert.equal(camera(s, 8).key, "vault:gold");
  s.players[0].x = -20;
  s.messages = [{ seq: 1 }];
  assert.equal(camera(s, 10).key, "vault:gold");
  assert.equal(camera(s, 13.9).key, "vault:gold");
  assert.equal(camera(s, 14).key, "crowd-overview");
  assert.equal(camera(s, 21.9).key, "crowd-overview");
  assert.equal(camera(s, 22).key, "vault:diamond");
});
test("preparation base spotlight does not hop to a newly busy base", () => {
  const s = {
      world: "battlefield1",
      worldTime: 0,
      round: 2,
      players: [],
      broadcast: defaultBroadcast(),
      battlefield: {
        phase: "planning",
        teams: [{ id: "a" }, { id: "b" }],
        deployments: [],
      },
    },
    camera = createBroadcastDirector();
  camera(s, 0);
  s.battlefield.deployments = [{ id: 1, team: "a", time: 8, quantity: 3 }];
  assert.equal(camera(s, 8).key, "base:a");
  s.battlefield.deployments.push({ id: 2, team: "b", time: 9, quantity: 30 });
  assert.equal(camera(s, 9).key, "base:a");
  assert.equal(camera(s, 14).key, "battle-overview");
  assert.equal(camera(s, 21).key, "battle-overview");
});
test("casino shot timing matches the previous seven-second schedule", () => {
  const s = {
      world: "casino",
      round: 1,
      players: [],
      broadcast: defaultBroadcast(),
      poker: {
        tables: [
          { x: 7, z: 0 },
          { x: -7, z: 0 },
        ],
      },
    },
    camera = createBroadcastDirector();
  for (const time of [0, 7, 14, 21, 28])
    assert.deepEqual(camera(s, time), broadcastCamera(s, time));
});
test("projector lobby emotes are one short fresh clip with cooldown and priority interruption", () => {
  const choose = createProjectorEmoteSelector(),
    s = {
      world: "lobby",
      players: [
        {
          id: "a",
          connected: true,
          emoteActive: true,
          emoteName: "dance",
          emoteAt: 0,
          emoteAge: 0,
        },
        {
          id: "b",
          connected: true,
          emoteActive: true,
          emoteName: "wave",
          emoteAt: 0,
          emoteAge: 0,
        },
      ],
    };
  assert.equal(choose(s, 0).length, 1);
  assert.equal(choose(s, 2).length, 1);
  assert.equal(choose(s, 3).length, 0);
  assert.equal(choose(s, 7).length, 0);
  s.players[0].emoteAt = 8000;
  assert.equal(choose(s, 8).length, 1);
  assert.equal(choose(s, 9, true).length, 0);
  s.world = "arena1";
  assert.equal(choose(s, 20).length, 0);
});
test("lobby chat switch is authoritative, persistent and independent of Battlefield team privacy", () => {
  const g = new Game(),
    a = g.join(null, "Alpha"),
    b = g.join(null, "Bravo");
  g.command("lobbyChat", { enabled: false });
  assert.throws(() => g.chat(a, "Hi"), /disabled/);
  assert.equal(g.snapshot().lobbyChatEnabled, false);
  const restored = new Game({ saved: validateState(g.save()) });
  assert.equal(restored.lobbyChatEnabled, false);
  assert.throws(() => g.command("lobbyChat", { enabled: 1 }));
  g.command("lobbyChat", { enabled: true });
  g.chat(a, "Hi");
  g.command("battlefield");
  g.command("battle:match");
  g.battlefield.act(a.id, "chat", { text: "Alpha private" });
  g.battlefield.act(b.id, "chat", { text: "Bravo private" });
  assert.equal(g.battlefield.messages.length, 2);
  assert.deepEqual(
    g.snapshotFor(a.id).battlefield.messages.map((m) => m.text),
    ["Alpha private"],
  );
  assert.deepEqual(
    g.snapshotFor(b.id).battlefield.messages.map((m) => m.text),
    ["Bravo private"],
  );
  assert.deepEqual(g.snapshot().battlefield.messages, []);
});

test("projector sound switch validates booleans without resetting camera timing", () => {
  const b = defaultBroadcast();
  const mute = updateBroadcast(b, { soundEnabled: false }, { world: "lobby" });
  assert.equal(mute.soundEnabled, false);
  assert.equal(mute.revision, b.revision);
  assert.throws(() =>
    updateBroadcast(b, { soundEnabled: "no" }, { world: "lobby" }),
  );
});

test("Round 2 moves thirty percent closer while later overviews retain their distance", () => {
  for (let stage = 2; stage <= 5; stage++) {
    const shot = broadcastCamera(arena(stage), 20);
    assert.ok(
      Math.abs(
        Math.hypot(shot.position.x, shot.position.z + 6) -
          (stage === 2 ? 36.4 : 52),
      ) < 1e-9,
    );
    assert.equal(shot.position.y, stage === 2 ? 24.5 : 35);
  }
});
test("vault close-ups circle approach paths from inside every arena perimeter", () => {
  for (let stage = 2; stage <= 5; stage++) {
    const bounds = arenaBounds(stage);
    for (const vault of vaultsFor(stage)) {
      const s = arena(stage),
        spotlight = { kind: "vault", vault };
      const first = broadcastCamera(s, 8, false, spotlight);
      assert.notDeepEqual(
        first.position,
        broadcastCamera(s, 9, false, spotlight).position,
      );
      for (let time = 8; time < 80; time += 0.5) {
        const shot = broadcastCamera(s, time, false, spotlight);
        assert.ok(Math.abs(shot.position.x) <= bounds.side - 2);
        assert.ok(
          shot.position.z >= bounds.rear + 2 &&
            shot.position.z <= bounds.front - 2,
        );
        if (vault.id !== "sky") {
          // Camera remains on the inward side of the approach, not behind the vault.
          assert.ok(
            (shot.position.x - shot.target.x) * vault.x +
              (shot.position.z - shot.target.z) * (vault.z - 1) <
              0,
          );
          assert.ok(
            Math.hypot(shot.target.x, shot.target.z - 1) <
              Math.hypot(vault.x, vault.z - 1),
          );
        }
      }
    }
  }
});
test("every Battlefield base is framed from its open side with a slow moving arc", () => {
  const teams = Array.from({ length: 8 }, (_, i) => ({ id: String(i) }));
  const s = {
    world: "battlefield1",
    players: [],
    broadcast: { ...defaultBroadcast(), mode: "base" },
    battlefield: { teams, phase: "planning" },
  };
  for (const base of teamPositions(teams)) {
    s.broadcast.target = base.id;
    for (let time = 0; time < 60; time += 2) {
      const shot = broadcastCamera(s, time);
      assert.equal(shot.target.z, base.z + 3.5);
      assert.ok(shot.position.z > base.z + 22);
    }
    assert.notDeepEqual(
      broadcastCamera(s, 0).position,
      broadcastCamera(s, 3).position,
    );
  }
});

test("falls on the gold approach select gold instead of a neighboring vault or staging", () => {
  const s = arena(2),
    camera = createBroadcastDirector();
  s.vaults = vaultsFor(2);
  const gold = s.vaults.find((v) => v.id === "gold");
  Object.assign(s.players[0], { x: 0, z: 1, grounded: false });
  camera(s, 0);
  assert.equal(camera(s, 8).key, "crowd-overview");
  s.players[0].z = 1 + (gold.z - 1) * 0.4;
  assert.equal(camera(s, 9).key, "vault:gold");
});
