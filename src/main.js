import { nearSkinLocker } from "./lobby-wayfinding.js";
import { scrollBroadcastLists, createBroadcastUI } from "./broadcast-ui.js";
import { createPokerUI, createPokerPractice } from './poker-ui.js';
import { createBlottoPractice } from "./blotto-practice.js";
import { teamPlan } from "../shared/battlefield.js";
import { createBattlefieldUI } from "./battlefield-ui.js";
import { canEmote } from "../shared/emotes.js";
import {
  WARDROBE,
  normalizeAppearance,
  randomAppearance,
} from "../shared/wardrobe.js";
import { createScene } from "./scene.js";
import { appropriateText } from "../server/moderation.js";
import { createAudio } from "./audio.js";
import "./style.css";
import { STAGES, isParkour } from "../shared/world.js";
const pageId = crypto.randomUUID();
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
<aside id="social" hidden><div class="social-heading"><span id="social-title">Lobby chat</span><button id="social-toggle" aria-expanded="true">Hide</button></div><div id="social-body"><div id="messages" tabindex="0" aria-label="Recent messages"></div><form id="chat-form"><input id="chat-text" aria-label="Lobby message" maxlength="160" placeholder="Say hello…" autocomplete="off"><button>Send</button></form></div></aside><div id="emote-menu" role="dialog" aria-label="Emote wheel" hidden><span>Choose an emote</span><button data-emote="wave"><kbd>1</kbd> Wave</button><button data-emote="scuba"><kbd>2</kbd> Scuba</button><button data-emote="dance"><kbd>3</kbd> Dance</button><button data-emote="griddy"><kbd>4</kbd> Griddy</button><small>E or Escape to close</small></div><div id="personal" aria-live="polite"></div><div id="vaults" aria-label="Vault rewards and occupancy"></div>
<aside id="board"><h3>Standings</h3><p class="board-note">Crowd Rush earnings</p><div id="leaderboard"></div></aside>
<footer><span class="key-guide"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move <span id="look-guide"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Look</span> <kbd class="space-key">Space</kbd> Jump</span><div class="footer-actions"><button id="emotes">Emotes · E</button><button id="ready">I'm ready</button></div></footer>
<details id="settings" class="settings-menu"><summary><span aria-hidden="true">☰</span> Menu</summary><div class="settings-panel"><button type="button" id="sound">Mute audio</button><button type="button" id="remote-sound">Mute other players’ emotes</button><button type="button" id="quality">Low graphics</button><button type="button" id="motion">Reduce motion</button><button type="button" id="workshop-info" hidden>Workshop info · 3 games</button><button type="button" id="help">Rules</button><details><summary>Controls</summary><p>WASD moves · Arrows look · Space jumps<br>E opens emotes · 1–4 selects one<br>Move or jump to stop an emote.</p></details></div></details><div id="transition" aria-live="polite"></div><div id="overlay"></div><div id="host"></div><div id="toast" role="status"></div>`;
document.body.dataset.view = view;
const gameScene = createScene(document.querySelector("#scene"));
const audio = createAudio({projector:view === "projector"});
let lastHoverAt = 0;
document.addEventListener(
  "pointerdown",
  () => {
    audio.unlock().catch(() => {});
  },
  { passive: true },
);
document.addEventListener("keydown", () => {
  audio.unlock().catch(() => {});
});
document.addEventListener("click", (e) => {
  const control = e.target.closest("button, summary, select, a");
  if (!control || control.disabled) return;
  if (["play", "load-continue"].includes(control.id)) audio.cue("click");
  else if (control.closest("#settings") || control.id === "emotes")
    audio.cue("softClick");
});
document.addEventListener("pointerover", (e) => {
  const control = e.target.closest("#play, #load-continue");
  if (
    control &&
    !control.disabled &&
    !control.contains(e.relatedTarget) &&
    performance.now() - lastHoverAt > 700
  ) {
    lastHoverAt = performance.now();
    audio.cue("hover");
  }
});
let loadingKey = "",
  preparedKey = "",
  dismissedKey = "";
let lobbyEnteredAt = performance.now(),
  lastSocialKey = "",
  lastSocialWorld = "";
let receivedAt = performance.now(),
  lastZone = null,
  lastTick = null,
  lastUrgencyTick = null;
const overlay = document.querySelector("#overlay");
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const blottoPractice = createBlottoPractice(audio);
const pokerPractice = createPokerPractice(audio);
const pokerUI = createPokerUI({send,escape,view,toast,scene:gameScene});
const battlefieldUI = createBattlefieldUI({
  send,
  escape,
  view,
  scene: gameScene,
  toast,
});
gameScene.onTerminal((front) => battlefieldUI.openTerminal(front));
const controlling = () =>
  joined || (view === "host" && authed && !!(state?.battlefield?.demo || state?.poker?.demo));
function instructions() {
  if (state?.poker) {pokerUI.rules();return;}
  if (state?.battlefield) {
    toast(
      "Your goal is to win territory across three fronts. Buy units at your barracks with E and compare armies with binoculars (1). The stronger army wins each front. Final changes are private, and purchases freeze at the countdown.",
    );
    return;
  }
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
  document.querySelector("#social").hidden = view === "player" && !joined;
  document.querySelector("#social-title").textContent = lobby
    ? "Lobby chat"
    : "Round events";
  document.querySelector("#chat-form").hidden = !lobby || view !== "player";
  document.querySelector("#emotes").hidden =
    view !== "player" ||
    !canEmote(
      state,
      state.players.find((p) => p.id === id),
    );
  if (
    !canEmote(
      state,
      state.players.find((p) => p.id === id),
    )
  )
    document.querySelector("#emote-menu").hidden = true;
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
let lockerPreview;
let sponsorTimer;
const workshopSplashes = [
  "All in!",
  "Poker face!",
  "Call my bluff!",
  "Play your cards right!",
  "Know when to fold!",
  "Raise the stakes!",
  "Fortune favors the bold!",
  "Tit for tat!",
  "Trust, but verify!",
  "The house always wins!",
  "Never tell me the odds!",
  "Prisoner’s dilemma!",
  "Nash equilibrium!",
  "Cooperate or defect?",
  "Gig ’em, strategists!",
];
const workshopSplash =
  workshopSplashes[Math.floor(Math.random() * workshopSplashes.length)];
let hasEntered = false;
const entranceTheme = "purple";
document.body.dataset.theme="purple";
let lockerEditing=false;
function joinForm(editing = false) {
  lockerEditing=editing;
  document.body.dataset.locker=String(editing);
  lockerPreview?.dispose();
  clearInterval(sponsorTimer);
  document.body.dataset.entrance = "true";
  document.body.dataset.theme = entranceTheme;
  const saved = JSON.parse(localStorage.getItem("bear-profile") || "null");
  const appearance = saved
    ? normalizeAppearance(saved.appearance)
    : randomAppearance();
  const skins = ["panda", "brown", "polar", "black", "red"];
  const names = [
    "Panda",
    "Brown bear",
    "Polar bear",
    "Black bear",
    "Red panda",
  ];
  let selected = Math.max(0, skins.indexOf(appearance.bear));
  overlay.innerHTML = `<form id="join" class="entrance"><aside class="workshop-teaser" aria-label="Workshop challenge"><h3>Three games.<br> One total score.</h3><div class="teaser-games"><span>Crowd Rush</span><span>Battlefield</span><span>Poker Showdown</span></div><p class="teaser-prize">Finish with the highest cumulative score to win a prize.</p></aside><div class="entrance-title"><div class="club-banner-frame"><img src="/assets/club-entrance-banner.png" alt="Aggie Data Science Club"></div><h2>Game Theory</h2><span class="workshop-splash">${workshopSplash}</span></div><div class="entrance-account"><label for="username">Your username</label><input id="username" name="name" value="${escape(saved?.name || "")}" maxlength="24" pattern="[A-Za-z0-9]+" required placeholder="Enter your username" autocomplete="nickname"><span id="username-error" class="sr-only" role="status"></span></div><div class="locker-stage"><button type="button" id="previous-skin" aria-label="Previous skin">‹</button><canvas id="locker" aria-label="Character preview. Drag to rotate." tabindex="0"></canvas><button type="button" id="next-skin" aria-label="Next skin">›</button></div><div class="skin-caption"><strong id="skin-name"></strong></div><div class="locker-options">${[
    ["Accent", "color", "accent"],
    ["Hat", "hat", "hat"],
    ["Glasses", "glasses", "glasses"],
    ["Shirts", "shirt", "shirt"],
  ]
    .map(
      ([label, key, id]) =>
        `<label>${label}<select id="${id}">${WARDROBE[key].map(([value, name]) => `<option value="${value}">${name}</option>`).join("")}</select></label>`,
    )
    .join(
      "",
    )}</div><button type="button" id="random-outfit">🎲 Randomize outfit</button><button id="play">${saved ? "Rejoin lobby" : "Play"}</button><p id="entrance-room" role="status">Connecting to the room…</p><div class="entrance-sponsors"><span>Supported by</span><div class="sponsor-carousel" aria-label="Workshop sponsors"><div class="sponsor-deck">${["Southwest", "LPL Financial", "xAI", "Verizon"].map((name, i) => `<div class="sponsor-slide" data-sponsor="${i}" role="img" aria-label="${name}"><div class="sponsor-art" style="--sponsor-index:${i}"></div></div>`).join("")}</div></div></div><a class="datathon-invite" href="https://tamudatathon.com/#event-information" target="_blank" rel="noopener noreferrer" aria-label="Register for TAMU Datathon"><img src="/assets/tamu-datathon-mark.png" alt="TAMU Datathon"><span>Join TAMU Datathon</span><small>Explore the event & register</small></a><a class="discord-invite" href="https://discord.com/invite/wJF2T7Gb8" target="_blank" rel="noopener noreferrer"><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M19.7 5.3a18 18 0 0 0-4.4-1.4l-.6 1.2a16 16 0 0 0-5.4 0l-.6-1.2a18 18 0 0 0-4.4 1.4C1.5 9.5.8 13.6 1.2 17.6a18 18 0 0 0 5.4 2.7l1.1-1.8-1.7-.8.4-.3a13 13 0 0 0 11.2 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.4-2.7c.5-4.6-.8-8.7-3.1-12.3ZM8.5 14.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg><span>Join our Discord</span></a></form>`;
  if (editing) {
    document.querySelector(".entrance-title h2").textContent="Skin locker";
    document.querySelector(".workshop-splash").remove();
    document.querySelector(".club-banner-frame").remove();
    document.querySelector("#play").textContent = "Save outfit & return";
    document.querySelector(".entrance-account").hidden = true;
    document.querySelector("#username").required = false;
    const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Keep current outfit";cancel.onclick=closeLocker;document.querySelector("#play").after(cancel);
  }
  lockerPreview = gameScene.locker(
    document.querySelector("#locker"),
    appearance,
  );
  const change = () => {
    appearance.bear = skins[selected];
    document.querySelector("#skin-name").textContent = names[selected];
    lockerPreview.change(appearance);
  };
  change();
  document.querySelector("#previous-skin").onclick = () => {
    selected = (selected + 4) % 5;
    change();
  };
  document.querySelector("#next-skin").onclick = () => {
    selected = (selected + 1) % 5;
    change();
  };
  for (const [selector, key] of [
    ["#accent", "color"],
    ["#hat", "hat"],
    ["#glasses", "glasses"],
    ["#shirt", "shirt"],
  ]) {
    const select = document.querySelector(selector);
    select.value = appearance[key];
    select.onchange = () => {
      appearance[key] = select.value;
      change();
    };
  }
  document.querySelector("#random-outfit").onclick = () => {
    Object.assign(appearance, randomAppearance());
    selected = skins.indexOf(appearance.bear);
    for (const [selector, key] of [
      ["#accent", "color"],
      ["#hat", "hat"],
      ["#glasses", "glasses"],
      ["#shirt", "shirt"],
    ])
      document.querySelector(selector).value = appearance[key];
    change();
  };
  let sponsor = 0,
    paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slides = [...document.querySelectorAll(".sponsor-slide")];
  const positionSponsors = () =>
    slides.forEach((slide, i) => {
      const offset = (i - sponsor + 4) % 4;
      slide.dataset.position = ["front", "next", "back", "previous"][offset];
    });
  positionSponsors();
  sponsorTimer = setInterval(() => {
    if (
      paused ||
      document.body.classList.contains("reduce-motion") ||
      document.hidden ||
      document.querySelector(
        ".sponsor-carousel:hover, .sponsor-carousel:focus-within",
      )
    )
      return;
    sponsor = (sponsor + 1) % 4;
    positionSponsors();
  }, 3500);
  const username = document.querySelector("#username");
  const rejectName = (message) => {
    username.value = "";
    username.classList.remove("name-rejected");
    void username.offsetWidth;
    username.classList.add("name-rejected");
    username.setAttribute("aria-invalid", "true");
    document.querySelector("#username-error").textContent = message;
  };
  username.addEventListener("animationend", () =>
    username.classList.remove("name-rejected"),
  );
  username.oninput = () => {
    try {
      if (username.value && !/^[A-Za-z0-9]+$/.test(username.value))
        throw Error("Use letters and numbers.");
      appropriateText(username.value);
      username.classList.remove("name-rejected");
      username.removeAttribute("aria-invalid");
      document.querySelector("#username-error").textContent = "";
    } catch (error) {
      rejectName(error.message);
    }
  };
  username.oninvalid = () => rejectName("Enter a username.");
  document.querySelector("#join").onsubmit = (e) => {
    e.preventDefault();
    if (ws?.readyState !== 1) return toast("Wait for the room connection.");
    if (editing) {send({type:"customize",appearance});return;}
    const profile = { name: new FormData(e.target).get("name"), appearance };
    localStorage.setItem("bear-profile", JSON.stringify(profile));
    send({ type: "join", id: token, pageId, resume: false, ...profile });
  };
}
function closeLocker() {
  lockerEditing=false;document.body.dataset.locker="false";
  clearInterval(sponsorTimer);lockerPreview?.dispose();lockerPreview=null;overlay.innerHTML="";document.body.dataset.entrance="false";keys.clear();
}
const skinPrompt=document.createElement("button");skinPrompt.id="skin-locker-prompt";skinPrompt.textContent="Enter · Change your outfit";skinPrompt.hidden=true;app.append(skinPrompt);
const openLocker=()=>{if(joined && state?.phase==="lobby" && nearSkinLocker(state.players.find(p=>p.id===id)) && !overlay.innerHTML){keys.clear();joinForm(true);}};
skinPrompt.onclick=openLocker;
const broadcastUI=createBroadcastUI(view,gameScene,audio,send);
let inputSequence = 0,
  lastInputSent = performance.now();
function send(m) {
  if (["input","sceneLoaded","loadReady","ready","chat","emote"].includes(m.type) && !controlling()) return;
  if (m.type === "input" && (m.x || m.z || m.jump)) audio.emote(null);
  if (ws?.readyState === 1) {
    if (m.type === "input") {
      if (ws.bufferedAmount > 8192) return;
      const now = performance.now();
      m.seq = ++inputSequence;
      gameScene.predict(m.seq, m, Math.min(0.1, (now - lastInputSent) / 1000));
      lastInputSent = now;
    }
    ws.send(JSON.stringify(m));
  }
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
      if (hasEntered && token && profile)
        send({ type: "join", id: token, pageId, resume: true, ...profile });
      else joinForm();
    }
  };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "customized") {
      const profile=JSON.parse(localStorage.getItem("bear-profile")||"{}");profile.appearance=m.appearance;localStorage.setItem("bear-profile",JSON.stringify(profile));closeLocker();toast("Outfit saved");
    }
    if (m.type === "identity") {
      id = m.id;
      token = m.token;
      localStorage.setItem("bear-token", token);
      joined = true;
      hasEntered = true;
      clearInterval(sponsorTimer);
      lockerPreview?.dispose();
      lockerPreview = null;
      document.body.dataset.entrance = "false";
      overlay.innerHTML = "";
      if (state?.world === "lobby") lobbyEnteredAt = performance.now();
      if (state) gameScene.update(state, id);
    }
    if (m.type === "state") {
      const old = state;
      state = m.state;
      if(lockerEditing && state.phase!=="lobby") closeLocker();
      const demoPilot =
        view === "host" && authed && state.poker?.demo
          ? state.poker.demo.pilot
          : view === "host" && authed && state.battlefield?.demo
          ? state.battlefield.demo.pilot
          : null;
      if (view === "host" && id !== demoPilot) {
        id = demoPilot;
        gameScene.clearPrediction();
        keys.clear();
      }
      if (state.world === "lobby" && old?.world !== "lobby")
        lobbyEnteredAt = performance.now();
      receivedAt = performance.now();
      gameScene.update(state, id);
      const player = state.players.find((p) => p.id === id);
      const previousPlayer = old?.players.find((p) => p.id === id);
      if (
        joined &&
        player?.connected &&
        player.emoteActive &&
        canEmote(state, player) &&
        !state.paused
      )
        audio.emote(
          player.emoteName,
          `${player.id}:${player.emoteName}:${player.emoteAt}`,
          player.emoteAge,
        );
      else audio.emote(null);
      if (joined && previousPlayer && player) {
        if ((player.hazardCooldown || 0) > (previousPlayer.hazardCooldown || 0))
          audio.impact("punch", 0.12);
        if (
          (player.respawns || 0) > (previousPlayer.respawns || 0) &&
          player.lastRespawn === "spikes"
        )
          audio.impact("spike", 0.045);
      }
      if (joined && player && previousPlayer && state.world === old.world) {
        if (
          (player.respawns || 0) > (previousPlayer.respawns || 0) &&
          player.lastRespawn === "fall"
        )
          audio.impact("fall", 0.07);
        if ((player.padCooldown || 0) > (previousPlayer.padCooldown || 0))
          audio.cue("pad");
      }
      if (
        joined &&
        previousPlayer?.grounded &&
        player &&
        !player.grounded &&
        player.vy > 0 &&
        player.padCooldown === previousPlayer.padCooldown
      )
        audio.cue("jump");
      phaseFeedback(old);
      renderUI();
      if (state.battlefield && old?.world !== state.world)
        audio.cue("softClick");
      const roomNotice = document.querySelector("#entrance-room");
      if (roomNotice)
        roomNotice.textContent = state.battlefield
          ? `Battlefield · ${state.battlefield.phase === "matching" ? "Team matching" : "Activity in progress"}`
          : state.world === "lobby"
            ? `${state.players.filter((p) => p.connected).length} players in the lobby`
            : `Crowd Rush · Round ${state.stage} · ${["active", "practice", "countdown"].includes(state.phase) ? `${state.phase === "countdown" ? "Starting" : "In progress"} · ${Math.ceil(state.remaining)}s left${state.paused ? " · Paused" : ""}` : "Waiting for the host"}`;
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
    if (m.type === "battleAck") battlefieldUI.ack(m.receipt);
    if (m.type === "error") {
      battlefieldUI.error();
      if (view === "player" && !joined) joinForm();
      toast(m.message);
    }
  };
  ws.onclose = (e) => {
    audio.emote(null);
    gameScene.clearPrediction();
    joined = false;
    authed = false;
    keys.clear();
    hostUI();
    document.querySelector("#connection").textContent = "Reconnecting…";
    if (e.code === 4001 || e.code === 4002) {
      hasEntered = false;
      document.querySelector("#connection").textContent =
        "Disconnected by host";
      toast(
        e.code === 4002
          ? "Removed by host. Ask to be allowed back, then refresh."
          : "Disconnected by host. Refresh to rejoin the lobby.",
      );
      return;
    }
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
    ? `<div class="hostpanel"><h3>Control desk</h3><label>Game<select id="game-select"><option value="crowd">Crowd Rush</option><option value="battlefield">Battlefield</option><option value="poker">Kuhn Poker</option></select></label><button id="load-game">Load selected game</button><p id="game-entry-help">Crowd Rush uses the arena controls below.</p><div id="crowd-controls"><div class="actions">${["instructions", "practice", "ready", "start", "countdown", "forceCountdown", "pause", "resume", "leaderboard", "results", "next", "lobby", "battlefield"].map((a) => `<button data-action="${a}">${{ instructions: "Show rules", practice: "Load practice", ready: "Gather ready checks", start: "Load scored round", countdown: "Start countdown", forceCountdown: "Start without waiting", pause: "Pause", resume: "Resume", leaderboard: "Show leaderboard", results: "End round & show results", next: "Next round", lobby: "Return to lobby", battlefield: "Start Battlefield matching" }[a]}</button>`).join("")}</div><label>Arena<select id="stage">${STAGES.map((s) => `<option value="${s.id}">Round ${s.id}: ${s.name}</option>`).join("")}</select></label><label>Scored duration (seconds)<input id="duration" type="number" min="5" max="180" value="${state?.duration || 35}"></label><label>Rewards: bronze, gold, diamond, sky (rounds 3–5)<input id="rewards" value="${[...["bronze", "gold", "diamond", "sky"].map((key) => state?.rewardPools?.[key] ?? { bronze: 120, gold: 240, diamond: 360, sky: 480 }[key])].join(",")}"></label><button id="configure">Apply settings</button><p class="host-help">Start without waiting admits ready scenes; others wait in the lobby.</p></div><div id="roster"></div></div>`
    : `<form class="hostpanel" id="auth"><h3>Host sign in</h3><label>Server host key<input type="password" id="key" required></label><button>Authenticate</button></form>`;
  if (authed) {
    document
      .querySelector("#host .hostpanel")
      .insertAdjacentHTML(
        "beforeend",
        `<details class="demo-setup"><summary>Battlefield solo demo</summary><p>Simulated pandas, opponents and disposable scores. Participants include your controllable demo bear.</p><label>Participants<input id="demo-count" type="number" min="2" max="40" value="16"></label><label>Preferred team size<select id="demo-size"><option value="3">Automatic · prefer 3</option><option value="2">Prefer 2</option></select></label><p id="demo-plan"></p><button id="start-demo">Start solo demo</button></details>`,
      );
    document.querySelector('#host .hostpanel').insertAdjacentHTML('beforeend', `<details><summary>Kuhn Poker solo demo</summary><p>Two to forty simulated participants; odd counts add a bot seat. Demo scores are disposable.</p><label>Participants<input id="poker-demo-count" type="number" min="2" max="40" value="2"></label><button id="poker-demo-start">Start Poker demo</button></details><details><summary>Prize exclusions</summary><p>Excluded accounts sit out scored games. Odd Poker attendance always uses a rotating bot seat.</p><div id="officers" class="officer-controls"></div></details>`);
    document.querySelector('#poker-demo-start').onclick=()=>send({type:'host',action:'pokerDemo',data:{count:Number(document.querySelector('#poker-demo-count').value)}});
    document.querySelector('#officers').onchange=e=>send({type:'host',action:'officer',data:{id:e.target.dataset.officer,officer:e.target.checked}});
    document.querySelector('#game-select').onchange=e=>{
      const game=e.target.value; document.querySelector('#game-entry-help').textContent=game==='battlefield'?'Load starts 30-second team matching. Rounds unlock after teams form.':game==='poker'?'Load opens the casino tutorial. Ready players roam until you start.':'Crowd Rush uses the arena controls below.';
      document.querySelector('#crowd-controls').hidden=game!=='crowd';
    };
    document.querySelector('#load-game').onclick=()=>{
      const game=document.querySelector('#game-select').value;
      if(game==='crowd'){toast('Choose an arena, gather ready checks, then load the scored round.');return;}
      send({type:'host',action:game});
    };
    const previewDemo = () => {
      try {
        const plan = teamPlan(
          Number(document.querySelector("#demo-count").value),
          Number(document.querySelector("#demo-size").value),
        );
        document.querySelector("#demo-plan").textContent =
          `${plan.length} teams · ${plan.map((n) => n + " players").join(", ")}. Exact sizes may adjust for fair reciprocal fronts.`;
      } catch (e) {
        document.querySelector("#demo-plan").textContent = e.message;
      }
    };
    document.querySelector("#demo-count").oninput = previewDemo;
    document.querySelector("#demo-size").onchange = previewDemo;
    previewDemo();
    document.querySelector("#start-demo").onclick = () =>
      send({
        type: "host",
        action: "battlefieldDemo",
        data: {
          count: Number(document.querySelector("#demo-count").value),
          preferred: Number(document.querySelector("#demo-size").value),
        },
      });
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
  if (view !== "player") {
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
    panel.innerHTML = `<section class="loading-card" aria-labelledby="loading-title"><span>${intro ? "Lobby" : `Round ${state.stage} · ${state.practice ? "Practice" : "Scored"}`}</span><h2 id="loading-title">${intro ? "Before you join" : STAGES[state.stage - 1].name}</h2><ol class="loading-steps"><li tabindex="0"><b>1</b><div><h3>${intro ? "Move and look" : "Choose a reward"}</h3><p>${intro ? "WASD moves. Arrows look. Space jumps." : "Every vault has a pool. More bears inside means a smaller share."}</p></div></li><li tabindex="0"><b>2</b><div><h3>${intro ? "Try the practice hall" : parkour ? "Time your route" : "Step into a chamber"}</h3><p>${intro ? "Follow the tunnel to practice jumps and hazards. E opens emotes; 1–4 selects one." : parkour ? STAGES[state.stage - 1].description + (state.stage >= 3 ? " Purple pads launch you toward Sky." : " Round 2 assists small adjacent steps.") : "The lit floor and HUD confirm you are inside. Leave the doorway to change your choice."}</p></div></li><li tabindex="0"><b>3</b><div><h3>${intro ? "Wait for the host" : "Stay inside at the deadline"}</h3><p>${intro ? "Use lobby chat to greet others. The host loads each activity, then starts its countdown." : "The server divides each occupied pool equally. Outside all vaults earns zero."}</p></div></li></ol><div class="loading-progress" role="status">Preparing the scene…</div>${view === "player" ? '<div class="loading-actions"><button id="load-continue" disabled>Continue</button></div>' : "<p>The host starts the countdown after players continue.</p>"}</section>`;
    panel.dataset.step = "0";
    panel
      .querySelectorAll(".loading-steps li")
      .forEach((li, i) => (li.hidden = i !== 0));
    for (const button of panel.querySelectorAll("button"))
      button.onclick = () => {
        if (preparedKey !== key) return;
        if (!intro && Number(panel.dataset.step) < 2) {
          panel.dataset.step = String(Number(panel.dataset.step) + 1);
          panel
            .querySelectorAll(".loading-steps li")
            .forEach((li, i) => (li.hidden = i !== Number(panel.dataset.step)));
          button.textContent =
            Number(panel.dataset.step) === 2 ? "Enter staging area" : "Next";
          return;
        }
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
        if (intro) {
          send({ type: "loadReady", round });
          dismissedKey = key;
          panel.innerHTML = "";
          return;
        }
        panel.querySelector(".loading-progress").textContent =
          "Explore the vaults, then enter the staging area. The gate opens after the countdown.";
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
  blottoPractice.update(state, id);
  pokerPractice.update(state,id);
  pokerUI.update(state,id,authed,joined);
  if(state.poker && state.world === "casino") standingsUI();
  if (state.poker && state.world === "casino") {
    document.body.dataset.world=state.world;document.body.dataset.phase=state.phase;
    document.querySelector("#transition").innerHTML="";overlay.innerHTML="";tour.hidden=true;readyGuide.hidden=true;
    battlefieldUI.update({...state,battlefield:null},id,authed,joined);return;
  }
  if (state.battlefield && view === "player" && !joined) {
    battlefieldUI.update(state, id, authed, joined);
    return;
  }
  if (state.battlefield) {
    document.body.dataset.world = state.world;
    document.body.dataset.phase = state.phase;
    document.querySelector("#social").hidden = true;
    document.querySelector("#ready").style.display = "none";
    document.querySelector("#emotes").disabled = true;
    document.querySelector("#transition").innerHTML = "";
    overlay.innerHTML = "";
    tour.hidden = true;
    readyGuide.hidden = true;
    battlefieldUI.update(state, id, authed, joined);
    return;
  }
  battlefieldUI.update(state, id, authed, joined);
  document.querySelector("#board .board-note").textContent =
    state.world === "lobby" ? "Rank points · 100 per game" : "Crowd Rush earnings";
  document.querySelector("#board").style.display = "";
  social();
  document.body.dataset.world = state.world;
  document.body.dataset.phase = state.phase;
  loadingUI();
  lobbyTutorial();
  standingsUI();
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
    state.world === "lobby" ? "" : `Crowd Rush | Round ${state.stage}`;
  document.querySelector("#headline").textContent = state.activity
    ? ["active", "practice", "countdown"].includes(state.activity.phase)
      ? `Round ${state.activity.stage} ${state.activity.paused ? "paused" : "in progress"} · ${Math.ceil(state.activity.remaining)}s left · You’ll join the next round`
      : "Waiting in the lobby · You’ll join the next round"
    : phaseNames[state.phase];
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
    .filter((p) => !p.kicked && !p.officer && !p.demo)
    .sort((a, b) =>
      state.world === "lobby"
        ? (b.tournament?.total || 0) - (a.tournament?.total || 0)
        : b.earnings - a.earnings,
    )
    .slice(0, 40)
    .map(
      (p, i) =>
        `<div class="score ${p.id === id ? "me" : ""}"><span class="rank">${i + 1}</span><span class="player-name">${escape(p.name)}${p.id === id ? " <em>you</em>" : ""}${p.connected ? "" : " <em>away</em>"}${state.world==='lobby'?`<small class="score-breakdown">Vault earnings ${Number(p.earnings||0).toFixed(1)}<br>Crowd rank ${p.tournament?.crowd||0} · Field ${p.tournament?.battlefield||0} · Poker ${p.tournament?.poker||0}</small>`:''}</span><b>${(state.world==='lobby'?(p.tournament?.total||0):p.earnings).toFixed(1)}</b></div>`,
    )
    .join("");
  document.querySelector("#ready").style.display =
    view === "player" && state.phase === "ready" ? "" : "none";
  if (authed) {
    updateHostActions();
    const roster = document.querySelector("#roster");
    const html =
      `<p>${state.players.filter((p) => p.connected).length} connected · ${state.players.filter((p) => p.connected && p.ready).length} ready</p>` +
      state.players
        .map((p) => {
          const status = p.kicked
            ? "kicked"
            : !p.connected
              ? "disconnected"
              : p.waitingLobby
                ? "waiting lobby"
                : state.phase === "loading"
                  ? p.loaded
                    ? "continued"
                    : p.sceneLoaded
                      ? "scene ready · reading"
                      : "loading scene"
                  : p.ready
                    ? "ready"
                    : "not ready";
          return `<div class="roster-player"><b>${escape(p.name)}</b><span>${status}</span><div>${p.kicked ? `<button data-player-action="allowPlayer" data-id="${p.id}">Allow back</button>` : `<button data-player-action="playerLobby" data-id="${p.id}" ${!p.connected ? "disabled" : ""}>Lobby</button><button data-player-action="disconnectPlayer" data-id="${p.id}" ${!p.connected ? "disabled" : ""}>Disconnect</button><button data-player-action="kickPlayer" data-id="${p.id}">Kick</button>`}</div></div>`;
        })
        .join("");
    if (roster.innerHTML !== html) roster.innerHTML = html;
    roster.onclick = (e) => {
      const b = e.target.closest("[data-player-action]");
      if (b)
        send({
          type: "host",
          action: b.dataset.playerAction,
          data: { id: b.dataset.id },
        });
    };
  }
  const me = state.players.find((p) => p.id === id);
  document.querySelector("#ready").textContent = me?.ready
    ? "Confirmed ready"
    : "Confirm ready";
  document
    .querySelector("#ready")
    .classList.toggle("ready-confirmed", !!me?.ready);
  document
    .querySelector("#ready")
    .setAttribute("aria-pressed", String(!!me?.ready));
  if (state.phase === "ready")
    document.querySelector("#headline").textContent = me?.ready
      ? "Confirmed ready"
      : "Confirm you’re ready";
  document
    .querySelector("#headline")
    .classList.toggle(
      "confirmed-ready",
      state.phase === "ready" && !!me?.ready,
    );
  readyGuide.hidden =
    view !== "player" || !joined || state.phase !== "ready" || !!me?.ready;
  if (!readyGuide.hidden)
    pointArrow(readyGuide, document.querySelector("#ready"), null);
  if (state.phase === "results" && joined && view === "player") {
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
document.querySelector("#workshop-info").onclick = () => {
  if (!joined || !tourDone || lockerEditing || state?.world!=="lobby" || document.body.dataset.entrance==="true") return;
  keys.clear();
  document.querySelector("#settings").open = false;
  overlay.innerHTML = `<section class="modal workshop-info" role="dialog" aria-label="Workshop information"><div class="sheet-heading"><span>Aggie Data Science Club</span><h2>Three games. One workshop.</h2></div><div class="sheet-body"><p>You’ll play three games: Crowd Rush, Battlefield and Poker Showdown. The players with the highest total score after all three games win.</p><ol><li><b>Game 1 · Crowd Rush</b><p>Choose where to compete for rewards. Try the parkour hall straight ahead for movement practice.</p></li><li><b>Game 2 · Battlefield</b><p>Coordinate your resources across three fronts. Follow the hovering arrow through the left doorway for Colonel Blotto practice against your own bot.</p></li><li><b>Game 3 · Poker Showdown</b><p>Play one-card Kuhn Poker against a panda dealer. Take the right doorway when facing the parkour hall to find the small casino lounge.</p></li></ol><p>Lobby practice is optional and doesn’t change your workshop points. You can always check Total Points in the lobby standings.</p><button id="close-workshop-info">Back to the lobby</button></div></section>`;
  document.querySelector("#close-workshop-info").onclick = () =>
    (overlay.innerHTML = "");
};
document.querySelector("#ready").onclick = () => {
  audio.cue("ready");
  send({ type: "ready", ready: true });
};
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
  if (!typing && e.code === "Enter" && !e.repeat && !overlay.innerHTML && state?.phase === "lobby" && nearSkinLocker(state.players.find(p=>p.id===id))) {e.preventDefault();openLocker();return;}
  if (!typing && state?.world === "lobby" && !state.battlefield) {
    if (e.code === "KeyE" && !e.repeat && (blottoPractice.open() || pokerPractice.open())) {
      e.preventDefault();
      return;
    }
    if (e.code === "Escape") {blottoPractice.close();pokerPractice.close();}
  }
  if (!typing && state?.battlefield && controlling()) {
    if ((e.code === "Digit1" || e.code === "Numpad1") && !e.repeat) {
      e.preventDefault();
      battlefieldUI.toggleBinoculars();
      return;
    }
    if (e.code === "KeyE" && !e.repeat) {
      e.preventDefault();
      const terminal = gameScene.nearbyTerminal();
      if (terminal) battlefieldUI.openTerminal(terminal);
      else
        toast(
          "Walk to one of the three glowing screens under your barracks tent",
        );
      return;
    }
    if (e.code === "Escape") {
      battlefieldUI.putAwayBinoculars();
      battlefieldUI.closeTerminal();
      return;
    }
  }
  if (!typing && !document.querySelector("#emote-menu").hidden) {
    if (/^(Digit|Numpad)[1-4]$/.test(e.code)) {
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
    canEmote(
      state || {},
      state?.players.find((p) => p.id === id),
    ) &&
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
    if (e.code === "Space" && !e.repeat && controlling())
      send({ type: "input", ...input() });
  }
});
addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Space" && controlling()) send({ type: "input", ...input() });
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
document.querySelector("#sound").textContent = audio.enabled
  ? "Mute audio"
  : "Unmute audio";
let reducedMotion = localStorage.getItem("bear-motion") === "true";
function motionText() {
  document.body.classList.toggle("reduce-motion", reducedMotion);
  document.querySelector("#motion").textContent = reducedMotion
    ? "Enable motion"
    : "Reduce motion";
  gameScene.setMotion(reducedMotion);
}
motionText();
document.querySelector("#motion").onclick = () => {
  reducedMotion = !reducedMotion;
  localStorage.setItem("bear-motion", String(reducedMotion));
  motionText();
};
document.querySelector("#quality").onclick = () => {
  low = !low;
  gameScene.setQuality(low);
  localStorage.setItem("bear-low", low);
  qualityText();
};
document.querySelector("#sound").onclick = async () => {
  const enabled = await audio.toggle();
  document.querySelector("#sound").textContent = enabled
    ? "Mute audio"
    : "Unmute audio";
};
function remoteSoundText() {
  document.querySelector("#remote-sound").textContent = audio.remoteEnabled
    ? "Mute other players’ emotes"
    : "Unmute other players’ emotes";
}
remoteSoundText();
document.querySelector("#remote-sound").onclick = () => {
  audio.toggleRemote();
  remoteSoundText();
};
setInterval(() => {
  if (controlling() && (view === "player" || state?.battlefield?.demo || state?.poker?.demo))
    send({ type: "input", ...input() });
}, 50);
function updateHostActions() {
  const officers=document.querySelector('#officers');
  if(officers){const html=state.players.filter(p=>!p.demo).map(p=>`<label><input type="checkbox" data-officer="${p.id}" ${p.officer?'checked':''} ${state.phase!=='lobby'?'disabled':''}>${escape(p.name)}${p.connected?'':' (away)'}</label>`).join('');if(officers.dataset.renderKey!==html){officers.dataset.renderKey=html;officers.innerHTML=html;}}
  const load=document.querySelector('#load-game');if(load)load.disabled=!['lobby','results'].includes(state.phase);
  const demo=document.querySelector('#poker-demo-start');if(demo)demo.disabled=!['lobby','results'].includes(state.phase);
  const phase = state.phase;
  const available = {
    instructions: phase === "lobby",
    practice: ["instructions", "lobby", "results", "ready"].includes(phase),
    ready: ["results", "instructions", "lobby"].includes(phase),
    start: phase === "ready",
    forceCountdown: phase === "loading" && !state.paused,
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
    leaderboard: true,
    results: ["active", "practice", "countdown"].includes(phase),
    lobby: phase !== "lobby",
    battlefield: ["lobby", "results"].includes(phase),
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
    const activity = state.activity;
    if (activity) {
      const seconds = Math.ceil(
        Math.max(
          0,
          activity.remaining -
            (activity.paused ? 0 : (performance.now() - receivedAt) / 1000),
        ),
      );
      document.querySelector("#headline").textContent =
        activity.kind === "battlefield"
          ? "Watching Battlefield · You’ll join the next team matching"
          : ["active", "practice", "countdown"].includes(activity.phase)
            ? `Round ${activity.stage} ${activity.paused ? "paused" : "in progress"} · ${seconds}s left · You’ll join the next round`
            : "Waiting in the lobby · You’ll join the next round";
    }
    const remaining = Math.max(
      0,
      state.remaining -
        (state.paused ? 0 : (performance.now() - receivedAt) / 1000),
    );
    const timed = ["countdown", "active", "practice"].includes(state.phase);
    const urgency = Math.ceil(remaining);
    if (
      joined &&
      ["active", "practice"].includes(state.phase) &&
      !state.paused &&
      urgency > 0 &&
      urgency <= 10
    ) {
      const urgencyKey = `${state.round}:${urgency}`;
      if (lastUrgencyTick !== urgencyKey) {
        audio.cue("urgent");
        lastUrgencyTick = urgencyKey;
      }
    } else if (!timed) lastUrgencyTick = null;
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
  skinPrompt.hidden = !(joined && state?.phase==="lobby" && nearSkinLocker(state.players.find(p=>p.id===id)) && !overlay.innerHTML);
  document.querySelector("#workshop-info").hidden = !joined || !tourDone || lockerEditing || state?.world!=="lobby" || document.body.dataset.entrance==="true";
  broadcastUI.update(state,authed);
  if(view==="projector") scrollBroadcastLists(document.querySelector("#app"),t);
  blottoPractice.frame();
  pokerUI.clock((performance.now()-receivedAt)/1000);
  battlefieldUI.clock((performance.now() - receivedAt) / 1000);
  audio.remoteEmotes(
    joined && !document.querySelector("#load-continue") ? state : null,
    state?.players.find((p) => p.id === id),
    id,
    gameScene.listenerYaw(),
  );
  audio.battlefield(
    view === "projector" || controlling() || (view === "host" && authed)
      ? { ...state, audioReceivedAt: receivedAt }
      : null,
    state?.players.find((p) => p.id === id) || { x: 0, z: 0 },
    gameScene.listenerYaw(),
  );
  audio.environment(
    joined && !document.querySelector("#load-continue") ? state : null,
    state?.players.find((p) => p.id === id),
    gameScene.listenerYaw(),
  );
  audio.casino(state, state?.players.find(p=>p.id===id), view === "projector");
  gameScene.frame(
    dt,
    t / 1000,
    controlling() ? input() : { x: 0, z: 0, jump: false },
  );
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (view !== "player") {
  document.querySelector("footer").style.display = "none";
  document.querySelector("#board").classList.add("spectator");
}
hostUI();
connect();

const guideArrowMarkup =
  '<svg class="guide-arrow" aria-hidden="true" viewBox="0 0 56 32"><path d="M5 16H47M35 5L47 16L35 27" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const readyGuide = document.createElement("div");
readyGuide.id = "ready-guide";
readyGuide.hidden = true;
readyGuide.innerHTML = guideArrowMarkup;
document.body.append(readyGuide);
function pointArrow(element, target, card) {
  const t = target.getBoundingClientRect();
  let x = t.x + t.width / 2,
    y = t.y - 35,
    angle = 90;
  if (card) {
    const c = card.getBoundingClientRect();
    const startX = card.classList.contains("tour-menu")
      ? c.right
      : c.x + c.width / 2;
    const startY = c.bottom - 8;
    const menu = card.classList.contains("tour-menu");
    const endX = menu ? t.x - 10 : t.x + t.width / 2,
      endY = menu ? t.y + t.height / 2 : t.y - 10;
    const dx = endX - startX,
      dy = endY - startY,
      d = Math.hypot(dx, dy) || 1;
    x = endX - (dx / d) * 32;
    y = endY - (dy / d) * 32;
    angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  } else element = element.querySelector(".guide-arrow");
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  element.style.setProperty("--arrow-angle", `${angle}deg`);
}
// The tour observes gameplay inputs and confirmed server emotes; it never blocks movement.
const tour = document.createElement("aside");
tour.id = "lobby-tutorial";
tour.setAttribute("aria-live", "polite");
document.body.append(tour);
let tourStep = 0,
  tourGroups = new Set(),
  menuOpened = false,
  tourEmoteAt;
let tourDone = localStorage.getItem("bear-lobby-tutorial-v1") === "done";
function finishTourStep() {
  tourStep++;
  if (tourStep === 3) {
    tourDone = true;
    localStorage.setItem("bear-lobby-tutorial-v1", "done");
    toast("Tutorial completed");
    const notice = document.querySelector("#toast");
    notice.classList.remove("tutorial-completed");
    void notice.offsetWidth;
    notice.classList.add("tutorial-completed");
  }
  lobbyTutorial();
}
function lobbyTutorial() {
  document
    .querySelectorAll(".tutorial-target")
    .forEach((el) => el.classList.remove("tutorial-target"));
  const p = state?.players.find((p) => p.id === id);
  const active =
    view === "player" &&
    joined &&
    state?.world === "lobby" &&
    p?.loaded &&
    !tourDone &&
    !overlay.innerHTML &&
    !document.querySelector("#blotto-practice:not([hidden])") &&
    !document.querySelector("#poker-practice:not([hidden])") &&
    !document.querySelector("#load-continue");
  tour.hidden = !active;
  if (!active) return;
  const target = document.querySelector(
    [".key-guide", "#settings > summary", "#emotes"][tourStep],
  );
  target.classList.add("tutorial-target");
  if (tourStep === 1 && document.querySelector("#settings").open)
    menuOpened = true;
  tour.className = ["tour-left", "tour-menu", "tour-emote"][tourStep];
  if (tour.dataset.step !== String(tourStep)) {
    tour.dataset.step = String(tourStep);
    tour.innerHTML = `<span>Tutorial · ${tourStep + 1} / 3</span><h3>${["Move, look & jump", "Make yourself comfortable", "Say hello with an emote"][tourStep]}</h3><p>${["Three games make up the workshop, and the highest total score wins. First, try two controls: WASD to move, arrows to look, or Space to jump.", "Open Menu to check your settings, then close it. Crowd Rush practice is straight ahead. Take the left doorway for Battlefield practice or the right doorway for Poker practice.", "Open Emotes (E) and play any emote."][tourStep]}</p>${guideArrowMarkup}`;
  }
  pointArrow(tour.querySelector(".guide-arrow"), target, tour);
  if (tourStep === 2) {
    if (tourEmoteAt === undefined) tourEmoteAt = p.emoteAt ?? null;
    if (p.emoteActive && p.emoteAt !== tourEmoteAt) finishTourStep();
  }
}
addEventListener("keydown", (e) => {
  if (
    tour.hidden ||
    tourStep !== 0 ||
    e.repeat ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
  )
    return;
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) tourGroups.add("move");
  if (e.code.startsWith("Arrow")) tourGroups.add("look");
  if (e.code === "Space") tourGroups.add("jump");
  if (tourGroups.size >= 2) finishTourStep();
});
document.querySelector("#settings").addEventListener("toggle", () => {
  if (tour.hidden || tourStep !== 1) return;
  if (document.querySelector("#settings").open) menuOpened = true;
  else if (menuOpened) finishTourStep();
});
const standings = document.createElement("div");
standings.id = "standings-dialog";
document.body.append(standings);
let standingsSerial, standingsTimeout;
function standingsUI() {
  if (standingsSerial === undefined) {
    standingsSerial = state.leaderboardSerial;
    return;
  }
  if (standingsSerial === state.leaderboardSerial) return;
  standingsSerial = state.leaderboardSerial;
  if (view !== "player" || !joined) return;
  clearTimeout(standingsTimeout);
  standings.innerHTML = `<section class="modal results" role="dialog" aria-label="Workshop leaderboard"><div class="sheet-heading"><span>Workshop standings · closes in 5 seconds</span><h2>Leaderboard</h2></div><div class="sheet-body"><div class="resultrows">${state.players
    .filter((p) => !p.kicked && !p.officer && !p.demo)
    .sort(
      (a, b) =>
        (b.tournament?.total||0)-(a.tournament?.total||0),
    )
    .map(
      (p, i) =>
        `<div class="${p.id === id ? "own-result" : ""}"><b>${i + 1}. ${escape(p.name)}</b><strong>${(p.tournament?.total||0).toFixed(1)}</strong></div>`,
    )
    .join(
      "",
    )}</div><button id="close-standings">Close</button></div></section>`;
  document.querySelector("#close-standings").onclick = () => {
    standings.innerHTML = "";
    clearTimeout(standingsTimeout);
  };
  standingsTimeout = setTimeout(() => (standings.innerHTML = ""), 5000);
}
