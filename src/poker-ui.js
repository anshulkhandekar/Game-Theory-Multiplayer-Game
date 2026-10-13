import {pokerAudience} from "./broadcast-audience.js";
import { renderPokerTable, renderPokerResults } from "./poker-table-ui.js";
import { pokerLesson, lessonTitles } from "./poker-lessons.js";
import {
  RANKS,
  legalActions,
  handResult,
  botAction,
  inPokerRoom,
} from "../shared/poker.js";
const meanings = {
  check: "Keep playing without adding a chip.",
  bet: "Put 1 more chip in the pot and let your opponent respond.",
  call: "Match their bet with 1 chip, then compare cards.",
  fold: "Let your opponent win this hand. You lose your ante.",
};
const card = (rank, caption = "") =>
  `<div class="poker-card ${rank ? "" : "card-back"}"><span>${rank || "?"}</span><b>${rank ? "♠" : "♢"}</b><small>${caption}</small></div>`;
export function createPokerUI({ send, escape, view, toast, scene }) {
  const root = document.createElement("div");
  root.id = "poker-ui";
  root.hidden = true;
  document.querySelector("#app").append(root);
  let state,
    id,
    authed,
    joined,
    page = 0,
    roundKey = "",
    renderKey = "",
    preview = false,
    overview = false,
    example = {};
  const host = (action, data = {}) =>
    send({ type: "host", action: "poker:" + action, data });
  const act = (action, data = {}) => send({ type: "poker", action, data });
  function render() {
    const openDetails = [...root.querySelectorAll("details[open]")].map(
      (d) => d.querySelector("summary")?.textContent,
    );
    const hostScroll = root.querySelector(".poker-host")?.scrollTop || 0;
    const b = state.poker,
      mine = b.tables.find((t) => t.players.includes(id)),
      p = state.players.find((p) => p.id === id);
    const ready = b.roster.filter(
        (i) =>
          state.players.find((p) => p.id === i)?.connected &&
          !state.players.find((p) => p.id === i)?.waitingLobby,
      ),
      done = ready.filter((i) => b.ready.includes(i)).length;
    const names = (t) =>
      t.players
        .map((i) =>
          escape(state.players.find((p) => p.id === i)?.name || "Panda"),
        )
        .join(" vs ");
    const management = `<details><summary>Player controls</summary>${state.players
      .filter((p) => !p.demo)
      .map(
        (p) =>
          `<p>${escape(p.name)}${p.connected ? "" : " · away"}${p.waitingLobby ? " · lobby" : ""}</p>${(p.kicked ? ["allowPlayer"] : ["playerLobby", "disconnectPlayer", "kickPlayer"]).map((a) => `<button data-manage="${a}" data-player="${p.id}">${{ playerLobby: "Send to lobby", disconnectPlayer: "Disconnect", kickPlayer: "Kick", allowPlayer: "Allow back" }[a]}</button>`).join("")}`,
      )
      .join("")}</details>`;
    root.dataset.host = String(authed && !preview);
    const controls =
      authed && !preview
        ? `<section class="poker-host"><h3>Kuhn Poker controls</h3><p>Round ${b.round}/5 · ${b.tables.length} ${b.tables.length === 1 ? "table" : "tables"}</p><p>${done}/${ready.length} connected players ready</p>${b.phase === "instructions" ? '<button data-host="start">Seat players & start countdown</button><button data-host="forceStart">Start without waiting</button>' : b.phase === "results" && b.round < 5 ? '<button data-host="next">Load next round & tutorial</button>' : ""}<button data-host="${b.paused ? "resume" : "pause"}">${b.paused ? "Resume" : "Pause"}</button><button data-lobby>Return to lobby</button><button data-standings>Show leaderboard</button>${b.demo ? `<label>Play as<select data-pilot>${b.roster.map((i) => `<option value="${i}" ${i === id ? "selected" : ""}>${escape(state.players.find((p) => p.id === i)?.name || i)}</option>`).join("")}</select></label><button data-overview>${overview ? "Close camera" : "Casino overview"}</button><button data-preview>Preview player screen</button>` : ""}<details><summary>Tables & results</summary>${b.tables.map((t) => `<p>${names(t)} · ${t.status} · ${t.net.join(" / ")} chips</p>`).join("")}</details>${management}</section>`
        : view === "projector"
          ? pokerAudience(state,escape)
          : "";
    const participant = joined || (authed && b.demo);
    let content = "";
    if (participant && mine) {
      if (b.phase === "instructions") {
        if (!b.ready.includes(id)) {
          const lesson = pokerLesson(page, example, card);
          content = `<section class="poker-lesson" role="dialog" aria-label="Poker tutorial"><header class="poker-lesson-heading"><div><span>Kuhn Poker · Round ${b.round} of 5</span><h2>${lesson.title}</h2></div><div class="lesson-emblem" aria-hidden="true">♠</div></header><ol class="poker-lesson-progress">${lessonTitles.map((title, i) => `<li class="${i === page ? "current" : i < page ? "completed" : ""}"><b>${i + 1}</b>${title}</li>`).join("")}</ol><div class="poker-lesson-content"><div class="poker-lesson-copy">${lesson.text}</div><div class="poker-teaching-art">${lesson.art}</div></div><aside class="poker-lesson-note">${lesson.note}</aside><div class="poker-lesson-actions">${page ? "<button data-back>Previous explanation</button>" : ""}<button data-continue>${lesson.button}</button></div></section>`;
        } else
          content =
            '<div class="poker-ready">You have finished the tutorial. Explore until the host starts the round.<br><small>WASD to move · Arrow keys to look</small></div>';
      } else if (b.phase === "countdown") {
        content = `<section class="poker-countdown"><span>Round ${b.round} starts in</span><strong data-countdown></strong><p>You are seated. Your card arrives after the countdown.</p></section>`;
      } else if (b.phase === "playing") {
        const ownIndex = mine.players.indexOf(id),
          opponent = state.players.find(
            (p) => p.id === mine.players[1 - ownIndex],
          );
        content = renderPokerTable(mine,b,id,opponent,card,escape,meanings);
      } else {
        const index = mine.players.indexOf(id);
        content = renderPokerResults(mine,b,id,p?.demo?undefined:p?.pokerScore||0);
      }
    }
    root.innerHTML =
      controls +
      content +
      (preview
        ? '<button class="poker-show-host" data-preview>Show demo controls</button>'
        : "");
    for (const d of root.querySelectorAll("details"))
      d.open = openDetails.includes(d.querySelector("summary")?.textContent);
    if (root.querySelector(".poker-host"))
      root.querySelector(".poker-host").scrollTop = hostScroll;
    root
      .querySelector("[data-standings]")
      ?.addEventListener("click", () =>
        send({ type: "host", action: "leaderboard" }),
      );
    root.querySelectorAll("[data-manage]").forEach(
      (el) =>
        (el.onclick = () =>
          send({
            type: "host",
            action: el.dataset.manage,
            data: { id: el.dataset.player },
          })),
    );
    root
      .querySelectorAll("[data-host]")
      .forEach((el) => (el.onclick = () => host(el.dataset.host)));
    root
      .querySelector("[data-lobby]")
      ?.addEventListener("click", () =>
        send({ type: "host", action: "lobby" }),
      );
    root
      .querySelector("[data-pilot]")
      ?.addEventListener("change", (e) =>
        host("pilot", { id: e.target.value }),
      );
    root.querySelector("[data-preview]")?.addEventListener("click", () => {
      preview = !preview;
      if (preview) {
        overview = false;
        scene.setPokerOverview(false);
      }
      document.body.classList.toggle("poker-preview", preview);
      render();
    });
    root.querySelector("[data-overview]")?.addEventListener("click", () => {
      overview = !overview;
      scene.setPokerOverview(overview);
      render();
    });
    root.querySelector("[data-back]")?.addEventListener("click", () => {
      page--;
      example = {};
      render();
    });
    root.querySelector("[data-continue]")?.addEventListener("click", () => {
      if (page < 2) {
        page++;
        example = {};
        render();
      } else act("ready");
    });
    root.querySelectorAll("[data-example]").forEach(
      (el) =>
        (el.onclick = () => {
          const action = el.dataset.example;
          if (page === 1) {
            if (action === "bet") example.path = "bet-call";
            if (action === "check" || action === "again")
              example.path = "check-bet-call";
            example.stage = {
              check: "response",
              bet: "win",
              call: "win",
              fold: "fold",
              again: "choose",
            }[action];
          } else example.called = action === "reveal";
          render();
        }),
    );
    root.querySelectorAll("[data-play]").forEach(
      (el) =>
        (el.onclick = () => {
          el.disabled = true;
          act(el.dataset.play, {
            session: state.round,
            round: b.round,
            hand: mine.hand,
            step: mine.actions.length,
          });
        }),
    );
  }
  return {
    update(s, actor, auth, hasJoined) {
      state = s;
      id = actor;
      authed = auth;
      joined = hasJoined;
      const active = !!s.poker && s.world === "casino";
      root.hidden = !active;
      document.body.classList.toggle("in-poker", active);
      if (!active) {
        roundKey = "";
        renderKey = "";
        preview = false;
        overview = false;
        scene.setPokerOverview(false);
        document.body.classList.remove("poker-preview");
        return;
      }
      const key = s.round + ":" + s.poker.round + ":" + actor;
      if (key !== roundKey) {
        roundKey = key;
        page = 0;
        example = {};
        renderKey = "";
      }
      const ownTable = s.poker.tables.find((t) => t.players.includes(actor));
      const { remaining, ...ownView } = ownTable || {};
      const next = JSON.stringify([
        auth || view === "projector" ? s.poker.serial : ownView,
        s.poker.ready,
        s.poker.phase,
        s.poker.paused,
        actor,
        s.players
          .filter(
            (p) =>
              auth || view === "projector" || s.poker.roster.includes(p.id),
          )
          .map((p) => [
            p.id,
            p.connected,
            p.waitingLobby,
            p.kicked,
            p.pokerScore,
          ]),
      ]);
      if (next !== renderKey) {
        renderKey = next;
        render();
      }
      document.querySelector("#phase").textContent =
        "Kuhn Poker · Round " + s.poker.round + "/5";
      document.querySelector("#headline").textContent = s.poker.paused
        ? "Poker paused"
        : s.poker.phase === "instructions"
          ? "Explore & learn"
          : s.poker.phase === "countdown"
            ? "Get ready"
          : s.poker.phase === "results"
            ? "Round complete"
            : "At the tables";
      document.querySelector("#timer").textContent = "";
      document.querySelector("#round-cue").textContent = "";
    },
    clock(elapsed) {
      if (!state?.poker || root.hidden) return;
      const t = state.poker.tables.find((t) => t.players.includes(id));
      const countdown = root.querySelector("[data-countdown]");
      if (countdown) countdown.textContent = state.poker.paused ? "Paused" : Math.ceil(Math.max(0,state.poker.countdown-elapsed));
      const clock = root.querySelector("[data-clock]");
      if (clock && t)
        clock.textContent = state.poker.paused
          ? "Paused"
          : t.status === "playing"
            ? Math.ceil(Math.max(0, t.remaining - elapsed)) +
              "s for this decision"
            : t.result ? "" : "";
    },
    rules() {
      toast(
        "King beats Queen, and Queen beats Jack. Both players pay one chip to begin. Check to pass without betting, or bet one chip. If your opponent bets, call by paying one chip or fold to give up the pot. You gain or lose one chip per hand, or two when a bet is called.",
      );
    },
  };
}
export function createPokerPractice(audio) {
  const root = document.createElement("section");
  root.id = "poker-practice";
  root.hidden = true;
  document.querySelector("#app").append(root);
  const prompt = document.createElement("button");
  prompt.id = "poker-prompt";
  prompt.textContent = "Press E · Practice Kuhn Poker";
  prompt.hidden = true;
  document.querySelector("#app").append(prompt);
  let near = false,
    open = false,
    cards,
    actions,
    first = 0,
    turn = 0,
    result = null,
    net = 0,
    hands = 0;
  function deal() {
    const deck = RANKS.slice();
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    cards = deck.slice(0, 2);
    actions = [];
    result = null;
    first = hands % 2;
    turn = first;
    hands++;
    audio.cue("card");
    bot();
    render();
  }
  function choose(a) {
    actions.push(a);
    const r = handResult([cards[first], cards[1 - first]], actions);
    if (r) {
      result = { ...r, winner: r.winner === 0 ? first : 1 - first };
      const gain = result.winner === 0 ? r.amount : -r.amount;
      net += gain;
      audio.cue("results");
    } else turn = 1 - turn;
  }
  function bot() {
    if (turn === 1 && !result) choose(botAction(cards[1], actions.join(",")));
  }
  function render() {
    root.innerHTML = `<button data-close class="blotto-close" aria-label="Close practice">×</button><h2>Kuhn Poker practice</h2><p>Try a hand against the panda dealer. You each receive one hidden card and pay a one-chip ante. King beats Queen, and Queen beats Jack.</p><div class="poker-hand">${card(cards[0], "Your card")}${card(result?.showdown ? cards[1] : null, "Panda dealer")}</div><p>${result ? (result.winner === 0 ? "You win" : "Dealer wins") + ". You " + (result.winner === 0 ? "gain " : "lose ") + result.amount + " chip" + (result.amount === 2 ? "s" : "") + " overall." : legalActions(actions.join(",")).includes("call") ? "The dealer bet 1. Match it to compare cards, or give up your ante." : "Check to pass, or bet 1 to ask the dealer to call or fold."}</p><div class="poker-history">${actions.join(" → ") || "Both ante 1. You act first."}</div><div class="poker-decisions">${
      result
        ? "<button data-again>Deal next hand</button>"
        : legalActions(actions.join(","))
            .map(
              (a) =>
                `<button data-act="${a}"><b>${a[0].toUpperCase() + a.slice(1)}</b><small>${meanings[a]}</small></button>`,
            )
            .join("")
    }</div><p>Your chip balance in this practice is ${net}. Take as long as you need; practice does not change workshop points.</p><small>A bet can be a strong card or a bluff. The dealer uses its own card and your actions; it cannot see yours.</small>`;
  }
  function show() {
    if (!near || document.querySelector("#overlay")?.children.length)
      return false;
    open = true;
    root.hidden = false;
    prompt.hidden = true;
    hands = 0;
    net = 0;
    deal();
    return true;
  }
  prompt.onclick = show;
  root.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-close")) {
      open = false;
      root.hidden = true;
    }
    if (b.hasAttribute("data-again")) deal();
    if (b.dataset.act && !result && turn === 0) {
      choose(b.dataset.act);
      bot();
      render();
    }
  };
  return {
    open: show,
    close() {
      open = false;
      root.hidden = true;
    },
    update(state, id) {
      near =
        state.world === "lobby" &&
        !state.battlefield &&
        !state.poker &&
        inPokerRoom(state.players.find((p) => p.id === id));
      if (!near) {
        open = false;
        root.hidden = true;
      }
      prompt.hidden = !near || open;
    },
    frame() {},
  };
}
