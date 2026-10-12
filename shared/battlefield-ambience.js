// Shared trajectories keep visible flyovers and positional sound in the same place.
export function sceneryExtent(positions) {
  return {
    x: Math.max(110, ...positions.map((p) => Math.abs(p.x) + 65)),
    z: Math.max(110, ...positions.map((p) => Math.abs(p.z) + 65)),
    hangarZ: -Math.max(215, ...positions.map((p) => Math.abs(p.z) + 120)),
  };
}
export function aircraftAt(time, positions) {
  const bounds = sceneryExtent(positions),
    out = [];
  for (let squad = 0; squad < 2; squad++)
    for (let wing = 0; wing < 3; wing++) {
      const t = (time / 75 + squad * 0.5) % 1,
        direction = squad ? 1 : -1;
      out.push({
        kind: "jet",
        x:
          direction * (-bounds.x * 1.4 + t * bounds.x * 2.8) -
          direction * wing * 13,
        y: 29 + squad * 5 + wing * 1.5,
        z: (squad ? 1 : -1) * bounds.z + (wing - 1) * 13,
        angle: (direction * Math.PI) / 2,
      });
    }
  for (let i = 0; i < 2; i++) {
    const angle = time / 30 + i * Math.PI;
    out.push({
      kind: "helicopter",
      x: Math.cos(angle) * bounds.x,
      z: Math.sin(angle) * bounds.z,
      y: 22 + i * 5,
      angle: Math.atan2(
        -Math.sin(angle) * bounds.x,
        Math.cos(angle) * bounds.z,
      ),
    });
  }
  return out;
}
export const weaponCycle = (time, type, index = 0) =>
  (time / ({ troop: 0.42, heavy: 0.68, tank: 1.9, artillery: 2.6 }[type] || 2) +
    index * 0.19) %
  1;
