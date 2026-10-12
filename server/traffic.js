// Per socket: movement remains independent of slower UI/action traffic.
export class TrafficBudget {
  constructor(now = Date.now()) {
    this.updated = now;
    this.tokens = { total: 100, input: 60, action: 30, error: 4 };
    this.dropped = 0;
  }
  refill(now) {
    const seconds = Math.max(0, now - this.updated) / 1000;
    for (const [key, rate, cap] of [
      ["total", 80, 100],
      ["input", 40, 60],
      ["action", 15, 30],
      ["error", 2, 4],
    ])
      this.tokens[key] = Math.min(cap, this.tokens[key] + seconds * rate);
    this.updated = now;
    this.dropped = Math.max(0, this.dropped - seconds * 8);
  }
  accept(kind, now = Date.now()) {
    this.refill(now);
    const bucket = kind === "input" ? "input" : "action";
    if (this.tokens.total < 1 || this.tokens[bucket] < 1) {
      this.dropped++;
      return false;
    }
    this.tokens.total--;
    this.tokens[bucket]--;
    return true;
  }
  reportError(now = Date.now()) {
    this.refill(now);
    if (this.tokens.error < 1) return false;
    this.tokens.error--;
    return true;
  }
  get abusive() {
    return this.dropped >= 64;
  }
}
export const MAX_QUEUED_BYTES = 256 * 1024;
