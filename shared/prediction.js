import { move, canMove } from "./movement.js";
// Rebuild from authority plus only inputs not yet included in that snapshot.
// Render smoothing is deliberately outside the collision state.
export class Predictor {
  constructor() {
    this.pending = [];
    this.state = null;
    this.player = null;
    this.time = 0;
  }
  clear() {
    this.pending = [];
    this.state = null;
    this.player = null;
  }
  reconcile(player, state, ack = 0, reset = false) {
    if (reset) this.pending = [];
    this.pending = this.pending.filter((c) => c.seq > ack);
    this.player = { ...player };
    this.state = state;
    this.time = state.worldTime;
    for (const c of this.pending) this.apply(c);
    return this.player;
  }
  apply(c) {
    if (!this.player || !canMove(this.state, this.player)) return;
    const staging = ["loading", "countdown"].includes(this.state.phase);
    if (!staging) this.time += c.dt;
    move(
      this.player,
      c.input,
      c.dt,
      this.state.world,
      this.time,
      staging,
      this.state.battlefield || this.state.poker,
    );
  }
  input(seq, input, dt = 0.05) {
    const command = {
      seq,
      input: { ...input },
      dt: Math.max(0, Math.min(0.1, dt)),
    };
    this.pending.push(command);
    // Never replay seconds of stale input after a suspended tab/network outage.
    if (this.pending.length > 40) this.pending.shift();
    this.apply(command);
  }
  preview(input, dt) {
    if (!this.player) return null;
    const p = { ...this.player };
    if (canMove(this.state, p))
      move(
        p,
        input,
        Math.max(0, Math.min(0.05, dt)),
        this.state.world,
        this.time +
          (["loading", "countdown"].includes(this.state.phase)
            ? 0
            : Math.min(0.05, dt)),
        ["loading", "countdown"].includes(this.state.phase),
        this.state.battlefield || this.state.poker,
      );
    return p;
  }
}
export function interpolatePlayers(a, b, t) {
  const p = { ...b };
  if (
    !a ||
    a.respawns !== b.respawns ||
    Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > 4
  )
    return p;
  for (const key of ["x", "y", "z", "vx", "vy", "vz"])
    p[key] = (a[key] || 0) + ((b[key] || 0) - (a[key] || 0)) * t;
  return p;
}
