import test from "node:test";
import assert from "node:assert/strict";
import { createAudio } from "../src/audio.js";
import { createCasinoAudio } from "../src/casino-audio.js";
import { createBattlefieldAudio } from "../src/battlefield-audio.js";
function context() {
  const c = {
    state: "running",
    currentTime: 0,
    sampleRate: 100,
    destination: {},
    sources: [],
    oscillators: [],
    gains: [],
  };
  const param = () => ({
    value: 0,
    peak: 0,
    setValueAtTime(v) {
      this.value = v;
      this.peak = Math.max(this.peak, v);
    },
    setTargetAtTime(v) {
      this.value = v;
      this.peak = Math.max(this.peak, v);
    },
    linearRampToValueAtTime(v) {
      this.peak = Math.max(this.peak, v);
    },
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  });
  const node = () => ({
    frequency: param(),
    gain: param(),
    pan: param(),
    positionX: param(),
    positionY: param(),
    positionZ: param(),
    threshold: param(),
    ratio: param(),
    Q: param(),
    connect() {},
    disconnect() {},
    start() {},
    stop() {},
  });
  c.createBuffer = (_, n) => ({ getChannelData: () => new Float32Array(n) });
  c.createBufferSource = () => {
    const n = node();
    c.sources.push(n);
    return n;
  };
  c.createOscillator = () => {
    const n = node();
    c.oscillators.push(n);
    return n;
  };
  c.createGain = () => {
    const n = node();
    c.gains.push(n);
    return n;
  };
  c.createStereoPanner =
    c.createPanner =
    c.createBiquadFilter =
    c.createDynamicsCompressor =
      node;
  c.resume = async () => {};
  return c;
}
test("projector hears bounded distant trap motors without a joined player and suppresses jump/UI cues", async (t) => {
  const oldStorage = globalThis.localStorage,
    oldAudio = globalThis.AudioContext,
    oldPerformance = globalThis.performance;
  const c = context();
  globalThis.localStorage = {
    getItem: (key) =>
      key === "bear-muted" || key === "bear-remote-muted" ? "true" : null,
    setItem() {},
  };
  globalThis.AudioContext = class {
    constructor() {
      return c;
    }
  };
  globalThis.performance = { now: () => 1000 };
  t.after(() => {
    globalThis.localStorage = oldStorage;
    globalThis.AudioContext = oldAudio;
    globalThis.performance = oldPerformance;
  });
  const a = createAudio({ projector: true });
  assert.equal(a.enabled, true);
  assert.equal(a.remoteEnabled, true);
  await a.unlock();
  a.cue("jump");
  a.cue("click");
  assert.equal(c.oscillators.length, 0);
  a.environment(
    { world: "arena4", worldTime: 1, phase: "active" },
    { connected: true, projector: true, x: 0, y: 0, z: 0 },
  );
  assert.ok(c.sources.length > 0);
  assert.ok(c.sources.filter((s) => s.loop).length <= 2);
  assert.ok(c.gains.some((g) => g.gain.peak > 0));
  a.cue("tick");
  assert.equal(c.oscillators.length, 1);
  a.setBroadcastEnabled(false);
  assert.equal(a.enabled, false);
  a.cue("tick");
  assert.equal(c.oscillators.length, 1);
});
test("projector lobby has music, casino countdown has shuffling, and staggered deals are throttled", () => {
  const c = context(),
    a = createCasinoAudio({
      context: () => c,
      enabled: () => true,
      noise: () => ({}),
    });
  a.update({ world: "lobby", worldTime: 0 }, undefined, true);
  assert.ok(c.oscillators.length > 0);
  a.update(
    {
      world: "casino",
      worldTime: 0,
      round: 1,
      poker: { round: 1, phase: "countdown", countdown: 5, tables: [] },
    },
    undefined,
    true,
  );
  assert.equal(c.sources.length, 3);
  const s = {
    world: "casino",
    worldTime: 5,
    round: 1,
    poker: {
      round: 1,
      phase: "playing",
      tables: [
        { hand: 1, players: [] },
        { hand: 1, players: [] },
      ],
    },
  };
  a.update(s, undefined, true);
  assert.equal(c.sources.length, 6);
  s.worldTime = 5.2;
  s.poker.tables[0].hand = 2;
  a.update(s, undefined, true);
  assert.equal(c.sources.length, 6);
  s.worldTime = 7.5;
  s.poker.tables[1].hand = 2;
  a.update(s, undefined, true);
  assert.equal(c.sources.length, 9);
  a.stop();
});
test("projector combat prioritizes horn and weapons over aircraft voices with audible distant gunfire", (t) => {
  const oldDocument = globalThis.document;
  globalThis.document = { hidden: false };
  t.after(() => {
    globalThis.document = oldDocument;
  });
  const c = context(),
    cues = [],
    a = createBattlefieldAudio({
      context: () => c,
      enabled: () => true,
      noise: () => ({}),
      cue: (k) => cues.push(k),
    });
  a.update(
    {
      world: "battlefield1",
      round: 2,
      worldTime: 0,
      battlefield: {
        phase: "reveal",
        remaining: 10,
        teams: [{ id: "a" }, { id: "b" }],
        orders: { "a:f": { troop: 1 } },
        deployments: [],
      },
    },
    { x: 1000, z: 1000, projector: true },
  );
  assert.deepEqual(cues, ["warHorn"]);
  assert.equal(c.oscillators.length, 2);
  assert.ok(c.gains.some((n) => Math.abs(n.gain.peak - 0.029 * 0.22) < 1e-8));
  a.stop();
});
