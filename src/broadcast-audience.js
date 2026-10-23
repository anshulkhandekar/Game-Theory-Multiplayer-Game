export function pokerAudience(state, escape) {
  const b = state.poker,
    name = (id) =>
      escape(state.players.find((p) => p.id === id)?.name || "Panda");
  return `<section class="audience-matchups"><h3>Poker matchups · Round ${b.round}</h3><div data-broadcast-scroll>${b.tables.map((t) => `<article><b>${t.players.map(name).join(" vs ")}</b><span>${t.status === "waiting" ? "Getting seated" : t.result ? `${name(t.players[t.result.winner])} won Hand ${t.hand}` : t.status === "done" ? "Both hands finished" : `Playing Hand ${t.hand}`}</span>${t.hand ? `<small>${t.players.map((id, i) => `${name(id)}: ${t.net[i] > 0 ? "+" : ""}${t.net[i]} chips`).join(" · ")}</small>` : ""}</article>`).join("")}</div></section>`;
}
export function battlefieldAudience(state, escape) {
  const b = state.battlefield,
    name = (id) => escape(b.teams.find((t) => t.id === id)?.name || "Team");
  if (b.phase !== "results") return "";
  return `<section class="audience-matchups"><h3>Battlefield results · ${b.practice ? "Practice" : "Round " + b.round}</h3><div data-broadcast-scroll>${b.results.map((r) => `<article><b>${name(r.a)} vs ${name(r.b)}</b><span>${r.lane === 0 ? "Supply" : "Field " + r.lane}: ${r.leftPoints === r.rightPoints ? "Tie" : name(r.leftPoints > r.rightPoints ? r.a : r.b) + " wins"}</span><small>${name(r.a)} +${r.leftPoints} · ${name(r.b)} +${r.rightPoints} territory</small></article>`).join("")}</div></section>`;
}
