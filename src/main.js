import { createScene } from "./scene.js";
import { createAudio } from "./audio.js";
import "./style.css";
import { STAGES, isParkour } from "../shared/world.js";
const view = new URLSearchParams(location.search).get("view") || "player";
let token = localStorage.getItem("bear-token"),
  id = null,
  state,
  ws,
  joined = false,
  authed = false,
  last = performance.now();
const keys = new Set();
const app = document.querySelector("#app");
app.innerHTML = `<canvas id="scene" tabindex="0" aria-label="Game view"></canvas><div class="vignette"></div>
<header><h1>Game Theory</h1><div class="connection" id="connection">Connecting</div></header>
<section class="status"><span id="phase">Crowd Rush</span><h2 id="headline">Crowd Rush</h2><div class="clock"><div id="timer"></div><div id="round-cue" aria-live="polite"></div></div></section>
<aside id="social" hidden><div class="social-heading"><span id="social-title">Lobby chat</span><button id="social-toggle" aria-expanded="true">Hide</button></div><div id="social-body"><div id="messages" tabindex="0" aria-label="Recent messages"></div><form id="chat-form"><input id="chat-text" aria-label="Lobby message" maxlength="160" placeholder="Say hello…" autocomplete="off"><button>Send</button></form></div></aside><div id="emote-menu" role="dialog" aria-label="Emote wheel" hidden><span>Choose an emote</span><button data-emote="wave"><kbd>1</kbd> Wave</button><button data-emote="scuba"><kbd>2</kbd> Scuba</button><button data-emote="dance"><kbd>3</kbd> Dance</button><small>E or Escape to close</small></div><div id="personal" aria-live="polite"></div><div id="vaults" aria-label="Vault rewards and occupancy"></div>
<aside id="board"><h3>Standings</h3><p class="board-note">Crowd Rush earnings</p><div id="leaderboard"></div></aside>
<footer><span class="key-guide"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move <span id="look-guide"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Look</span> <kbd class="space-key">Space</kbd> Jump</span><div class="footer-actions"><button id="emotes">Emotes · E</button><button id="help">Rules</button><button id="quality">Low graphics</button><button id="sound">Sound off</button><button id="ready">I'm ready</button></div></footer>
<div id="transition" aria-live="polite"></div><div id="overlay"></div><div id="host"></div><div id="toast" role="status"></div>`;
document.body.dataset.view = view;
const gameScene = createScene(document.querySelector("#scene"));
const audio = createAudio();
let loadingKey = "",
  preparedKey = "",
  dismissedKey = "";
let lobbyEnteredAt = performance.now(),
  lastSocialKey = "",
  lastSocialWorld = "";
let receivedAt = performance.now(),
  lastZone = null,
  lastTick = null;
const overlay = document.querySelector("#overlay");
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function instructions() {
  keys.clear();
  overlay.innerHTML = `<div class="modal rules"><div class="sheet-heading"><span>Crowd Rush rules</span><h2>How to play</h2></div><div class="sheet-body"><p>Step inside a vault chamber before the clock runs out. Its floor lights up and the HUD confirms “Inside”. Leave its threshold to change your choice. Everyone inside shares its reward equally.</p><div class="rule-example"><b>240</b><span>Gold reward</span><i>÷</i><b>4</b><span>Bears inside</span><i>=</i><b>60</b><span>Each bear earns</span></div><p>Move with WASD and jump with Space. In the lobby and rounds 2–5, use arrow keys to look around. Round 2 assists small adjacent steps. Rounds 3–5 have paths in three directions and a purple jump-pad route to the elevated Sky vault. Step on a jump pad to launch, then steer with WASD. Round 4 adds wall punchers; round 5 combines punchers and floor spikes with faster moving platforms. Amber warns before hazards strike; red is dangerous. Falls return you to the start. Move freely between vaults. More bears means a smaller share. Outside all chambers earns zero.</p><p>Practice doesn’t change your earnings. Scored rounds add to the standings.</p><button id="close">Back to the arena</button></div></div>`;
  document.querySelector("#close").onclick = () => (overlay.innerHTML = "");
}
document.querySelector("#chat-form").onsubmit = (e) => {
  e.preventDefault();
  const box = document.querySelector("#chat-text");
  if (box.value.trim()) send({ type: "chat", text: box.value });
  box.value = "";
  document.querySelector("#scene").focus();
};
document.querySelector("#chat-text").onfocus = () => {
  keys.clear();
  send({ type: "input", x: 0, z: 0, jump: false });
};
document.querySelector("#social-toggle").onclick = (e) => {
  const body = document.querySelector("#social-body");
  body.hidden = !body.hidden;
  e.target.textContent = body.hidden ? "Show" : "Hide";
  e.target.setAttribute("aria-expanded", String(!body.hidden));
};
document.querySelector("#emotes").onclick = () => {
  document.querySelector("#emote-menu").hidden =
    !document.querySelector("#emote-menu").hidden;
};
document.querySelectorAll("[data-emote]").forEach(
  (button) =>
    (button.onclick = () => {
      send({ type: "emote", emote: button.dataset.emote });
      document.querySelector("#emote-menu").hidden = true;
    }),
);
function social() {
  const lobby = state.world === "lobby";
  document.querySelector("#social").hidden = view !== "player" || !joined;
  document.querySelector("#social-title").textContent = lobby
    ? "Lobby chat"
    : "Round events";
  document.querySelector("#chat-form").hidden = !lobby;
  document.querySelector("#emotes").hidden = !lobby;
  if (!lobby) document.querySelector("#emote-menu").hidden = true;
  const messages = state.messages || [],
    key = state.world + ":" + messages.map((m) => m.seq).join(",");
  if (key !== lastSocialKey) {
    const panel = document.querySelector("#messages");
    const bottom =
      panel.scrollHeight - panel.scrollTop - panel.clientHeight < 28 ||
      lastSocialWorld !== state.world;
    panel.innerHTML = messages.length
      ? messages
          .map(
            (m) =>
              `<p><b>${escape(m.name)}</b>${m.kind === "chat" ? ": " : " "}${escape(m.text)}</p>`,
          )
          .join("")
      : `<p class="empty-feed">${lobby ? "Chat is available here in the lobby." : "Vault entries and obstacle events appear here."}</p>`;
    if (bottom) panel.scrollTop = panel.scrollHeight;
    lastSocialKey = key;
    lastSocialWorld = state.world;
  }
}
function joinForm() {
  overlay.innerHTML = `<form class="modal join-sheet" id="join"><div class="sheet-heading"><h2>Join the game</h2><p>Crowd Rush</p></div><div class="sheet-body"><p class="join-intro">Choose your name and bear appearance.</p><label>Your display name<input name="name" maxlength="24" required placeholder="Display name" autocomplete="nickname"></label><div class="fields"><label>Bear<select name="bear"><option value="brown">Brown bear</option><option value="panda">Panda</option><option value="polar">Polar bear</option><option value="black">Black bear</option></select></label><label>Color<select name="color"><option>mint</option><option>pink</option><option>blue</option><option>yellow</option></select></label><label>Hat<select name="hat"><option>none</option><option>cap</option><option>crown</option></select></label></div><button>Enter the arena</button></div></form>`;
  document.querySelector("#join").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const profile = {
      name: f.get("name"),
      appearance: {
        bear: f.get("bear"),
        color: f.get("color"),
        hat: f.get("hat"),
      },
    };
    localStorage.setItem("bear-profile", JSON.stringify(profile));
    send({ type: "join", id: token, ...profile });
    overlay.innerHTML = "";
  };
}
function send(m) {
  if (ws?.readyState === 1) ws.send(JSON.stringify(m));
}
function connect() {
  ws = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`,
  );
  ws.onopen = () => {
    document.querySelector("#connection").textContent = "Room connected";
    if (view === "player") {
      const profile = JSON.parse(
        localStorage.getItem("bear-profile") || "null",
      );
      if (token && profile) send({ type: "join", id: token, ...profile });
      else joinForm();
    }
  };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "identity") {
      id = m.id;
      token = m.token;
      localStorage.setItem("bear-token", token);
      joined = true;
      if (state?.world === "lobby") lobbyEnteredAt = performance.now();
      if (state) gameScene.update(state, id);
    }
    if (m.type === "state") {
      const old = state;
      state = m.state;
      if (state.world === "lobby" && old?.world !== "lobby")
        lobbyEnteredAt = performance.now();
      receivedAt = performance.now();
      gameScene.update(state, id);
      phaseFeedback(old);
      renderUI();
      if (authed && old?.stage !== state.stage) {
        document.querySelector("#stage").value = state.stage;
        document.querySelector("#duration").value = state.duration;
      }
      if (
        state.phase === "instructions" &&
        old?.phase !== state.phase &&
        view === "player" &&
        joined
      )
        instructions();
    }
    if (m.type === "auth") {
      authed = m.ok;
      hostUI();
      if (!m.ok) toast("Incorrect host key");
    }
    if (m.type === "error") {
      if (view === "player" && !joined) joinForm();
      toast(m.message);
    }
  };
  ws.onclose = (e) => {
    joined = false;
    authed = false;
    keys.clear();
    hostUI();
    document.querySelector("#connection").textContent = "Reconnecting…";
    if (e.code === 4000) {
      toast("This player session is open in another tab.");
      return;
    }
    setTimeout(connect, 1000);
  };
}
function toast(t) {
  document.querySelector("#toast").textContent = t;
  setTimeout(() => (document.querySelector("#toast").textContent = ""), 3500);
}
function hostUI() {
  if (view !== "host") return;
  document.querySelector("#host").innerHTML = authed
    ? `<div class="hostpanel"><h3>Control desk</h3><div class="actions">${["instructions", "practice", "ready", "start", "countdown", "pause", "resume", "results", "next", "lobby"].map((a) => `<button data-action="${a}">${{ instructions: "Show rules", practice: "Load practice", ready: "Gather ready checks", start: "Load scored round", countdown: "Start countdown", pause: "Pause", resume: "Resume", results: "Reveal results", next: "Next round", lobby: "Return to lobby" }[a]}</button>`).join("")}</div><label>Arena<select id="stage">${STAGES.map((s) => `<option value="${s.id}">Round ${s.id}: ${s.name}</option>`).join("")}</select></label><label>Scored duration (seconds)<input id="duration" type="number" min="5" max="180" value="${state?.duration || 35}"></label><label>Rewards: bronze, gold, diamond, sky (rounds 3–5)<input id="rewards" value="${[...["bronze", "gold", "diamond", "sky"].map((key) => state?.rewardPools?.[key] ?? { bronze: 120, gold: 240, diamond: 360, sky: 480 }[key])].join(",")}"></label><button id="configure">Apply settings</button><p id="roster"></p></div>`
    : `<form class="hostpanel" id="auth"><h3>Host sign in</h3><label>Server host key<input type="password" id="key" required></label><button>Authenticate</button></form>`;
  if (authed) {
    document.querySelector("#stage").value = state?.stage || 1;
    document.querySelector("#stage").onchange = (e) =>
      (document.querySelector("#duration").value =
        STAGES[Number(e.target.value) - 1].duration);
    document
      .querySelectorAll("[data-action]")
      .forEach(
        (b) =>
          (b.onclick = () => send({ type: "host", action: b.dataset.action })),
      );
    document.querySelector("#configure").onclick = () =>
      send({
        type: "host",
        action: "configure",
        data: {
          stage: Number(document.querySelector("#stage").value),
          duration: Number(document.querySelector("#duration").value),
          rewards: document
            .querySelector("#rewards")
            .value.split(",")
            .map(Number),
        },
      });
  } else
    document.querySelector("#auth").onsubmit = (e) => {
      e.preventDefault();
      send({ type: "hostAuth", key: document.querySelector("#key").value });
    };
}
function loadingUI() {
  if (view === "host") {
    document.querySelector("#transition").innerHTML = "";
    return;
  }
  const player = state.players.find((p) => p.id === id);
  const intro = joined && state.world === "lobby" && !player?.loaded;
  const waiting = state.phase === "loading";
  const key = `${id}:${state.round}:${state.world}`;
  const panel = document.querySelector("#transition");
  if (!intro && !waiting) {
    panel.innerHTML = "";
    loadingKey = "";
    return;
  }
  if (view === "player" && (!joined || dismissedKey === key)) {
    panel.innerHTML = "";
    return;
  }
  if (loadingKey !== key) {
    loadingKey = key;
    preparedKey = "";
    delete panel.dataset.preparing;
    keys.clear();
    const parkour = state.stage > 1 && !intro;
    panel.innerHTML = `<section class="loading-card" aria-labelledby="loading-title"><span>${intro ? "Lobby" : `Round ${state.stage} · ${state.practice ? "Practice" : "Scored"}`}</span><h2 id="loading-title">${intro ? "Before you join" : STAGES[state.stage - 1].name}</h2><ol class="loading-steps"><li tabindex="0"><b>1</b><div><h3>${intro ? "Move and look" : "Choose a reward"}</h3><p>${intro ? "WASD moves. Arrows look. Space jumps." : "Every vault has a pool. More bears inside means a smaller share."}</p></div></li><li tabindex="0"><b>2</b><div><h3>${intro ? "Try the practice hall" : parkour ? "Time your route" : "Step into a chamber"}</h3><p>${intro ? "Follow the tunnel to practice jumps and hazards. E opens emotes; 1–3 selects one." : parkour ? STAGES[state.stage - 1].description + (state.stage >= 3 ? " Purple pads launch you toward Sky." : " Round 2 assists small adjacent steps.") : "The lit floor and HUD confirm you are inside. Leave the doorway to change your choice."}</p></div></li><li tabindex="0"><b>3</b><div><h3>${intro ? "Wait for the host" : "Stay inside at the deadline"}</h3><p>${intro ? "Use lobby chat to greet others. The host loads each activity, then starts its countdown." : "The server divides each occupied pool equally. Outside all vaults earns zero."}</p></div></li></ol><div class="loading-progress" role="status">Preparing the scene…</div>${view === "player" ? '<div class="loading-actions"><button id="load-continue" disabled>Continue</button></div>' : "<p>The host starts the countdown after players continue.</p>"}</section>`;
    for (const button of panel.querySelectorAll("button"))
      button.onclick = () => {
        if (preparedKey !== key) return;
        send({ type: "loadReady", round: state.round });
        dismissedKey = key;
        panel.innerHTML = "";
      };
  }
  if (
    view === "player" &&
    joined &&
    preparedKey !== key &&
    !panel.dataset.preparing
  ) {
    panel.dataset.preparing = key;
    const round = state.round;
    gameScene
      .ready()
      .then(() => {
        delete panel.dataset.preparing;
        if (loadingKey !== key) return;
        preparedKey = key;
        send({ type: "sceneLoaded", round });
        panel.querySelector(".loading-progress").textContent =
          "Continue when you’re ready.";
        panel.querySelectorAll("button").forEach((b) => (b.disabled = false));
      })
      .catch(() => {
        delete panel.dataset.preparing;
        if (loadingKey === key)
          panel.querySelector(".loading-progress").textContent =
            "The scene could not finish preparing. Refresh to retry.";
      });
  }
}
function renderUI() {
  social();
  document.body.dataset.world = state.world;
  document.body.dataset.phase = state.phase;
  loadingUI();
  document.querySelector("#look-guide").hidden = state.world === "arena1";
  document.querySelector("#vaults").hidden = state.world === "lobby";
  document
    .querySelector("#vaults")
    .style.setProperty("--vault-count", state.vaults.length);
  const phaseNames = {
    lobby: "Lobby",
    loading: "Waiting for players",
    instructions: "Read the rules",
    ready: "Confirm you’re ready",
    countdown: "Round starting",
    active: "Choose a vault",
    practice: "Practice round",
    results: state.practice
      ? "Practice complete"
      : state.stage === 5
        ? "Crowd Rush complete"
        : "Round complete",
  };
  document.querySelector("#phase").textContent =
    state.world === "lobby"
      ? ""
      : `Crowd Rush | Round ${state.stage}`;
  document.querySelector("#headline").textContent = phaseNames[state.phase];
  document.querySelector("#timer").textContent = [
    "countdown",
    "active",
    "practice",
  ].includes(state.phase)
    ? Math.ceil(state.remaining) + "s"
    : "";
  document.querySelector("#vaults").innerHTML = state.vaults
    .map((v) => {
      const n = state.occupancy[v.id];
      return `<div class="vaultcard ${lastZone === v.id ? "selected" : ""}" style="--vault:${v.color}"><div class="vault-name"><i class="vault-symbol ${v.id}" aria-hidden="true"></i><span>${v.name}</span>${lastZone === v.id ? '<b class="your-vault">You’re here</b>' : ""}</div><div class="vault-pool"><strong>${v.reward}</strong><span>reward pool</span></div><div class="vault-detail"><span>${n} ${n === 1 ? "bear" : "bears"}</span><b>${n ? (v.reward / n).toFixed(1) : v.reward}<em> each</em></b></div></div>`;
    })
    .join("");
  document.querySelector("#leaderboard").innerHTML = [...state.players]
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 40)
    .map(
      (p, i) =>
        `<div class="score ${p.id === id ? "me" : ""}"><span class="rank">${i + 1}</span><span class="player-name">${escape(p.name)}${p.id === id ? " <em>you</em>" : ""}${p.connected ? "" : " <em>away</em>"}</span><b>${p.earnings.toFixed(1)}</b></div>`,
    )
    .join("");
  document.querySelector("#ready").style.display =
    view === "player" && state.phase === "ready" ? "" : "none";
  if (authed) {
    updateHostActions();
    document.querySelector("#roster").textContent =
      `${state.players.filter((p) => p.connected).length} connected · ${state.players.filter((p) => p.connected && p.ready).length} ready\n` +
      state.players
        .filter((p) => p.connected)
        .map(
          (p) =>
            `${p.name}: ${state.phase === "loading" ? (!p.eligible ? "next round" : p.loaded ? "loaded · continued" : p.sceneLoaded ? "scene ready · reading" : "loading scene") : p.ready ? "ready" : "waiting"}`,
        )
        .join(" · ");
  }
  const me = state.players.find((p) => p.id === id);
  document.querySelector("#ready").textContent = me?.ready
    ? "✓ Ready"
    : "I'm ready";
  if (state.phase === "results" && (joined || view === "projector")) {
    if (overlay.dataset.round !== String(state.round)) {
      overlay.dataset.round = state.round;
      overlay.innerHTML = `<div class="modal results"><div class="sheet-heading"><span>${state.practice ? "Practice / No earnings added" : "Round " + state.stage + " of 5 / Scored attempt " + state.scoredRound}</span><h2>Round results</h2></div><div class="sheet-body"><div class="result-column-head"><span>Bear / Vault split</span><span>Earned</span></div><div class="resultrows">${[
        ...state.results,
      ]
        .sort((a, b) => b.payout - a.payout)
        .map(
          (r) =>
            `<div class="${r.id === id ? "own-result" : ""}"><b>${escape(r.name)}${r.id === id ? " (you)" : ""}</b><span>${r.vault ? `${r.vault} · ${r.reward} ÷ ${r.occupants}` : r.disconnected ? "Disconnected" : "Outside vaults"}</span><strong>+${r.payout.toFixed(2)}</strong></div>`,
        )
        .join(
          "",
        )}</div><button id="dismiss">Back to the arena</button></div></div>`;
      document.querySelector("#dismiss").onclick = () =>
        (overlay.innerHTML = "");
    }
  } else if (overlay.dataset.round) {
    overlay.innerHTML = "";
    delete overlay.dataset.round;
  }
}
document.querySelector("#help").onclick = instructions;
document.querySelector("#ready").onclick = () =>
  send({ type: "ready", ready: true });
function input() {
  if (document.querySelector("#load-continue"))
    return { x: 0, z: 0, jump: false };
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName))
    return { x: 0, z: 0, jump: false };
  return gameScene.movement({
    x: Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
    z: Number(keys.has("KeyS")) - Number(keys.has("KeyW")),
    jump: keys.has("Space"),
  });
}
addEventListener("keydown", (e) => {
  const typing =
    ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) ||
    document.activeElement.isContentEditable;
  if (!typing && !document.querySelector("#emote-menu").hidden) {
    if (/^(Digit|Numpad)[1-3]$/.test(e.code)) {
      e.preventDefault();
      document
        .querySelectorAll("[data-emote]")
        [Number(e.code.slice(-1)) - 1].click();
      return;
    }
    if (e.code === "Escape") {
      document.querySelector("#emote-menu").hidden = true;
      return;
    }
  }

  if (
    e.code === "KeyE" &&
    !e.repeat &&
    !document.querySelector("#load-continue") &&
    !(
      ["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement.tagName,
      ) || document.activeElement.isContentEditable
    ) &&
    state?.world === "lobby" &&
    joined &&
    !overlay.innerHTML
  ) {
    e.preventDefault();
    document.querySelector("#emote-menu").hidden =
      !document.querySelector("#emote-menu").hidden;
  }
  if (typing || overlay.innerHTML) return;
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "Space",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.code)
  ) {
    e.preventDefault();
    keys.add(e.code);
    if (e.code === "Space" && !e.repeat && joined)
      send({ type: "input", ...input() });
  }
});
addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Space" && joined) send({ type: "input", ...input() });
});
addEventListener("blur", () => {
  keys.clear();
  send({ type: "input", x: 0, z: 0, jump: false });
});
let low = localStorage.getItem("bear-low") === "true";
gameScene.setQuality(low);
function qualityText() {
  document.querySelector("#quality").textContent = low
    ? "High graphics"
    : "Low graphics";
}
qualityText();
document.querySelector("#quality").onclick = () => {
  low = !low;
  gameScene.setQuality(low);
  localStorage.setItem("bear-low", low);
  qualityText();
};
document.querySelector("#sound").onclick = async () => {
  const enabled = await audio.toggle();
  document.querySelector("#sound").textContent = enabled
    ? "Sound on"
    : "Sound off";
};
setInterval(() => {
  if (joined && view === "player") send({ type: "input", ...input() });
}, 50);
function updateHostActions() {
  const phase = state.phase;
  const available = {
    instructions: phase === "lobby",
    practice: ["instructions", "lobby", "results", "ready"].includes(phase),
    ready: ["results", "instructions", "lobby"].includes(phase),
    start: phase === "ready",
    countdown:
      phase === "loading" &&
      !state.paused &&
      state.players
        .filter((p) => p.connected && p.eligible)
        .every((p) => p.loaded),
    pause:
      ["loading", "active", "practice", "countdown"].includes(phase) &&
      !state.paused,
    resume: state.paused,
    results: ["active", "practice", "countdown"].includes(phase),
    lobby: phase !== "lobby",
    next: phase === "results" && !state.practice && state.stage < 5,
  };
  document
    .querySelectorAll("[data-action]")
    .forEach((b) => (b.disabled = !available[b.dataset.action]));
  document.querySelector("#configure").disabled = ![
    "lobby",
    "ready",
    "instructions",
    "results",
  ].includes(phase);
}
function phaseFeedback(old) {
  if (old?.phase !== state.phase) {
    document.querySelector("#round-cue").textContent = [
      "active",
      "practice",
    ].includes(state.phase)
      ? "Go!"
      : state.phase === "results"
        ? "Vaults locked"
        : "";
    if (["active", "practice"].includes(state.phase)) audio.cue("go");
    if (state.phase === "results") audio.cue("results");
    if (state.phase !== "countdown") lastTick = null;
  }
  if (state.phase !== "countdown")
    document.querySelector("#round-cue").style.color = "";
  const me = state.players.find((p) => p.id === id);
  const vault = me && state.vaults.find((v) => v.id === me.zone);
  const playing = ["active", "practice"].includes(state.phase);
  const zone = playing && me?.eligible ? vault?.id || null : null;
  if (zone && zone !== lastZone) audio.cue("vault");
  lastZone = zone;
  const personal = document.querySelector("#personal");
  personal.style.display = view === "player" && joined ? "" : "none";
  personal.classList.toggle("in-vault", !!zone);
  personal.textContent = playing
    ? me?.eligible
      ? zone
        ? `Inside ${vault.name} · ${(vault.reward / (state.occupancy[zone] || 1)).toFixed(1)} if time ended now`
        : isParkour(state.world)
          ? "Enter a vault chamber before time ends"
          : "Step through a chamber’s lit entrance"
      : "Watching this round · you’ll join the next one"
    : "You are " + (me?.name || "a bear");
}
function frame(t) {
  const dt = Math.min((t - last) / 1000, 0.05);
  last = t;
  if (state) {
    const remaining = Math.max(
      0,
      state.remaining -
        (state.paused ? 0 : (performance.now() - receivedAt) / 1000),
    );
    const timed = ["countdown", "active", "practice"].includes(state.phase);
    document.querySelector("#timer").textContent = timed
      ? Math.ceil(remaining) + "s"
      : "";
    document
      .querySelector("#timer")
      .classList.toggle(
        "urgent",
        state.phase !== "countdown" && timed && remaining <= 10,
      );
    if (state.phase === "countdown") {
      const tick = Math.ceil(remaining);
      document.querySelector("#round-cue").style.color =
        { 3: "#f07469", 2: "#ffd36a", 1: "#83dfb0" }[tick] || "#f5f7ef";
      document.querySelector("#round-cue").textContent =
        tick > 0 ? tick : "Go!";
      if (tick !== lastTick && !state.paused) {
        const cue = document.querySelector("#round-cue");
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          cue.style.animation = "none";
          void cue.offsetWidth;
          cue.style.animation = "count-in .24s ease-out";
        }
        audio.cue("tick");
        lastTick = tick;
      }
    } else if (
      ["active", "practice"].includes(state.phase) &&
      performance.now() - receivedAt > 0 &&
      state.remaining < (state.practice ? 20 : state.duration) - 1.5
    )
      document.querySelector("#round-cue").textContent = "";
  }
  document.body.classList.toggle(
    "lobby-settled",
    state?.phase === "lobby" && performance.now() - lobbyEnteredAt > 3500,
  );
  if (
    !overlay.innerHTML &&
    !["INPUT", "SELECT"].includes(document.activeElement.tagName)
  )
    gameScene.look(dt, keys);
  gameScene.frame(dt, t / 1000, joined ? input() : { x: 0, z: 0, jump: false });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (view !== "player") {
  document.querySelector("footer").style.display = "none";
  document.querySelector("#board").classList.add("spectator");
}
hostUI();
connect();
