import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../server/game.js";
import {
  RANKS,
  handResult,
  legalActions,
  pairings,
  tableLayout,
  botAction,
} from "../shared/poker.js";
import { tournamentScores } from "../shared/tournament.js";
import { move, canMove } from "../shared/movement.js";
function setup(n = 2) {
  let time = 0;
  const g = new Game({ now: () => time });
  const ps = Array.from({ length: n }, (_, i) => g.join(null, "Panda" + i));
  return {
    g,
    ps,
    advance(ms) {
      time += ms;
      g.tick(0.05);
    },
  };
}
test("all six deals and all five terminal paths conserve chips and use exact ante/call payoffs", () => {
  for (const a of RANKS)
    for (const b of RANKS)
      if (a !== b)
        for (const path of [
          ["check", "check"],
          ["bet", "call"],
          ["bet", "fold"],
          ["check", "bet", "call"],
          ["check", "bet", "fold"],
        ]) {
          const result = handResult([a, b], path);
          assert.equal(result.net[0] + result.net[1], 0);
          assert.equal(result.amount, path.at(-1) === "call" ? 2 : 1);
          const expected =
            path.at(-1) === "fold"
              ? path.length === 2
                ? 0
                : 1
              : RANKS.indexOf(a) > RANKS.indexOf(b)
                ? 0
                : 1;
          assert.equal(result.winner, expected);
        }
  assert.deepEqual(legalActions("check,bet"), ["call", "fold"]);
  assert.equal(handResult(["J", "K"], ["check"]), null);
});
test("2–42 seats pair everyone exactly once per round; opponents never repeat before schedule exhaustion; layout has uniform clearance", () => {
  for (let n = 2; n <= 42; n += 2) {
    const ids = Array.from({ length: n }, (_, i) => "" + i),
      seen = new Set();
    for (let r = 1; r <= Math.min(n - 1, 5); r++) {
      const pairs = pairings(ids, r);
      assert.equal(new Set(pairs.flat()).size, n);
      for (const pair of pairs) {
        const key = pair.sort().join(":");
        assert.ok(!seen.has(key));
        seen.add(key);
      }
    }
    const layout = tableLayout(n / 2);
    for (const a of layout)
      for (const b of layout)
        if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 7);
  }
});
test("readiness, authoritative seating, stale actions, pause, public/owner privacy, timeouts and exactly-once five-round payouts", () => {
  const { g, ps, advance } = setup();
  g.command("poker");
  assert.equal(g.world, "casino");
  assert.throws(() => g.command("poker:start"));
  for (let round = 1; round <= 5; round++) {
    for (const p of ps) g.poker.act(p.id, "ready");
    g.command("poker:start");
    advance(5000);
    const table = g.poker.tables[0];
    assert.equal(canMove(g.snapshot(), ps[0]), false);
    const x = ps[0].x;
    ps[0].input = { x: 1, jump: true };
    advance(100);
    assert.equal(ps[0].x, x);
    const publicTable = g.snapshot().poker.tables[0];
    assert.equal(publicTable.cards, undefined);
    assert.equal(publicTable.ownCard, undefined);
    const owner = g.snapshotFor(ps[0].id).poker.tables[0];
    assert.ok(RANKS.includes(owner.ownCard));
    assert.equal(owner.cards, undefined);
    const turn = g.players.get(table.players[table.turn]);
    assert.throws(() =>
      g.poker.act(turn.id, "bet", { session: -1, round, hand: 1, step: 0 }),
    );
    assert.throws(() =>
      g.poker.act(table.players[1 - table.turn], "check", {
        session: g.round,
        round,
        hand: 1,
        step: 0,
      }),
    );
    const remaining = table.deadline;
    g.command("poker:pause");
    advance(60000);
    assert.equal(table.hand, 1);
    g.command("poker:resume");
    assert.equal(table.deadline, remaining + 60000);
    let guard = 0;
    while (g.poker.phase !== "results" && guard++ < 40) advance(13000);
    assert.equal(g.poker.phase, "results");
    assert.equal(table.hand, 2);
    assert.equal(table.net[0] + table.net[1], 0);
    const scores = ps.map((p) => p.pokerScore);
    advance(13000);
    assert.deepEqual(
      ps.map((p) => p.pokerScore),
      scores,
    );
    if (round < 5) g.command("poker:next");
  }
  assert.throws(() => g.command("poker:next"));
  g.command("lobby");
  assert.equal(g.poker, null);
  assert.equal(ps[0].eventsPlayed.poker, true);
  const restored = new Game({ saved: g.save() });
  assert.equal(restored.players.get(ps[0].id).pokerScore, ps[0].pokerScore);
});
test("folded cards remain private; called cards reveal, replay rejects and net chips score after two hands", () => {
  const { g, ps, advance } = setup();
  g.command("poker");
  g.command("poker:forceStart");
  advance(5000);
  for (let hand = 1; hand <= 2; hand++) {
    const t = g.poker.tables[0],
      actor = t.players[t.turn],
      data = { session: g.round, round: 1, hand, step: 0 };
    g.poker.act(actor, "bet", data);
    assert.throws(() => g.poker.act(actor, "bet", data));
    g.poker.act(t.players[t.turn], hand % 2 ? "fold" : "call", {
      ...data,
      step: 1,
    });
    assert.equal(!!g.snapshot().poker.tables[0].cards, hand % 2 === 0);
    advance(4100);
  }
  assert.equal(g.poker.phase, "results");
  assert.equal(ps[0].pokerScore + ps[1].pokerScore, 0);
});
test("officer excluded from first two games and prize standings, uses a bot for odd seat; bots/demo are never saved", () => {
  const { g, ps } = setup(4);
  g.command("officer", { id: ps[3].id, officer: true });
  g.command("ready");
  g.command("start");
  assert.equal(ps[3].eligible, false);
  assert.equal(ps[3].waitingLobby, true);
  g.command("lobby");
  g.command("battlefield");
  assert.ok(!g.battlefield.roster.includes(ps[3].id));
  g.command("lobby");
  g.command("poker");
  assert.equal(g.poker.roster.length, 4);
  assert.ok(!g.poker.roster.includes(ps[3].id));
  assert.ok(g.poker.roster.includes("poker-bot-40"));
  g.command("lobby");
  ps[3].connected = false;
  g.command("poker");
  assert.ok(g.poker.roster.includes("poker-bot-40"));
  assert.ok(!JSON.stringify(g.save()).includes("poker-bot"));
  g.command("lobby");
  g.command("pokerDemo", { count: 29 });
  assert.equal(g.poker.tables.length, 15);
  assert.equal(g.poker.demo.count, 29);
  assert.equal(g.save().players.length, 4);
  g.command("lobby");
  assert.equal(g.players.size, 4);
});
test("equal-weight scores give a leader 100 in each game, preserve raw scores, ignore officers and keep ties equal", () => {
  const ps = [
    {
      id: "a",
      earnings: 1200,
      battlefieldScore: 12,
      pokerScore: 4,
      eventsPlayed: { crowd: true, battlefield: true, poker: true },
    },
    { id: "b", earnings: 600, battlefieldScore: 8, pokerScore: -4 },
    { id: "o", officer: true, earnings: 99999 },
  ];
  const before = JSON.stringify(ps),
    points = tournamentScores(ps);
  assert.equal(points.get("a").total, 300);
  assert.equal(points.get("b").total, 0);
  assert.equal(points.get("o").total, 0);
  assert.equal(JSON.stringify(ps), before);
  ps.push({ ...ps[0], id: "tie" });
  assert.deepEqual(
    tournamentScores(ps).get("a"),
    tournamentScores(ps).get("tie"),
  );
});
test("jumping lands on the lobby pad and launches, ordinary gym floor still respawns; side lounges are safe", () => {
  const p = { x: -5, z: 32, y: 1, vy: -4, vx: 0, vz: 0, grounded: false };
  for (let i = 0; i < 45; i++) move(p, {}, 1 / 120, "lobby", i / 120);
  assert.equal(p.respawns || 0, 0);
  assert.ok(p.vy > 0);
  assert.ok(p.padCooldown > 0);
  const q = { x: 0, z: 34, y: 1, vy: -4, vx: 0, vz: 0, grounded: false };
  for (let i = 0; i < 45; i++) move(q, {}, 1 / 120, "lobby", i / 120);
  assert.ok(q.respawns > 0);
  const r = { x: -22, z: 41, y: 1, vy: -4, vx: 0, vz: 0, grounded: false };
  for (let i = 0; i < 45; i++) move(r, {}, 1 / 120, "lobby", i / 120);
  assert.equal(r.respawns || 0, 0);
});
test("reconnect retains private card/seat, late join waits in lobby, unavailable/invalid controls leave scores alone", () => {
  const { g, ps, advance } = setup();
  g.command("poker");
  g.command("poker:forceStart");
  advance(5000);
  const card = g.snapshotFor(ps[0].id).poker.tables[0].ownCard;
  ps[0].connected = false;
  g.join(ps[0].token, "Panda0", ps[0].appearance, {
    pageId: "fresh",
    resume: false,
  });
  assert.equal(ps[0].waitingLobby, false);
  assert.equal(g.snapshotFor(ps[0].id).poker.tables[0].ownCard, card);
  const late = g.join(null, "Late");
  assert.equal(late.waitingLobby, true);
  assert.equal(g.snapshotFor(late.id).world, "lobby");
  assert.equal(g.snapshotFor(late.id).poker, null);
  assert.throws(() => g.poker.act(late.id, "ready"));
  assert.throws(() => g.command("battlefield"));
  assert.throws(() => g.command("officer", { id: ps[0].id, officer: true }));
});

test("two hands with alternating first seats have at most 80 seconds of betting and reveals", () => {
  const { g, advance } = setup();
  g.command("poker");
  g.command("poker:forceStart");
  advance(5000);
  let elapsed = 0;
  for (let hand = 1; hand <= 2; hand++) {
    const t = g.poker.tables[0];
    assert.equal(t.first, (hand - 1) % 2);
    for (const [step, action] of ["check", "bet", "call"].entries()) {
      advance(11999);
      elapsed += 11999;
      g.poker.act(t.players[t.turn], action, {
        session: g.round,
        round: 1,
        hand,
        step,
      });
    }
    advance(4000);
    elapsed += 4000;
  }
  assert.equal(g.poker.phase, "results");
  assert.ok(elapsed <= 80000);
});

test("right-hand practice corridor reaches the mirrored room without floor respawns", () => {
  const p = { x: 0, z: 27, y: 0, vx: 0, vz: 0, vy: 0, grounded: true };
  for (let i = 0; i < 65; i++) move(p, { x: -1 }, 0.05, "lobby");
  assert.ok(p.x < -19);
  for (let i = 0; i < 45; i++) move(p, { z: 1 }, 0.05, "lobby");
  assert.ok(p.z > 29 && p.x >= -30 && p.x <= -14);
  assert.equal(p.lastRespawn, undefined);
});

test("host-removal leaves a Poker seat to time out, cannot submit or earn, and rejoin remains waiting", () => {
  const { g, ps, advance } = setup();
  g.command("poker");
  g.command("poker:forceStart");
  advance(5000);
  g.command("playerLobby", { id: ps[0].id });
  assert.throws(() =>
    g.poker.act(ps[0].id, "check", {
      session: g.round,
      round: 1,
      hand: 1,
      step: 0,
    }),
  );
  g.join(ps[0].token, "Panda0");
  assert.equal(ps[0].waitingLobby, true);
  for (let i = 0; i < 20 && g.poker.phase !== "results"; i++) advance(13000);
  assert.equal(g.poker.phase, "results");
  assert.equal(ps[0].pokerScore, undefined);
  g.command("lobby");
  assert.equal(ps[0].pokerRemoved, undefined);
});

test("officer disconnecting before seating activates a non-prize bot fallback", () => {
  const { g, ps } = setup(4);
  g.command("officer", { id: ps[3].id, officer: true });
  g.command("poker");
  ps[3].connected = false;
  for (const p of ps.slice(0, 3)) g.poker.act(p.id, "ready");
  g.command("poker:start");
  assert.ok(g.poker.roster.includes("poker-bot-40"));
  assert.ok(!g.poker.roster.includes(ps[3].id));
  assert.equal(g.poker.tables.length, 2);
});

test("casino exploration caps diagonal speed and blocks roulette, while seated state denies motion", () => {
  const p = { x: 10, z: 20, y: 0, vx: 0, vz: 0, vy: 0, grounded: true };
  for (let i = 0; i < 20; i++)
    move(p, { x: 1, z: -1 }, 0.05, "casino", i * 0.05, false, { tables: [] });
  assert.ok(Math.hypot(p.vx, p.vz) <= 6.80001);
  const q = { x: 16, z: 0, y: 0, vx: 0, vz: 0, vy: 0, grounded: true };
  for (let i = 0; i < 40; i++)
    move(q, { x: 1 }, 0.05, "casino", i * 0.05, false, { tables: [] });
  assert.ok(q.x < 18.4);
});

test("Poker seating countdown hides cards, prevents early actions and pauses its clock", () => {
  const { g, ps, advance } = setup();
  g.command("poker");
  g.command("poker:forceStart");
  assert.equal(g.poker.phase, "countdown");
  assert.equal(canMove(g.snapshot(), ps[0]), false);
  assert.equal(g.snapshotFor(ps[0].id).poker.tables[0].ownCard, undefined);
  assert.throws(() => g.poker.act(ps[0].id, "check", {}));
  advance(2000);
  assert.equal(g.poker.snapshot().countdown, 3);
  g.command("poker:pause");
  advance(60000);
  assert.equal(g.poker.snapshot().countdown, 3);
  g.command("poker:resume");
  advance(2999);
  assert.equal(g.poker.phase, "countdown");
  advance(1);
  assert.equal(g.poker.phase, "playing");
  assert.ok(RANKS.includes(g.snapshotFor(ps[0].id).poker.tables[0].ownCard));
  assert.equal(g.poker.tables[0].deadline - g.now(), 12000);
});
test("Lobby outfit changes preserve identity and scores and reject changes during games", () => {
  const { g, ps } = setup();
  const p = ps[0];
  p.earnings = 30;
  p.battlefieldScore = 5;
  p.pokerScore = -2;
  const identity = [p.id, p.token];
  g.customize(p, { bear: "polar", hat: "frog" });
  assert.equal(p.appearance.bear, "polar");
  assert.equal(p.appearance.hat, "frog");
  assert.deepEqual([p.id, p.token], identity);
  assert.deepEqual([p.earnings, p.battlefieldScore, p.pokerScore], [30, 5, -2]);
  const restored = new Game({ saved: g.save() });
  assert.equal(restored.players.get(p.id).appearance.hat, "frog");
  g.command("poker");
  assert.throws(() => g.customize(p, { bear: "red" }));
});

test("Five-player Poker rotates the bot seat once per participant across five rounds", () => {
  const { g, ps } = setup(5);
  g.command("poker");
  const seen = new Map(ps.map((p) => [p.id, 0]));
  for (let r = 1; r <= 5; r++) {
    g.poker.round = r;
    g.poker.prepare();
    for (const t of g.poker.tables)
      if (t.players.includes("poker-bot-40")) {
        const id = t.players.find((id) => id !== "poker-bot-40");
        seen.set(id, seen.get(id) + 1);
      }
  }
  assert.deepEqual([...seen.values()], [1, 1, 1, 1, 1]);
});
