import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { batchStatic } from "./static-batch.js";
let strip, brand;
function textures() {
  if (strip) return;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 768;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f3e8cc";
  ctx.fillRect(0, 0, 128, 768);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 88px Georgia";
  ["7", "♥", "♣", "♦", "★", "7"].forEach((s, i) => {
    ctx.fillStyle = i % 2 ? "#9e3443" : "#294c45";
    ctx.fillText(s, 64, i * 128 + 64);
  });
  strip = c;
  const b = document.createElement("canvas");
  b.width = 512;
  b.height = 128;
  const t = b.getContext("2d");
  t.fillStyle = "#24352e";
  t.fillRect(0, 0, 512, 128);
  t.fillStyle = "#e9cc8b";
  t.textAlign = "center";
  t.font = "bold 48px Georgia";
  t.fillText("Panda Fortune", 256, 77);
  brand = new THREE.CanvasTexture(b);
  brand.colorSpace = THREE.SRGBColorSpace;
}
export function createSlotMachine(
  parent,
  x,
  z,
  angle = Math.PI / 2,
  seed = 0,
  scale = 1,
) {
  textures();
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = angle;
  root.scale.setScalar(scale);
  parent.add(root);
  const paints = new Map();
  const mesh = (g, color, px, py, pz) => {
    if (!paints.has(color))
      paints.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          metalness: color === "#c3a263" ? 0.5 : 0,
          roughness: 0.55,
        }),
      );
    const m = new THREE.Mesh(g, paints.get(color));
    m.position.set(px, py, pz);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const box = (px, py, pz, w, h, d, c) =>
    mesh(new RoundedBoxGeometry(w, h, d, 2, 0.035), c, px, py, pz);
  box(0, 1.18, 0, 1.45, 2.36, 1.1, "#302e32");
  box(0, 1.67, 0.58, 1.25, 1.08, 0.1, "#c3a263");
  box(0, 1.67, 0.646, 1.08, 0.88, 0.04, "#23372f");
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.29),
    new THREE.MeshBasicMaterial({ map: brand }),
  );
  title.position.set(0, 2.21, 0.563);
  root.add(title);
  const reels = [-1, 0, 1].map((side, i) => {
    const map = new THREE.CanvasTexture(strip);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 1 / 6);
    map.offset.y = i / 6;
    const reel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.57),
      new THREE.MeshBasicMaterial({ map }),
    );
    reel.position.set(side * 0.33, 1.7, 0.674);
    root.add(reel);
    return map;
  });
  box(0, 1.16, 0.6, 1.18, 0.16, 0.31, "#674146");
  for (const x of [-0.34, 0.34])
    mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16),
      "#c3a263",
      x,
      1.26,
      0.67,
    ).rotation.x = Math.PI / 2;
  box(0, 0.77, 0.61, 1.14, 0.08, 0.4, "#c3a263");
  box(0, 0.65, 0.79, 1.16, 0.18, 0.045, "#302e32");
  for (let i = 0; i < 3; i++)
    mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.045, 16),
      "#c3a263",
      -0.3 + i * 0.3,
      0.83 + i * 0.012,
      0.65,
    );
  const lever = new THREE.Group();
  lever.position.set(0.86, 1.35, 0.18);
  root.add(lever);
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.5, 12),
    new THREE.MeshStandardMaterial({
      color: "#c3a263",
      metalness: 0.6,
      roughness: 0.3,
    }),
  );
  rod.position.y = 0.25;
  lever.add(rod);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    new THREE.MeshStandardMaterial({ color: "#8d343e", roughness: 0.35 }),
  );
  knob.position.y = 0.56;
  lever.add(knob);
  const glow = new THREE.MeshStandardMaterial({
    color: "#f3d391",
    emissive: "#c28c45",
    emissiveIntensity: 0.3,
  });
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), glow);
      lamp.position.set(side * 0.61, 1.39 + i * 0.18, 0.67);
      root.add(lamp);
    }
  batchStatic(root);
  batchStatic(lever);
  return {
    root,
    reels,
    lever,
    seed,
    glow,
    frame(time, reduced = false) {
      const phase = (time + seed * 1.07) % 8;
      const spin = phase > 1 && phase < 3.5;
      lever.rotation.x = reduced
        ? -0.12
        : phase < 1
          ? -0.12 - Math.sin(phase * Math.PI) * 0.75
          : -0.12;
      reels.forEach(
        (map, i) =>
          (map.offset.y =
            spin && !reduced
              ? (time * (2.4 + i * 0.25) + seed * 0.27) % 1
              : seed % 3 === 0
                ? 0
                : [0, 2, 4][i] / 6),
      );
      glow.emissiveIntensity = reduced
        ? 0.3
        : spin
          ? 0.35
          : 0.35 + Math.max(0, Math.sin(time * 2 + seed)) * 0.5;
    },
  };
}
