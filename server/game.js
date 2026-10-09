import { randomUUID } from "node:crypto";
import { vaultsFor, insideVault, STAGES } from "../shared/world.js";
import { appropriateText } from "./moderation.js";
import { move } from "../shared/movement.js";
export const VAULTS = [
  { id: "bronze", name: "Bronze", x: -9, z: -5, reward: 120, color: "#e79b56" },
  { id: "gold", name: "Gold", x: 0, z: 10, reward: 240, color: "#ffd45a" },
  {
    id: "diamond",
    name: "Diamond",
    x: 9,
    z: -5,
    reward: 360,
    color: "#66e3ff",
  },
];
export class Game {
  constructor({
    duration = 35,
    practiceDuration = 20,
    now = () => Date.now(),
    saved,
  } = {}) {
    this.now = now;
    this.duration = duration;
    this.practiceDuration = practiceDuration;
    this.players = new Map(
      saved?.players?.map((p) => [
        p.id,
        { ...p, connected: false, input: {}, ready: false },
      ]) || [],
    );
    for (const p of this.players.values()) {
      try {
        p.name = this.name(p.name);
      } catch {
        p.name = "Bear";
      }
    }
    this.world = "lobby";
    this.stage = 1;
    this.worldTime = 0;
    this.phase = "lobby";
    this.round = 0;
    this.scoredRound = saved?.scoredRound || 0;
    this.paused = false;
    this.deadline = 0;
    this.results = [];
    this.messages = [];
    this.messageSerial = 0;
    this.practice = false;
    this.rewardPools = { bronze: 120, gold: 240, diamond: 360, sky: 480 };
    this.vaults = VAULTS.map((v) => ({ ...v }));
  }
  join(id, name, appearance = {}) {
    let p = [...this.players.values()].find((p) => p.token === id);
    if (!p) {
      p = {
        id: randomUUID(),
        token: randomUUID(),
        name: this.name(name),
        appearance: this.appearance(appearance),
        x: 0,
        z: 0,
        y: 0,
        vy: 0,
        earnings: 0,
        ready: false,
        eligible: false,
      };
      this.players.set(p.id, p);
    }
    if (!p.connected && this.phase === "lobby") {
      const a =
        [...this.players.values()].findIndex((player) => player.id === p.id) *
        2.4;
      const radius =
        3 +
        ([...this.players.values()].findIndex((player) => player.id === p.id) %
          3) *
          1.1;
      p.x = Math.cos(a) * radius;
      p.z = Math.sin(a) * radius;
      p.y = 0;
      p.vx = p.vy = p.vz = 0;
      p.grounded = true;
    }
    if (this.phase === "loading" && !p.eligible) {
      const angle =
        [...this.players.values()].findIndex((other) => other.id === p.id) *
        2.4;
      p.x = p.spawnX = Math.cos(angle) * 2.5;
      p.z = p.spawnZ = Math.sin(angle) * 2.5;
      p.y = 0;
      p.vx = p.vy = p.vz = 0;
      p.eligible = true;
      p.grounded = true;
      p.support = "spawn";
      p.jumpHeld = false;
    }
    p.sceneLoaded = false;
    p.loaded = false;
    p.connected = true;
    p.input = {};
    return p;
  }
  message(p, kind, text) {
    this.messages.push({
      seq: ++this.messageSerial,
      kind,
      name: p.name,
      text,
      time: this.now(),
    });
    if (this.messages.length > 80) this.messages.shift();
  }
  chat(p, text) {
    if (
      this.world !== "lobby" ||
      !["lobby", "ready", "instructions"].includes(this.phase)
    )
      throw Error("Chat is available in the lobby");
    if (typeof text !== "string") throw Error("Invalid message");
    const clean = text
      .normalize("NFKC")
      .replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, "")
      .trim();
    if (!clean || clean.length > 160) throw Error("Use 1–160 characters");
    appropriateText(clean);
    if (p.chatAt !== undefined && this.now() - p.chatAt < 1500)
      throw Error("Wait a moment before sending another message");
    p.chatAt = this.now();
    this.message(p, "chat", clean);
  }
  emote(p, emote) {
    if (this.world !== "lobby" || !["wave", "dance", "scuba"].includes(emote))
      throw Error("Invalid lobby emote");
    if (p.emoteAt !== undefined && this.now() - p.emoteAt < 2500)
      throw Error("Wait before another emote");
    p.emoteAt = this.now();
    p.emoteName = emote;
  }
  name(s) {
    const clean =
      String(s || "Bear")
        .normalize("NFKC")
        .replace(
          /[\x00-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g,
          "",
        )
        .trim()
        .slice(0, 24) || "Bear";
    appropriateText(clean);
    return clean;
  }
  appearance(a) {
    return {
      bear: ["panda", "polar", "brown", "black"].includes(a.bear)
        ? a.bear
        : "brown",
      color: ["mint", "pink", "blue", "yellow"].includes(a.color)
        ? a.color
        : "mint",
      hat: ["none", "cap", "crown"].includes(a.hat) ? a.hat : "none",
    };
  }
  acknowledgeLoad(p, round, continueRequested = false) {
    if (!Number.isInteger(round) || round !== this.round)
      throw Error("Loading acknowledgement is out of date");
    if (!(
      this.world === "lobby" || ["loading", "countdown"].includes(this.phase)
    ))
      throw Error("Loading is unavailable");
    if (continueRequested) {
      if (!p.sceneLoaded) throw Error("The scene is still loading");
      p.loaded = true;
    } else p.sceneLoaded = true;
  }
  command(action, data = {}) {
    if (action === "countdown" && this.phase === "loading") {
      if (this.paused) throw Error("Resume before starting the countdown");
      const players = [...this.players.values()].filter(
        (p) => p.connected && p.eligible,
      );
      if (players.some((p) => !p.loaded))
        throw Error("Wait for players to load and continue");
      this.phase = "countdown";
      this.deadline = this.now() + 8000;
      return;
    }
    if (action === "pause") {
      if (!["loading", "countdown", "active", "practice"].includes(this.phase))
        throw Error("Nothing to pause");
      if (!this.paused) {
        this.remaining = Math.max(0, this.deadline - this.now());
        this.paused = true;
      }
      return;
    }
    if (action === "resume") {
      if (this.paused) {
        this.deadline = this.now() + this.remaining;
        this.paused = false;
      }
      return;
    }
    if (action === "lobby") {
      this.world = "lobby";
      this.phase = "lobby";
      this.paused = false;
      for (const p of this.players.values()) {
        p.eligible = false;
        p.ready = false;
        p.x = 0;
        p.z = 0;
        p.y = 0;
        p.vx = 0;
        p.vz = 0;
        p.vy = 0;
        p.jumpHeld = false;
        p.grounded = true;
        p.support = null;
        p.launchedUntil = 0;
        p.hazardCooldown = 0;
        p.padCooldown = 0;
        p.input = {};
      }
      const connected = [...this.players.values()].filter((p) => p.connected);
      connected.forEach((p, i) => {
        const angle = (i / connected.length) * Math.PI * 2;
        const radius = 3 + (i % 3) * 1.1;
        p.x = Math.cos(angle) * radius;
        p.z = Math.sin(angle) * radius;
      });
      return;
    }
    if (action === "instructions" && this.phase === "lobby") {
      this.phase = "instructions";
      return;
    }
    if (
      action === "practice" &&
      ["instructions", "lobby", "results", "ready"].includes(this.phase)
    ) {
      this.begin(true);
      return;
    }
    if (
      action === "ready" &&
      ["results", "instructions", "lobby"].includes(this.phase)
    ) {
      this.phase = "ready";
      for (const p of this.players.values()) p.ready = false;
      return;
    }
    if (
      action === "next" &&
      this.phase === "results" &&
      !this.practice &&
      this.stage < 5
    ) {
      this.stage++;
      this.duration = STAGES[this.stage - 1].duration;
      this.phase = "ready";
      for (const p of this.players.values()) p.ready = false;
      return;
    }
    if (action === "start" && this.phase === "ready") {
      this.begin(false);
      return;
    }
    if (
      action === "results" &&
      ["active", "practice", "countdown"].includes(this.phase)
    ) {
      this.finish();
      return;
    }
    if (
      action === "configure" &&
      ["lobby", "ready", "instructions", "results"].includes(this.phase)
    ) {
      if (
        STAGES.some((s) => s.id === Number(data.stage)) &&
        this.stage !== Number(data.stage)
      ) {
        this.stage = Number(data.stage);
        this.duration = STAGES[this.stage - 1].duration;
      }
      const d = Number(data.duration);
      if (Number.isFinite(d) && d >= 5 && d <= 180) this.duration = d;
      for (let i = 0; i < 4; i++) {
        const r = Number(data.rewards?.[i]);
        if (Number.isFinite(r) && r >= 0 && r <= 10000)
          this.rewardPools[["bronze", "gold", "diamond", "sky"][i]] = r;
        for (const v of this.vaults) v.reward = this.rewardPools[v.id];
      }
      return;
    }
    throw Error("Action unavailable in this phase");
  }
  begin(practice) {
    this.round++;
    this.practice = practice;
    this.results = [];
    this.paused = false;
    const nextWorld = `arena${this.stage}`;
    this.phase = "loading";
    this.world = nextWorld;
    this.worldTime = 0;
    this.vaults = vaultsFor(this.stage).map((v) => ({
      ...v,
      reward: this.rewardPools[v.id],
    }));
    this.deadline = 0;
    const ps = [...this.players.values()].filter((p) => p.connected);
    ps.forEach((p, i) => {
      const a = (i / ps.length) * Math.PI * 2;
      p.x = Math.cos(a) * 2.5;
      p.z = Math.sin(a) * 2.5;
      p.spawnX = p.x;
      p.spawnZ = p.z;
      p.grounded = true;
      p.support = "spawn";
      p.launchedUntil = 0;
      p.hazardCooldown = 0;
      p.padCooldown = 0;
      p.y = 0;
      p.vy = 0;
      p.vx = 0;
      p.vz = 0;
      p.jumpHeld = false;
      p.eligible = true;
      p.sceneLoaded = false;
      p.loaded = false;
      p.input = {};
    });
    for (const p of this.players.values()) if (!p.connected) p.eligible = false;
  }
  zone(p) {
    return this.vaults.find((v) => insideVault(p, v))?.id || null;
  }
  occupancy() {
    return Object.fromEntries(
      this.vaults.map((v) => [
        v.id,
        [...this.players.values()].filter(
          (p) => p.connected && p.eligible && this.zone(p) === v.id,
        ).length,
      ]),
    );
  }
  finish() {
    if (!["active", "practice", "countdown"].includes(this.phase)) return;
    const counts = this.occupancy();
    this.results = [...this.players.values()]
      .filter((p) => p.eligible)
      .map((p) => {
        const vault = p.connected ? this.zone(p) : null;
        const v = this.vaults.find((v) => v.id === vault);
        const payout = v ? v.reward / counts[v.id] : 0;
        if (!this.practice) p.earnings += payout;
        return {
          id: p.id,
          name: p.name,
          vault,
          payout,
          occupants: v ? counts[v.id] : 0,
          reward: v?.reward || 0,
          disconnected: !p.connected,
        };
      });
    if (!this.practice) this.scoredRound++;
    this.phase = "results";
    this.paused = false;
    this.deadline = 0;
  }
  tick(dt) {
    if (this.paused) return;
    if (this.phase === "countdown" && this.now() >= this.deadline) {
      this.phase = this.practice ? "practice" : "active";
      this.deadline =
        this.now() +
        (this.practice ? this.practiceDuration : this.duration) * 1000;
    }
    if (
      ["active", "practice"].includes(this.phase) &&
      this.now() >= this.deadline
    ) {
      this.finish();
      return;
    }
    if (
      !["lobby", "ready", "instructions", "active", "practice"].includes(
        this.phase,
      )
    )
      return;
    this.worldTime += dt;
    for (const p of this.players.values()) {
      if (
        !p.connected ||
        (["active", "practice"].includes(this.phase) && !p.eligible)
      )
        continue;
      const beforeZone = this.zone(p),
        beforeRespawns = p.respawns || 0,
        beforePunch = p.hazardCooldown || 0;
      move(p, p.input || {}, dt, this.world, this.worldTime);
      if (this.world !== "lobby") {
        if ((p.respawns || 0) > beforeRespawns)
          this.message(
            p,
            "event",
            p.lastRespawn === "spikes" ? "was hit by spikes" : "fell",
          );
        else if ((p.hazardCooldown || 0) > beforePunch)
          this.message(p, "event", "was punched off course");
        const zone = this.zone(p);
        if (zone && zone !== beforeZone)
          this.message(p, "event", `entered the ${zone} vault`);
      }
    }
  }
  snapshot() {
    return {
      phase: this.phase,
      world: this.world,
      stage: this.stage,
      stageName: STAGES[this.stage - 1].name,
      worldTime: this.worldTime,
      round: this.round,
      scoredRound: this.scoredRound,
      practice: this.practice,
      paused: this.paused,
      remaining: this.paused
        ? this.remaining / 1000
        : Math.max(0, (this.deadline - this.now()) / 1000),
      duration: this.duration,
      rewardPools: this.rewardPools,
      vaults: this.vaults,
      occupancy: this.occupancy(),
      results: this.results,
      messages: this.messages.filter((m) =>
        this.world === "lobby" ? m.kind === "chat" : m.kind === "event",
      ),
      players: [...this.players.values()].map(
        ({ input, jumpHeld, token, ...p }) => ({
          ...p,
          zone: this.zone(p),
          emoteAge: (this.now() - (p.emoteAt ?? -10000)) / 1000,
        }),
      ),
    };
  }
  save() {
    return {
      scoredRound: this.scoredRound,
      players: [...this.players.values()].map(({ input, vy, ...p }) => p),
    };
  }
}
