import { randomUUID, randomInt } from "node:crypto";
import { appropriateText } from "./moderation.js";
import {
  BATTLE_ROUNDS,
  emptyOrder,
  orderCost,
  makeFronts,
  frontValue,
  compareOrders,
  teamPositions,
  teamPlan,
  terminalPosition,
  availableUnits,
} from "../shared/battlefield.js";
export class Battlefield {
  constructor(game, { demoCount = 0, preferred = 3 } = {}) {
    this.game = game;
    this.demo = null;
    if (demoCount) {
      teamPlan(demoCount, preferred);
      const ids = Array.from({ length: demoCount }, (_, i) => {
        const p = game.join(null, `Demo${String(i + 1).padStart(2, "0")}`, {
          bear: "panda",
          color: ["mint", "pink", "blue", "yellow"][i % 4],
          hat: i % 3 ? "none" : "cap",
        });
        p.demo = true;
        return p.id;
      });
      this.demo = {
        count: demoCount,
        preferred,
        pilot: ids[0],
        ids,
        untimed: true,
      };
    }
    this.wallets = {};
    this.credits = {};
    this.personalOrders = {};
    this.transactions = new Map();
    this.transactionCounts = new Map();
    this.deployments = [];
    this.deploymentSerial = 0;
    this.botNext = 0;
    this.phase = "matching";
    this.round = 1;
    this.practice = true;
    this.deadline = game.now() + 30000;
    this.paused = false;
    this.requests = new Map();
    this.teams = [];
    this.fronts = [];
    this.orders = {};
    this.locks = {};
    this.ready = new Set();
    this.results = [];
    this.transfers = [];
    this.messages = [];
    this.serial = 0;
    this.roster = this.demo
      ? this.demo.ids
      : [...game.players.values()]
          .filter((p) => p.connected && !p.kicked && !p.demo && !p.officer)
          .map((p) => p.id);
    if (this.roster.length < 2)
      throw Error("Battlefield needs at least two players");
    for (const id of this.roster) this.requests.set(id, []);
  }
  teamOf(id) {
    return this.teams.find((t) => t.members.includes(id));
  }
  editAllowed() {
    if (this.paused || !["planning", "final"].includes(this.phase))
      throw Error("Orders are closed");
  }
  accessible(id, front) {
    const team = this.teamOf(id),
      f = this.fronts.find((f) => f.id === front);
    if (!team || !f || ![f.a, f.b].includes(team.id))
      throw Error("That is not your front");
    return team;
  }
  act(id, action, data = {}) {
    this.tick();
    const player = this.game.players.get(id);
    if (!player?.connected || player.kicked || player.waitingLobby)
      throw Error("You are observing this activity");
    if (action === "friends") {
      if (this.phase !== "matching" || this.paused || !this.roster.includes(id))
        throw Error("Team matching has closed");
      if (
        !Array.isArray(data.ids) ||
        data.ids.length > 2 ||
        new Set(data.ids).size !== data.ids.length ||
        data.ids.some((x) => x === id || !this.roster.includes(x))
      )
        throw Error("Choose up to two other players");
      this.requests.set(id, data.ids);
      return;
    }
    const team = this.teamOf(id);
    if (!team) throw Error("You will join the next activity");
    if (action === "ready") {
      if (this.phase !== "instructions" || this.paused)
        throw Error("Instructions are closed");
      this.ready.add(id);
      return;
    }
    if (action === "chat") {
      if (typeof data.text !== "string") throw Error("Enter a message");
      const text = data.text.trim().slice(0, 160);
      if (!text) return;
      appropriateText(text);
      if (this.game.now() - (player.battleChatAt ?? -Infinity) < 1200)
        throw Error("Wait a moment before sending");
      player.battleChatAt = this.game.now();
      this.messages.push({
        team: team.id,
        name: player.name,
        player: player.id,
        time: this.game.now(),
        text,
        id: ++this.serial,
      });
      this.messages = this.messages.slice(-100);
      return;
    }
    this.editAllowed();
    const owner = data.owner || id;
    if (!team.members.includes(owner))
      throw Error("That wallet is not on your team");
    const walletPlayer = this.game.players.get(owner);
    if (owner !== id && walletPlayer?.connected && !walletPlayer.waitingLobby)
      throw Error("Only an absent teammate’s wallet can be managed");
    if (action === "purchase" || action === "refund")
      return this.purchase(owner, data, action === "refund", false, id);
    if (action === "lock") {
      this.locks[owner] = !!data.locked;
      return;
    }
    if (this.phase !== "planning")
      throw Error("Transfers close when final orders begin");
    if (action === "request") {
      if (
        !Number.isSafeInteger(data.amount) ||
        data.amount < 1 ||
        data.amount > 90
      )
        throw Error("Choose a valid resource amount");
      if (!team.members.includes(data.from) || data.from === owner)
        throw Error("Choose another teammate");
      const pending = this.transfers.filter(t => t.status === "pending" && t.team === team.id);
      if (pending.some(t => t.to === owner && t.from === data.from))
        throw Error("You already have a pending request to that teammate");
      if (pending.filter(t => t.to === owner).length >= 2 || pending.length >= 6)
        throw Error("Resolve your team’s pending requests first");
      // Retain bounded history; pending requests are never discarded.
      const resolved = this.transfers.filter(t => t.status !== "pending").slice(-100);
      this.transfers = [...this.transfers.filter(t => t.status === "pending"), ...resolved];
      this.transfers.push({
        id: randomUUID(),
        team: team.id,
        from: data.from,
        to: owner,
        amount: data.amount,
        status: "pending",
      });
      return;
    }
    if (action === "transfer") {
      const transfer = this.transfers.find(
        (t) =>
          t.id === data.id &&
          t.from === owner &&
          t.team === team.id &&
          t.status === "pending",
      );
      if (!transfer) throw Error("That request is no longer available");
      if (!data.accept) {
        transfer.status = "declined";
        return;
      }
      if (this.locks[owner] || this.locks[transfer.to])
        throw Error("Unlock both wallets first");
      if (this.wallets[owner] < transfer.amount)
        throw Error("Only unspent resources can be transferred");
      this.wallets[owner] -= transfer.amount;
      this.wallets[transfer.to] += transfer.amount;
      this.credits[owner] -= transfer.amount;
      this.credits[transfer.to] += transfer.amount;
      transfer.status = "accepted";
      return;
    }
    throw Error("Unknown Battlefield action");
  }
  purchase(owner, data, refund = false, internal = false, actor = owner) {
    this.editAllowed();
    const team = this.accessible(owner, data.front),
      key = `${team.id}:${data.front}`;
    if (this.locks[owner]) throw Error("Unlock your orders first");
    if (data.volley !== this.game.round)
      throw Error("This purchase belongs to a previous volley");
    if (
      typeof data.nonce !== "string" ||
      !/^[a-zA-Z0-9-]{8,80}$/.test(data.nonce)
    )
      throw Error("Invalid transaction");
    const receiptKey = `${owner}:${data.nonce}`;
    if (!internal && this.transactions.has(receiptKey))
      return this.transactions.get(receiptKey);
    if (!internal && (this.transactionCounts.get(actor) || 0) >= 120)
      throw Error("Your purchase limit for this volley has been reached");
    const front = this.fronts.find((f) => f.id === data.front),
      station = terminalPosition(this.teams, team.id, front.lane),
      p = this.game.players.get(actor);
    if (
      !internal &&
      (Math.hypot(p.x - station.x, p.z - station.z) > 7 || p.y > 4)
    )
      throw Error("Walk to your barracks terminal to deploy units");
    const unit =
      availableUnits(this.round).find((u) => u.id === data.unit) ||
      (this.round >= 4 && data.unit === "fort"
        ? { id: "fort", name: "Fortification", cost: 5 }
        : null);
    if (
      !unit ||
      !Number.isSafeInteger(data.quantity) ||
      data.quantity < 1 ||
      data.quantity > 90
    )
      throw Error("Choose an available unit and whole quantity");
    const cost = unit.cost * data.quantity,
      personal = this.personalOrders[owner][data.front];
    if (refund) {
      if (personal[unit.id] < data.quantity)
        throw Error("You can only recall units bought with this wallet");
      personal[unit.id] -= data.quantity;
      this.orders[key][unit.id] -= data.quantity;
      this.wallets[owner] += cost;
    } else {
      if (this.wallets[owner] < cost)
        throw Error("Not enough resources. Reduce quantity or request points");
      if (unit.id === "fort" && this.orders[key].fort + data.quantity > 2)
        throw Error("At most two fortifications per team front");
      this.wallets[owner] -= cost;
      personal[unit.id] += data.quantity;
      this.orders[key][unit.id] += data.quantity;
      this.deployments.push({
        id: ++this.deploymentSerial,
        team: team.id,
        owner,
        front: data.front,
        unit: unit.id,
        quantity: data.quantity,
        time: this.game.worldTime,
      });
      this.deployments = this.deployments.slice(-120);
    }
    const receipt = {
      nonce: data.nonce,
      owner,
      front: data.front,
      unit: unit.id,
      quantity: data.quantity,
      cost,
      refund,
      wallet: this.wallets[owner],
    };
    if (!internal) {
      this.transactions.set(receiptKey, receipt);
      this.transactionCounts.set(actor, (this.transactionCounts.get(actor) || 0) + 1);
    }
    return receipt;
  }
  formTeams() {
    const ids = this.roster.filter(
      (id) =>
        this.game.players.get(id)?.connected &&
        !this.game.players.get(id)?.kicked,
    );
    if (ids.length < 2)
      throw Error("At least two connected players are needed");
    // Even team counts permit exactly three reciprocal opponents with equal front values.
    const capacity = teamPlan(ids.length, this.demo?.preferred || 3);
    const count = capacity.length;
    for (let i = ids.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const colors = [
      "#ec8299",
      "#71c9e0",
      "#f2c96b",
      "#9bcf87",
      "#b39bea",
      "#e6a06c",
    ];
    this.teams = capacity.map((_, i) => ({
      id: `t${i}`,
      name: `Team ${i + 1}`,
      color: colors[i % colors.length],
      members: [],
      score: 0,
    }));
    const mutualCount = (id) =>
      (this.requests.get(id) || []).filter((friend) =>
        this.requests.get(friend)?.includes(id),
      ).length;
    ids.sort((a, b) => mutualCount(b) - mutualCount(a));
    const remaining = new Set(ids);
    for (const id of ids) {
      if (!remaining.has(id)) continue;
      const group = [
        id,
        ...this.requests
          .get(id)
          .filter(
            (friend) =>
              remaining.has(friend) && this.requests.get(friend)?.includes(id),
          ),
      ].slice(0, 3);
      let target = this.teams.find(
        (t, i) => capacity[i] - t.members.length >= group.length,
      );
      if (!target)
        target = this.teams.find((t, i) => t.members.length < capacity[i]);
      const take = group.slice(
        0,
        capacity[this.teams.indexOf(target)] - target.members.length,
      );
      target.members.push(...take);
      for (const member of take) remaining.delete(member);
    }
    this.fronts = makeFronts(this.teams);
    this.prepare(true);
  }
  prepare(practice) {
    this.game.round++;
    this.practice = practice;
    this.phase = "staging";
    this.deadline = 0;
    this.ready.clear();
    this.results = [];
    this.orders = {};
    this.locks = {};
    this.transfers = [];
    this.wallets = {};
    this.credits = {};
    this.personalOrders = {};
    this.transactions.clear();
    this.transactionCounts.clear();
    this.deployments = [];
    this.botNext = this.game.now() + 2500;
    for (const team of this.teams) {
      const budget = BATTLE_ROUNDS[this.round - 1].budget;
      const fronts = this.fronts.filter((f) => [f.a, f.b].includes(team.id));
      for (const f of fronts) {
        this.orders[`${team.id}:${f.id}`] = emptyOrder();
      }
      team.members.forEach((id, i) => {
        this.wallets[id] =
          Math.floor(budget / team.members.length) +
          (i < budget % team.members.length ? 1 : 0);
        this.credits[id] = this.wallets[id];
        this.locks[id] = false;
        this.personalOrders[id] = Object.fromEntries(
          fronts.map((f) => [f.id, emptyOrder()]),
        );
        if (this.game.players.get(id).demo && id !== this.demo?.pilot)
          this.ready.add(id);
      });
    }
    const positions = teamPositions(this.teams);
    for (const t of this.teams)
      t.members.forEach((id, i) => {
        const p = this.game.players.get(id),
          pos = positions.find((p) => p.id === t.id);
        Object.assign(p, {
          x: pos.x + ((i % 3) - 1) * 2,
          z: pos.z + 5 + Math.floor(i / 3) * 2,
          y: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          grounded: true,
          eligible: true,
          waitingLobby: false,
          input: {},
        });
      });
  }
  command(action, data = {}) {
    if (action === "pause") {
      if (!this.paused) {
        this.remaining = Math.max(0, this.deadline - this.game.now());
        this.paused = true;
      }
      return;
    }
    if (action === "resume") {
      if (this.paused) {
        this.deadline = this.remaining ? this.game.now() + this.remaining : 0;
        this.paused = false;
      }
      return;
    }
    if (this.paused) throw Error("Resume Battlefield first");
    if (action === "match" && this.phase === "matching")
      return this.formTeams();
    if (action === "tutorial" && this.phase === "staging") {
      this.phase = "instructions";
      return;
    }
    if (
      ["start", "forceStart"].includes(action) &&
      this.phase === "instructions"
    ) {
      const connected = this.teams
        .flatMap((t) => t.members)
        .filter((id) => {
          const p = this.game.players.get(id);
          return p?.connected && !p.waitingLobby;
        });
      if (action === "start" && connected.some((id) => !this.ready.has(id)))
        throw Error("Wait for players to read, or start without waiting");
      this.phase = "planning";
      this.deadline = this.demo?.untimed ? 0 : this.game.now() + 45000;
      return;
    }
    if (action === "final" && this.phase === "planning") {
      this.phase = "final";
      this.transfers
        .filter((t) => t.status === "pending")
        .forEach((t) => (t.status = "expired"));
      this.deadline = this.demo?.untimed ? 0 : this.game.now() + 15000;
      return;
    }
    if (action === "fight" && this.phase === "final") return this.countdown();
    if (action === "next" && this.phase === "results") {
      if (this.practice) this.prepare(false);
      else if (this.round < 5) {
        this.round++;
        this.prepare(false);
      } else throw Error("Battlefield complete. Return to the lobby");
      return;
    }
    if (action === "timer" && this.demo) {
      this.demo.untimed = !data.timed;
      if (["planning", "final"].includes(this.phase))
        this.deadline = this.demo.untimed
          ? 0
          : this.game.now() + (this.phase === "planning" ? 45000 : 15000);
      return;
    }
    if (action === "pilot" && this.demo) {
      if (!this.demo.ids.includes(data.id)) throw Error("Choose a demo bear");
      if (["staging", "instructions"].includes(this.phase)) {
        this.ready.add(this.demo.pilot);
        this.ready.delete(data.id);
      }
      this.demo.pilot = data.id;
      return;
    }
    if (action === "visit" && this.demo) {
      const team = this.teamOf(this.demo.pilot),
        front = this.fronts.find(
          (f) => f.id === data.front && [f.a, f.b].includes(team.id),
        );
      if (!front) throw Error("Choose your team’s terminal");
      const pos = terminalPosition(this.teams, team.id, front.lane);
      Object.assign(this.game.players.get(this.demo.pilot), {
        x: pos.x,
        y: 0,
        z: pos.z + 2,
        vx: 0,
        vz: 0,
        vy: 0,
        input: {},
      });
      this.game.players.get(this.demo.pilot).respawns =
        (this.game.players.get(this.demo.pilot).respawns || 0) + 1;
      return;
    }
    if (action === "round" && this.demo) {
      if (!Number.isInteger(data.round) || data.round < 1 || data.round > 5)
        throw Error("Choose round 1–5");
      this.round = data.round;
      this.prepare(false);
      return;
    }
    throw Error("That Battlefield action is unavailable");
  }
  tick() {
    this.deployments = this.deployments.filter(
      (d) => this.game.worldTime - d.time < 8,
    );
    if (
      this.demo &&
      !this.paused &&
      this.phase === "planning" &&
      (this.demo.untimed || this.game.now() < this.deadline) &&
      this.game.now() >= this.botNext
    ) {
      this.botNext = this.game.now() + 1800;
      for (const id of this.demo.ids) {
        if (
          id === this.demo.pilot ||
          !this.game.players.get(id)?.connected ||
          this.locks[id]
        )
          continue;
        const team = this.teamOf(id),
          fronts = this.fronts.filter((f) => [f.a, f.b].includes(team.id));
        const i = this.demo.ids.indexOf(id),
          available = availableUnits(this.round).filter(
            (u) => u.cost <= this.wallets[id],
          );
        if (!available.length) continue;
        const front = fronts[(i + Math.floor(this.game.worldTime / 5)) % 3],
          unit = available[(i + this.round) % available.length];
        this.purchase(
          id,
          {
            front: front.id,
            unit: unit.id,
            quantity: unit.id === "troop" ? Math.min(3, this.wallets[id]) : 1,
            nonce: randomUUID(),
            volley: this.game.round,
          },
          false,
          true,
        );
        const pos = terminalPosition(this.teams, team.id, front.lane),
          p = this.game.players.get(id);
        p.input = {
          x: Math.sign(pos.x - p.x) * 0.3,
          z: Math.sign(pos.z + 2 - p.z) * 0.3,
        };
        p.lastInput = this.game.now();
      }
      for (const t of this.transfers.filter(
        (t) =>
          t.status === "pending" &&
          this.demo.ids.includes(t.from) &&
          t.from !== this.demo.pilot,
      )) {
        if (
          this.wallets[t.from] >= t.amount &&
          !this.locks[t.from] &&
          !this.locks[t.to]
        ) {
          this.wallets[t.from] -= t.amount;
          this.wallets[t.to] += t.amount;
          this.credits[t.from] -= t.amount;
          this.credits[t.to] += t.amount;
          t.status = "accepted";
        }
      }
    }
    if (!this.paused && this.phase === "final" && this.game.now() >= this.deadline - 5000) this.spendAbsentResources();
    if (this.paused || !this.deadline || this.game.now() < this.deadline)
      return;
    if (this.phase === "matching") {
      try {
        this.formTeams();
      } catch {
        this.deadline = 0;
      } // Host can retry after more players join.
    } else if (this.phase === "planning") this.command("final");
    else if (this.phase === "final") this.countdown();
    else if (this.phase === "countdown") this.resolve();
    else if (this.phase === "reveal") {
      this.phase = "results";
      this.deadline = 0;
    }
  }
  spendAbsentResources() {
    // Spend only a disconnected member's leftovers, evenly across their fronts.
    // No enemy orders or strength estimates enter this decision.
    for (const team of this.teams) for (const id of team.members) {
      const p=this.game.players.get(id);
      if (!p || p.connected || p.kicked || p.waitingLobby || !(this.wallets[id]>0)) continue;
      const fronts=this.fronts.filter(f=>[f.a,f.b].includes(team.id));
      const amount=this.wallets[id], locked=this.locks[id];this.locks[id]=false;
      try {
        fronts.forEach((f,i)=>{const quantity=Math.floor(amount/fronts.length)+(i<amount%fronts.length?1:0);if(quantity)this.purchase(id,{front:f.id,unit:"troop",quantity,nonce:randomUUID(),volley:this.game.round},false,true);});
        this.messages.push({team:team.id,name:"Barracks",text:`${p.name} disconnected. Their remaining ${amount} resources were deployed evenly as troops.`,id:++this.serial});
        this.messages=this.messages.slice(-100);
      } finally {this.locks[id]=locked;}
    }
  }
  countdown() {
    if (this.phase !== "final") return;
    this.spendAbsentResources();
    this.phase = "countdown";
    this.deadline = this.game.now() + 5000;
  }
  resolve() {
    if (this.phase !== "countdown") return;
    this.results = this.fronts.map((f) => {
      const a = this.orders[`${f.a}:${f.id}`],
        b = this.orders[`${f.b}:${f.id}`];
      return {
        ...f,
        aOrder: { ...a },
        bOrder: { ...b },
        ...compareOrders(a, b, this.round, frontValue(this.round, f.lane)),
      };
    });
    if (!this.practice)
      for (const team of this.teams) {
        team.score += this.results.reduce(
          (sum, r) =>
            sum +
            (r.a === team.id
              ? r.leftPoints
              : r.b === team.id
                ? r.rightPoints
                : 0),
          0,
        );
        for (const id of team.members) {
          const p = this.game.players.get(id);
          p.eventsPlayed = {...p.eventsPlayed, battlefield:true};
          p.battlefieldScore =
            (p.battlefieldScore || 0) +
            this.results.reduce(
              (sum, r) =>
                sum +
                (r.a === team.id
                  ? r.leftPoints
                  : r.b === team.id
                    ? r.rightPoints
                    : 0),
              0,
            );
        }
      }
    if (!this.practice && !this.demo) this.game.recordRound("battlefield", this.round,
      this.teams.flatMap(team => {
        const fronts = this.results.filter(r => [r.a,r.b].includes(team.id)).map(r => ({front:r.lane+1, opponent:this.teams.find(t=>t.id===(r.a===team.id?r.b:r.a))?.name || "Opponent", points:r.a===team.id?r.leftPoints:r.rightPoints, rivalPoints:r.a===team.id?r.rightPoints:r.leftPoints}));
        const points = fronts.reduce((sum,f)=>sum+f.points,0);
        return team.members.filter(id=>!this.game.players.get(id)?.demo).map(id=>({id,team:team.name,points,fronts}));
      }));
    this.phase = "reveal";
    this.deadline = this.game.now() + 10000;
    this.game.battlefieldSerial++;
  }
  snapshot(id = null, publicSnapshot = null) {
    const team = this.teamOf(id),
      publicOrders =
        this.phase === "planning" || ["reveal", "results"].includes(this.phase);
    const visibleTeams =
      publicSnapshot && publicOrders
        ? []
        : publicOrders
          ? this.teams
          : team
            ? [team]
            : [];
    const orders = {};
    for (const t of visibleTeams)
      for (const f of this.fronts.filter((f) => [f.a, f.b].includes(t.id))) {
        const key = `${t.id}:${f.id}`;
        orders[key] = { ...this.orders[key] };
      }
    return {
      ...(publicSnapshot || {
        phase: this.phase,
        round: this.round,
        practice: this.practice,
        paused: this.paused,
        remaining: this.paused
          ? (this.remaining || 0) / 1000
          : Math.max(0, (this.deadline - this.game.now()) / 1000),
        teams: this.teams.map((t) => ({
          ...t,
          members: [...t.members],
        })),
        fronts: this.fronts.map((f) => ({
          ...f,
          value: frontValue(this.round, f.lane),
        })),
        roster: this.roster,
        ready: [...this.ready],
        connectedCount: this.teams
          .flatMap((t) => t.members)
          .filter((id) => {
            const p = this.game.players.get(id);
            return p?.connected && !p.waitingLobby && !p.kicked;
          }).length,
        readyCount: this.teams
          .flatMap((t) => t.members)
          .filter((id) => {
            const p = this.game.players.get(id);
            return (
              p?.connected && !p.waitingLobby && !p.kicked && this.ready.has(id)
            );
          }).length,
        results: this.results,
        serial: this.serial,
        plan: this.teams.length
          ? this.teams.map((t) => t.members.length)
          : teamPlan(
              Math.max(
                2,
                this.roster.filter((id) => this.game.players.get(id)?.connected)
                  .length,
              ),
              this.demo?.preferred || 3,
            ),
        demo: this.demo
          ? {
              count: this.demo.count,
              preferred: this.demo.preferred,
              pilot: this.demo.pilot,
              untimed: this.demo.untimed,
            }
          : null,
      }),
      team: team?.id || null,
      friends: id ? [...(this.requests.get(id) || [])] : [],
      orders: publicSnapshot && publicOrders ? publicSnapshot.orders : orders,
      wallets: team
        ? Object.fromEntries(team.members.map((id) => [id, this.wallets[id]]))
        : {},
      credits: team
        ? Object.fromEntries(team.members.map((id) => [id, this.credits[id]]))
        : {},
      personalOrders: team
        ? Object.fromEntries(
            team.members.map((id) => [id, this.personalOrders[id]]),
          )
        : {},
      walletLocks: team
        ? Object.fromEntries(team.members.map((id) => [id, this.locks[id]]))
        : {},
      deployments: this.deployments.filter(
        (d) => publicOrders || d.team === team?.id,
      ),
      transfers: this.transfers.filter((t) => t.team === team?.id),
      messages: this.messages.filter((m) => m.team === team?.id),
    };
  }
}
