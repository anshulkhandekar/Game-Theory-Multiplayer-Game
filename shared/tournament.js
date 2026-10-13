const events = {
  crowd: "earnings",
  battlefield: "battlefieldScore",
  poker: "pokerScore",
};
// Equal 100-point ceilings. Competition ranks preserve ties; no points until participation.
export function tournamentScores(players) {
  const eligible = players.filter((p) => !p.officer && !p.demo && !p.kicked);
  const result = new Map(
    players.map((p) => [
      p.id,
      { crowd: 0, battlefield: 0, poker: 0, total: 0 },
    ]),
  );
  for (const [event, field] of Object.entries(events)) {
    const entrants = eligible.filter(
      (p) => p.eventsPlayed?.[event] || Number(p[field] || 0) !== 0,
    );
    for (const p of entrants) {
      const higher = entrants.filter(
        (q) => Number(q[field] || 0) > Number(p[field] || 0),
      ).length;
      const points =
        entrants.length === 1
          ? 100
          : 100 * (1 - higher / (entrants.length - 1));
      result.get(p.id)[event] = Math.round(points * 10) / 10;
      result.get(p.id).total += result.get(p.id)[event];
    }
  }
  for (const score of result.values())
    score.total = Math.round(score.total * 10) / 10;
  return result;
}
