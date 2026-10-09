// Tiny synthesized cues: no downloads, and only enabled by an explicit click.
export function createAudio() {
  let context,
    enabled = false;
  function cue(kind) {
    if (!enabled || !context || context.state !== "running") return;
    const notes = {
      tick: [440],
      go: [523, 659, 784],
      vault: [660, 880],
      results: [523, 659, 784, 1046],
    };
    (notes[kind] || [440]).forEach((frequency, i) => {
      const oscillator = context.createOscillator(),
        gain = context.createGain(),
        t = context.currentTime + i * 0.09;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(t);
      oscillator.stop(t + 0.2);
    });
  }
  return {
    cue,
    async toggle() {
      enabled = !enabled;
      if (enabled) {
        context ||= new AudioContext();
        await context.resume();
        cue("vault");
      }
      return enabled;
    },
  };
}
