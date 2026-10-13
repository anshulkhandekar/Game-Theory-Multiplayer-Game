import * as THREE from "three";
import { inBlottoRoom, blottoResult, BLOTTO_WALLS } from "../shared/blotto.js";
export function buildBlottoRoom(parent, label) {
  const root = new THREE.Group();
  parent.add(root);
  const mesh = (x, y, z, w, h, d, color) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    m.position.set(-x, y, z);
    root.add(m);
    return m;
  };
  // Tile around the existing hall/gym rather than layering coplanar floors.
  mesh(-15.6, -0.25, 26, 20.8, 0.5, 6, "#637c75");
  mesh(-13, -0.25, 29.5, 2, 0.5, 1, "#637c75");
  mesh(-22, -0.25, 41, 16, 0.5, 24, "#829b80");
  for (const wall of BLOTTO_WALLS)
    mesh(-wall.x, wall.y, wall.z, wall.w, wall.h, wall.d, "#465967");
  mesh(-22, 5.65, 41, 16, 0.3, 24, "#61737a");
  mesh(-13, 5.65, 26.5, 26, 0.3, 7, "#61737a");
  for (const x of [-29.7, -14.3]) {
    mesh(x, 1.1, 41, 0.12, 0.2, 23, "#bb9ddc");
    for (const z of [34, 42, 49]) mesh(x, 3.2, z, 0.12, 1.7, 3, "#9caec3");
  }
  for (const z of [34, 45]) {
    const lamp = new THREE.PointLight("#ffe2aa", 24, 18, 2);
    lamp.position.set(22, 4.5, z);
    root.add(lamp);
    mesh(-22, 5.25, z, 2, 0.15, 1, "#eee2bb");
  }
  mesh(-22, 5, 29, 8.2, 0.65, 0.4, "#79579c");
  mesh(-22, 0.7, 43, 7, 1.4, 3, "#756455");
  mesh(-22, 1.45, 43, 7.2, 0.15, 3.2, "#d5c29b");
  for (let i = 0; i < 3; i++) {
    mesh(-24 + i * 2, 1.55, 43, 1.6, 0.04, 2, "#627f79");
    const s = label("Front " + (i + 1), "#e6f1ce", 1.8);
    s.position.set(24 - i * 2, 1.9, 43);
    root.add(s);
  }
  const title = label("Game 2 · Battlefield practice", "#f9d986", 9);
  title.position.set(22, 4.2, 46);
  root.add(title);
  const sign = label("Game 2 · Blotto", "#f9d986", 5);
  sign.position.set(7, 3.7, 26.5);
  root.add(sign);
  const welcome = label("Press E · Your own bot match", "#dcecc4", 7);
  welcome.position.set(22, 3, 46);
  root.add(welcome);
  // A small panda bot waits across the table; everyone plays their own local match.
  const bot = new THREE.Group();
  bot.position.set(22, 0, 46);
  root.add(bot);
  const sphere = (x, y, z, r, color) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 12, 8),
      new THREE.MeshStandardMaterial({ color }),
    );
    m.position.set(x, y, z);
    bot.add(m);
  };
  sphere(0, 1.1, 0, 0.7, "#deded4");
  sphere(0, 2.1, 0, 0.65, "#f4f1df");
  for (const s of [-1, 1]) {
    sphere(s * 0.48, 2.55, 0, 0.24, "#293c46");
    sphere(s * 0.24, 2.15, -0.55, 0.18, "#293c46");
    sphere(s * 0.38, 0.35, 0, 0.27, "#293c46");
  }
  return root;
}
export function createBlottoPractice(audio) {
  const panel = document.createElement("section");
  panel.id = "blotto-practice";
  panel.hidden = true;
  document.querySelector("#app").append(panel);
  const prompt = document.createElement("button");
  prompt.id = "blotto-prompt";
  prompt.textContent = "Press E · Play Blotto with a bot";
  prompt.hidden = true;
  document.querySelector("#app").append(prompt);
  let near = false,
    open = false,
    selected = 1,
    cards = [null, null, null],
    bot = [],
    phase = "placing",
    revealAt = 0;
  function reset() {
    cards = [null, null, null];
    selected = 1;
    bot = [1, 2, 3];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bot[i], bot[j]] = [bot[j], bot[i]];
    }
    phase = "placing";
    render();
  }
  function render() {
    const result = phase === "results" ? blottoResult(cards, bot) : null;
    panel.innerHTML = `<button data-close class="blotto-close" aria-label="Close practice">×</button><h2>Colonel Blotto</h2><p>Place your 1, 2 and 3 cards across three fronts. The bot has the same cards. Win more fronts to win.</p><div class="blotto-cards">${[1, 2, 3].map((n) => `<button data-card="${n}" class="${selected === n ? "selected" : ""}" ${phase !== "placing" ? "disabled" : ""}>${n}<small>${cards.includes(n) ? "Placed" : "Strength"}</small></button>`).join("")}</div><div class="blotto-fronts">${cards.map((n, i) => `<button data-front="${i}" ${phase !== "placing" ? "disabled" : ""}><span>Front ${i + 1}</span><b>${n ?? "Place card"}</b><i class="${phase === "revealing" ? "card-reveal" : ""}">Bot: ${phase === "results" ? bot[i] : "?"}</i>${result ? `<small>${result.fronts[i] > 0 ? "Win" : result.fronts[i] < 0 ? "Loss" : "Tie"}</small>` : ""}</button>`).join("")}</div><p aria-live="polite">${result ? result.outcome + " · " + result.wins + " wins, " + result.losses + " losses" : phase === "revealing" ? "Revealing the bot’s cards…" : "Choose a card, then choose its front."}</p>${phase === "placing" ? `<button data-fight ${cards.includes(null) ? "disabled" : ""}>Reveal & fight</button>` : phase === "results" ? "<button data-again>Play again</button>" : ""}<p class="blotto-note">Practice only · No points or purchases</p>`;
  }
  function show() {
    if (!near || document.querySelector("#overlay")?.children.length)
      return false;
    open = true;
    panel.hidden = false;
    prompt.hidden = true;
    reset();
    audio.cue("softClick");
    return true;
  }
  prompt.onclick = show;
  panel.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-close")) {
      open = false;
      panel.hidden = true;
      return;
    }
    if (b.dataset.card) {
      selected = Number(b.dataset.card);
      render();
    }
    if (b.hasAttribute("data-front") && phase === "placing") {
      const index = Number(b.dataset.front);
      cards = cards.map((n) => (n === selected ? null : n));
      cards[index] = selected;
      selected = [1, 2, 3].find((n) => !cards.includes(n)) || selected;
      audio.cue("softClick");
      render();
    }
    if (b.hasAttribute("data-fight") && !cards.includes(null)) {
      phase = "revealing";
      revealAt = performance.now() + 1600;
      audio.cue("tick");
      render();
    }
    if (b.hasAttribute("data-again")) reset();
  };
  return {
    open: show,
    close() {
      open = false;
      panel.hidden = true;
    },
    update(state, id) {
      near =
        state?.world === "lobby" &&
        !state.battlefield &&
        inBlottoRoom(state.players.find((p) => p.id === id));
      if (!near) {
        open = false;
        panel.hidden = true;
      }
      prompt.hidden = !near || open;
    },
    frame() {
      if (open && phase === "revealing" && performance.now() >= revealAt) {
        phase = "results";
        audio.cue("results");
        render();
      }
    },
  };
}
