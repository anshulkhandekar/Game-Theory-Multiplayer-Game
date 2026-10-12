export const UNITS = [
  { id: "troop", name: "Troops", cost: 1 },
  { id: "heavy", name: "Turrets", cost: 5 },
  { id: "tank", name: "Tanks", cost: 10 },
  { id: "artillery", name: "Artillery", cost: 8, unlock: 5 },
];
export const BATTLE_ROUNDS = [
  {
    name: "Oasis",
    ground: "#dab779",
    sky: "#b7dfee",
    budget: 60,
    change:
      "Allocate 60 resources across three fronts. Troops cost 1, turrets 5, tanks 10. Each resource buys one strength.",
    prompt: "Which front did you give up to strengthen another?",
  },
  {
    name: "Wildflower plains",
    ground: "#80a75c",
    sky: "#b7dcff",
    budget: 60,
    change:
      "The marked supply front is worth 2 territory; the other fronts are worth 1. Both opponents see the same reward.",
    prompt: "Did the extra reward attract more strength than you expected?",
  },
  {
    name: "Mountain valley",
    ground: "#88a29b",
    sky: "#c2d2e8",
    budget: 60,
    change:
      "Counters begin: troops counter turrets, turrets counter tanks, tanks counter troops. Countered enemy strength gives that unit up to a 50% bonus.",
    prompt: "What did you expect your opponent to deploy?",
  },
  {
    name: "Redrock canyon",
    ground: "#ba7854",
    sky: "#f1d1aa",
    budget: 60,
    change:
      "Fortifications unlock: spend 5 resources for 6 strength that cannot counter or be countered. At most two per front.",
    prompt: "When was a fortification better than a flexible army?",
  },
  {
    name: "Volcanic highlands",
    ground: "#535163",
    sky: "#d0a9b5",
    budget: 90,
    change:
      "Final round: 90 resources and artillery (cost/strength 8), with up to 50% extra strength against enemy fortifications. Counters and fortifications remain. Supply fronts award 3 territory; other fronts award 2.",
    prompt: "How did the public deployments change your private final orders?",
  },
];
export const emptyOrder = () => ({
  troop: 0,
  heavy: 0,
  tank: 0,
  artillery: 0,
  fort: 0,
});
export const orderCost = (o) =>
  UNITS.reduce((n, u) => n + (o[u.id] || 0) * u.cost, 0) + o.fort * 5;
export function validateOrder(order, round) {
  if (!order || typeof order !== "object" || Array.isArray(order))
    throw Error("Choose valid unit counts");
  const out = emptyOrder();
  for (const key of Object.keys(out)) {
    const n = order[key] ?? 0;
    if (!Number.isSafeInteger(n) || n < 0 || n > 90)
      throw Error("Unit counts must be whole, nonnegative numbers");
    out[key] = n;
  }
  if (round < 5 && out.artillery) throw Error("Artillery unlocks in round 5");
  if (out.fort > (round >= 4 ? 2 : 0))
    throw Error("Fortifications are limited to two per front from round 4");
  return out;
}
export function strength(order, enemy, round) {
  let total = orderCost(order) + order.fort; // fortifications cost 5 and supply 6.
  if (round < 3) return total;
  const enemyArmy = orderCost(enemy) - enemy.fort * 5;
  if (!enemyArmy)
    return (
      total + (round >= 5 && enemy.fort ? 0.5 * (order.artillery || 0) * 8 : 0)
    );
  const prey = { troop: "heavy", heavy: "tank", tank: "troop" };
  for (const unit of UNITS) {
    if (!prey[unit.id]) continue;
    const target = UNITS.find((u) => u.id === prey[unit.id]);
    total +=
      (0.5 * order[unit.id] * unit.cost * enemy[target.id] * target.cost) /
      enemyArmy;
  }
  if (round >= 5 && enemy.fort)
    total +=
      (0.5 * (order.artillery || 0) * 8 * (enemy.fort * 6)) /
      (enemyArmy + enemy.fort * 6);
  return total;
}
export function compareOrders(a, b, round, value = 1) {
  const left = strength(a, b, round),
    right = strength(b, a, round);
  const empty = left === 0 && right === 0,
    tie = Math.abs(left - right) < 1e-8;
  return {
    left,
    right,
    value,
    leftPoints: empty ? 0 : tie ? value / 2 : left > right ? value : 0,
    rightPoints: empty ? 0 : tie ? value / 2 : right > left ? value : 0,
    outcome: empty
      ? "Empty"
      : tie
        ? "Tie"
        : left > right
          ? "Left wins"
          : "Right wins",
  };
}
// Three edge colors give every team one equally valued front of each kind.
export function makeFronts(teams) {
  const edges = [],
    n = teams.length;
  const add = (a, b, lane) =>
    edges.push({
      id: `f${edges.length}`,
      a: teams[a].id,
      b: teams[b].id,
      lane,
    });
  if (n === 2) {
    for (let lane = 0; lane < 3; lane++) add(0, 1, lane);
  } else if (n % 4 === 0) {
    for (let i = 0; i < n; i += 4) {
      add(i, i + 1, 0);
      add(i + 2, i + 3, 0);
      add(i, i + 2, 1);
      add(i + 1, i + 3, 1);
      add(i, i + 3, 2);
      add(i + 1, i + 2, 2);
    }
  } else {
    for (let i = 0; i < n; i++) add(i, (i + 1) % n, i % 2);
    for (let i = 0; i < n / 2; i++) add(i, i + n / 2, 2);
  }
  return edges;
}
export const frontValue = (round, lane) =>
  round === 5 ? (lane === 0 ? 3 : 2) : round === 2 && lane === 0 ? 2 : 1;
export function teamPositions(teams) {
  const n = teams.length;
  return teams.map((t, i) => {
    if (n % 4 === 0) {
      const c = Math.floor(i / 4),
        offset = (c - (n / 4 - 1) / 2) * 166;
      return {
        id: t.id,
        x: offset + [-38, 38, -38, 38][i % 4],
        z: [-38, -38, 38, 38][i % 4],
      };
    }
    const angle = (i / n) * Math.PI * 2,
      radius = n === 2 ? 46 : Math.max(72, n * 10);
    return {
      id: t.id,
      x: Math.sin(angle) * radius,
      z: Math.cos(angle) * radius,
    };
  });
}

export function teamPlan(participants, preferred = 3) {
  if (!Number.isInteger(participants) || participants < 2 || participants > 40)
    throw Error("Choose 2–40 participants");
  let count =
    participants < 8
      ? 2
      : preferred === 2
        ? 2 * Math.floor(participants / 4)
        : 2 * Math.ceil(participants / 6);
  count = Math.max(2, count);
  return Array.from(
    { length: count },
    (_, i) =>
      Math.floor(participants / count) + (i < participants % count ? 1 : 0),
  );
}
export function terminalPosition(teams, teamId, lane) {
  const p = teamPositions(teams).find((p) => p.id === teamId);
  return { x: p.x + (lane - 1) * 3.5, y: 1.6, z: p.z + 3.5 };
}
export const availableUnits = (round) =>
  UNITS.filter((u) => !u.unlock || round >= u.unlock);
const solidCache = new Map();
export function battlefieldSolids(teams) {
  const count = teams.length;
  if (solidCache.has(count)) return solidCache.get(count);
  const boxes = [];
  for (const p of teamPositions(teams)) {
    boxes.push({ x: p.x, y: 1.7, z: p.z - 5.8, w: 14, h: 3.4, d: 0.2 });
    for (const side of [-1, 1])
      boxes.push({
        x: p.x + side * 7,
        y: 1.7,
        z: p.z - 1.5,
        w: 0.2,
        h: 3.4,
        d: 8.5,
      });
    for (const x of [-7, 7])
      for (const z of [-5.7, 5.7])
        boxes.push({
          x: p.x + x,
          y: 2.1,
          z: p.z + z,
          w: 0.22,
          h: 4.2,
          d: 0.22,
        });
  }
  solidCache.set(count, boxes);
  return boxes;
}

// Each player remains in a spacious, disjoint home territory. Units travel beyond it.
export const HOME_RADIUS = 28;
export function homePosition(battlefield, playerId) {
  const team = battlefield?.teams.find((t) => t.members?.includes(playerId));
  return team
    ? teamPositions(battlefield.teams).find((p) => p.id === team.id)
    : null;
}

export const barriersRaised = (phase) => !["reveal", "results"].includes(phase);
export function battlefieldBounds(teams) {
  const positions = teamPositions(teams);
  return {
    x: Math.max(100, ...positions.map((p) => Math.abs(p.x) + 52)),
    z: Math.max(100, ...positions.map((p) => Math.abs(p.z) + 52)),
  };
}

// Small demos use the same three scored fronts, but each has a distinct physical route.
export function frontPatch(teams, front, teamId) {
  const positions = teamPositions(teams),
    p = positions.find((p) => p.id === teamId),
    enemy = positions.find(
      (p) => p.id === (front.a === teamId ? front.b : front.a),
    );
  const angle = Math.atan2(enemy.x - p.x, enemy.z - p.z);
  if (teams.length === 2) {
    // Both bases agree on world-left/world-right, avoiding crossed paired lanes.
    const offset = [0, -17, 17][front.lane];
    return {
      x: p.x + offset,
      z: p.z + Math.cos(angle) * (front.lane ? 11 : 17),
      angle: front.lane ? Math.atan2(offset, Math.cos(angle) * 11) : angle,
    };
  }
  return {
    x: p.x + Math.sin(angle) * 17,
    z: p.z + Math.cos(angle) * 17,
    angle,
  };
}
export function frontPath(teams, front) {
  const a = frontPatch(teams, front, front.a),
    b = frontPatch(teams, front, front.b);
  if (teams.length !== 2 || front.lane === 0) return [a, b];
  const x = front.lane === 1 ? -32 : 32;
  return [a, { x, z: a.z }, { x, z: b.z }, b];
}
