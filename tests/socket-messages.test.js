import test from "node:test";
import assert from "node:assert/strict";
import { readMessage } from "./socket-messages.js";

const state = (roster, actors) =>
  JSON.stringify({
    type: "state",
    state: { rosterVersion: 1, roster, actors },
  });

test("load clients retain independent roster caches across incremental frames", () => {
  const first = {},
    second = {};
  readMessage(first, state([{ id: "a", name: "Alpha" }], [{ id: "a", x: 1 }]));
  readMessage(second, state([{ id: "b", name: "Bravo" }], [{ id: "b", x: 2 }]));
  const a = readMessage(first, state(undefined, [{ id: "a", x: 3 }]));
  const b = readMessage(second, state(undefined, [{ id: "b", x: 4 }]));
  assert.equal(a.state.players[0].name, "Alpha");
  assert.equal(a.state.players[0].x, 3);
  assert.equal(b.state.players[0].name, "Bravo");
  assert.equal(b.state.players[0].x, 4);
  assert.throws(() => readMessage({}, state(undefined, [])), /Missing roster/);
});

test("load clients preserve authentication and error messages unchanged", () => {
  for (const message of [
    { type: "auth", ok: true },
    { type: "error", message: "Denied" },
  ]) {
    assert.deepEqual(
      readMessage({}, Buffer.from(JSON.stringify(message))),
      message,
    );
  }
});
