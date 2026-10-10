// Quadratic falloff includes elevation; a hard voice budget avoids a wall of machinery.
export function soundDistance(source, listener, radius = 12) {
  const distance = Math.hypot(source.x-listener.x, (source.y || 0)-(listener.y || 0), source.z-listener.z);
  return Math.max(0, 1-distance/radius)**2;
}
export function audibleStructures(structures, listener, limit = 2) {
  return structures.filter(p=>soundDistance(p,listener)>.015)
    .sort((a,b)=>soundDistance(b,listener)-soundDistance(a,listener)).slice(0,limit);
}
