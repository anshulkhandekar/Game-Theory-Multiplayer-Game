import {defaultBroadcast,updateBroadcast} from "../shared/broadcast.js";
import { Poker } from './poker.js';
import { tournamentScores } from '../shared/tournament.js';
import { teamPlan } from "../shared/battlefield.js";
import { Battlefield } from "./battlefield.js";
import { EMOTE_SECONDS, canEmote } from "../shared/emotes.js";
import { normalizeAppearance } from "../shared/wardrobe.js";
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
    this.battlefield = null;
    this.poker = null;
    this.pokerSerial = 0;
    this.battlefieldSerial = 0;
    this.duration = duration;
    this.practiceDuration = practiceDuration;
    this.players = new Map(
      saved?.players?.map((p) => [
        p.id,
        { ...p, connected: false, input: {}, ready: false, emoteActive: false },
      ]) || [],
    );
    for (const p of this.players.values()) {
      try {
        p.name = this.name(p.name);
      } catch {
        p.name = "Bear";
      }
    }
    this.broadcast=defaultBroadcast();
    this.world = "lobby";
    this.stage = 1;
    this.worldTime = 0;
    this.lobbyTime = 0;
    this.phase = "lobby";
    this.round = 0;
    this.scoredRound = saved?.scoredRound || 0;
    this.paused = false;
    this.deadline = 0;
    this.results = [];
    this.leaderboardSerial ??= 0;
    this.messages = [];
    this.messageSerial = 0;
    this.practice = false;
    this.rewardPools = { bronze: 120, gold: 240, diamond: 360, sky: 480 };
    this.vaults = VAULTS.map((v) => ({ ...v }));
  }
  join(id, name, appearance = {}, connection = null) {
    let p = [...this.players.values()].find((p) => p.token === id);
    if (!p) {
      if([...this.players.values()].filter(p=>p.connected&&!p.demo&&!p.kicked).length>=40) throw Error("The room already has 40 players. Ask the host for help.");
      if([...this.players.values()].filter(p=>!p.demo).length>=300) throw Error("The room has reached its profile limit. Ask the host for help.");
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
    if (p.kicked)
      throw Error("Removed by the host. Ask the host to allow you back.");
    if (connection) {
      const resume =
        connection.pageId === p.pageId && connection.resume === true;
      if (
        !resume &&
        !this.battlefield?.teamOf(p.id) &&
        !this.poker?.roster.includes(p.id) &&
        this.world !== "lobby" &&
        this.phase !== "loading"
      ) {
        p.waitingLobby = true;
        p.eligible = false;
        p.x = p.z = p.y = p.vx = p.vy = p.vz = 0;
        p.grounded = true;
        p.support = null;
        p.jumpHeld = false;
        p.hazardCooldown = p.padCooldown = p.launchedUntil = 0;
        p.emoteAt = undefined;
        p.emoteActive = false;
      }
      p.pageId = connection.pageId;
    }
    if (!p.connected && this.phase === "lobby") {
      p.waitingLobby = false;
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
    if (this.phase === "loading" && !p.eligible && !p.waitingLobby && !p.officer) {
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
    if (
      this.battlefield &&
      this.battlefield.phase !== "matching" &&
      !this.battlefield.teamOf(p.id)
    ) {
      p.waitingLobby = true;
      p.eligible = false;
    }
    if (this.battlefield?.demo && !p.demo) {
      p.waitingLobby = true;
      p.eligible = false;
    }
    if (this.poker) {
      p.waitingLobby = !this.poker.roster.includes(p.id);
      p.eligible = !p.waitingLobby;
      if (p.pokerRemoved) {p.waitingLobby=true;p.eligible=false;}
      if (!p.waitingLobby && this.poker.phase !== 'instructions') this.poker.seat(this.poker.tableOf(p.id));
    }
    p.connected = true;
    if (this.battlefield?.phase === "matching" && !this.battlefield.demo && !p.officer) {
      if (
        !this.battlefield.roster.includes(p.id) &&
        this.battlefield.roster.length < 40
      ) {
        this.battlefield.roster.push(p.id);
        this.battlefield.requests.set(p.id, []);
      }
      p.waitingLobby = !this.battlefield.roster.includes(p.id);
    }
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
      !p.waitingLobby &&
      (this.world !== "lobby" ||
        !["lobby", "ready", "instructions"].includes(this.phase))
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
    if (this.battlefield?.paused) throw Error("Emotes are paused");
    if (!canEmote(this, p) || !Object.hasOwn(EMOTE_SECONDS, emote))
      throw Error("Invalid emote for this phase");
    if (p.emoteAt !== undefined && this.now() - p.emoteAt < 2500)
      throw Error("Wait before another emote");
    p.emoteAt = this.now();
    p.emoteName = emote;
    p.emoteEndsAt = this.now() + EMOTE_SECONDS[emote] * 1000;
    p.emoteActive = true;
    p.emoteFacing = p.facing ?? Math.PI;
    p.emoteStoppedAt = undefined;
  }
  stopEmote(p) {
    if (!p.emoteActive) return;
    p.emoteActive = false;
    p.emoteStoppedAt = this.now();
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
  customize(p, appearance) {
    if (this.world !== "lobby" || this.phase !== "lobby" || !p.connected || p.kicked || p.demo)
      throw Error("Change your outfit while waiting in the main lobby.");
    p.appearance = this.appearance(appearance);
    this.stopEmote(p);
    p.input = {};
    return p.appearance;
  }
  appearance(a) {
    return normalizeAppearance(a);
  }
  acknowledgeLoad(p, round, continueRequested = false) {
    if (!Number.isInteger(round) || round !== this.round)
      throw Error("Loading acknowledgement is out of date");
    if (!(
      p.waitingLobby ||
      this.world === "lobby" ||
      ["loading", "countdown"].includes(this.phase)
    ))
      throw Error("Loading is unavailable");
    if (continueRequested) {
      if (!p.sceneLoaded) throw Error("The scene is still loading");
      p.loaded = true;
    } else p.sceneLoaded = true;
  }
  sendToLobby(p) {
    this.stopEmote(p);
    Object.assign(p, {
      waitingLobby: this.world !== "lobby",
      eligible: false,
      ready: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: true,
      support: null,
      input: {},
      jumpHeld: false,
      hazardCooldown: 0,
      padCooldown: 0,
      launchedUntil: 0,
    });
  }
  command(action, data = {}) {
    if(action === "broadcast"){this.broadcast=updateBroadcast(this.broadcast,data,this);return;}
    if (action === 'officer') {
      if (this.phase !== 'lobby') throw Error('Assign officers in the lobby');
      const p = this.players.get(data.id); if (!p || p.demo) throw Error('Unknown player');
      p.officer = !!data.officer; p.eligible = false; return;
    }
    if (action === 'poker' || action === 'pokerDemo') {
      if (!['lobby','results'].includes(this.phase)) throw Error('Return to the lobby first');
      const count = data.count;
      if (action === 'pokerDemo' && (!Number.isInteger(count) || count < 2 || count > 40)) throw Error('Choose 2–40 participants');
      const n = [...this.players.values()].filter(p => p.connected && !p.officer && !p.kicked && !p.demo).length;
      if (action === 'poker' && (n < 1 || n > 40)) throw Error('Poker needs 1–40 participants');
      this.command('lobby'); this.poker = new Poker(this, action === 'pokerDemo' ? {demoCount:count} : {});
      this.phase = 'poker'; this.world = 'casino'; this.round++; return;
    }
    if (action.startsWith('poker:')) {
      if (!this.poker) throw Error('Load Poker first'); this.poker.command(action.slice(6),data); return;
    }
    if (this.poker && ['pause','resume'].includes(action)) {this.poker.command(action,data);return;}
    if (this.poker && !['lobby','leaderboard','playerLobby','disconnectPlayer','kickPlayer','allowPlayer'].includes(action)) throw Error('Use the Poker controls');
    if (["battlefield", "battlefieldDemo"].includes(action)) {
      if (!["lobby", "results"].includes(this.phase))
        throw Error("Finish the current activity first");
      if (action === "battlefieldDemo")
        teamPlan(data.count, data.preferred || 3);
      else if (
        [...this.players.values()].filter(
          (p) => p.connected && !p.kicked && !p.demo && !p.officer,
        ).length > 40
      )
        throw Error("Battlefield supports up to 40 participants");
      else if (
        [...this.players.values()].filter(
          (p) => p.connected && !p.kicked && !p.demo && !p.officer,
        ).length < 2
      )
        throw Error(
          "Battlefield needs at least two players. Use solo demo to test",
        );
      this.command("lobby");
      this.battlefield = new Battlefield(
        this,
        action === "battlefieldDemo"
          ? { demoCount: data.count, preferred: data.preferred || 3 }
          : {},
      );
      this.phase = "battlefield";
      if (this.battlefield.demo) this.battlefield.formTeams();
      for (const p of this.players.values()) {
        this.stopEmote(p);
        if (this.battlefield.demo && !p.demo) {
          p.waitingLobby = true;
          p.eligible = false;
        }
      }
      return;
    }
    if (action.startsWith("battle:")) {
      if (!this.battlefield || this.phase !== "battlefield")
        throw Error("Start Battlefield first");
      this.battlefield.command(action.slice(7), data);
      return;
    }
    if (this.phase === "battlefield" && ["pause", "resume"].includes(action)) {
      this.battlefield.command(action, data);
      return;
    }
    if (
      this.phase === "battlefield" &&
      ![
        "lobby",
        "leaderboard",
        "playerLobby",
        "disconnectPlayer",
        "kickPlayer",
        "allowPlayer",
      ].includes(action)
    )
      throw Error("Use the Battlefield controls");
    if (action === "leaderboard") {
      this.leaderboardSerial++;
      return;
    }
    if (
      ["playerLobby", "disconnectPlayer", "kickPlayer", "allowPlayer"].includes(
        action,
      )
    ) {
      const p = this.players.get(data.id);
      if (!p) throw Error("Player no longer exists");
      if (action === "allowPlayer") {
        p.kicked = false;
        return;
      }
      this.sendToLobby(p);
      if (this.poker) {p.waitingLobby=true;p.pokerRemoved=true;}
      if (this.battlefield) {
        p.waitingLobby = true;
        if (this.battlefield.phase === "matching")
          this.battlefield.roster = this.battlefield.roster.filter(
            (id) => id !== p.id,
          );
      }
      if (action !== "playerLobby") p.connected = false;
      if (action === "kickPlayer") p.kicked = true;
      return;
    }
    if (action === "forceCountdown" && this.phase === "loading") {
      if (this.paused) throw Error("Resume before starting the countdown");
      for (const p of this.players.values()) {
        if (!p.connected || !p.eligible) continue;
        if (p.sceneLoaded) p.loaded = true;
        else this.sendToLobby(p);
      }
      this.phase = "countdown";
      this.deadline = this.now() + 8000;
      return;
    }
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
      for (const [id, p] of this.players) if (p.demo) this.players.delete(id);
      this.battlefield = null;
      this.poker = null;
      this.world = "lobby";
      this.phase = "lobby";
      this.paused = false;
      for (const p of this.players.values()) {
        this.stopEmote(p);
        p.waitingLobby = false;
        delete p.pokerRemoved;
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
      this.leaderboardSerial++;
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
    const ps = [...this.players.values()].filter((p) => p.connected && !p.officer);
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
      this.stopEmote(p);
      p.waitingLobby = false;
      p.eligible = true;
      p.sceneLoaded = false;
      p.loaded = false;
      p.input = {};
    });
    for (const p of this.players.values()) if (!p.connected || p.officer) {p.eligible = false; if(p.officer)p.waitingLobby=true;}
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
        if (!this.practice) {p.earnings += payout; p.eventsPlayed = {...p.eventsPlayed, crowd:true};}
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
    if (this.poker) {
      this.poker.tick(dt);
      if (!this.poker.paused) {this.worldTime += dt; this.lobbyTime += dt;}
      return;
    }
    if (this.phase === "battlefield" && this.battlefield) {
      for (const p of this.players.values())
        if (p.emoteActive && this.now() >= p.emoteEndsAt) this.stopEmote(p);
      this.battlefield.tick();
      this.world =
        this.battlefield.phase === "matching"
          ? "lobby"
          : `battlefield${this.battlefield.round}`;
      if (!this.battlefield.paused) {
        this.worldTime += dt;
        this.lobbyTime += dt;
        for (const p of this.players.values())
          if (p.connected) {
            move(
              p,
              p.input || {},
              dt,
              p.waitingLobby ? "lobby" : this.world,
              this.worldTime,
              false,
              this.battlefield,
            );
            p.inputAck = p.inputSequence || 0;
          }
      }
      return;
    }
    for (const p of this.players.values())
      if (p.emoteActive && this.now() >= p.emoteEndsAt) this.stopEmote(p);
    for (const p of this.players.values())
      if (
        this.paused ||
        (!p.waitingLobby &&
          ![
            "lobby",
            "ready",
            "instructions",
            "loading",
            "countdown",
            "active",
            "practice",
          ].includes(this.phase))
      )
        p.inputAck = p.inputSequence || 0;
    if (this.paused) return;
    this.lobbyTime += dt;
    for (const p of this.players.values()) {
      if (p.connected && p.waitingLobby) {
        move(p, p.input || {}, dt, "lobby", this.lobbyTime);
        p.inputAck = p.inputSequence || 0;
      }
    }
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
      ![
        "lobby",
        "ready",
        "instructions",
        "loading",
        "countdown",
        "active",
        "practice",
      ].includes(this.phase)
    )
      return;
    if (!["loading", "countdown"].includes(this.phase)) this.worldTime += dt;
    for (const p of this.players.values()) {
      if (
        !p.connected ||
        p.waitingLobby ||
        (["loading", "countdown"].includes(this.phase) &&
          (!p.loaded || !p.eligible)) ||
        (["active", "practice"].includes(this.phase) && !p.eligible)
      )
        continue;
      const beforeZone = this.zone(p),
        beforeRespawns = p.respawns || 0,
        beforePunch = p.hazardCooldown || 0;
      move(
        p,
        p.input || {},
        dt,
        this.world,
        this.worldTime,
        ["loading", "countdown"].includes(this.phase),
      );
      p.inputAck = p.inputSequence || 0;
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
  snapshotFor(playerId, publicState = this.snapshot()) {
    const state = { ...publicState };
    if (this.poker) state.poker = this.poker.snapshot(playerId);
    if (this.battlefield)
      state.battlefield = this.battlefield.snapshot(
        playerId,
        publicState.battlefield,
      );
    const owner = this.players.get(playerId);
    state.prediction = {
      ack: owner?.inputAck || 0,
      jumpHeld: !!owner?.jumpHeld,
    };
    if (!this.players.get(playerId)?.waitingLobby) return state;
    return {
      ...state,
      poker: null,
      activity: {
        kind: this.poker ? "poker" : this.battlefield ? "battlefield" : "crowd",
        phase: state.phase,
        remaining: state.remaining,
        stage: state.stage,
        paused: state.paused,
      },
      phase: "lobby",
      world: "lobby",
      worldTime: this.lobbyTime,
      vaults: [],
      occupancy: {},
      results: [],
      messages: this.messages.filter((m) => m.kind === "chat"),
    };
  }
  snapshot() {
    const points = tournamentScores([...this.players.values()]);
    return {
      broadcast:this.broadcast,
      poker: this.poker?.snapshot() || null,
      phase: this.phase,
      battlefield: this.battlefield?.snapshot() || null,
      leaderboardSerial: this.leaderboardSerial,
      world: this.world,
      stage: this.stage,
      stageName: STAGES[this.stage - 1].name,
      worldTime: this.worldTime,
      round: this.round,
      scoredRound: this.scoredRound,
      practice: this.practice,
      paused: this.poker?.paused ?? this.battlefield?.paused ?? this.paused,
      remaining: this.paused
        ? this.remaining / 1000
        : Math.max(0, (this.deadline - this.now()) / 1000),
      duration: this.duration,
      rewardPools: this.rewardPools,
      vaults: this.battlefield || this.poker ? [] : this.vaults,
      occupancy: this.battlefield || this.poker ? {} : this.occupancy(),
      results: this.results,
      messages: this.messages.filter((m) =>
        this.world === "lobby" ? m.kind === "chat" : m.kind === "event",
      ),
      players: [...this.players.values()].map(
        ({
          input,
          jumpHeld,
          inputSequence,
          inputAck,
          token,
          pageId,
          ...p
        }) => ({
          ...p,
          tournament: points.get(p.id),
          zone: this.zone(p),
          emoteFadeAge: (this.now() - (p.emoteStoppedAt ?? -10000)) / 1000,
          emoteAge: (this.now() - (p.emoteAt ?? -10000)) / 1000,
        }),
      ),
    };
  }
  save() {
    return {
      scoredRound: this.scoredRound,
      players: [...this.players.values()]
        .filter((p) => !p.demo)
        .map(({ input, vy, inputSequence, inputAck, pageId, lobbyTankAt, pokerRemoved, ...p }) => p),
    };
  }
}
