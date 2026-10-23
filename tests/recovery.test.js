import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../server/game.js";
import { loadAndCountdown } from "./lifecycle-helper.js";
const page = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
function round() {
  let now = 0;
  const game = new Game({ now: () => now });
  const p = game.join(null, "Alice", { bear: "red" }, { pageId: page });
  p.earnings = 75;
  game.command("ready");
  game.command("start");
  loadAndCountdown(game);
  now = 8000;
  game.tick(0.05);
  return { game, p };
}
test("same-page reconnect preserves active-round eligibility and scores", () => {
  const { game, p } = round();
  p.connected = false;
  p.x = 5;
  assert.equal(
    game.join(p.token, "Alice", {}, { pageId: page, resume: true }),
    p,
  );
  assert.equal(p.x, 5);
  assert.equal(p.eligible, true);
  assert.equal(p.earnings, 75);
  assert.equal(game.snapshotFor(p.id).world, "arena1");
});
test("refresh or other tab goes to isolated lobby, preserving profile and scores", () => {
  const { game, p } = round();
  p.connected = false;
  game.join(p.token, "Alice", {}, { pageId: other, resume: true });
  assert.equal(p.waitingLobby, true);
  assert.equal(p.eligible, false);
  assert.equal(p.appearance.bear, "red");
  assert.equal(p.earnings, 75);
  const state = game.snapshotFor(p.id);
  assert.equal(state.world, "lobby");
  assert.equal(state.activity.phase, "active");
  assert.ok(state.activity.remaining > 0);
  p.input = { x: 1, z: 0 };
  game.tick(0.1);
  assert.ok(p.x > 0);
  assert.equal(game.snapshot().world, "arena1");
  game.acknowledgeLoad(p, game.round);
  game.acknowledgeLoad(p, game.round, true);
  game.chat(p, "Hello");
  game.emote(p, "wave");
  game.finish();
  assert.equal(p.earnings, 75);
  game.command("ready");
  game.command("start");
  assert.equal(p.waitingLobby, false);
  assert.equal(p.eligible, true);
  assert.equal(game.snapshotFor(p.id).world, "arena1");
  assert.equal(p.loaded, false);
});
test("new late arrivals wait; reconnect cannot escape waiting; private page IDs are omitted", () => {
  const { game } = round();
  const p = game.join(null, "Bob", {}, { pageId: other });
  assert.equal(p.waitingLobby, true);
  p.connected = false;
  game.join(p.token, "Bob", {}, { pageId: other, resume: true });
  assert.equal(p.waitingLobby, true);
  assert.ok(
    game.snapshot().players.every((p) => !("pageId" in p) && !("token" in p)),
  );
  assert.ok(game.save().players.every((p) => !("pageId" in p)));
});
test("return to lobby clears isolation and restart restores saved identity", () => {
  const { game, p } = round();
  game.join(p.token, "Alice", {}, { pageId: other });
  game.command("lobby");
  assert.equal(p.waitingLobby, false);
  const restored = new Game({ saved: game.save() });
  const again = restored.join(p.token, "Alice", {}, { pageId: page });
  assert.equal(again.id, p.id);
  assert.equal(again.earnings, 75);
  assert.equal(again.waitingLobby, false);
});
test("host override starts ready scenes and isolates unfinished scenes", () => {
  const game = new Game({ now: () => 0 });
  const reader = game.join(null, "Reader"),
    slow = game.join(null, "Slow");
  game.command("ready");
  game.command("start");
  game.acknowledgeLoad(reader, game.round);
  assert.throws(() => game.command("countdown"), /Wait/);
  game.command("forceCountdown");
  assert.equal(game.phase, "countdown");
  assert.equal(reader.loaded, true);
  assert.equal(reader.eligible, true);
  assert.equal(slow.waitingLobby, true);
  assert.equal(slow.eligible, false);
  assert.equal(game.snapshotFor(slow.id).world, "lobby");
});
test("host lobby, disconnect, kick and allow preserve scores and control return", () => {
  const { game, p } = round();
  game.command("playerLobby", { id: p.id });
  assert.equal(p.waitingLobby, true);
  assert.equal(p.eligible, false);
  game.command("disconnectPlayer", { id: p.id });
  assert.equal(p.connected, false);
  game.command("kickPlayer", { id: p.id });
  assert.throws(() => game.join(p.token, "Alice"), /Removed by/);
  const restored = new Game({ saved: game.save() });
  assert.throws(() => restored.join(p.token, "Alice"), /Removed by/);
  game.command("allowPlayer", { id: p.id });
  assert.equal(game.join(p.token, "Alice").earnings, 75);
});
