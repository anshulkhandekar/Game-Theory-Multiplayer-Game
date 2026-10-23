import { pokerVocabulary } from "./poker-vocabulary.js";
const signed = (n) => `${n > 0 ? "+" : ""}${n}`;
const names = {
  check: "checked",
  bet: "bet 1 chip",
  call: "called your bet",
  fold: "folded",
};
export function tableStatus(t, id) {
  const seat = t.players.indexOf(id);
  if (t.status === "done") return "Both hands finished";
  if (t.result)
    return t.result.winner === seat
      ? "You won this hand"
      : "Your opponent won this hand";
  const last = t.actions.at(-1),
    actor = (t.first + t.actions.length - 1) % 2;
  if (last && actor !== seat) return `Your opponent ${names[last]}.`;
  return t.turn === id ? "Your turn" : "Waiting for your opponent";
}
export function renderPokerTable(t, b, id, opponent, card, escape, meanings) {
  const i = t.players.indexOf(id),
    result = t.result;
  const status = tableStatus(t, id);
  const explanation = result
    ? result.showdown
      ? `${result.winner === i ? "Your card" : "Their card"} was higher.`
      : `${t.actions.at(-1) === "fold" && t.players[(t.first + t.actions.length - 1) % 2] === id ? "You folded" : "Your opponent folded"}; the other card stays hidden.`
    : t.legal.includes("call")
      ? "Call to compare cards, or fold to give up this hand."
      : t.turn === id
        ? "Check to pass without paying, or bet one chip."
        : "Your buttons will appear when it is your turn.";
  return `<section class="poker-play poker-table-panel"><div class="poker-play-heading"><span>Hand ${t.hand} of ${b.hands} · vs ${escape(opponent?.name || "Opponent")}</span><span>Round balance <b>${signed(t.net[i])}</b></span></div><div class="poker-focus"><div class="your-card">${card(t.ownCard, "Your card")}<small>J &lt; Q &lt; K</small></div><div class="poker-next"><h2 aria-live="polite">${status}</h2>${result ? `<strong class="hand-payoff ${result.net[i] > 0 ? "gain" : "loss"}">${result.net[i] > 0 ? "You gained" : "You lost"} ${Math.abs(result.net[i])} chip${Math.abs(result.net[i]) === 1 ? "" : "s"}</strong>` : ""}<p>${t.status === "done" ? "Wait for the host to load the next round." : explanation}</p>${result?.showdown ? `<span class="opponent-reveal">Opponent’s card: <b>${t.cards[1 - i]}</b></span>` : ""}<div class="poker-decisions practice-choices">${t.legal.map((a) => `<button data-play="${a}" ${b.paused ? "disabled" : ""}><b>${a[0].toUpperCase() + a.slice(1)}</b><small>${{ check: "Pay nothing", bet: "Add 1 chip", call: "Add 1 chip", fold: "Lose 1 chip" }[a]}</small></button>`).join("")}</div><div class="poker-clock" data-clock></div></div></div><div class="poker-table-foot"><span>Pot: ${result?.pot || (t.actions.includes("bet") ? 3 : 2)} chips</span><span>${result ? (t.hand < b.hands ? "Next hand starts shortly" : "Round summary follows") : "Timer ends: check, or fold to a bet"}</span></div>${pokerVocabulary()}</section>`;
}
export function renderPokerResults(t, b, id, total) {
  const i = t.players.indexOf(id),
    net = t.net[i];
  return `<section class="poker-results poker-round-summary"><span>Round ${b.round} of 5 finished</span><h2>${net > 0 ? "You gained " + net + " chip" + (net === 1 ? "" : "s") : net < 0 ? "You lost " + Math.abs(net) + " chip" + (net === -1 ? "" : "s") : "You broke even"}</h2><p>Across both hands against this opponent</p><div class="hand-recap">${t.log.map((h) => `<div><span>Hand ${h.hand}</span><b>${signed(h.net[i])} chips</b><small>${h.actions.at(-1) === "fold" ? ((h.hand - 1 + h.actions.length - 1) % 2 === i ? "You folded" : "Opponent folded") : "Higher card wins"}${h.auto.length ? " · timer ended" : ""}</small></div>`).join("")}</div>${total === undefined ? "<p>Demo scores do not affect workshop standings.</p>" : `<p>Your Poker balance so far: <b>${signed(total)} chips</b></p>`}<small>${b.round === 5 ? "The host will return everyone to the lobby for the final standings." : "The host will load the next round with a new opponent."}</small></section>`;
}
