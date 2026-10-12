import * as THREE from "three";
import { arenaBounds, STAGES } from "../shared/world.js";
import { batchStatic } from "./static-batch.js";
const ACCENTS = ["#ef6b75", "#6ce1ca", "#b597f4", "#ffc65b", "#78bdf5"];
export function createCrowdSet(parent, stage) {
  const root = new THREE.Group();
  parent.add(root);
  const accent = ACCENTS[stage - 1],
    bounds =
      stage === 1 ? { side: 18, rear: -19, front: 19 } : arenaBounds(stage);
  const paints = new Map();
  function box(color, x, y, z, w, h, d) {
    if (!paints.has(color))
      paints.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
      );
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paints.get(color));
    m.position.set(x, y, z);
    root.add(m);
    return m;
  }
  const back = bounds.rear + (stage === 1 ? 0 : 1.2),
    height = stage === 1 ? 6.5 : 15;
  // Suspended broadcast rig and vertical light ladders frame, rather than obscure, routes.
  for (const x of [-bounds.side, bounds.side]) {
    box(
      "#273647",
      x,
      height / 2,
      (back + bounds.front) / 2,
      0.55,
      height,
      bounds.front - back,
    );
    for (let z = back; z < bounds.front; z += 7) {
      box("#667b86", x, height / 2, z, 0.7, height, 0.7);
      for (let y = 2; y < height; y += 2.3)
        box(accent, x - Math.sign(x) * 0.45, y, z, 0.15, 0.6, 0.8);
      const fixture = box(
        "#1f2938",
        x - Math.sign(x) * 1.2,
        height - 0.7,
        z,
        1.5,
        0.9,
        1.3,
      );
      fixture.rotation.z = Math.sign(x) * 0.35;
      box(accent, x - Math.sign(x) * 1.3, height - 1.3, z, 1, 0.1, 1);
    }
    // Tiered production/spectator balcony beyond the playable perimeter.
    for (let tier = 0; tier < 3; tier++) {
      box(
        "#34485b",
        x + Math.sign(x) * (3 + tier * 1.6),
        tier * 1.2 + 1,
        (back + bounds.front) / 2,
        2,
        1.2,
        bounds.front - back,
      );
      for (let z = back + 3; z < bounds.front; z += 3)
        box(
          tier % 2 ? accent : "#728695",
          x + Math.sign(x) * (3 + tier * 1.6),
          tier * 1.2 + 2,
          z,
          1.1,
          0.65,
          1.1,
        );
    }
  }
  box("#667b86", 0, height + 0.5, back, bounds.side * 2, 0.6, 0.6);
  box("#1c2735", 0, height + 0.9, back, bounds.side * 2, 0.35, 0.4);
  for (let x = -bounds.side + 2; x < bounds.side; x += 4)
    box(accent, x, height + 0.9, back + 0.3, 1.8, 0.12, 0.1);
  box(
    "#111821",
    0,
    height - 1,
    back,
    stage === 1 ? 13 : 21,
    stage === 1 ? 4.2 : 5.8,
    0.6,
  );
  for (const x of [-1, 1])
    box(
      accent,
      x * (stage === 1 ? 6.5 : 10.5),
      height - 1,
      back + 0.35,
      0.14,
      stage === 1 ? 4.2 : 5.8,
      0.12,
    );
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(stage === 1 ? 12 : 20, stage === 1 ? 3 : 4.8),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  screen.position.set(0, height - 1, back + 0.36);
  root.add(screen);
  const beams = [];
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(
        stage === 1 ? 2 : 4,
        stage === 1 ? 7 : 14,
        12,
        1,
        true,
      ),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.035,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    beam.position.set(
      (i - 1.5) * (stage === 1 ? 8 : 15),
      height / 2,
      back + 6 + (i % 2) * 7,
    );
    beam.rotation.z = (i % 2 ? 1 : -1) * 0.2;
    root.add(beam);
    beams.push(beam);
  }
  batchStatic(root);
  let stamp = "";
  return {
    frame(state, elapsed, reduced, low) {
      if (!state) return;
      const seconds = Math.max(
        0,
        Math.ceil(state.remaining - (state.paused ? 0 : elapsed)),
      );
      const phase = state.paused
        ? "PAUSED"
        : ["active", "practice"].includes(state.phase)
          ? "TIME LEFT"
          : state.phase === "countdown"
            ? "GET READY"
            : state.phase === "results"
              ? "ROUND COMPLETE"
              : state.phase === "loading"
                ? "LOADING"
                : "CROWD RUSH";
      const key = phase + seconds + state.round;
      if (key !== stamp) {
        stamp = key;
        const c = canvas.getContext("2d");
        c.fillStyle = "#080d15";
        c.fillRect(0, 0, 1024, 256);
        c.textAlign = "center";
        c.fillStyle = "#d8e1e7";
        c.font = "bold 27px sans-serif";
        c.fillText(
          `${state.practice ? "PRACTICE" : `ROUND ${stage}`}   ·   ${STAGES[stage - 1].name}`,
          512,
          42,
        );
        c.fillStyle = state.paused ? "#ffc65b" : "#ff4e61";
        c.font = "bold 118px monospace";
        c.fillText(
          ["active", "practice", "countdown"].includes(state.phase)
            ? `${Math.floor(seconds / 60)
                .toString()
                .padStart(
                  2,
                  "0",
                )}:${(seconds % 60).toString().padStart(2, "0")}`
            : phase,
          512,
          170,
          960,
        );
        c.fillStyle = "#a6b7c8";
        c.font = "bold 24px sans-serif";
        c.fillText(phase, 512, 222);
        texture.needsUpdate = true;
      }
      beams.forEach((beam, i) => {
        beam.visible = !low;
        beam.rotation.z =
          (i % 2 ? 1 : -1) * 0.2 +
          (reduced ? 0 : Math.sin(state.worldTime * 0.35 + i) * 0.045);
      });
    },
  };
}
