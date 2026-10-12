// One selection performs one bounded gesture. Clips play once within this window.
export const EMOTE_SECONDS = {wave: 2.4, scuba: 10.27, dance: 6.27, griddy: 8};
export function canEmote(state, player) {
  return !!player?.connected && !state.paused &&
    (player.waitingLobby || ['lobby','ready','instructions','active','practice'].includes(state.phase)) &&
    (player.waitingLobby || !['active','practice'].includes(state.phase) || player.eligible);
}
