export function createAdminStandings(view, send, escape) {
  if (view !== "host") return { update() {}, history() {} };
  const root = document.createElement("details");
  root.id = "admin-standings";
  root.hidden = true;
  root.innerHTML =
    '<summary>Player standings & history</summary><div class="admin-history-body"><label>Player<select data-player aria-label="Player history"></select></label><div data-record></div></div>';
  document.querySelector("#app").append(root);
  let state,
    rounds = [],
    selected,
    signature = "";
  const select = root.querySelector("[data-player]");
  select.onchange = () => {
    selected = select.value;
    signature = "";
    render();
  };
  root.onclick = (e) => {
    const b = e.target.closest("[data-manage]");
    if (b && selected)
      send({ type: "host", action: b.dataset.manage, data: { id: selected } });
  };
  function render() {
    if (!state || root.hidden) return;
    const players = state.players
      .filter((p) => !p.demo)
      .sort((a, b) => (b.tournament?.total || 0) - (a.tournament?.total || 0));
    if (!players.some((p) => p.id === selected)) selected = players[0]?.id;
    const key = JSON.stringify([
      selected,
      rounds.length,
      players.map((p) => [
        p.id,
        p.name,
        p.connected,
        p.kicked,
        p.tournament,
        p.earnings,
        p.battlefieldScore,
        p.pokerScore,
      ]),
    ]);
    if (key === signature) return;
    signature = key;
    select.innerHTML = players
      .map(
        (p) =>
          `<option value="${p.id}">${escape(p.name)} · ${(p.tournament?.total || 0).toFixed(1)}</option>`,
      )
      .join("");
    select.value = selected || "";
    const p = players.find((p) => p.id === selected),
      node = root.querySelector("[data-record]");
    if (!p) {
      node.innerHTML = "<p>No players yet.</p>";
      return;
    }
    const entries = rounds
      .map((r) => ({ ...r, result: r.players.find((q) => q.id === p.id) }))
      .filter((r) => r.result);
    const poker = entries.filter((r) => r.kind === "poker");
    node.innerHTML = `<h3>${escape(p.name)} · ${(p.tournament?.total || 0).toFixed(1)} total points</h3><p>${p.kicked ? "Removed" : p.connected ? "Connected" : "Disconnected"} <button data-manage="${p.kicked ? "allowPlayer" : "kickPlayer"}">${p.kicked ? "Allow back" : "Kick player"}</button></p><dl class="admin-score-totals"><div><dt>Crowd Rush</dt><dd>${p.tournament?.crowd || 0} rank points · ${Number(p.earnings || 0).toFixed(1)} earnings</dd></div><div><dt>Battlefield</dt><dd>${p.tournament?.battlefield || 0} rank points · ${p.battlefieldScore || 0} territory</dd></div><div><dt>Kuhn Poker</dt><dd>${p.tournament?.poker || 0} rank points · ${p.pokerScore || 0} net chips<br>${poker.filter((r) => r.result.won).length}/${poker.length} recorded rounds won</dd></div></dl><h4>Completed plays</h4><ol class="admin-round-history">${
      entries
        .toReversed()
        .map((r) => {
          const q = r.result,
            title = {
              crowd: "Crowd Rush",
              battlefield: "Battlefield",
              poker: "Kuhn Poker",
            }[r.kind];
          const detail =
            r.kind === "crowd"
              ? `${escape(q.vault || "Outside all vaults")} · +${Number(q.payout).toFixed(1)} earnings${q.disconnected ? " · disconnected" : ""}${q.vault ? `<small>${q.reward} pool ÷ ${q.occupants} players</small>` : ""}`
              : r.kind === "battlefield"
                ? `${escape(q.team)} · +${q.points} territory<small>${q.fronts.map((f) => `Front ${f.front}: ${f.points > f.rivalPoints ? "won" : f.points < f.rivalPoints ? "lost" : "tied"} (${f.points}–${f.rivalPoints}) vs ${escape(f.opponent)}`).join("<br>")}</small>`
                : `vs ${escape(q.opponent)} · ${q.net > 0 ? "+" : ""}${q.net} chips · ${q.won ? "round won" : q.net < 0 ? "round lost" : "even"}<small>${q.hands.map((h) => `Hand ${h.hand}: ${h.net > 0 ? "+" : ""}${h.net} chips`).join(" · ")}</small>`;
          return `<li><b>Play ${r.play} · ${title} round ${r.round}</b><span>${detail}</span></li>`;
        })
        .join("") ||
      "<li>No completed plays recorded yet. Earlier saved scores remain in the totals.</li>"
    }</ol>`;
  }
  return {
    update(s, authed) {
      state = s;
      root.hidden = !authed;
      render();
    },
    history(records) {
      rounds = records;
      signature = "";
      render();
    },
  };
}
