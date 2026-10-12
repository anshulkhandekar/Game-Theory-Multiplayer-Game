import { battlefieldSolids, homePosition, HOME_RADIUS, barriersRaised, battlefieldBounds } from "./battlefield.js";
import {
  STAGING_DOME,
  platforms,
  jumpPads,
  practicePlatforms,
  practiceHazards,
  lobbyRegion,
  contains,
  resetPosition,
  isParkour,
  stageOf,
  solids,
  hazards,
  toLocal,
  toWorld,
} from "./world.js";
export const MOVEMENT = {
  speed: 6.8,
  acceleration: 25,
  braking: 70,
  gravity: 20,
  jump: 7.8,
  radius: 14,
  bodyRadius: 0.32,
  bodyHeight: 2.05,
};
export function canMove(state, player) {
  if (state.battlefield && (state.world.startsWith("battlefield") || state.battlefield.phase === "matching")) return !state.battlefield.paused && !player.waitingLobby;
  return (
    !state.paused &&
    (!["loading", "countdown"].includes(state.phase) || (player.loaded && player.eligible)) &&
    ["lobby", "ready", "instructions", "loading", "countdown", "active", "practice"].includes(
      state.phase,
    ) &&
    (player.eligible || !["active", "practice"].includes(state.phase))
  );
}
const approach = (value, target, amount) =>
  value +
  Math.sign(target - value) * Math.min(Math.abs(target - value), amount);
// Resolve a character box against rotated solid boxes. Small substeps prevent tunnelling.
function horizontal(p, boxes) {
  for (const b of boxes) {
    if (
      p.y >= b.y + b.h / 2 - 0.001 ||
      p.y + MOVEMENT.bodyHeight <= b.y - b.h / 2 + 0.001
    )
      continue;
    const q = toLocal(p, b),
      rx = b.w / 2 + MOVEMENT.bodyRadius,
      rz = b.d / 2 + MOVEMENT.bodyRadius;
    if (Math.abs(q.x) >= rx || Math.abs(q.z) >= rz) continue;
    const dx = rx - Math.abs(q.x),
      dz = rz - Math.abs(q.z),
      a = b.angle || 0;
    if (dx < dz) {
      q.x = Math.sign(q.x || 1) * rx;
      const normalX = Math.cos(a),
        normalZ = -Math.sin(a),
        dot = p.vx * normalX + p.vz * normalZ;
      p.vx -= dot * normalX;
      p.vz -= dot * normalZ;
    } else {
      q.z = Math.sign(q.z || 1) * rz;
      const normalX = Math.sin(a),
        normalZ = Math.cos(a),
        dot = p.vx * normalX + p.vz * normalZ;
      p.vx -= dot * normalX;
      p.vz -= dot * normalZ;
    }
    Object.assign(p, toWorld(q, b));
  }
}
export function move(p, input, dt, world = "arena1", time = 0, staging = false, battlefield = null) {
  if (world.startsWith("battlefield")) {
    const ix=input.x||0, iz=input.z||0, length=Math.max(1,Math.hypot(ix,iz));
    p.vx=approach(p.vx||0,ix/length*MOVEMENT.speed,MOVEMENT.acceleration*dt);
    p.vz=approach(p.vz||0,iz/length*MOVEMENT.speed,MOVEMENT.acceleration*dt);
    const bounds=battlefield?battlefieldBounds(battlefield.teams):{x:420,z:340};
    p.x=Math.max(-bounds.x,Math.min(bounds.x,p.x+p.vx*dt)); p.z=Math.max(-bounds.z,Math.min(bounds.z,p.z+p.vz*dt));
    if(battlefield) {
      horizontal(p,battlefieldSolids(battlefield.teams));
      const home = homePosition(battlefield, p.id);
      if (home && barriersRaised(battlefield.phase)) {
        const dx = p.x-home.x, dz = p.z-home.z, distance = Math.hypot(dx,dz);
        if(distance > HOME_RADIUS-.35) {
          const limit=HOME_RADIUS-.35, nx=dx/distance, nz=dz/distance;
          p.x=home.x+nx*limit; p.z=home.z+nz*limit;
          const outward=Math.max(0,p.vx*nx+p.vz*nz);
          p.vx-=outward*nx; p.vz-=outward*nz;
        }
      }
    }
    if (ix||iz) p.facing=Math.atan2(ix,iz);
    if (input.jump && !p.jumpHeld && p.grounded) { p.vy=MOVEMENT.jump; p.grounded=false; }
    p.jumpHeld=!!input.jump; p.vy=(p.vy||0)-MOVEMENT.gravity*dt; p.y=Math.max(0,(p.y||0)+p.vy*dt);
    if (p.y===0) {p.vy=0;p.grounded=true;} return;
  }
  const parkour = isParkour(world),
    stage = stageOf(world);
  let ix = input.x || 0,
    iz = input.z || 0,
    length = Math.hypot(ix, iz);
  if (length > 0.01) p.facing = Math.atan2(ix, iz);
  if (p.emoteActive && p.emoteName === "griddy" && length === 0 && !input.jump) {
    ix = Math.sin(p.emoteFacing ?? Math.PI) * .2;
    iz = Math.cos(p.emoteFacing ?? Math.PI) * .2;
    length = .2;
  }
  if (length > 1) {
    ix /= length;
    iz /= length;
  }
  if (input.jump && !p.jumpHeld && (p.grounded ?? p.y === 0)) {
    p.vy = MOVEMENT.jump;
    p.grounded = false;
    p.support = null;
  }
  p.jumpHeld = !!input.jump;
  const steps = Math.max(1, Math.ceil(dt / (1 / 120))),
    step = dt / steps;
  for (let i = 0; i < steps; i++) {
    const at = time - dt + (i + 1) * step;
    if ((parkour || world === "lobby") && p.grounded && p.support) {
      const surfaces = (t) =>
        parkour ? platforms(t, stage) : practicePlatforms(t);
      const before = surfaces(at - step).find((b) => b.id === p.support),
        after = surfaces(at).find((b) => b.id === p.support);
      if (before && after && after.walkable !== false) {
        p.x += after.x - before.x;
        p.z += after.z - before.z;
        p.y += after.y - before.y;
      }
    }
    // Round 2 assists small ledges only, in the direction the player is walking.
    if (stage === 2 && parkour && p.grounded && length > 0.15) {
      const probe = {
        x: p.x + (ix / length) * 0.8,
        z: p.z + (iz / length) * 0.8,
      };
      const next = platforms(at, stage).find(
        (b) =>
          b.id !== p.support &&
          b.y > p.y + 0.05 &&
          b.y - p.y <= 0.6 &&
          contains(b, probe.x, probe.z, 0.05),
      );
      if (next) {
        p.vy = Math.sqrt(2 * MOVEMENT.gravity * (next.y - p.y + 0.22));
        p.grounded = false;
        p.support = null;
      }
    }
    const rate = p.grounded
      ? length
        ? MOVEMENT.acceleration
        : MOVEMENT.braking
      : length
        ? ix * (p.vx || 0) + iz * (p.vz || 0) < -0.5
          ? 48
          : 24
        : 0.5;
    if (!p.launchedUntil || at >= p.launchedUntil) {
      p.vx = approach(p.vx || 0, ix * MOVEMENT.speed, rate * step);
      p.vz = approach(p.vz || 0, iz * MOVEMENT.speed, rate * step);
    }
    const boxes = solids(world, at);
    const previousX = p.x,
      previousZ = p.z;
    p.x += p.vx * step;
    p.z += p.vz * step;

    if (!parkour) {
      const radius = Math.hypot(p.x, p.z);
      const limit = world === "lobby" ? 19 : MOVEMENT.radius;
      if (world === "lobby" && !lobbyRegion(p.x, p.z)) {
        p.x = previousX;
        p.z = previousZ;
        p.vx = p.vz = 0;
      } else if (world !== "lobby" && radius > limit) {
        p.x *= limit / radius;
        p.z *= limit / radius;
        const nx = p.x / limit,
          nz = p.z / limit,
          out = Math.max(0, p.vx * nx + p.vz * nz);
        p.vx -= out * nx;
        p.vz -= out * nz;
      }
    }
    const wasGrounded = p.grounded;
    const oldY = p.y;
    p.vy = (p.vy || 0) - MOVEMENT.gravity * step;
    p.y += p.vy * step;
    p.grounded = false;
    p.support = null;
    // Highest crossed surface wins; an upward jump stops at a solid underside.
    const overlaps = boxes.filter((b) =>
      contains(b, p.x, p.z, MOVEMENT.bodyRadius * 0.5),
    );
    if (p.vy <= 0) {
      const landing = overlaps
        .filter(
          (b) =>
            b.walkable !== false &&
            oldY >= b.y + b.h / 2 - 0.002 &&
            p.y <= b.y + b.h / 2,
        )
        .sort((a, b) => b.y + b.h / 2 - (a.y + a.h / 2))[0];
      if (landing) {
        if (!wasGrounded) { p.vx = 0; p.vz = 0; }
        p.y = landing.y + landing.h / 2;
        p.vy = 0;
        p.grounded = true;
        p.support = landing.id;
      }
    } else {
      const ceiling = overlaps
        .filter(
          (b) =>
            oldY + MOVEMENT.bodyHeight <= b.y - b.h / 2 + 0.002 &&
            p.y + MOVEMENT.bodyHeight >= b.y - b.h / 2,
        )
        .sort((a, b) => a.y - a.h / 2 - (b.y - b.h / 2))[0];
      if (ceiling) {
        p.y = ceiling.y - ceiling.h / 2 - MOVEMENT.bodyHeight;
        p.vy = 0;
      }
    }
    horizontal(p, boxes);
    if (world === "lobby" && p.z > 29 && p.y <= 0 && p.vy < -5) {
      resetPosition(p);
      p.x = 0;
      p.z = 1;
      p.lastRespawn = "fall";
      return;
    }
    if (!parkour && p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.grounded = true;
    }
    const pad = jumpPads(world, at).find(
      (b) =>
        p.grounded &&
        Math.abs(p.y - b.y) < 0.08 &&
        contains(b, p.x, p.z, -0.08),
    );
    if (pad && at >= (p.padCooldown || 0)) {
      p.vy = pad.impulse;
      p.grounded = false;
      p.support = null;
      p.padCooldown = at + 0.35;
    }
    if (parkour || world === "lobby") {
      if (p.y < -6 || Math.hypot(p.x, p.z) > 65) {
        resetPosition(p);
        p.lastRespawn = "fall";
        return;
      }
      const hit = (parkour ? hazards(at, stage) : practiceHazards(at)).find(
        (h) =>
          h.state === "active" &&
          h.extension > 0.45 &&
          Math.abs(p.x - h.x) < h.w / 2 + MOVEMENT.bodyRadius &&
          Math.abs(p.z - h.z) < h.d / 2 + MOVEMENT.bodyRadius &&
          p.y < h.y + (h.kind === "puncher" ? h.h / 2 : h.h * h.extension) &&
          p.y + MOVEMENT.bodyHeight >
            h.y - (h.kind === "puncher" ? h.h / 2 : 0) &&
          (h.kind !== "puncher" || at >= (p.hazardCooldown || 0)),
      );
      if (hit?.kind === "puncher") {
        p.vx = hit.nx * 9;
        p.vz = hit.nz * 9;
        p.vy = 5.2;
        p.grounded = false;
        p.support = null;
        p.launchedUntil = at + 0.45;
        p.hazardCooldown = at + 1.4;
      } else if (hit) {
        resetPosition(p);
        if (world === "lobby") {
          p.x = 0;
          p.z = 1;
        }
        p.lastRespawn = "spikes";
        return;
      }
    }
  }
  if (staging) {
    const head = Math.min(STAGING_DOME.radius, Math.max(0, p.y + MOVEMENT.bodyHeight));
    const limit = Math.max(0, Math.sqrt(STAGING_DOME.radius ** 2 - head ** 2) - MOVEMENT.bodyRadius);
    const dz = p.z - STAGING_DOME.z, distance = Math.hypot(p.x, dz);
    if (distance > limit) {
      const nx = p.x / distance, nz = dz / distance;
      p.x = nx * limit; p.z = STAGING_DOME.z + nz * limit;
      const outward = p.vx * nx + p.vz * nz;
      if (outward > 0) { p.vx -= outward * nx; p.vz -= outward * nz; }
    }
  }

}
