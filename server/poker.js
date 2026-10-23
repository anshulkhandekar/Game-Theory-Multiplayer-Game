import { randomAppearance } from "../shared/wardrobe.js";
import { randomInt } from "node:crypto";
import {
  POKER,
  RANKS,
  legalActions,
  handResult,
  pairings,
  tableLayout,
  botAction,
} from "../shared/poker.js";
import { move } from "../shared/movement.js";
export class Poker {
  constructor(game, { demoCount } = {}) {
    this.game = game;
    this.round = 1;
    this.phase = "instructions";
    this.paused = false;
    this.ready = new Set();
    this.serial = 1;
    if (demoCount !== undefined) {
      if (!Number.isInteger(demoCount) || demoCount < 2 || demoCount > 40)
        throw Error("Choose 2–40 participants");
      this.roster = Array.from({ length: demoCount }, (_, i) =>
        this.addBot(i, i === 0),
      );
      this.demo = { pilot: this.roster[0], count: demoCount };
    } else {
      this.roster = [...game.players.values()]
        .filter((p) => p.connected && !p.kicked && !p.officer && !p.demo)
        .map((p) => p.id);
      if (!this.roster.length || this.roster.length > 40)
        throw Error("Poker needs 1–40 participants");
    }
    if (this.roster.length % 2) {
      this.roster.push(this.addBot(40));
    }
    this.tables = [];
    this.prepare();
  }
  addBot(index, pilot = false) {
    const id = "poker-bot-" + index;
    this.game.players.set(id, {
      id,
      name: pilot ? "YourDemoPanda" : "PandaBot" + (index + 1),
      appearance: { ...randomAppearance(), bear: "panda" },
      connected: true,
      demo: true,
      pokerBot: !pilot,
      earnings: 0,
      pokerScore: 0,
      x: 0,
      y: 0,
      z: 0,
      grounded: true,
      input: {},
    });
    return id;
  }
  tableOf(id) {
    return this.tables.find((t) => t.players.includes(id));
  }
  prepare() {
    this.phase = "instructions";
    this.ready.clear();
    this.tables = pairings(this.roster, this.round).map((players, i) => ({
      ...tableLayout(this.roster.length / 2)[i],
      players,
      hand: 0,
      net: [0, 0],
      log: [],
      status: "waiting",
    }));
    for (const p of this.game.players.values()) {
      this.game.stopEmote(p);
      p.input = {};
      p.vx = p.vy = p.vz = 0;
      p.y = 0;
      p.grounded = true;
      p.waitingLobby =
        !this.roster.includes(p.id) || !!p.pokerRemoved || !!p.kicked;
      p.eligible = !p.waitingLobby;
      if (!p.waitingLobby) {
        const i = this.roster.indexOf(p.id);
        p.x = ((i % 8) - 3.5) * 2;
        p.z = 18 + Math.floor(i / 8) * 1.5;
        p.respawns = (p.respawns || 0) + 1;
      }
      if (p.pokerBot) this.ready.add(p.id);
    }
    for (const t of this.tables) this.seat(t);
    if (this.demo) {
      const pilot = this.game.players.get(this.demo.pilot);
      pilot.x = 0;
      pilot.z = 21;
    }
    this.serial++;
  }
  seat(t) {
    t.players.forEach((id, i) => {
      const p = this.game.players.get(id);
      if (p.waitingLobby) return;
      Object.assign(p, {
        x: t.x,
        y: 0,
        z: t.z + (i ? -2.15 : 2.15),
        facing: i ? 0 : Math.PI,
        vx: 0,
        vy: 0,
        vz: 0,
        input: {},
        grounded: true,
        respawns: (p.respawns || 0) + 1,
      });
    });
  }
  deal(t) {
    const deck = RANKS.slice();
    for (let i = 2; i > 0; i--) {
      const j = randomInt(i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    t.hand++;
    t.first = (t.hand - 1) % 2;
    t.cards = [deck[0], deck[1]];
    t.actions = [];
    t.turn = t.first;
    t.status = "playing";
    t.result = null;
    t.deadline = this.game.now() + POKER.turnSeconds * 1000;
    t.botAt = this.game.now() + 950;
    t.auto = [];
    this.serial++;
  }
  act(id, action, data = {}) {
    if (!this.roster.includes(id) || this.game.players.get(id)?.waitingLobby)
      throw Error("You are waiting for the next Poker session");
    if (this.paused) throw Error("Poker is paused");
    if (action === "ready" && this.phase === "instructions") {
      this.ready.add(id);
      return;
    }
    const t = this.tableOf(id);
    if (
      this.phase !== "playing" ||
      t?.status !== "playing" ||
      t.players[t.turn] !== id
    )
      throw Error("Wait for your turn");
    if (
      data.session !== this.game.round ||
      data.round !== this.round ||
      data.hand !== t.hand ||
      data.step !== t.actions.length
    )
      throw Error("That decision has already passed");
    this.choose(t, action, false);
  }
  choose(t, action, automatic) {
    if (!legalActions(t.actions.join(",")).includes(action))
      throw Error("Choose a legal action");
    if (automatic) t.auto.push({ seat: t.turn, action });
    t.actions.push(action);
    const orderedCards = [t.cards[t.first], t.cards[1 - t.first]];
    const result = handResult(orderedCards, t.actions);
    if (result) {
      const winner = result.winner === 0 ? t.first : 1 - t.first;
      const net = t.players.map((_, i) =>
        i === winner ? result.amount : -result.amount,
      );
      t.result = { ...result, winner, net };
      t.status = "reveal";
      t.deadline = this.game.now() + POKER.revealSeconds * 1000;
      t.net = t.net.map((n, i) => n + net[i]);
      t.log.push({
        hand: t.hand,
        actions: t.actions.slice(),
        net,
        reason: result.showdown ? "Higher card wins" : "Opponent folded",
        cards: result.showdown ? t.cards.slice() : undefined,
        auto: t.auto.slice(),
      });
    } else {
      t.turn = 1 - t.turn;
      t.deadline = this.game.now() + POKER.turnSeconds * 1000;
      t.botAt = this.game.now() + 950;
    }
    this.serial++;
  }
  command(action, data = {}) {
    if (action === "pause") {
      if (!this.paused) {
        this.paused = true;
        this.pauseAt = this.game.now();
      }
      return;
    }
    if (action === "resume") {
      if (this.paused) {
        const delta = this.game.now() - this.pauseAt;
        for (const t of this.tables) {
          t.deadline += delta;
          t.botAt += delta;
        }
        this.countdownEnd += delta;
        this.paused = false;
      }
      return;
    }
    if (this.paused) throw Error("Resume Poker first");
    if (action === "start" || action === "forceStart") {
      if (this.phase !== "instructions")
        throw Error("Finish the current round first");
      const present = this.roster.filter(
        (id) =>
          this.game.players.get(id)?.connected &&
          !this.game.players.get(id)?.waitingLobby,
      );
      if (action === "start" && present.some((id) => !this.ready.has(id)))
        throw Error("Wait for tutorial readiness or start without waiting");
      this.phase = "countdown";
      this.countdownEnd = this.game.now() + POKER.countdownSeconds * 1000;
      for (const t of this.tables) this.seat(t);
      this.serial++;
      return;
    }
    if (action === "next" && this.phase === "results" && this.round < 5) {
      this.round++;
      this.prepare();
      return;
    }
    if (action === "pilot" && this.demo && this.roster.includes(data.id)) {
      const previous = this.game.players.get(this.demo.pilot);
      previous.pokerBot = true;
      this.ready.add(previous.id);
      this.demo.pilot = data.id;
      this.game.players.get(data.id).pokerBot = false;
      this.ready.delete(data.id);
      return;
    }
    throw Error("That Poker control is unavailable");
  }
  tick(dt) {
    if (this.paused) return;
    const now = this.game.now();
    for (const p of this.game.players.values())
      if (p.connected && (p.waitingLobby || this.phase === "instructions")) {
        move(
          p,
          p.input || {},
          dt,
          p.waitingLobby ? "lobby" : "casino",
          this.game.worldTime,
          false,
          this,
        );
        p.inputAck = p.inputSequence || 0;
      } else p.inputAck = p.inputSequence || 0;
    if (this.phase === "countdown" && now >= this.countdownEnd) {
      this.phase = "playing";
      for (const t of this.tables) this.deal(t);
    }
    if (this.phase !== "playing") return;
    for (const t of this.tables) {
      if (t.status === "playing") {
        const p = this.game.players.get(t.players[t.turn]);
        if (p?.pokerBot && now >= t.botAt)
          this.choose(
            t,
            botAction(t.cards[t.turn], t.actions.join(",")),
            false,
          );
        else if (now >= t.deadline)
          this.choose(
            t,
            legalActions(t.actions.join(",")).includes("check")
              ? "check"
              : "fold",
            true,
          );
      } else if (t.status === "reveal" && now >= t.deadline) {
        if (t.hand < POKER.hands) this.deal(t);
        else t.status = "done";
      }
    }
    if (this.tables.every((t) => t.status === "done")) {
      for (const t of this.tables)
        t.players.forEach((id, i) => {
          const p = this.game.players.get(id);
          if (p && !p.officer && !p.demo && !p.waitingLobby && !p.kicked) {
            p.pokerScore = (p.pokerScore || 0) + t.net[i];
            p.eventsPlayed = { ...p.eventsPlayed, poker: true };
          }
        });
      if (!this.demo)
        this.game.recordRound(
          "poker",
          this.round,
          this.tables
            .flatMap((t) =>
              t.players.map((id, i) => ({
                id,
                opponent:
                  this.game.players.get(t.players[1 - i])?.name || "Opponent",
                net: t.net[i],
                won: t.net[i] > 0,
                hands: t.log.map((h) => ({ hand: h.hand, net: h.net[i] })),
              })),
            )
            .filter((r) => {
              const p = this.game.players.get(r.id);
              return p && !p.demo && !p.officer && !p.waitingLobby && !p.kicked;
            }),
        );
      this.phase = "results";
      this.serial++;
      this.game.pokerSerial++;
    }
  }
  snapshot(id) {
    return {
      round: this.round,
      phase: this.phase,
      paused: this.paused,
      serial: this.serial,
      hands: POKER.hands,
      countdown: Math.max(
        0,
        ((this.countdownEnd || 0) -
          (this.paused ? this.pauseAt : this.game.now())) /
          1000,
      ),
      roster: this.roster,
      ready: [...this.ready],
      demo: this.demo || null,
      tables: this.tables.map((t) => ({
        id: t.id,
        x: t.x,
        z: t.z,
        players: t.players,
        hand: t.hand,
        first: t.first,
        turn: t.players[t.turn],
        status: t.status,
        actions: t.actions || [],
        net: t.net,
        remaining: Math.max(
          0,
          ((t.deadline || 0) - (this.paused ? this.pauseAt : this.game.now())) /
            1000,
        ),
        log: t.log,
        result: t.result || null,
        cards: t.result?.showdown ? t.cards : undefined,
        ownCard:
          id && t.players.includes(id)
            ? t.cards?.[t.players.indexOf(id)]
            : undefined,
        legal:
          id === t.players[t.turn] && t.status === "playing"
            ? legalActions(t.actions.join(","))
            : [],
      })),
    };
  }
}
