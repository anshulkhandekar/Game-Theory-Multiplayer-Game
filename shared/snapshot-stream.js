// Metadata changes only when a roster/profile/score/status changes. Movement remains 20Hz.
const fields = [
  "id",
  "name",
  "appearance",
  "earnings",
  "battlefieldScore",
  "pokerScore",
  "tournament",
  "eventsPlayed",
  "connected",
  "kicked",
  "officer",
  "demo",
  "pokerBot",
  "waitingLobby",
  "eligible",
  "ready",
  "loaded",
  "sceneLoaded",
];
const fieldSet = new Set(fields);
export class SnapshotStream {
  version = 0;
  update(players) {
    this.actors = players
      .filter((p) => p.connected)
      .map((p) =>
        Object.fromEntries(
          Object.entries(p).filter(([k]) => k === "id" || !fieldSet.has(k)),
        ),
      );
    this.roster = players.map((p) =>
      Object.fromEntries(
        fields.filter((k) => p[k] !== undefined).map((k) => [k, p[k]]),
      ),
    );
    const signature = JSON.stringify(this.roster);
    if (signature !== this.signature) {
      this.signature = signature;
      this.version++;
    }
  }
  encode(state, previousVersion) {
    const { players, ...rest } = state;
    return {
      ...rest,
      rosterVersion: this.version,
      ...(previousVersion !== this.version ? { roster: this.roster } : {}),
      actors: this.actors,
    };
  }
}

export function snapshotDecoder() {
  let roster = [],
    version = -1;
  return (state) => {
    if (state.players) return state; // Entrance preview / legacy snapshots.
    if (state.roster) {
      roster = state.roster;
      version = state.rosterVersion;
    }
    if (version !== state.rosterVersion)
      throw Error("Missing roster; reconnect to the room");
    const actors = new Map((state.actors || []).map((p) => [p.id, p]));
    const { actors: _, roster: __, rosterVersion: ___, ...rest } = state;
    return {
      ...rest,
      players: roster.map((p) => ({
        x: 0,
        y: 0,
        z: 0,
        ...p,
        ...actors.get(p.id),
      })),
    };
  };
}
