export function createAdminChat(view, send, escape) {
  if (view !== "host") return { update() {}, messages() {} };
  const root = document.createElement("details");
  root.id = "admin-chat";
  root.hidden = true;
  root.innerHTML =
    '<summary>Chat moderation</summary><div class="admin-chat-body"><label class="chat-switch"><input type="checkbox" data-lobby-chat> Enable lobby chat</label><p data-chat-status></p><h3>Battlefield team chats</h3><label>Show<select data-team aria-label="Team chat filter"></select></label><p class="chat-privacy">This monitor is visible only to the admin.</p><div data-team-feed></div></div>';
  document.querySelector("#app").append(root);
  let state,
    records = [],
    signature = "",
    selected = "all";
  root.querySelector("[data-lobby-chat]").onchange = (e) =>
    send({
      type: "host",
      action: "lobbyChat",
      data: { enabled: e.target.checked },
    });
  root.querySelector("[data-team]").onchange = (e) => {
    selected = e.target.value;
    signature = "";
    render();
  };
  root.addEventListener("toggle", () => {
    if (root.open) document.querySelector("#admin-standings").open = false;
  });
  document.querySelector("#admin-standings").addEventListener("toggle", (e) => {
    if (e.target.open) root.open = false;
  });
  function render() {
    if (!state || root.hidden) return;
    const teams = state.battlefield?.teams || [],
      enabled = state.lobbyChatEnabled !== false;
    if (selected !== "all" && !teams.some((t) => t.id === selected))
      selected = "all";
    const key = JSON.stringify([
      enabled,
      selected,
      teams.map((t) => [t.id, t.name]),
      [records.length, records.at(-1)?.id],
    ]);
    if (key === signature) return;
    signature = key;
    root.querySelector("[data-lobby-chat]").checked = enabled;
    root.querySelector("[data-chat-status]").textContent = enabled
      ? "Players can send lobby messages."
      : "Lobby chat is disabled. Existing messages stay visible.";
    const select = root.querySelector("[data-team]");
    select.innerHTML =
      '<option value="all">All teams</option>' +
      teams
        .map((t) => `<option value="${t.id}">${escape(t.name)}</option>`)
        .join("");
    select.value = selected;
    select.disabled = !teams.length;
    const feed = root.querySelector("[data-team-feed]"),
      atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 30;
    const visible = records.filter(
      (m) => selected === "all" || m.team === selected,
    );
    feed.innerHTML =
      visible
        .map(
          (m) =>
            `<article><span>${escape(teams.find((t) => t.id === m.team)?.name || "Team")}</span><b>${escape(m.name)}</b><p>${escape(m.text)}</p></article>`,
        )
        .join("") ||
      `<p>${teams.length ? "No team messages yet." : "Team chats appear once Battlefield teams are formed."}</p>`;
    if (atBottom) feed.scrollTop = feed.scrollHeight;
  }
  return {
    update(s, auth) {
      state = s;
      root.hidden = !auth;
      render();
    },
    messages(m) {
      records = m;
      signature = "";
      render();
    },
  };
}
