export const inBlottoRoom = (p) =>
  !!p && p.x >= 14 && p.x <= 30 && p.z >= 29 && p.z <= 53;
export function blottoResult(player, bot) {
  const valid = (a) =>
    Array.isArray(a) && a.length === 3 && [...a].sort().join(",") === "1,2,3";
  if (!valid(player) || !valid(bot)) throw Error("Place each card once");
  const fronts = player.map((n, i) => Math.sign(n - bot[i]));
  const wins = fronts.filter((n) => n > 0).length,
    losses = fronts.filter((n) => n < 0).length;
  return {
    fronts,
    wins,
    losses,
    outcome: wins > losses ? "You win" : wins < losses ? "Bot wins" : "Tie",
  };
}

// World-space walls match the lobby room and leave an eight-unit entrance.
export const BLOTTO_WALLS = [
  { x: 26, z: 26, y: 2.75, w: 0.35, d: 6, h: 5.5 },
  { x: 30, z: 41, y: 2.75, w: 0.35, d: 24, h: 5.5 },
  { x: 14, z: 41, y: 2.75, w: 0.35, d: 24, h: 5.5 },
  { x: 22, z: 53, y: 2.75, w: 16, d: 0.35, h: 5.5 },
  { x: 28, z: 29, y: 2.75, w: 4, d: 0.35, h: 5.5 },
  { x: 16, z: 29, y: 2.75, w: 4, d: 0.35, h: 5.5 },
  { x: 15.7, z: 23, y: 2.75, w: 20.6, d: 0.35, h: 5.5 },
  { x: 11.7, z: 30, y: 2.75, w: 12.6, d: 0.35, h: 5.5 },
];
