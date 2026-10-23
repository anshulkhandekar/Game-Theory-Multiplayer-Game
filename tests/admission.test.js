import test from "node:test";
import assert from "node:assert/strict";
import { allowUpgrade } from "../server/admission.js";
import { Game } from "../server/game.js";
test("WebSocket admission rejects cross-site browsers and excessive connections", () => {
  assert.equal(
    allowUpgrade(
      { headers: { host: "localhost:3000", origin: "http://localhost:3000" } },
      40,
    ),
    true,
  );
  assert.equal(
    allowUpgrade(
      { headers: { host: "game.example", origin: "https://other.example" } },
      1,
    ),
    false,
  );
  assert.equal(allowUpgrade({ headers: {} }, 96), false);
  assert.equal(allowUpgrade({ headers: { host: "game.example" } }, 1), true);
});
test("Full-room admission blocks new identities but allows existing players to reconnect", () => {
  const g = new Game();
  const p = Array.from({ length: 40 }, (_, i) => g.join(null, "P" + i));
  assert.throws(() => g.join(null, "Extra"), /40 players/);
  assert.equal(g.join(p[0].token, "P0").id, p[0].id);
  p[0].connected = false;
  assert.ok(g.join(null, "Extra"));
});
