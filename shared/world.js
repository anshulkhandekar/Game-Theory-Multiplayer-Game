import { BLOTTO_WALLS } from "./blotto.js";
// The renderer and authoritative simulation consume these same dimensions.
export const STAGES = [
  {
    id: 1,
    name: "Three chambers",
    duration: 35,
    description: "Walk into a chamber. Everyone inside shares its reward.",
  },
  {
    id: 2,
    name: "Platform routes",
    duration: 45,
    description: "Jump between wide platforms. Diamond has a moving landing.",
  },
  {
    id: 3,
    name: "Three-way gallery",
    duration: 50,
    description: "Three directions from the start. Turn to compare the routes.",
  },
  {
    id: 4,
    name: "Punch works",
    duration: 60,
    description:
      "Wall-mounted punchers launch bears sideways. Watch their wind-up.",
  },
  {
    id: 5,
    name: "High vaults",
    duration: 70,
    description:
      "Three long routes combine punchers, floor spikes, and faster moving landings.",
  },
];
const COLORS = ["#e79b56", "#ffd45a", "#66e3ff"];
const IDS = ["bronze", "gold", "diamond"];
const endpoints = {
  1: [
    [-9, -5, 0],
    [0, 10, 0],
    [9, -5, 0],
  ],
  2: [
    [-12, -12, 1.8],
    [0, -18, 3],
    [12, -12, 3.6],
  ],
  3: [
    [-22.5167, 14, 4.8],
    [0, -25, 5.4],
    [22.5167, 14, 6],
  ],
  4: [
    [-25.9808, 16, 6.3],
    [0, -29, 7.2],
    [25.9808, 16, 8.1],
  ],
  5: [
    [-29.4449, 18, 8.4],
    [0, -33, 9.3],
    [29.4449, 18, 10.2],
  ],
};
export function stageOf(world) {
  return Number(String(world).replace("arena", "")) || 1;
}
export function isParkour(world) {
  return /^arena[2-5]$/.test(world);
}
export function vaultsFor(stage = 2) {
  const vaults = endpoints[stage].map(([x, z, y], i) => ({
    id: IDS[i],
    name: IDS[i][0].toUpperCase() + IDS[i].slice(1),
    x: stage > 1 ? x * (1 + 6 / Math.hypot(x,z-1)) : x,
    z: stage > 1 ? 1 + (z-1) * (1 + 6 / Math.hypot(x,z-1)) : z,
    y,
    color: COLORS[i],
    angle: Math.atan2(-x, 1 - z),
  }));
  if (stage >= 3)
    vaults.push({
      id: "sky",
      name: "Sky",
      x: 0,
      z: 1,
      y: { 3: 11, 4: 14, 5: 17 }[stage],
      color: "#ba9cff",
      angle: 0,
    });
  return vaults;
}
// Shared dome dimensions keep the rendered shield and staging collision aligned.
export const STAGING_DOME = { radius: 6, z: 1 };
export function arenaBounds(stage) {
  const vaults = vaultsFor(stage).filter(v => v.id !== "sky");
  const margin = 10; // Rotated 7×7 vault floors plus clear space before perimeter ribs.
  return {
    side: Math.max(34, ...vaults.map(v => Math.abs(v.x) + margin)),
    front: Math.max(stage >= 3 ? 28 : 8, ...vaults.map(v => v.z + margin)),
    rear: Math.min(stage === 5 ? -55 : stage === 4 ? -47 : -39, ...vaults.map(v => v.z - margin)),
  };
}
// Flip transitions do not supply a walkable surface; the flat face and vertical
// edge use their actual box dimensions. Shrinking platforms retain a fixed center.
export function timedPlatform(p, time) {
  if (p.shrinking) {
    const cycle = (time + (p.offset || 0)) % 2;
    const t =
      cycle < 0.75
        ? 0
        : cycle < 1
          ? (cycle - 0.75) / 0.25
          : cycle < 1.5
            ? 1
            : 1 - (cycle - 1.5) / 0.5;
    const scale = 1 - 0.62 * t;
    return {
      ...p,
      baseW: p.w,
      baseD: p.d,
      scale,
      w: p.w * scale,
      d: p.d * scale,
      y: p.y + (cycle > 0.55 && cycle < 0.75 ? Math.sin(cycle * 65) * 0.04 : 0),
    };
  }
  if (p.flipping) {
    const cycle = (time + (p.offset || 0)) % 3.2;
    const t =
      cycle < 1.6
        ? 0
        : cycle < 1.95
          ? (cycle - 1.6) / 0.35
          : cycle < 2.65
            ? 1
            : Math.max(0, 1 - (cycle - 2.65) / 0.35);
    const angle = (t * Math.PI) / 2,
      h = p.h * Math.abs(Math.cos(angle)) + p.d * Math.abs(Math.sin(angle));
    return {
      ...p,
      baseY: p.y,
      baseD: p.d,
      baseH: p.h,
      flipAngle: angle,
      walkable: t === 0 || t === 1,
      h,
      d: p.d * Math.abs(Math.cos(angle)) + p.h * Math.abs(Math.sin(angle)),
      y: p.y - p.h / 2 + h / 2,
    };
  }
  return p;
}
export function jumpPads(world, time = 0) {
  if (world === "lobby")
    return [
      { id: "practice-pad", x: -5, z: 32, y: 0, w: 2.5, d: 2.5, impulse: 11 },
    ];
  const stage = stageOf(world);
  if (stage < 3) return [];
  const points = [
    [0, 8.8, 0],
    [-3, 7, 2.8],
    [1, 10, 5.6],
    [4, 7, 8.4],
    [0, 10, 11.2],
    [0, 6.5, 14],
  ];
  return points.slice(0, stage + 1).map(([x, z, y], i) =>
    timedPlatform(
      {
        id: `sky-pad-${i}`,
        x,
        z,
        y,
        w: stage === 5 ? 2.3 : 2.5,
        d: stage === 5 ? 2.3 : 2.5,
        h: 0.7,
        color: "#ba9cff",
        impulse: 13,
        shrinking: stage >= 4 && i === 2,
        flipping: stage >= 4 && i === 3,
        offset: i * 0.43,
      },
      time,
    ),
  );
}
export function practicePlatforms(time = 0) {
  const blocks = [
    [-5, 35, 0.7, 3],
    [-2, 38, 1.4, 2.8],
    [2, 40, 2.1, 2.6],
    [5, 43, 2.8, 2.5],
    [2, 46, 3.5, 2.3],
    [-2, 48, 4.2, 2.2],
    [-5, 51, 4.9, 2],
    [-1, 54, 5.6, 1.8],
    [3, 56, 6.3, 1.5],
    [0, 59, 7, 5],
  ];
  return blocks.map(([x, z, y, w], i) =>
    timedPlatform(
      {
        id: `practice-${i}`,
        x: i === 2 ? x + Math.sin(time * 2.8) : x,
        z,
        y,
        w,
        d: w,
        h: 0.45,
        color: i < 3 ? "#7fceba" : i < 6 ? "#efbe76" : "#ba9cff",
        moving: i === 2,
        flipping: i === 4,
        shrinking: i === 7,
      },
      time,
    ),
  );
}
export function practiceHazards(time = 0) {
  const ps = practicePlatforms(time),
    p = ps[3],
    s = ps[6],
    motion = hazardMotion(((time % 4.4) * 5) / 4.4),
    baseX = p.x - p.w / 2 - 0.75,
    reach = p.w / 2 + 1.05;
  return [
    {
      id: "practice-punch",
      kind: "puncher",
      platform: p.id,
      baseX,
      baseZ: p.z,
      nx: 1,
      nz: 0,
      reach,
      x: baseX + reach * motion.extension,
      z: p.z,
      y: p.y + 0.6,
      w: 0.95,
      d: 0.95,
      h: 1.1,
      ...motion,
    },
    {
      id: "practice-spikes",
      kind: "spikes",
      platform: s.id,
      x: s.x,
      z: s.z,
      y: s.y,
      w: s.w,
      d: s.d,
      h: 0.85,
      ...hazardMotion((time + 1) % 5),
    },
  ];
}
export function lobbyRegion(x, z) {
  return (
    Math.hypot(x, z) <= 19 ||
    (Math.abs(x) <= 5.2 && z >= 17 && z <= 30) ||
    (Math.abs(x) <= 12 && z >= 29 && z <= 62) ||
    (x >= 2 && x <= 26 && z >= 23 && z <= 30) ||
    (x >= 14 && x <= 30 && z >= 29 && z <= 53)
  );
}
export const ROUTES = vaultsFor(2);
export function toLocal(point, box) {
  const a = box.angle || 0,
    c = Math.cos(a),
    s = Math.sin(a),
    dx = point.x - box.x,
    dz = point.z - box.z;
  return { x: c * dx - s * dz, z: s * dx + c * dz };
}
export function toWorld(point, box) {
  const a = box.angle || 0,
    c = Math.cos(a),
    s = Math.sin(a);
  return {
    x: box.x + c * point.x + s * point.z,
    z: box.z - s * point.x + c * point.z,
  };
}
export function contains(platform, x, z, margin = 0) {
  const p = toLocal({ x, z }, platform);
  return (
    Math.abs(p.x) <= platform.w / 2 + margin &&
    Math.abs(p.z) <= platform.d / 2 + margin
  );
}
export function insideVault(player, vault) {
  const p = toLocal(player, vault);
  return (
    Math.abs(p.x) <= 2.39 &&
    p.z >= -2.39 &&
    p.z <= 2.55 &&
    Math.abs(player.y - (vault.y || 0)) < 0.45
  );
}
const platformCache = new Map(),
  solidCache = new Map(),
  hazardCache = new Map();
function cacheSet(cache, key, value) {
  cache.set(key, value);
  if (cache.size > 64) cache.delete(cache.keys().next().value);
  return value;
}
function stairHeight(v, count, i, stage) {
  if (stage < 3) return (v.y * i) / (count + 1);
  const weight = (n) => [1, 1.15, 0.65][n % 3];
  const sum = (n) =>
    Array.from({ length: n }, (_, j) => weight(j + 1)).reduce(
      (a, b) => a + b,
      0,
    );
  return (v.y * sum(i)) / sum(count + 1);
}
export function platforms(time = 0, stage = 2) {
  const key = stage + ":" + time.toFixed(6);
  if (platformCache.has(key)) return platformCache.get(key);
  const blocks = [{ id: "spawn", x: 0, z: 1, y: 0, w: 12, d: 12, h: 0.7 }];
  const width = { 2: 2.8, 3: 2.55, 4: 2.35, 5: 2.5 }[stage];
  for (const [index, v] of vaultsFor(stage)
    .filter((v) => v.id !== "sky")
    .entries()) {
    const distance = Math.hypot(v.x, v.z - 1),
      ux = v.x / distance,
      uz = (v.z - 1) / distance;
    const start = (6 + width / 2 + 0.8) / Math.max(Math.abs(ux), Math.abs(uz));
    const end = distance - 5.3;
    const count = Math.ceil((distance - 6 - 5.3) / 3.3);
    for (let i = 1; i <= count; i++) {
      const t = i / count,
        length =
          start + (end - start) * (i - 1) / (count - 1) +
          (stage === 2 && i >= Math.ceil(count * 0.65)
            ? (1.1 * (count - i)) / Math.max(1, count - Math.ceil(count * 0.65))
            : 0);
      const stagger =
        stage >= 3 && index > 0 && i > 1
          ? Math.sin((i * Math.PI) / 2) * (0.7 + (stage - 3) * 0.12)
          : 0;
      const moving =
        (index === 2 && i === Math.ceil(count * 0.55)) ||
        (stage >= 3 && index === 1 && i === Math.ceil(count * 0.7)) ||
        (stage >= 3 && index === 2 && i === count - 1);
      const shift = moving
        ? Math.sin(time * { 2: 2.2, 3: 2.9, 4: 3.5, 5: 4.2 }[stage] + index) *
          { 2: 0.8, 3: 1.05, 4: 1.15, 5: 1.45 }[stage]
        : 0;
      blocks.push({
        id: `${v.id}-${i}`,
        x: ux * length - uz * (stagger + shift),
        z: 1 + uz * length + ux * (stagger + shift),
        y: stairHeight(v, count, i, stage),
        w: stage >= 3 && i % 3 === 0 ? width + 0.65 : width,
        d: stage >= 3 && i % 3 === 0 ? width + 0.65 : width,
        h: 0.7,
        color: v.color,
        moving,
        route: v.id,
        index: i,
      });
    }
    blocks.push({ ...v, w: 7, d: 7, h: 0.7 });
  }
  if (stage >= 3) {
    const sky = vaultsFor(stage).find((v) => v.id === "sky");
    blocks.push(...jumpPads(`arena${stage}`, time), {
      ...sky,
      w: 7,
      d: 7,
      h: 0.7,
    });
  }
  return cacheSet(platformCache, key, blocks);
}
// Extension is authoritative: warning flutter, fast strike, hold, then retract.
export function hazardMotion(cycle) {
  if (cycle < 2.8) return { state: "safe", extension: 0 };
  if (cycle < 3.6) {
    const t = (cycle - 2.8) / 0.8;
    return {
      state: "warning",
      extension: 0.08 + 0.13 * Math.sin(t * Math.PI * 3) ** 2,
    };
  }
  const t = cycle - 3.6;
  const extension =
    t < 0.15 ? t / 0.15 : t < 0.65 ? 1 : Math.max(0, 1 - (t - 0.65) / 0.65);
  return { state: "active", extension };
}
export function hazards(time = 0, stage = 4) {
  const key = stage + ":" + time.toFixed(6);
  if (hazardCache.has(key)) return hazardCache.get(key);
  if (stage < 4) return [];
  const ps = platforms(time, stage),
    out = [];
  for (const [routeIndex, route] of IDS.entries()) {
    const stones = ps.filter((p) => p.route === route && !p.moving);
    const v = vaultsFor(stage)[routeIndex];
    const distance = Math.hypot(v.x, v.z - 1);
    const nx = -(v.z - 1) / distance,
      nz = v.x / distance;
    const fractions = stage === 5 ? [0.25, 0.55, 0.85] : [0.35, 0.75];
    fractions.forEach((fraction, j) => {
      const p = stones[Math.floor(stones.length * fraction)];
      const period = (stage === 5 ? 3.1 : 4.4) + routeIndex * 0.17;
      const motion = hazardMotion(
        (((time + routeIndex * 1.25 + j * 1.7) % period) * 5) / period,
      );
      const baseX = p.x - nx * (p.w / 2 + 0.75),
        baseZ = p.z - nz * (p.d / 2 + 0.75);
      const reach = p.w / 2 + 1.05;
      out.push({
        id: `puncher-${route}-${j}`,
        kind: "puncher",
        platform: p.id,
        baseX,
        baseZ,
        nx,
        nz,
        reach,
        x: baseX + nx * reach * motion.extension,
        z: baseZ + nz * reach * motion.extension,
        y: p.y + 0.6,
        w: 0.95,
        d: 0.95,
        h: 1.1,
        ...motion,
      });
    });
    if (stage === 5) {
      const floor = stones[Math.floor(stones.length * 0.35)];
      out.push({
        id: `spikes-${route}`,
        kind: "spikes",
        platform: floor.id,
        x: floor.x,
        z: floor.z,
        y: floor.y,
        w: floor.w,
        d: floor.d,
        h: 0.85,
        ...hazardMotion((time + routeIndex * 1.25 + 2) % 5),
      });
    }
  }
  return cacheSet(hazardCache, key, out);
}
// Chamber entrance faces the start. Full-height back/side walls and roof are solid.
export function chamberSolids(v) {
  return [
    [-2.85, 1.65, 0, 0.3, 3.3, 5.8, "left"],
    [2.85, 1.65, 0, 0.3, 3.3, 5.8, "right"],
    [0, 1.65, -2.85, 5.8, 3.3, 0.3, "back"],
    [0, 3.4, 0, 6, 0.2, 6, "roof"],
    [-2.35, 1.65, 2.85, 1, 3.3, 0.3, "door-left"],
    [2.35, 1.65, 2.85, 1, 3.3, 0.3, "door-right"],
  ].map(([x, y, z, w, h, d, side]) => ({
    ...toWorld({ x, z }, v),
    y: (v.y || 0) + y,
    w,
    h,
    d,
    angle: v.angle,
    id: `${v.id}-${side}`,
  }));
}
export function solids(world, time = 0) {
  const key = world + ":" + (world !== "arena1" ? time.toFixed(6) : 0);
  if (solidCache.has(key)) return solidCache.get(key);
  if (isParkour(world)) {
    const stage = stageOf(world);
    return cacheSet(solidCache, key, [
      ...platforms(time, stage).map((p) => ({ ...p, y: p.y - p.h / 2 })),
      ...vaultsFor(stage).flatMap(chamberSolids),
      ...hazards(time, stage)
        .filter((h) => h.kind === "puncher")
        .map((h) => ({
          id: h.id + "-wall",
          x: h.baseX - h.nx * 0.35,
          z: h.baseZ - h.nz * 0.35,
          y: h.y + 0.5,
          w: 0.45,
          d: 2.3,
          h: 2.8,
          angle: Math.atan2(-h.nz, h.nx),
        })),
    ]);
  }
  if (world === "arena1")
    return cacheSet(solidCache, key, vaultsFor(1).flatMap(chamberSolids));
  // Lounge sofas and tables are real obstacles rather than walkthrough props.
  const furniture = [-1, 1].flatMap((side) => {
    const sofa = { x: side * 9, z: 0, angle: (-side * Math.PI) / 2 };
    return [
      { ...sofa, id: `sofa-seat-${side}`, y: 0.4625, w: 4, d: 1.5, h: 0.925 },
      {
        ...toWorld({ x: 0, z: -0.7 }, sofa),
        angle: sofa.angle,
        id: `sofa-back-${side}`,
        y: 1,
        w: 4,
        d: 0.35,
        h: 1.2,
      },
      {
        id: `table-${side}`,
        x: side * 7,
        z: 2,
        y: 0.3375,
        w: 2,
        d: 2,
        h: 0.675,
      },
      {
        id: `planter-${side}`,
        x: side * 10,
        z: -7,
        y: 0.35,
        w: 1.3,
        d: 1.3,
        h: 0.7,
      },
      {
        id: `stool-${side}`,
        x: side * 4.7,
        z: 7.5,
        y: 0.275,
        w: 1.3,
        d: 1.3,
        h: 0.55,
      },
    ];
  });
  furniture.push({
    id: "notice-board",
    x: -6,
    z: 12.5,
    y: 2.3,
    w: 3.4,
    d: 0.22,
    h: 2.1,
  });
  return cacheSet(solidCache, key, [
    {id:"blotto-hall-floor",x:13,z:26.5,y:-.3,w:26,d:7,h:.5},
    ...BLOTTO_WALLS.map((b,i)=>({...b,id:"blotto-wall-"+i})),
    {id:"blotto-room-floor",x:22,z:41,y:-.3,w:16,d:24,h:.5},
    ...practicePlatforms(time).map((p) => ({ ...p, y: p.y - p.h / 2 })),
    {
      id: "practice-punch-wall",
      x: practiceHazards(time)[0].baseX - 0.35,
      z: 43,
      y: 3.9,
      w: 0.45,
      d: 2.3,
      h: 2.8,
    },
    ...furniture.map((b) => ({
      ...b,
      x: b.x * 1.35,
      z: b.z * 1.35,
      w: b.w * 1.35,
      d: b.d * 1.35,
    })),
  ]);
}
export function surfaceAt(x, z, time = 0, stage = 2) {
  return platforms(time, stage)
    .filter((p) => contains(p, x, z))
    .sort((a, b) => b.y - a.y)[0];
}
export function resetPosition(p) {
  p.launchedUntil = 0;
  p.hazardCooldown = 0;
  p.x = p.spawnX ?? 0;
  p.z = p.spawnZ ?? 1;
  p.y = 0;
  p.vx = p.vy = p.vz = 0;
  p.grounded = true;
  p.support = "spawn";
  p.respawns = (p.respawns || 0) + 1;
}
