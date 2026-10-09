export function loadAndCountdown(g) {
  for (const p of g.players.values())
    if (p.connected && p.eligible) {
      g.acknowledgeLoad(p, g.round);
      g.acknowledgeLoad(p, g.round, true);
    }
  g.command("countdown");
}
