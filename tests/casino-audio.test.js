import test from "node:test";
import assert from "node:assert/strict";
import { createCasinoAudio } from "../src/casino-audio.js";
const param = () => ({
  value: 0,
  setValueAtTime() {},
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
  cancelScheduledValues() {},
});
const node = () => ({
  frequency: param(),
  gain: param(),
  pan: param(),
  connect() {},
  disconnect() {},
  start() {},
  stop() {},
});
test("Casino audio supports a host observer without a player and respects mute", () => {
  const c = {
    state: "running",
    currentTime: 0,
    destination: {},
    createOscillator: node,
    createGain: node,
    createStereoPanner: node,
    createBufferSource: node,
    createBiquadFilter: node,
  };
  let enabled = true;
  const a = createCasinoAudio({
    context: () => c,
    enabled: () => enabled,
    noise: () => ({}),
  });
  const s = {
    world: "casino",
    worldTime: 0,
    poker: { phase: "instructions", tables: [] },
  };
  assert.doesNotThrow(() => a.update(s, undefined, false));
  assert.doesNotThrow(() => a.update(s, undefined, true));
  enabled = false;
  assert.doesNotThrow(() => a.update(s, undefined, false));
  a.stop();
});
