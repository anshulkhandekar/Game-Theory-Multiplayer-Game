import { snapshotDecoder } from "../shared/snapshot-stream.js";

// Each socket needs its own roster cache when decoding incremental snapshots.
const decoders = new WeakMap();

export function readMessage(socket, raw) {
  const message = JSON.parse(raw);
  if (message.type === "state") {
    if (!decoders.has(socket)) decoders.set(socket, snapshotDecoder());
    message.state = decoders.get(socket)(message.state);
  }
  return message;
}
