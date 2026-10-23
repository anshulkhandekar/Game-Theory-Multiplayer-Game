export const POKER = {
  hands: 2,
  rounds: 5,
  turnSeconds: 12,
  revealSeconds: 4,
  countdownSeconds: 5,
};
export const RANKS = ["J", "Q", "K"];
export const inPokerRoom = (p) =>
  !!p && p.x >= -30 && p.x <= -14 && p.z >= 29 && p.z <= 53;
export function legalActions(history) {
  if (history === "" || history === "check") return ["check", "bet"];
  if (history === "bet" || history === "check,bet") return ["call", "fold"];
  return [];
}
export function handResult(cards, actions) {
  const h = actions.join(",");
  if (
    ![
      "check,check",
      "bet,call",
      "bet,fold",
      "check,bet,call",
      "check,bet,fold",
    ].includes(h)
  )
    return null;
  if (
    cards.length !== 2 ||
    !cards.every((c) => RANKS.includes(c)) ||
    cards[0] === cards[1]
  )
    throw Error("Invalid deal");
  const fold = actions.at(-1) === "fold";
  const winner = fold
    ? actions.length === 2
      ? 0
      : 1
    : RANKS.indexOf(cards[0]) > RANKS.indexOf(cards[1])
      ? 0
      : 1;
  const amount = actions.at(-1) === "call" ? 2 : 1;
  return {
    winner,
    amount,
    net: winner === 0 ? [amount, -amount] : [-amount, amount],
    pot: actions.includes("bet") ? (fold ? 3 : 4) : 2,
    showdown: !fold,
  };
}
// Circle schedule: every pair meets once before repeats; first slot stays anchored.
export function pairings(ids, round) {
  if (ids.length < 2 || ids.length % 2) throw Error("Use an even roster");
  const ring = ids.slice();
  for (let i = 0; i < (round - 1) % (ids.length - 1); i++)
    ring.splice(1, 0, ring.pop());
  return Array.from({ length: ring.length / 2 }, (_, i) => [
    ring[i],
    ring[ring.length - 1 - i],
  ]);
}
export function tableLayout(count) {
  const columns = Math.min(5, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: ((i % columns) - (columns - 1) / 2) * 7,
    z: (Math.floor(i / columns) - (rows - 1) / 2) * 7,
  }));
}
export function botAction(card, history, random = Math.random) {
  const facingBet = legalActions(history).includes("call");
  const r = random();
  return facingBet
    ? card === "K" || (card === "Q" && r < 0.45)
      ? "call"
      : "fold"
    : card === "K"
      ? r < 0.7
        ? "bet"
        : "check"
      : card === "J" && r < 0.25
        ? "bet"
        : "check";
}

export function casinoSolids(tables = []) {
  return [
    ...tables.flatMap((t) => [
      { x: t.x, z: t.z, y: 0.75, w: 4.2, d: 3, h: 1.5 },
      ...[-1, 1].map((s) => ({
        x: t.x,
        z: t.z + s * 2.6,
        y: 0.8,
        w: 1.2,
        d: 0.25,
        h: 1.6,
      })),
    ]),
    ...[-15, 0, 15].map((z) => ({ x: 20, z, y: 1, w: 3.2, d: 4.6, h: 2 })),
    ...Array.from({ length: 8 }, (_, i) => ({
      x: -21,
      z: -17 + i * 4.5,
      y: 1.15,
      w: 1.8,
      d: 1.4,
      h: 2.3,
    })),
    { x: 0, z: -22, y: 1.15, w: 12.5, d: 2, h: 2.3 },
  ];
}
