export function reconnectDelay(attempt, random = Math.random()) {
  return Math.round(
    Math.min(15000, 1000 * 2 ** Math.min(attempt, 4)) * (0.8 + 0.4 * random),
  );
}
