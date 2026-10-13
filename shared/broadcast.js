import { teamPositions, frontPatch } from "./battlefield.js";
import { arenaBounds } from "./world.js";
export const defaultBroadcast = () => ({
  mode: "auto",
  soundEnabled: true,
  target: null,
  manualEnabled: false,
  focus: null,
  revision: 0,
});
export function updateBroadcast(current, data, state) {
  const next = { ...current, revision: current.revision + 1 };
  if (data.soundEnabled !== undefined) {
    if (typeof data.soundEnabled !== "boolean")
      throw Error("Choose whether projector sound is enabled");
    next.soundEnabled = data.soundEnabled;
    if (Object.keys(data).length === 1) next.revision = current.revision;
  }
  if (data.mode !== undefined) {
    if (!["auto", "player", "base", "sky"].includes(data.mode))
      throw Error("Choose an available broadcast mode");
    next.mode = data.mode;
    next.focus = null;
  }
  if (data.target !== undefined) {
    if (data.target !== null && typeof data.target !== "string")
      throw Error("Invalid camera target");
    next.target = data.target;
    next.focus = null;
  }
  if (data.manualEnabled !== undefined) {
    if (typeof data.manualEnabled !== "boolean")
      throw Error("Invalid manual camera option");
    next.manualEnabled = data.manualEnabled;
    next.focus = null;
  }
  if (data.focus !== undefined) {
    if (!next.manualEnabled) throw Error("Enable point focus first");
    const f = data.focus;
    if (
      !f ||
      !["x", "z", "angle", "distance"].every((k) => Number.isFinite(f[k])) ||
      Math.abs(f.x) > 1000 ||
      Math.abs(f.z) > 1000 ||
      Math.abs(f.angle) > Math.PI * 2 ||
      f.distance < 6 ||
      f.distance > 500
    )
      throw Error("Invalid camera focus");
    next.focus = {
      x: f.x,
      z: f.z,
      angle: f.angle,
      distance: f.distance,
      world: state.world,
    };
  }
  return next;
}
const orbit = (target, radius, height, angle) => ({
  target,
  position: {
    x: target.x + Math.sin(angle) * radius,
    y: height,
    z: target.z + Math.cos(angle) * radius,
  },
});
// Barracks entrances face +Z, including bases on the far side of the map.
// A gentle arc stays on the open side and frames the terminals and troop apron.
const frontBase = (base, time, reduced) =>
  orbit(
    { x: base.x, y: 1, z: base.z + 3.5 },
    24,
    18,
    reduced ? 0.35 : Math.sin(time * 0.12) * 0.65,
  );
const approachActivity = (player, vault) => {
  const dx = vault.x,
    dz = vault.z - 1,
    length2 = dx * dx + dz * dz;
  if (length2 < 1)
    return Math.hypot(player.x, player.z - 1) < 6 && player.y > 3 ? 1 : 0;
  const progress = (player.x * dx + (player.z - 1) * dz) / length2;
  const t = Math.min(1, Math.max(0, progress));
  const distance = Math.hypot(player.x - dx * t, player.z - 1 - dz * t);
  return progress > 0.2 && progress < 1.25 && distance < 7
    ? 1 + (player.grounded === false ? 1 : 0) + (1 - distance / 7) * 0.25
    : 0;
};
export function broadcastCamera(s, time, reduced = false, spotlight = null) {
  const b = s.broadcast || defaultBroadcast(),
    angle = reduced ? 0.6 : time * 0.07;
  if (b.manualEnabled && b.focus?.world === s.world) {
    const f = b.focus;
    return orbit(
      { x: f.x, y: 1, z: f.z },
      f.distance,
      f.distance * 0.7,
      f.angle,
    );
  }
  if (b.mode === "player") {
    const p = s.players.find(
      (p) => p.id === b.target && p.connected && !p.waitingLobby,
    );
    if (p) {
      const yaw =
          Math.hypot(p.vx || 0, p.vz || 0) > 0.3
            ? Math.atan2(p.vx || 0, p.vz || 0)
            : (p.facing ?? 0),
        dx = Math.sin(yaw),
        dz = Math.cos(yaw);
      return {
        target: { x: p.x + dx * 3, y: (p.y || 0) + 1.4, z: p.z + dz * 3 },
        position: { x: p.x - dx * 8, y: (p.y || 0) + 5, z: p.z - dz * 8 },
      };
    }
  }
  const battle = s.battlefield;
  if (battle && s.world.startsWith("battlefield")) {
    const bases = teamPositions(battle.teams);
    if (!bases.length) return null;
    const slot = Math.floor(time / 8),
      index = slot % bases.length;
    const base =
      bases.find((p) => b.mode === "base" && p.id === b.target) || bases[index];
    const radius = Math.max(
      100,
      ...bases.map((p) => Math.hypot(p.x, p.z) + 55),
    );
    const overview = () => ({
      ...orbit({ x: 0, y: 0, z: 0 }, radius, radius * 0.65, angle),
      key: "battle-overview",
    });
    if (b.mode === "base" || ["final", "countdown"].includes(battle.phase))
      return { ...frontBase(base, time, reduced), key: `base:${base.id}` };
    if (["reveal", "results"].includes(battle.phase)) {
      const elapsed =
        battle.phase === "results"
          ? 10
          : Math.max(
              0,
              10 - battle.remaining + (s.paused ? 0 : time - s.worldTime),
            );
      if (elapsed < 3) return overview();
      const density = (f) => {
        const a = battle.orders?.[`${f.a}:${f.id}`] || {},
          c = battle.orders?.[`${f.b}:${f.id}`] || {};
        return (
          Object.values(a).reduce((n, q) => n + (Number(q) || 0), 0) +
          Object.values(c).reduce((n, q) => n + (Number(q) || 0), 0)
        );
      };
      const fronts = (battle.fronts || []).toSorted(
        (a, c) => density(c) - density(a),
      );
      const f =
        fronts[
          Math.floor((elapsed - 3) / 4) %
            Math.max(1, Math.min(fronts.length, 3))
        ];
      if (f) {
        const a = frontPatch(battle.teams, f, f.a),
          c = frontPatch(battle.teams, f, f.b);
        const target = { x: (a.x + c.x) / 2, y: 1, z: (a.z + c.z) / 2 };
        return {
          ...orbit(target, 36, 27, Math.atan2(a.x - c.x, a.z - c.z) + 0.65),
          key: `combat:${f.id}`,
        };
      }
      return overview();
    }
    const focus =
      spotlight?.kind === "base" && bases.find((p) => p.id === spotlight.id);
    return focus
      ? { ...frontBase(focus, time, reduced), key: `base:${focus.id}` }
      : overview();
  }
  if (s.world === "casino") {
    const tables = s.poker?.tables || [],
      slot = Math.floor(time / 7),
      table = tables[slot % Math.max(1, tables.length)];
    if (table && slot % 3 !== 0)
      return orbit(
        { x: table.x, y: 1, z: table.z },
        7,
        6,
        reduced ? 0.6 : time * 0.05,
      );
    return orbit({ x: 0, y: 1, z: 0 }, 19, 9, angle);
  }
  if (/^arena[1-5]$/.test(s.world)) {
    const parkour = s.stage > 1,
      center = { x: 0, y: parkour ? 2 : 0, z: parkour ? -6 : 0 };
    const sky = {
      target: center,
      position: { x: 0, y: parkour ? 90 : 52, z: center.z + 0.01 },
    };
    if (b.mode === "sky") return { ...sky, key: "sky" };
    // The first arena always stays on its angled orbit; no activity close-ups.
    if (parkour && spotlight?.kind === "vault") {
      const v = spotlight.vault,
        target = {
          x: v.x * 0.65,
          y: (v.y || 0) * 0.65,
          z: 1 + (v.z - 1) * 0.65,
        },
        // View the approach from the arena interior, never beyond its wall.
        a = Math.atan2(-v.x, 1 - v.z) + Math.sin(time * 0.18) * 0.55,
        shot = orbit(target, 22, target.y + 18, a),
        bounds = arenaBounds(s.stage);
      shot.position.x = Math.max(
        -bounds.side + 2,
        Math.min(bounds.side - 2, shot.position.x),
      );
      shot.position.z = Math.max(
        bounds.rear + 2,
        Math.min(bounds.front - 2, shot.position.z),
      );
      return {
        ...shot,
        key: `vault:${v.id}`,
      };
    }
    return {
      ...orbit(
        center,
        parkour ? (s.stage === 2 ? 36.4 : 52) : 33,
        parkour ? (s.stage === 2 ? 24.5 : 35) : 27,
        angle * 0.5,
      ),
      key: "crowd-overview",
    };
  }
  return orbit({ x: 0, y: 1, z: 0 }, 18, 12, angle);
}

// A target is chosen once, held through the pan, then followed by eight quiet seconds.
// Per-view state never goes over the network and resets when the round or mode changes.
export function createBroadcastDirector() {
  let contextKey = "",
    focus = null,
    until = 0,
    overviewUntil = 0,
    consumed = "";
  return (s, time, reduced = false) => {
    const b = s.broadcast || defaultBroadcast(),
      key = `${s.world}:${s.round}:${b.mode}:${b.manualEnabled}:${b.revision}`;
    if (key !== contextKey) {
      contextKey = key;
      focus = null;
      until = 0;
      overviewUntil = time + 8;
      consumed = "";
    }
    if (focus && time >= until) {
      focus = null;
      overviewUntil = time + 8;
    }
    const battle = s.battlefield;
    const crowd =
      /^arena[2-5]$/.test(s.world) && ["active", "practice"].includes(s.phase);
    const preparation =
      battle &&
      /^battlefield/.test(s.world) &&
      ["planning", "instructions", "staging"].includes(battle.phase);
    if (reduced || (!crowd && !preparation)) focus = null;
    if (
      !reduced &&
      b.mode === "auto" &&
      !b.manualEnabled &&
      !focus &&
      time >= overviewUntil
    ) {
      let candidate;
      if (crowd) {
        const activity = (s.vaults || [])
          .map((v) => {
            const players = s.players.filter(
              (p) =>
                p.connected &&
                p.eligible &&
                // Include route jumps/falls without spotlighting a neighboring path.
                approachActivity(p, v) > 0 &&
                (Math.hypot(p.vx || 0, p.vz || 0) > 0.35 ||
                  p.grounded === false),
            );
            return {
              v,
              players,
              activity: players.reduce(
                (sum, p) => sum + approachActivity(p, v),
                0,
              ),
            };
          })
          .sort((a, c) => c.activity - a.activity)[0];
        if (activity?.players.length) {
          const event = s.messages?.at(-1)?.seq || 0;
          candidate = {
            kind: "vault",
            vault: { ...activity.v },
            token: `vault:${activity.v.id}:${event}:${activity.players.map((p) => p.id + ":" + (p.respawns || 0)).join(",")}`,
          };
        }
      } else if (preparation) {
        const prints = (battle.deployments || []).filter(
          (d) => time - d.time < 3,
        );
        const amounts = new Map();
        for (const d of prints)
          amounts.set(d.team, (amounts.get(d.team) || 0) + d.quantity);
        const id = [...amounts.keys()].sort(
          (a, c) => amounts.get(c) - amounts.get(a),
        )[0];
        if (id)
          candidate = {
            kind: "base",
            id,
            token: `base:${id}:${prints.filter((d) => d.team === id).at(-1)?.id}`,
          };
      }
      if (candidate && candidate.token !== consumed) {
        focus = candidate;
        consumed = candidate.token;
        until = time + 6;
      }
    }
    return broadcastCamera(s, time, reduced, focus);
  };
}
