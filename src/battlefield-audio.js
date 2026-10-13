import { aircraftAt, sceneryExtent } from "../shared/battlefield-ambience.js";
import { teamPositions } from "../shared/battlefield.js";

export function createBattlefieldAudio({ context, enabled, noise, cue }) {
  const voices = new Set(),
    slots = new Map();
  let bus,
    compressor,
    world = "",
    fight = -1,
    tick = "",
    yelped = -1;
  function stop() {
    const c = context();
    if (!c) return;
    for (const voice of voices) {
      if (voice.stopped) continue;
      voice.stopped = true;
      voice.gain.gain.cancelScheduledValues(c.currentTime);
      voice.gain.gain.setTargetAtTime(0, c.currentTime, 0.025);
      for (const source of voice.sources)
        try {
          source.stop(c.currentTime + 0.1);
        } catch {}
    }
  }
  function play(kind, volume, pan = 0) {
    const c = context();
    if (!c || !enabled() || c.state !== "running" || voices.size >= 6) return;
    if (!bus) {
      bus = c.createGain();
      bus.gain.value = 0.8;
      compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -19;
      compressor.ratio.value = 3;
      bus.connect(compressor);
      compressor.connect(c.destination);
    }
    const duration = {
      troop: 0.075,
      heavy: 0.15,
      tank: 0.7,
      artillery: 0.85,
      explosion: 0.8,
      jet: 2.8,
      helicopter: 1.8,
      robot: 1.3,
      yelp: 0.7,
      shell: 1.6,
    }[kind];
    const gain = c.createGain(),
      panner = c.createStereoPanner(),
      filter = c.createBiquadFilter(),
      source = c.createBufferSource(),
      osc = c.createOscillator();
    const t = c.currentTime,
      nodes = [gain, panner, filter, source, osc],
      sources = [source, osc];
    source.buffer = noise();
    source.loop = true;
    filter.type = kind === "yelp" ? "bandpass" : "lowpass";
    filter.Q.value = kind === "yelp" ? 3 : 1;
    const frequency = {
      troop: 3800,
      heavy: 2200,
      tank: 550,
      artillery: 420,
      explosion: 380,
      jet: 750,
      helicopter: 280,
      robot: 650,
      yelp: 1000,
      shell: 2100,
    }[kind];
    filter.frequency.setValueAtTime(frequency, t);
    if (kind === "jet") {
      filter.frequency.linearRampToValueAtTime(1800, t + duration * 0.5);
      filter.frequency.exponentialRampToValueAtTime(450, t + duration);
    } else
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(45, frequency * 0.25),
        t + duration,
      );
    osc.type = ["tank", "artillery", "explosion", "yelp"].includes(kind)
      ? "triangle"
      : "sawtooth";
    const tone = {
      troop: 180,
      heavy: 460,
      tank: 110,
      artillery: 90,
      explosion: 65,
      jet: 90,
      helicopter: 48,
      robot: 65,
      yelp: 450,
      shell: 1100,
    }[kind];
    osc.frequency.setValueAtTime(tone, t);
    osc.frequency.exponentialRampToValueAtTime(
      kind === "shell" ? 55 : kind === "yelp" ? 170 : Math.max(30, tone * 0.45),
      t + duration,
    );
    const tonal = c.createGain();
    tonal.gain.value = kind === "yelp" ? 0.9 : 0.32;
    nodes.push(tonal);
    osc.connect(tonal);
    tonal.connect(filter);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(bus);
    panner.pan.value = pan;
    const attack = ["jet", "helicopter", "robot"].includes(kind)
      ? duration * 0.25
      : 0.008;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    if (["helicopter", "robot", "yelp"].includes(kind)) {
      const lfo = c.createOscillator(),
        depth = c.createGain();
      lfo.frequency.value =
        kind === "helicopter" ? 19 : kind === "robot" ? 32 : 8;
      depth.gain.value = volume * 0.25;
      lfo.connect(depth);
      depth.connect(gain.gain);
      lfo.start(t);
      lfo.stop(t + duration);
      nodes.push(lfo, depth);
      sources.push(lfo);
    }
    const voice = { gain, sources };
    voices.add(voice);
    source.start(t);
    osc.start(t);
    source.stop(t + duration);
    osc.stop(t + duration);
    source.onended = () => {
      voices.delete(voice);
      nodes.forEach((n) => n.disconnect());
    };
  }
  function due(key, slot) {
    if (slots.get(key) === slot) return false;
    slots.set(key, slot);
    return true;
  }
  function update(state, listener = { x: 0, z: 0 }, yaw = 0) {
    const b = state?.battlefield,
      c = context();
    if (
      !enabled() ||
      c?.state !== "running" ||
      !b ||
      !state.world.startsWith("battlefield") ||
      b.paused ||
      document.hidden
    ) {
      stop();
      return;
    }
    if (world !== state.world) {
      stop();
      slots.clear();
      world = state.world;
    }
    const elapsed =
        (performance.now() - (state.audioReceivedAt || performance.now())) /
        1000,
      time = state.worldTime + elapsed;
    const positions = teamPositions(b.teams),
      bounds = sceneryExtent(positions);
    const spatial = (p, range) => {
      const dx = p.x - listener.x,
        dz = p.z - listener.z,
        distance = Math.hypot(dx, dz);
      return {
        volume: Math.max(listener.projector ? 0.22 : 0.04, (1 - Math.min(1, distance / range)) ** 2),
        pan: Math.max(
          -0.8,
          Math.min(0.8, (-dx * Math.cos(yaw) + dz * Math.sin(yaw)) / range),
        ),
      };
    };
    // No persistent loops: short bounded voices follow the shared aircraft positions.
    const distantAllowed=!(listener.projector && b.phase==="reveal");
    const routes = aircraftAt(time, positions),
      nearJet = routes
        .slice(0, 6)
        .sort(
          (a, b) =>
            Math.hypot(a.x - listener.x, a.z - listener.z) -
            Math.hypot(b.x - listener.x, b.z - listener.z),
        )[0];
    if (distantAllowed && due("jet", Math.floor(time / 7))) {
      const at = spatial(nearJet, 400);
      play("jet", 0.025 * at.volume, at.pan);
    }
    if (distantAllowed && due("helicopter", Math.floor((time + 3) / 9))) {
      const at = spatial(routes[6], 350);
      play("helicopter", 0.022 * at.volume, at.pan);
    }
    if (distantAllowed && due("robot", Math.floor((time + 1) / 6))) {
      const at = spatial({ x: 65, z: bounds.hangarZ + 45 }, 500);
      play("robot", 0.025 * at.volume, at.pan);
    }
    if (distantAllowed && due("distant-impact", Math.floor((time + 4) / 11))) {
      const at = spatial({ x: 0, z: bounds.hangarZ + 50 }, 500);
      play("explosion", 0.03 * at.volume, at.pan);
    }
    if (
      b.phase !== "reveal" &&
      due("distant-rifle", Math.floor((time + 2) / 3.3))
    ) {
      const at = spatial(
        { x: bounds.x * Math.sin(time * 0.1), z: bounds.hangarZ + 30 },
        450,
      );
      play("troop", 0.012 * at.volume, at.pan);
    }
    if (
      b.phase !== "reveal" &&
      due("distant-shell", Math.floor((time + 5) / 13))
    ) {
      const at = spatial({ x: -bounds.x, z: bounds.hangarZ + 15 }, 500);
      play("shell", 0.022 * at.volume, at.pan);
    }
    if (b.phase === "countdown") {
      const key =
        state.round + ":" + Math.ceil(Math.max(0, b.remaining - elapsed));
      if (key !== tick) {
        tick = key;
        cue("tick");
      }
    }
    if (b.phase === "reveal") {
      if (fight !== state.round) {
        fight = state.round;
        if(listener.projector)stop();
        cue("warHorn");
      }
      const sources = positions.map((p) => ({
        p,
        orders: Object.entries(b.orders)
          .filter(([key]) => key.startsWith(p.id + ":"))
          .map(([, o]) => o),
      }));
      for (const type of ["tank", "heavy", "troop", "artillery"]) {
        const available = sources
          .filter((s) => s.orders.some((o) => o[type]))
          .sort(
            (a, b) =>
              Math.hypot(a.p.x - listener.x, a.p.z - listener.z) -
              Math.hypot(b.p.x - listener.x, b.p.z - listener.z),
          );
        const interval = {
          troop: 0.42,
          heavy: 0.68,
          tank: 1.9,
          artillery: 2.6,
        }[type];
        if (
          available.length &&
          due("weapon-" + type, Math.floor(time / interval))
        ) {
          const at = spatial(available[0].p, 180);
          play(
            type,
            { troop: 0.029, heavy: 0.037, tank: 0.065, artillery: 0.075 }[
              type
            ] * at.volume,
            at.pan,
          );
        }
      }
      if (
        b.remaining - elapsed < 6 &&
        yelped !== state.round &&
        sources.some((s) => s.orders.some((o) => o.troop))
      ) {
        yelped = state.round;
        play("yelp", 0.025, -0.15);
      }
      if (due("combat-impact", Math.floor(time / 2.7)))
        play("explosion", 0.025, Math.sin(time) * 0.5);
    }
    const print = b.deployments
      .filter((d) => d.owner === listener?.id && time - d.time < 0.4)
      .at(-1);
    if (print && due("print", print.id)) cue("pad");
  }
  return { update, stop };
}
