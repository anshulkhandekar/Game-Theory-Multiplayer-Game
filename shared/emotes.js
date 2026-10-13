// One selection performs one bounded gesture. Clips play once within this window.
export const EMOTE_SECONDS = {
  wave: 2.4,
  scuba: 10.27,
  dance: 6.27,
  griddy: 8,
};
export function canEmote(state, player) {
  if (
    !player?.connected ||
    state.paused ||
    state.battlefield?.paused ||
    state.poker?.paused ||
    player.practiceSeat
  )
    return false;
  if (player.waitingLobby) return true;
  if (state.poker && state.world === "casino")
    return ["instructions", "results"].includes(state.poker.phase);
  if (state.battlefield) return true;
  if (state.phase === "loading") return !!player.loaded && !!player.eligible;
  return (
    ["lobby", "ready", "instructions", "active", "practice"].includes(
      state.phase,
    ) &&
    (!["active", "practice"].includes(state.phase) || player.eligible)
  );
}
