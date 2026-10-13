// Quadratic falloff includes elevation; a hard voice budget avoids a wall of machinery.
export function soundDistance(source, listener, radius = 12) {
  const distance = Math.hypot(
    source.x - listener.x,
    (source.y || 0) - (listener.y || 0),
    source.z - listener.z,
  );
  return Math.max(0, 1 - distance / radius) ** 2;
}
export function audibleStructures(structures, listener, limit = 2) {
  return structures
    .filter((p) => soundDistance(p, listener) > 0.015)
    .sort((a, b) => soundDistance(b, listener) - soundDistance(a, listener))
    .slice(0, limit);
}

// Projector emotes are a distant accent: at most one short, fresh clip per eight seconds.
export function createProjectorEmoteSelector() {
  let selected = null,
    ends = 0,
    next = 0;
  return (state, now, priority = false) => {
    if (!state || state.world !== "lobby" || state.paused || priority) {
      selected = null;
      return [];
    }
    const playing =
      selected &&
      state.players.find(
        (p) =>
          p.id === selected.id &&
          p.emoteActive &&
          `${p.emoteName}:${p.emoteAt}` === selected.key,
      );
    if (playing && now < ends) return [playing];
    selected = null;
    if (now < next) return [];
    const p = state.players
      .filter(
        (p) =>
          p.connected && !p.kicked && p.emoteActive && (p.emoteAge || 0) < 1.5,
      )
      .sort((a, b) => (a.emoteAge || 0) - (b.emoteAge || 0))[0];
    if (!p) return [];
    selected = { id: p.id, key: `${p.emoteName}:${p.emoteAt}` };
    ends = now + 2.8;
    next = now + 8;
    return [p];
  };
}
