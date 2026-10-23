import { battlefieldAudience } from "./broadcast-audience.js";
import { frontReport } from "../shared/battlefield-results.js";
import {
  battlefieldLessons,
  lessonScene,
  resultUnitIcon,
} from "./battlefield-lessons.js";
import {
  BATTLE_ROUNDS,
  availableUnits,
  orderCost,
  terminalPosition,
} from "../shared/battlefield.js";
export function createBattlefieldUI({ send, escape, view, scene, toast }) {
  const battleCue = document.createElement("div");
  battleCue.id = "battle-cue";
  battleCue.setAttribute("aria-live", "polite");
  document.querySelector("#app").append(battleCue);
  const root = document.createElement("section");
  root.id = "battlefield-ui";
  root.hidden = true;
  document.querySelector("#app").append(root);
  const checkout = document.createElement("aside");
  checkout.id = "battle-checkout";
  checkout.hidden = true;
  document.querySelector("#app").append(checkout);
  const previewToggle = document.createElement("button");
  previewToggle.id = "demo-view-toggle";
  previewToggle.hidden = true;
  document.querySelector("#app").append(previewToggle);
  const hotbar = document.createElement("div");
  hotbar.id = "battle-hotbar";
  hotbar.hidden = true;
  hotbar.innerHTML = `<button id="equip-binoculars" aria-pressed="false"><kbd>1</kbd><svg viewBox="0 0 72 48" aria-hidden="true"><path d="M14 8H26L30 24H42L46 8H58L66 34H6Z" fill="#859d8e"/><circle cx="18" cy="33" r="12" fill="#324653" stroke="#dbc69a" stroke-width="3"/><circle cx="54" cy="33" r="12" fill="#324653" stroke="#dbc69a" stroke-width="3"/><circle cx="18" cy="33" r="7" fill="#9dc4d0"/><circle cx="54" cy="33" r="7" fill="#9dc4d0"/></svg><span>Binoculars</span></button>`;
  const lenses = document.createElement("div");
  lenses.id = "binocular-view";
  lenses.hidden = true;
  lenses.innerHTML = `<svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><defs><mask id="binocular-lenses"><rect width="100" height="60" fill="white"/><ellipse cx="32" cy="30" rx="29" ry="27" fill="black"/><ellipse cx="68" cy="30" rx="29" ry="27" fill="black"/></mask></defs><rect width="100" height="60" fill="#101b22" mask="url(#binocular-lenses)" opacity=".94"/></svg><span>Mouse to look · 1 or Escape to put away</span><i class="binocular-reticle">+</i>`;
  document.querySelector("#app").append(hotbar, lenses);
  let equipped = false;
  scene.onBinocularChange((value) => {
    equipped = value;
    lenses.hidden = !value;
    document.body.classList.toggle("using-binoculars", value);
    hotbar.querySelector("button").setAttribute("aria-pressed", String(value));
  });
  const toggleBinoculars = () => {
    if (hotbar.hidden) return;
    front = null;
    checkout.hidden = true;
    scene.setBinoculars(!equipped);
  };
  hotbar.querySelector("button").onclick = toggleBinoculars;
  let playerPreview = false;
  previewToggle.onclick = () => {
    playerPreview = !playerPreview;
    key = "";
    overview = false;
    scene.setBattleCamera(false);
    update(state, id, authed, joined);
  };
  let state,
    id,
    authed = false,
    joined = false,
    key = "",
    lesson = 0,
    lessonKey = "",
    front = null,
    unit = "troop",
    quantity = 1,
    owner = null,
    pending = false,
    overview = false,
    demoLow = localStorage.getItem("bear-low") === "true",
    initialQuality = demoLow,
    qualityChanged = false,
    checkoutKey = "",
    controlOpen = true,
    chatOpen = false;
  const act = (action, data = {}) => send({ type: "battle", action, data });
  const host = (action, data = {}) =>
    send({ type: "host", action: `battle:${action}`, data });
  const name = (pid) =>
    escape(state.players.find((p) => p.id === pid)?.name || "Absent bear");
  const laneName = (f) => (f.lane === 0 ? "Supply" : `Field ${f.lane}`);
  const enemy = (b, t, f) =>
    b.teams.find((x) => x.id === (f.a === t.id ? f.b : f.a));
  const planText = (plan) =>
    `${plan.length} teams: ` +
    [...new Set(plan)]
      .sort()
      .map(
        (size) =>
          `${plan.filter((n) => n === size).length} ${size === 1 ? "solo teams" : size === 2 ? "pairs" : size === 3 ? "triples" : "teams of " + size}`,
      )
      .join(", ");
  function controlPanel(b) {
    if (!authed || playerPreview) return "";
    const options = {
      matching: [["match", "Form teams now"]],
      staging: [["tutorial", "Start animated tutorial"]],
      instructions: [
        ["start", "Start preparation"],
        ["forceStart", "Start without waiting"],
      ],
      planning: [["final", "Begin private orders"]],
      final: [["fight", "Fight now"]],
      countdown: [],
      reveal: [],
      results:
        b.round < 5 || b.practice
          ? [
              [
                "next",
                b.practice
                  ? "Load scored round 1"
                  : `Load round ${b.round + 1}`,
              ],
            ]
          : [],
    }[b.phase];
    const t = b.teams.find((t) => t.id === b.team);
    const readiness = `${b.readyCount} / ${b.connectedCount} connected participants ready`;
    return `<details class="battle-controls" ${controlOpen ? "open" : ""}><summary>${b.demo ? "Solo demo controls" : "Host controls"}</summary><p class="host-readiness">${readiness}</p><div class="battle-control-buttons">${options.map(([a, label]) => `<button data-host="${a}" ${b.paused ? "disabled" : ""}>${label}</button>`).join("")}<button data-host="${b.paused ? "resume" : "pause"}">${b.paused ? "Resume" : "Pause simulation"}</button><button data-lobby>Return to lobby${b.demo ? " · End demo" : ""}</button></div>${
      b.demo
        ? `<p>WASD moves · Arrows look · Space jumps · E opens terminals.</p><p>${b.demo.count} simulated participants · ${planText(b.plan)}. Demo scores are disposable.</p><label>Walk as<select id="battle-pilot">${b.teams.map((t) => `<optgroup label="${escape(t.name)}">${t.members.map((pid) => `<option value="${pid}" ${pid === id ? "selected" : ""}>${name(pid)}</option>`).join("")}</optgroup>`).join("")}</select></label><div class="battle-control-buttons">${
            t
              ? b.fronts
                  .filter((f) => [f.a, f.b].includes(t.id))
                  .map(
                    (f) =>
                      `<button data-visit="${f.id}">Visit ${laneName(f)} terminal</button>`,
                  )
                  .join("")
              : ""
          }<button data-camera>${overview ? "Close camera" : "Map overview"}</button><button data-quality>${demoLow ? "High graphics" : "Low graphics"}</button><button data-timer>${b.demo.untimed ? "Enable round timer" : "Hold round timer"}</button></div><form id="demo-round"><label>Preview round<select name="round">${BATTLE_ROUNDS.map((r, i) => `<option value="${i + 1}" ${b.round === i + 1 ? "selected" : ""}>${i + 1}: ${r.name}</option>`).join("")}</select></label><button>Load selected round</button></form><p>Loading a round resets demo purchases and wallets. Teams stay fixed.</p>`
        : ""
    }<details><summary>Workshop runbook</summary><p>Form teams → let everyone explore → Start animated tutorial → wait for the ready count → Start preparation. The 45 / 15 / 5 second sequence and combat run automatically. Review results, then load the next round. Pause freezes timers and orders; Resume continues. Start without waiting is available for missing ready checks.</p></details><details><summary>Player controls</summary>${state.players
      .filter((p) => !p.demo)
      .map(
        (p) =>
          `<p>${name(p.id)} · ${p.kicked ? "kicked" : p.connected ? "connected" : "disconnected"} ${p.kicked ? `<button data-player="${p.id}" data-action="allowPlayer">Allow back</button>` : `<button data-player="${p.id}" data-action="playerLobby">Lobby</button><button data-player="${p.id}" data-action="disconnectPlayer">Disconnect</button><button data-player="${p.id}" data-action="kickPlayer">Kick</button>`}</p>`,
      )
      .join("")}</details></details>`;
  }
  root.addEventListener(
    "toggle",
    (e) => {
      if (e.target.classList.contains("battle-controls"))
        controlOpen = e.target.open;
      if (e.target.classList.contains("battle-chat")) chatOpen = e.target.open;
    },
    true,
  );
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.host) host(b.dataset.host);
    if (b.hasAttribute("data-lobby")) send({ type: "host", action: "lobby" });
    if (b.dataset.player)
      send({
        type: "host",
        action: b.dataset.action,
        data: { id: b.dataset.player },
      });
    if (b.dataset.visit) host("visit", { front: b.dataset.visit });
    if (b.hasAttribute("data-camera")) {
      overview = !overview;
      scene.setBattleCamera(overview);
      key = "";
      update(state, id, authed, joined);
    }
    if (b.hasAttribute("data-quality")) {
      demoLow = !demoLow;
      qualityChanged = true;
      scene.setQuality(demoLow);
      key = "";
      update(state, id, authed, joined);
    }
    if (b.hasAttribute("data-timer"))
      host("timer", { timed: state.battlefield.demo.untimed });
    if (b.dataset.lesson) {
      lesson = Math.max(
        0,
        Math.min(
          state.battlefield.round === 1 ? 2 : 1,
          lesson + Number(b.dataset.lesson),
        ),
      );
      key = "";
      update(state, id, authed, joined);
    }
    if (b.id === "battle-ready") act("ready");
    if (b.dataset.open) openTerminal(b.dataset.open);
    if (b.hasAttribute("data-lock"))
      act("lock", { owner: id, locked: !state.battlefield.walletLocks[id] });
    if (b.dataset.accept)
      act("transfer", {
        owner: id,
        id: b.dataset.accept,
        accept: b.dataset.decline !== "true",
      });
  });
  root.addEventListener("change", (e) => {
    if (e.target.id === "battle-pilot") {
      host("pilot", { id: e.target.value });
      front = null;
      checkout.hidden = true;
    }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    document.activeElement?.blur();
    const f = e.target;
    if (f.id === "battle-friends")
      act("friends", {
        ids: [...f.querySelectorAll("select")]
          .map((s) => s.value)
          .filter(Boolean),
      });
    if (f.id === "battle-chat") {
      act("chat", { text: f.elements.text.value });
      f.elements.text.value = "";
    }
    if (f.id === "battle-request")
      act("request", {
        owner: id,
        from: f.elements.from.value,
        amount: Number(f.elements.amount.value),
      });
    if (f.id === "demo-round")
      host("round", { round: Number(f.elements.round.value) });
  });
  checkout.addEventListener("input", (e) => {
    if (e.target.name !== "quantity") return;
    quantity = Number(e.target.value);
    const b = state.battlefield,
      u = [
        ...availableUnits(b.round),
        { id: "fort", name: "Fortifications", cost: 5 },
      ].find((u) => u.id === unit),
      cost = u.cost * quantity,
      wallet = b.wallets[owner || id] || 0,
      t = b.teams.find((t) => t.id === b.team),
      mine = b.personalOrders[owner || id]?.[front]?.[unit] || 0;
    const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 90,
      fullFort =
        unit === "fort" && b.orders[`${t.id}:${front}`].fort + quantity > 2,
      unavailable = pending || b.paused || b.walletLocks[owner || id];
    checkout.querySelector("#checkout-line").textContent =
      `${quantity} × ${u.cost} resources`;
    checkout.querySelector("#checkout-total").textContent = cost + " total";
    checkout.querySelector("#checkout-balance").textContent = Math.max(
      0,
      wallet - cost,
    );
    const confirm = checkout.querySelector(".checkout-confirm");
    confirm.disabled = !valid || cost > wallet || unavailable || fullFort;
    confirm.textContent = `Confirm · Deploy ${quantity} ${u.name.toLowerCase()}`;
    const recall = checkout.querySelector(".checkout-recall");
    recall.textContent = `Recall ${quantity} · Refund ${cost}`;
    recall.disabled = !valid || mine < quantity || unavailable;
    checkout.querySelector("#checkout-feedback").textContent = !valid
      ? "Choose a whole quantity from 1 to 90."
      : fullFort
        ? "At most two fortifications per team front."
        : cost > wallet
          ? "Not enough resources. Reduce quantity or request points."
          : `Your ${u.name.toLowerCase()} on this front: ${mine}.`;
  });
  checkout.addEventListener("change", (e) => {
    if (e.target.name === "quantity") {
      quantity = Number(e.target.value);
      return;
    }
    if (e.target.name === "wallet") owner = e.target.value;
    document.activeElement?.blur();
    checkoutKey = "";
    renderCheckout();
  });
  checkout.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-close")) {
      front = null;
      checkout.hidden = true;
      return;
    }
    if (b.dataset.unit) {
      unit = b.dataset.unit;
      renderCheckout();
      return;
    }
    if (b.dataset.quantity) {
      quantity = Math.max(
        1,
        Math.min(90, quantity + Number(b.dataset.quantity)),
      );
      renderCheckout();
      return;
    }
    if (b.dataset.buy) {
      if (pending) return;
      pending = true;
      act(b.dataset.buy, {
        front,
        owner: owner || id,
        unit,
        quantity,
        nonce: crypto.randomUUID(),
        volley: state.round,
      });
      renderCheckout();
    }
  });
  function openTerminal(fid) {
    const b = state?.battlefield,
      t = b?.teams.find((t) => t.id === b.team),
      f = b?.fronts.find((f) => f.id === fid),
      p = state?.players.find((p) => p.id === id);
    if (
      !t ||
      !f ||
      ![f.a, f.b].includes(t.id) ||
      !["planning", "final"].includes(b.phase)
    )
      return toast("Terminals open during preparation and final orders");
    const pos = terminalPosition(b.teams, t.id, f.lane);
    if (!p || Math.hypot(p.x - pos.x, p.z - pos.z) > 7)
      return toast("Walk closer to that barracks terminal, then press E");
    scene.setBinoculars(false);
    front = fid;
    owner = id;
    pending = false;
    renderCheckout();
  }
  function renderCheckout() {
    const b = state?.battlefield,
      t = b?.teams.find((t) => t.id === b.team),
      f = b?.fronts.find((f) => f.id === front);
    checkout.hidden =
      !front || !t || !f || !["planning", "final"].includes(b.phase);
    if (checkout.hidden) return;
    const selectedOwner = owner || id,
      units = [
        ...availableUnits(b.round),
        ...(b.round >= 4
          ? [{ id: "fort", name: "Fortifications", cost: 5 }]
          : []),
      ];
    if (!units.some((u) => u.id === unit)) unit = "troop";
    const selected = units.find((u) => u.id === unit),
      cost = quantity * selected.cost,
      wallet = b.wallets[selectedOwner] || 0,
      mine = b.personalOrders[selectedOwner]?.[front]?.[unit] || 0;
    const p = state.players.find((p) => p.id === id),
      pos = terminalPosition(b.teams, t.id, f.lane),
      near = p && Math.hypot(p.x - pos.x, p.z - pos.z) <= 7;
    if (!near) {
      front = null;
      checkout.hidden = true;
      checkoutKey = "";
      return;
    }
    const fullFort =
      unit === "fort" && b.orders[`${t.id}:${f.id}`].fort + quantity > 2;
    const nextCheckoutKey = JSON.stringify([
      front,
      id,
      owner,
      unit,
      quantity,
      cost,
      wallet,
      mine,
      near,
      pending,
      b.phase,
      b.paused,
      b.walletLocks,
      b.orders[`${t.id}:${f.id}`].fort,
      t.members.map((pid) => [
        pid,
        state.players.find((p) => p.id === pid)?.connected,
        state.players.find((p) => p.id === pid)?.waitingLobby,
      ]),
    ]);
    if (nextCheckoutKey === checkoutKey) return;
    if (
      checkout.contains(document.activeElement) &&
      document.activeElement.name === "quantity" &&
      !pending
    )
      return;
    checkoutKey = nextCheckoutKey;
    const unavailable =
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 90 ||
      b.paused ||
      b.walletLocks[selectedOwner] ||
      !near ||
      pending;
    checkout.innerHTML = `<div class="checkout-title"><div><span>${laneName(f)} terminal</span><h2>Defend against ${escape(enemy(b, t, f).name)}</h2></div><button data-close aria-label="Close terminal">×</button></div><p class="checkout-wallet">Your resources <b>${wallet}</b></p>${
      t.members.some((pid) => {
        const p = state.players.find((p) => p.id === pid);
        return pid !== id && (!p?.connected || p.waitingLobby);
      })
        ? `<label>Wallet<select name="wallet">${t.members
            .filter((pid) => {
              const p = state.players.find((p) => p.id === pid);
              return pid === id || !p?.connected || p.waitingLobby;
            })
            .map(
              (pid) =>
                `<option value="${pid}" ${pid === selectedOwner ? "selected" : ""}>${name(pid)}${pid === id ? " · You" : " · Absent"}</option>`,
            )
            .join("")}</select></label>`
        : ""
    }<div class="checkout-unit-grid">${units.map((u) => `<button class="${unit === u.id ? "selected" : ""}" data-unit="${u.id}" aria-pressed="${unit === u.id}"><span class="unit-icon ${u.id}" aria-hidden="true"></span><b>${u.name}</b><small>${u.cost} resources each</small></button>`).join("")}</div><div class="checkout-quantity"><button data-quantity="-1" aria-label="Decrease quantity">−</button><label>Quantity<input name="quantity" type="number" min="1" max="90" value="${quantity}"></label><button data-quantity="1" aria-label="Increase quantity">+</button></div><div class="checkout-receipt"><span id="checkout-line">${quantity} × ${selected.cost} resources</span><b id="checkout-total">${cost} total</b><span>Balance after deployment</span><b id="checkout-balance">${Math.max(0, wallet - cost)}</b></div><button class="checkout-confirm" data-buy="purchase" ${unavailable || cost > wallet || fullFort ? "disabled" : ""}>${pending ? "Confirming…" : `Confirm · Deploy ${quantity} ${selected.name.toLowerCase()}`}</button><button class="checkout-recall" data-buy="refund" ${unavailable || mine < quantity ? "disabled" : ""}>Recall ${quantity} · Refund ${cost}</button><p id="checkout-feedback">${!near ? "Walk back to this terminal to confirm." : b.walletLocks[selectedOwner] ? "Unlock your orders to buy or recall." : fullFort ? "At most two fortifications per team front. Reduce quantity or recall one." : cost > wallet ? "Not enough resources. Reduce quantity or request points from a teammate." : `Your ${selected.name.toLowerCase()} on this front: ${mine}. Construction is automatic after confirmation.`}</p><p class="checkout-note">All teammates can use all three terminals simultaneously. Each purchase uses its selected personal wallet.</p>`;
  }
  function update(next, pid, isAuthed, isJoined) {
    state = next;
    id = pid;
    authed = isAuthed;
    joined = isJoined;
    document.body.dataset.hostAuth = String(authed);
    const b = state.battlefield;
    const canInspect =
      b?.team &&
      ["staging", "planning", "final", "reveal", "results"].includes(b.phase);
    hotbar.hidden = !canInspect;
    if (!canInspect && equipped) scene.setBinoculars(false);
    previewToggle.hidden = !b?.demo || !authed;
    previewToggle.textContent = playerPreview
      ? "Show demo controls"
      : "Preview player screen";
    document.body.dataset.playerPreview = String(playerPreview);
    document.body.dataset.battlePhase = b?.phase || "";
    document.body.dataset.demoUntimed = String(!!b?.demo?.untimed);
    root.hidden = !b || (!joined && view === "player");
    document.body.classList.toggle(
      "battle-mode",
      !!b && (joined || view !== "player"),
    );
    if (!b) {
      if (key) document.querySelector("#round-cue").textContent = "";
      battleCue.textContent = "";
      playerPreview = false;
      document.body.dataset.playerPreview = "false";
      overview = false;
      scene.setBattleCamera(false);
      pending = false;
      unit = "troop";
      quantity = 1;
      if (qualityChanged) {
        scene.setQuality(initialQuality);
        demoLow = initialQuality;
        qualityChanged = false;
      }
      key = "";
      front = null;
      checkout.hidden = true;
      return;
    }
    const t = b.teams.find((t) => t.id === b.team),
      config = BATTLE_ROUNDS[b.round - 1];
    document.querySelector("#phase").textContent =
      `${b.demo && !playerPreview ? "Demo · " : ""}Battlefield | ${b.practice ? "Practice" : `Round ${b.round}`} | ${config.name}`;
    document.querySelector("#headline").textContent =
      {
        matching: "Choose your teammates",
        staging: "Explore your base",
        instructions: "Round briefing",
        countdown: "Orders frozen",
        planning: "Deploy from your barracks",
        final: "Private final orders",
        reveal: "Fight!",
        results:
          b.round === 5 && !b.practice
            ? "Battlefield complete"
            : "Round results",
      }[b.phase] + (b.paused ? " · Paused" : "");
    document.querySelector("#vaults").hidden = true;
    document.querySelector("#personal").style.display = t ? "" : "none";
    document.querySelector("#personal").innerHTML = t
      ? `<b class="wallet-team">${escape(t.name)}</b><div class="field-wallet"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h17v14H3zM3 6V4h15v2M16 11h5v5h-5z"/></svg><div><span>Your remaining resources</span><strong>${b.wallets[id] ?? 0}</strong></div></div><div class="team-wallet"><span>Team left to allocate</span><b>${t.members.reduce((sum, pid) => sum + (b.wallets[pid] || 0), 0)}</b></div>`
      : "Watching Battlefield";
    document.querySelector("#board .board-note").textContent = b.demo
      ? "Demo territory"
      : "Battlefield territory";
    document.querySelector("#leaderboard").innerHTML = b.teams
      .map(
        (t) =>
          `<div class="score"><span class="player-name">${escape(t.name)}</span><b>${t.score}</b></div>`,
      )
      .join("");
    if (view === "projector") {
      if (b.phase === "matching")
        document.querySelector("#headline").textContent = "Teams Being Formed";
      document.querySelector("#personal").style.display = "none";
      root.classList.add("audience-only");
      const next = JSON.stringify([b.phase, b.round, b.results]);
      if (next !== key) {
        key = next;
        root.innerHTML = battlefieldAudience(state, escape);
      }
      document.querySelector("#board").style.display =
        b.phase === "matching" ? "none" : "";
      return;
    }
    const newKey = JSON.stringify([
      b.phase,
      b.round,
      b.paused,
      b.teams,
      b.ready,
      b.orders,
      b.wallets,
      b.walletLocks,
      b.personalOrders,
      b.transfers,
      b.messages,
      b.friends,
      b.roster,
      b.demo,
      b.plan,
      b.results,
      id,
      authed,
      playerPreview,
      state.players.map((p) => [p.id, p.connected, p.waitingLobby]),
    ]);
    renderCheckout();
    if (newKey === key) return;
    if (
      root.contains(document.activeElement) &&
      ["INPUT", "SELECT"].includes(document.activeElement.tagName) &&
      key &&
      root.dataset.phase === b.phase
    )
      return;
    key = newKey;
    root.dataset.phase = b.phase;
    if (!["planning", "final"].includes(b.phase)) {
      front = null;
      checkout.hidden = true;
    }
    let html = "";
    if (b.phase === "matching")
      html = `<div class="battle-sheet"><h2>Choose up to two friends</h2><p>${planText(b.plan)} expected. Team sizes depend on attendance. Mutual preferences have priority; exact groups aren’t guaranteed.</p><p>You’ll see your confirmed team before practice. That roster stays fixed for all five rounds.</p>${
        view === "player" && b.roster.includes(id)
          ? `<form id="battle-friends">${[0, 1]
              .map(
                (i) =>
                  `<label>Friend ${i + 1}<select><option value="">Random / no preference</option>${b.roster
                    .filter((pid) => pid !== id)
                    .map(
                      (pid) =>
                        `<option value="${pid}" ${b.friends[i] === pid ? "selected" : ""}>${name(pid)}</option>`,
                    )
                    .join("")}</select></label>`,
              )
              .join(
                "",
              )}<button>Save preferences</button><p>Saved: ${b.friends.map(name).join(", ") || "Random"}</p></form>`
          : ""
      }</div>`;
    else if (b.phase === "staging") {
      html = `<div class="battle-field-hud staging-note"><p>Explore your barracks and three fronts. The host will start the briefing.</p></div>`;
    } else if (b.phase === "instructions") {
      const lk = `${state.round}:${id}`;
      if (lk !== lessonKey) {
        lessonKey = lk;
        lesson = 0;
      }
      const steps = battlefieldLessons(b, t, state.players, escape, id),
        step = steps[Math.min(lesson, steps.length - 1)];
      html =
        b.ready.includes(id) && t
          ? `<div class="battle-field-hud staging-note"><h3>Ready</h3><p>Explore your base while the host gathers the team.</p></div>`
          : `<div class="battle-sheet battle-briefing"><p>${b.practice ? "Practice" : `Round ${b.round}`} · ${config.name} · ${lesson + 1} / ${steps.length}</p><h2>${step.title}</h2>${lessonScene(step.art)}<p>${step.text}</p><p class="lesson-note">${step.note}</p><div class="lesson-navigation">${lesson ? '<button data-lesson="-1">Back</button>' : ""}${lesson < steps.length - 1 ? '<button data-lesson="1">Next</button>' : t ? '<button id="battle-ready">Finish briefing · Ready</button>' : ""}</div></div>`;
    } else if (["planning", "final"].includes(b.phase)) {
      html = t
        ? `<div class="battle-compact"><button data-lock ${b.paused ? "disabled" : ""}>${b.walletLocks[id] ? "Unlock orders" : "Lock orders"}</button><span>${b.phase === "planning" ? "Visible preparation" : "Private orders"}</span></div>`
        : "";
    } else if (b.phase === "countdown") html = "";
    else if (b.phase === "reveal")
      html =
        '<div class="battle-field-hud"><h2>All fronts are fighting</h2><p>Watch the armies advance. Strength comparisons follow in ten seconds.</p></div>';
    else {
      const results = b.results
        .filter((r) => !t || [r.a, r.b].includes(t.id))
        .sort((a, b) => a.lane - b.lane);
      const fmt = (n) => Number(n.toFixed(2)).toString();
      const reports = results.map((r) => frontReport(r, t?.id || r.a));
      const question =
        reports.some((r) => r.verdict === "win") &&
        reports.some((r) => r.verdict === "loss")
          ? "Could you move some strength from a comfortable win to a front you lost?"
          : config.prompt;
      html = `<div class="battle-results"><h2>${b.practice ? "Practice results" : `Round ${b.round} results`}</h2><p>${b.practice ? "This was practice. Your workshop points haven’t changed." : "Each teammate earns the territory your team won."}</p><div class="front-results">${results
        .map((r, i) => {
          const report = reports[i],
            enemy = escape(b.teams.find((x) => x.id === report.enemyId).name),
            who = t
              ? "Your team"
              : escape(b.teams.find((x) => x.id === r.a).name);
          const title =
            report.verdict === "win"
              ? `${who} beat ${enemy}`
              : report.verdict === "loss"
                ? `${who} lost to ${enemy}`
                : report.verdict === "tie"
                  ? `${who} tied with ${enemy}`
                  : `Neither side defended this front`;
          return `<article class="front-outcome ${report.verdict}"><div class="front-result-heading"><span>${laneName(r)}</span><b>${b.practice ? "Would earn " : "+"}${fmt(report.points)} territory</b></div><h3>${title}</h3><div class="front-strengths"><div><i class="result-unit">${resultUnitIcon}</i><span>${t ? "Your army" : who}</span><strong>${fmt(report.mine)}</strong></div><i class="result-battle-symbol" aria-hidden="true">${report.verdict === "win" ? "→" : report.verdict === "loss" ? "←" : "="}</i><div><i class="result-unit">${resultUnitIcon}</i><span>${enemy}</span><strong>${fmt(report.enemy)}</strong></div></div><p>Effective strength${report.margin ? ` · ${Math.abs(report.margin) < 0.01 ? "Less than 0.01" : fmt(Math.abs(report.margin))} ${report.margin > 0 ? "ahead" : "behind"}` : report.verdict === "empty" ? " · No units committed, no territory awarded" : " · Equal strength, territory shared"}</p></article>`;
        })
        .join(
          "",
        )}</div><div class="strategy-question"><b>For your next decision</b><p>${escape(question)}</p></div></div>`;
    }
    if (t && ["planning", "final"].includes(b.phase))
      html += `<details class="battle-chat" ${chatOpen ? "open" : ""}><summary>Team chat & resources</summary><div>${
        b.messages
          .slice(-10)
          .map((m) => `<p><b>${escape(m.name)}</b>: ${escape(m.text)}</p>`)
          .join("") || "<p>Coordinate with your teammates here.</p>"
      }</div><form id="battle-chat"><input name="text" aria-label="Team message" maxlength="160" placeholder="Ask your team…"><button>Send</button></form>${
        b.phase === "planning"
          ? `<form id="battle-request"><label>Request from<select name="from">${t.members
              .filter((pid) => pid !== id)
              .map(
                (pid) =>
                  `<option value="${pid}">${name(pid)} · ${b.wallets[pid]} available</option>`,
              )
              .join(
                "",
              )}</select></label><label>Resources<input name="amount" type="number" value="5" min="1" max="90"></label><button ${t.members.length < 2 ? "disabled" : ""}>Request points</button></form>${b.transfers
              .filter((t) => t.status === "pending" && t.from === id)
              .map(
                (t) =>
                  `<p>${name(t.to)} requests ${t.amount}<button data-accept="${t.id}">Approve</button><button data-accept="${t.id}" data-decline="true">Decline</button></p>`,
              )
              .join("")}`
          : ""
      }${b.transfers
        .filter((t) => t.to === id)
        .slice(-3)
        .map(
          (t) =>
            `<p>Request to ${name(t.from)}: ${t.amount} · ${escape(t.status)}</p>`,
        )
        .join("")}</details>`;
    root.innerHTML = html + controlPanel(b);
    document.querySelector("#board").style.display =
      authed && !playerPreview ? "" : "none";
  }
  function clock(elapsed) {
    const b = state?.battlefield;
    if (!b) return;
    const seconds = Math.ceil(
      Math.max(0, b.remaining - (b.paused ? 0 : elapsed)),
    );
    document.querySelector("#round-cue").textContent = "";
    const cue = battleCue;
    cue.textContent =
      b.phase === "countdown"
        ? String(Math.max(1, seconds))
        : b.phase === "reveal" && b.remaining - elapsed > 8.3
          ? "Fight!"
          : "";
    document.querySelector("#timer").textContent =
      b.demo?.untimed && ["planning", "final"].includes(b.phase)
        ? "Timer held"
        : ["matching", "planning", "final", "countdown", "reveal"].includes(
              b.phase,
            )
          ? `${Math.ceil(Math.max(0, b.remaining - (b.paused ? 0 : elapsed)))}s`
          : "";
  }
  return {
    update,
    clock,
    openTerminal,
    toggleBinoculars,
    putAwayBinoculars() {
      scene.setBinoculars(false);
    },
    closeTerminal() {
      front = null;
      checkout.hidden = true;
    },
    ack(receipt) {
      pending = false;
      const noun =
        {
          troop: "troop",
          heavy: "turret",
          tank: "tank",
          fort: "fortification",
          artillery: "artillery",
        }[receipt.unit] || receipt.unit;
      const unitName =
        noun + (receipt.quantity !== 1 && noun !== "artillery" ? "s" : "");
      toast(
        `${receipt.refund ? "Recalled" : "Construction queued"} · ${receipt.quantity} ${unitName} · ${receipt.wallet} resources left`,
      );
      renderCheckout();
    },
    error() {
      pending = false;
      renderCheckout();
    },
  };
}
