import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Game } from "../server/game.js";
import {
  teamPlan,
  makeFronts,
  teamPositions,
  terminalPosition,
  compareOrders,
  emptyOrder,
  strength,
  orderCost,
} from "../shared/battlefield.js";
import { move } from "../shared/movement.js";
function room(n = 6, demo = false) {
  let now = 0;
  const game = new Game({ now: () => now });
  const players = Array.from({ length: demo ? 1 : n }, (_, i) =>
    game.join(null, `Bear${i}`, {}),
  );
  game.command(
    demo ? "battlefieldDemo" : "battlefield",
    demo ? { count: n } : {},
  );
  return {
    game,
    players,
    get b() {
      return game.battlefield;
    },
    advance(ms) {
      now += ms;
      game.tick(0.05);
    },
  };
}
function begin(r) {
  if (r.b.phase === "matching") r.game.command("battle:match");
  r.game.command("battle:tutorial");
  r.game.command("battle:forceStart");
  return r.b;
}
function place(r, id, front) {
  const t = r.b.teamOf(id),
    f = r.b.fronts.find((f) => f.id === front),
    pos = terminalPosition(r.b.teams, t.id, f.lane);
  Object.assign(r.game.players.get(id), { x: pos.x, z: pos.z + 1, y: 0 });
}
function buy(r, id, front, unit = "troop", quantity = 1, extra = {}) {
  place(r, id, front);
  const data = {
    front,
    unit,
    quantity,
    nonce: randomUUID(),
    volley: r.game.round,
    ...extra,
  };
  return r.b.act(id, "purchase", data);
}
test("2–40 participants produce balanced fixed rosters and exactly three reciprocal fronts; 21,22,29,30 work", () => {
  for (let n = 2; n <= 40; n++) {
    const r = room(n),
      b = begin(r),
      sizes = b.teams.map((t) => t.members.length);
    assert.deepEqual([...sizes].sort(), teamPlan(n).sort());
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
    assert.equal(new Set(b.teams.flatMap((t) => t.members)).size, n);
    const roster = JSON.stringify(b.teams.map((t) => t.members));
    for (const t of b.teams) {
      const fronts = b.fronts.filter((f) => [f.a, f.b].includes(t.id));
      assert.equal(fronts.length, 3);
      assert.deepEqual(fronts.map((f) => f.lane).sort(), [0, 1, 2]);
      if (b.teams.length > 2)
        assert.equal(
          new Set(fronts.map((f) => (f.a === t.id ? f.b : f.a))).size,
          3,
        );
      assert.equal(
        t.members.reduce((sum, id) => sum + b.wallets[id], 0),
        60,
      );
    }
    b.command("final");
    b.command("fight");
    r.advance(5000);
    r.advance(10000);
    b.command("next");
    assert.equal(JSON.stringify(b.teams.map((t) => t.members)), roster);
  }
  assert.deepEqual(teamPlan(20), [3, 3, 3, 3, 2, 2, 2, 2]);
  assert.deepEqual(teamPlan(30), Array(10).fill(3));
});
test("every layout leaves room around bases and has three independently reachable terminals", () => {
  for (const n of [2, 4, 6, 8, 10, 12, 14, 16, 20]) {
    const teams = Array.from({ length: n }, (_, i) => ({ id: `t${i}` })),
      positions = teamPositions(teams);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        assert.ok(
          Math.hypot(
            positions[i].x - positions[j].x,
            positions[i].z - positions[j].z,
          ) >= 45,
        );
    for (const t of teams)
      assert.equal(
        new Set([0, 1, 2].map((l) => terminalPosition(teams, t.id, l).x)).size,
        3,
      );
  }
});
test("mutual friend triples are prioritized when seats allow; matching does not promise three-person teams", () => {
  const r = room(20),
    p = r.players;
  r.b.act(p[0].id, "friends", { ids: [p[1].id, p[2].id] });
  r.b.act(p[1].id, "friends", { ids: [p[0].id] });
  r.b.act(p[2].id, "friends", { ids: [p[0].id] });
  r.advance(30000);
  assert.equal(r.b.teamOf(p[0].id), r.b.teamOf(p[1].id));
  assert.equal(r.b.teamOf(p[0].id), r.b.teamOf(p[2].id));
  assert.throws(() => r.b.act(p[0].id, "friends", { ids: [] }), /closed/);
});
test("personal wallets allow simultaneous same-front purchases and whole-team concentration without overspending", () => {
  const r = room(),
    b = begin(r),
    t = b.teams[0],
    f = b.fronts.find((f) => [f.a, f.b].includes(t.id));
  for (const id of t.members) buy(r, id, f.id, "tank", 2);
  assert.equal(b.orders[`${t.id}:${f.id}`].tank, 6);
  assert.ok(t.members.every((id) => b.wallets[id] === 0));
  assert.throws(() => buy(r, t.members[0], f.id), /Not enough/);
  for (const x of b.fronts.filter(
    (x) => x.id !== f.id && [x.a, x.b].includes(t.id),
  ))
    assert.equal(orderCost(b.orders[`${t.id}:${x.id}`]), 0);
});
test("transactions reject invalid quantities, units, front ownership, distant buying, stale volleys and forged wallet use; replay is idempotent", () => {
  const r = room(12),
    b = begin(r),
    t = b.teams[0],
    f = b.fronts[0],
    id = t.members[0];
  for (const n of [-1, 0, 1.2, Infinity, 100])
    assert.throws(() => buy(r, id, f.id, "troop", n));
  assert.throws(() => buy(r, id, f.id, "artillery", 1), /available/);
  assert.throws(
    () => buy(r, id, f.id, "tank", 1, { owner: t.members[1] }),
    /absent/,
  );
  assert.throws(
    () => buy(r, id, f.id, "troop", 1, { volley: 999 }),
    /previous/,
  );
  const p = r.game.players.get(id);
  p.x = 200;
  p.z = 180;
  assert.throws(
    () =>
      b.act(id, "purchase", {
        front: f.id,
        unit: "troop",
        quantity: 1,
        nonce: randomUUID(),
        volley: r.game.round,
      }),
    /Walk/,
  );
  const receipt = buy(r, id, f.id, "troop", 5),
    before = b.wallets[id];
  b.act(id, "purchase", {
    front: f.id,
    unit: "tank",
    quantity: 2,
    nonce: receipt.nonce,
    volley: r.game.round,
  });
  assert.equal(b.wallets[id], before);
  assert.equal(b.orders[`${t.id}:${f.id}`].troop, 5);
  const foreign = b.fronts.find((f) => ![f.a, f.b].includes(t.id));
  assert.ok(foreign);
  assert.throws(() => buy(r, id, foreign.id), /front/);
});
test("refunds recall only the selected wallet’s units, transfer requests conserve resources and wallet locks hold", () => {
  const r = room(),
    b = begin(r),
    t = b.teams[0],
    f = b.fronts[0],
    [a, c] = t.members;
  buy(r, a, f.id, "troop", 5);
  buy(r, c, f.id, "tank", 1);
  place(r, a, f.id);
  b.act(a, "refund", {
    front: f.id,
    unit: "troop",
    quantity: 3,
    nonce: randomUUID(),
    volley: r.game.round,
  });
  assert.equal(b.wallets[a], 18);
  assert.equal(b.orders[`${t.id}:${f.id}`].troop, 2);
  assert.throws(
    () =>
      b.act(a, "refund", {
        front: f.id,
        unit: "tank",
        quantity: 1,
        nonce: randomUUID(),
        volley: r.game.round,
      }),
    /only recall/,
  );
  b.act(a, "request", { from: c, amount: 5 });
  const request = b.transfers[0];
  b.act(c, "transfer", { id: request.id, accept: true });
  assert.equal(b.wallets[a], 23);
  assert.equal(b.wallets[c], 5);
  assert.throws(
    () => b.act(c, "transfer", { id: request.id, accept: true }),
    /available/,
  );
  b.act(a, "lock", { locked: true });
  assert.throws(() => buy(r, a, f.id), /Unlock/);
  b.act(a, "lock", { locked: false });
  b.command("final");
  assert.throws(() => b.act(a, "request", { from: c, amount: 1 }), /Transfers/);
});
test("public preparation exposes aggregate deployments, not personal wallets; final orders, team chat and new constructions remain private", () => {
  const r = room(),
    b = begin(r),
    t = b.teams[0],
    f = b.fronts[0],
    id = t.members[0],
    other = b.teams[1].members[0],
    k = `${t.id}:${f.id}`;
  buy(r, id, f.id, "troop", 7);
  b.act(id, "chat", { text: "coordinate here" });
  assert.equal(r.game.snapshot().battlefield.orders[k].troop, 7);
  assert.deepEqual(r.game.snapshot().battlefield.wallets, {});
  assert.equal(r.game.snapshot().battlefield.messages.length, 0);
  b.command("final");
  buy(r, id, f.id, "troop", 2);
  assert.deepEqual(r.game.snapshot().battlefield.orders, {});
  assert.equal(r.game.snapshot().battlefield.deployments.length, 0);
  assert.equal(r.game.snapshotFor(id).battlefield.orders[k].troop, 9);
  assert.equal(r.game.snapshotFor(other).battlefield.orders[k], undefined);
  assert.equal(r.game.snapshotFor(other).battlefield.messages.length, 0);
});
test("practice and five rounds resolve once, preserve Crowd Rush, and award equal persistent teammate scores", () => {
  const r = room(7),
    b = begin(r);
  r.players.forEach((p) => (p.earnings = 123));
  for (let round = 0; round <= 5; round++) {
    for (const t of b.teams) {
      const f = b.fronts.find((f) => [f.a, f.b].includes(t.id));
      for (const id of t.members)
        buy(r, id, f.id, "troop", Math.min(15, b.wallets[id]));
    }
    r.advance(45000);
    assert.equal(b.phase, "final");
    r.advance(15000);
    assert.equal(b.phase, "countdown");
    r.advance(5000);
    assert.equal(b.phase, "reveal");
    const saved = r.game.save();
    b.resolve();
    assert.deepEqual(r.game.save(), saved);
    r.advance(10000);
    if (round === 0) assert.ok(r.players.every((p) => !p.battlefieldScore));
    if (round < 5) {
      b.command("next");
      b.command("tutorial");
      b.command("forceStart");
    }
  }
  for (const t of b.teams)
    for (const id of t.members)
      assert.equal(r.game.players.get(id).battlefieldScore, t.score);
  assert.ok(r.players.every((p) => p.earnings === 123));
  const saved = r.game.save();
  r.game.command("lobby");
  const restored = new Game({ saved });
  for (const p of r.players)
    assert.equal(
      restored.players.get(p.id).battlefieldScore,
      p.battlefieldScore,
    );
});
test("pause freezes purchases and movement; reconnect keeps wallets; only absent wallets can be managed by teammates", () => {
  const r = room(),
    b = begin(r),
    t = b.teams[0],
    f = b.fronts[0],
    [a, c] = t.members;
  buy(r, a, f.id, "troop", 5);
  const p = r.game.players.get(a);
  p.connected = false;
  r.game.join(p.token, p.name, p.appearance, {
    pageId: "reload",
    resume: false,
  });
  assert.equal(b.wallets[a], 15);
  assert.equal(b.personalOrders[a][f.id].troop, 5);
  r.game.command("pause");
  r.advance(100000);
  assert.equal(b.phase, "planning");
  assert.throws(() => buy(r, a, f.id), /closed/);
  r.game.command("resume");
  p.connected = false;
  Object.assign(r.game.players.get(c), { x: 200, z: 180 });
  assert.throws(
    () =>
      b.act(c, "purchase", {
        owner: a,
        front: f.id,
        unit: "troop",
        quantity: 2,
        nonce: randomUUID(),
        volley: r.game.round,
      }),
    /Walk/,
  );
  p.x = 200;
  p.z = 180;
  place(r, c, f.id);
  b.act(c, "purchase", {
    owner: a,
    front: f.id,
    unit: "troop",
    quantity: 2,
    nonce: randomUUID(),
    volley: r.game.round,
  });
  assert.equal(b.wallets[a], 13);
  const late = r.game.join(
    null,
    "LateBear",
    {},
    { pageId: "late", resume: false },
  );
  assert.equal(late.waitingLobby, true);
  assert.throws(() => b.act(late.id, "purchase", {}), /observing/);
});
test("costs, counters, artillery, fortifications, ties and empty fronts follow the published rules", () => {
  const a = { ...emptyOrder(), troop: 20 },
    tank = { ...emptyOrder(), tank: 1 };
  assert.equal(compareOrders(a, tank, 1).leftPoints, 1);
  assert.equal(compareOrders(a, a, 2, 2).leftPoints, 1);
  assert.equal(compareOrders(emptyOrder(), emptyOrder(), 1).leftPoints, 0);
  assert.equal(strength({ ...emptyOrder(), heavy: 2 }, tank, 3), 15);
  assert.equal(strength({ ...emptyOrder(), fort: 2 }, tank, 4), 12);
  assert.equal(
    strength(
      { ...emptyOrder(), artillery: 1 },
      { ...emptyOrder(), fort: 1 },
      5,
    ),
    12,
  );
});
test("solo demo supports 2–40 actors, untimed planning, bot activity, switching bears, round selection and cleanup without saving demo identities or scores", () => {
  for (const count of [2, 16, 20, 21, 22, 29, 30, 40]) {
    const r = room(count, true),
      b = begin(r);
    assert.equal(b.roster.length, count);
    assert.equal(b.teams.length, teamPlan(count).length);
    r.advance(100000);
    assert.equal(b.phase, "planning");
    assert.ok(Object.values(b.orders).some((o) => orderCost(o) > 0));
    assert.equal(r.game.save().players.length, 1);
    const pilot = b.demo.pilot;
    b.command("pilot", { id: b.roster[1] });
    assert.notEqual(b.demo.pilot, pilot);
    b.command("round", { round: 5 });
    assert.equal(b.round, 5);
    assert.equal(b.phase, "staging");
    for (const t of b.teams)
      assert.equal(
        t.members.reduce((n, id) => n + b.wallets[id], 0),
        90,
      );
    r.game.command("lobby");
    assert.equal(r.game.players.size, 1);
    assert.equal(r.players[0].earnings, 0);
    assert.equal(r.players[0].waitingLobby, false);
  }
});
test("barracks back walls block walking while the open entrance admits a panda", () => {
  const teams = [{ id: "t0" }, { id: "t1" }],
    pos = teamPositions(teams)[0],
    p = { x: pos.x, z: pos.z - 8, y: 0, vx: 0, vz: 0, vy: 0, grounded: true };
  for (let i = 0; i < 40; i++)
    move(p, { z: 1 }, 0.05, "battlefield1", 0, false, { teams });
  assert.ok(p.z < pos.z - 5.8);
  const q = {
    x: pos.x,
    z: pos.z + 9,
    y: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    grounded: true,
  };
  for (let i = 0; i < 25; i++)
    move(q, { z: -1 }, 0.05, "battlefield1", 0, false, { teams });
  assert.ok(q.z < pos.z + 4);
});

test("waiting-lobby emotes remain finite during Battlefield and respect pause", () => {
  const r = room(),
    b = begin(r),
    p = r.game.join(null, "WaitingBear", {}, { pageId: "late", resume: false });
  r.game.emote(p, "wave");
  r.advance(3000);
  assert.equal(p.emoteActive, false);
  r.game.command("pause");
  assert.throws(() => r.game.emote(p, "wave"), /paused/);
});

test("host-led staging and briefing readiness precede timers; five-second countdown freezes and protects orders", () => {
  const r = room(12),
    b = r.b;
  b.command("match");
  assert.equal(b.phase, "staging");
  r.advance(90000);
  assert.equal(b.phase, "staging");
  assert.throws(() => b.command("start"), /unavailable/);
  b.command("tutorial");
  assert.equal(b.phase, "instructions");
  assert.throws(() => b.command("start"), /Wait/);
  for (const p of r.players) b.act(p.id, "ready");
  assert.equal(b.snapshot().readyCount, 12);
  b.command("start");
  const own = b.teams[0],
    enemy = b.teams[1],
    fid = b.fronts.find((f) => [f.a, f.b].includes(own.id)).id;
  buy(r, own.members[0], fid, "troop", 2);
  r.advance(45000);
  assert.equal(b.phase, "final");
  buy(r, own.members[0], fid, "tank", 1);
  r.advance(15000);
  assert.equal(b.phase, "countdown");
  assert.equal(
    b.snapshot(enemy.members[0]).orders[`${own.id}:${fid}`],
    undefined,
  );
  assert.throws(() => buy(r, own.members[0], fid), /closed/);
  r.advance(4000);
  assert.equal(b.phase, "countdown");
  b.command("pause");
  r.advance(20000);
  assert.equal(b.phase, "countdown");
  b.command("resume");
  r.advance(1000);
  assert.equal(b.phase, "reveal");
  assert.equal(b.snapshot().results.length, b.fronts.length);
});

test("every workshop home territory remains disjoint and keeps players inside even while jumping", () => {
  for (const count of [2, 20, 21, 22, 29, 30, 40]) {
    const r = room(count),
      b = begin(r),
      positions = teamPositions(b.teams);
    for (const team of b.teams) {
      const home = positions.find((p) => p.id === team.id),
        p = r.game.players.get(team.members[0]);
      for (const other of positions.filter((p) => p.id !== team.id))
        assert.ok(Math.hypot(home.x - other.x, home.z - other.z) > 56);
      for (let i = 0; i < 220; i++)
        move(
          p,
          { x: 1, z: 1, jump: i % 20 === 0 },
          0.05,
          "battlefield1",
          0,
          false,
          b,
        );
      assert.ok(Math.hypot(p.x - home.x, p.z - home.z) <= 27.651);
    }
  }
});

test("demo pilot sees its own briefing and readiness follows pilot changes", () => {
  const r = room(16, true),
    b = r.b;
  assert.equal(b.phase, "staging");
  assert.ok(!b.ready.has(b.demo.pilot));
  b.command("tutorial");
  const old = b.demo.pilot,
    next = b.demo.ids[1];
  b.command("pilot", { id: next });
  assert.ok(b.ready.has(old));
  assert.ok(!b.ready.has(next));
  b.act(next, "ready");
  b.command("start");
  assert.equal(b.phase, "planning");
});

test("home barriers hold through countdown, drop during combat/results, and return on the next round", () => {
  const r = room(12),
    b = begin(r),
    team = b.teams[0],
    p = r.game.players.get(team.members[0]);
  const home = teamPositions(b.teams).find((x) => x.id === team.id);
  Object.assign(p, { x: home.x, z: home.z + 26, y: 0, vx: 0, vz: 0 });
  for (let i = 0; i < 40; i++)
    move(p, { z: 1 }, 0.05, "battlefield1", 0, false, b);
  assert.ok(Math.hypot(p.x - home.x, p.z - home.z) <= 27.651);
  b.command("final");
  b.command("fight");
  assert.equal(b.phase, "countdown");
  for (let i = 0; i < 20; i++)
    move(p, { z: 1 }, 0.05, "battlefield1", 0, false, b);
  assert.ok(Math.hypot(p.x - home.x, p.z - home.z) <= 27.651);
  r.advance(5000);
  assert.equal(b.phase, "reveal");
  for (let i = 0; i < 40; i++)
    move(p, { z: 1 }, 0.05, "battlefield1", 0, false, b);
  assert.ok(Math.hypot(p.x - home.x, p.z - home.z) > 35);
  r.advance(10000);
  assert.equal(b.phase, "results");
  for (let i = 0; i < 20; i++)
    move(p, { z: 1 }, 0.05, "battlefield1", 0, false, b);
  assert.ok(Math.hypot(p.x - home.x, p.z - home.z) > 40);
  b.command("next");
  assert.equal(b.phase, "staging");
  assert.ok(Math.hypot(p.x - home.x, p.z - home.z) < 10);
});

test('Disconnected wallets auto-deploy only in the final five seconds, preserving connected choices',()=>{
 const r=room(6);const b=begin(r);r.game.command('battle:final');const team=b.teams[0],absent=team.members[0],connected=team.members[1];
 const budget=b.wallets[absent],kept=b.wallets[connected];r.game.players.get(absent).connected=false;b.locks[absent]=true;
 r.advance(9999);assert.equal(b.wallets[absent],budget);r.advance(1);assert.equal(b.wallets[absent],0);assert.equal(b.wallets[connected],kept);
 const fronts=b.fronts.filter(f=>[f.a,f.b].includes(team.id));const amounts=fronts.map(f=>b.personalOrders[absent][f.id].troop);assert.equal(amounts.reduce((a,b)=>a+b,0),budget);assert.ok(Math.max(...amounts)-Math.min(...amounts)<=1);const orders=JSON.stringify(b.orders);r.advance(5000);assert.equal(JSON.stringify(b.orders),orders);
});
