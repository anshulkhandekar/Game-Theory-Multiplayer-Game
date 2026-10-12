// Convert server comparisons into a player's own front outcomes without changing scoring.
export function frontReport(result, teamId) {
  if (![result.a, result.b].includes(teamId))
    throw Error("Team is not on this front");
  const left = result.a === teamId;
  const mine = left ? result.left : result.right,
    enemy = left ? result.right : result.left;
  return {
    enemyId: left ? result.b : result.a,
    mine,
    enemy,
    margin: mine - enemy,
    points: left ? result.leftPoints : result.rightPoints,
    verdict:
      result.outcome === "Empty"
        ? "empty"
        : result.outcome === "Tie"
          ? "tie"
          : mine > enemy
            ? "win"
            : "loss",
  };
}
