import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { batchStatic } from "./static-batch.js";
const black = "#1c252b",
  white = "#ece7db";
export function createCasinoPanda(
  parent,
  x,
  z,
  role = "player",
  angle = 0,
  seed = 0,
) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = angle;
  parent.add(root);
  const paints = new Map();
  const add = (target, geometry, color, px, py, pz) => {
    if (!paints.has(color))
      paints.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
      );
    const m = new THREE.Mesh(geometry, paints.get(color));
    m.position.set(px, py, pz);
    m.castShadow = m.receiveShadow = true;
    target.add(m);
    return m;
  };
  const ball = (target, px, py, pz, r, color) =>
    add(target, new THREE.SphereGeometry(r, 20, 14), color, px, py, pz);
  const box = (target, px, py, pz, w, h, d, color, r = 0.04) =>
    add(
      target,
      new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)),
      color,
      px,
      py,
      pz,
    );
  const kind =
    role === "guard"
      ? "guard"
      : role === "dealer"
        ? "dealer"
        : ["grandpa", "grandma", "young", "guest"][seed % 4];
  const coat = {
    guard: "#222b33",
    dealer: "#304939",
    grandpa: "#75634b",
    grandma: "#977994",
    young: "#6e8fa7",
    guest: seed % 2 ? "#824657" : "#596b81",
  }[kind];
  const body = ball(root, 0, 1, 0, 0.53, coat);
  body.scale.set(kind === "guard" ? 1.22 : 1, 0.98, 0.85);
  box(
    root,
    0,
    1.03,
    0.08,
    kind === "guard" ? 1.16 : 0.86,
    0.82,
    0.68,
    coat,
    0.15,
  );
  ball(root, 0, 1.05, 0.43, 0.27, white).scale.set(0.75, 1.15, 0.25);
  for (const side of [-1, 1]) {
    const shoe = ball(root, side * 0.25, 0.22, 0.13, 0.25, black);
    shoe.scale.set(1, 0.7, 1.2);
    box(root, side * 0.24, 0.5, 0, 0.26, 0.55, 0.28, black, 0.08);
  }
  const head = new THREE.Group();
  head.position.y = 1.78;
  root.add(head);
  ball(head, 0, 0, 0, 0.49, white).scale.set(
    kind === "grandpa" ? 1.04 : 1,
    kind === "young" ? 1.06 : 1,
    1,
  );
  for (const side of [-1, 1]) {
    ball(head, side * 0.37, 0.35, -0.03, 0.18, black);
    ball(head, side * 0.19, 0.04, 0.4, 0.15, black).scale.set(0.88, 1.15, 0.4);
    ball(head, side * 0.19, 0.05, 0.48, 0.061, "#11191c");
    ball(head, side * 0.18, 0.073, 0.53, 0.02, "#ffffff");
  }
  ball(head, 0, -0.12, 0.44, 0.19, white).scale.set(1.2, 0.65, 0.55);
  ball(head, 0, -0.075, 0.54, 0.065, black).scale.set(1, 0.65, 0.8);
  box(head, 0, -0.18, 0.54, 0.09, 0.014, 0.012, black, 0.005);
  const arms = [-1, 1].map((side) => {
    const joint = new THREE.Group();
    joint.position.set(side * (kind === "guard" ? 0.57 : 0.45), 1.35, 0);
    root.add(joint);
    add(joint, new THREE.CapsuleGeometry(0.15, 0.28, 4, 10), coat, 0, -0.21, 0);
    ball(joint, 0, -0.46, 0.06, 0.17, black);
    batchStatic(joint);
    return joint;
  });
  function lapel(side) {
    const shape = new THREE.Shape();
    shape
      .moveTo(side * 0.31, 0.34)
      .lineTo(side * 0.06, 0.08)
      .lineTo(side * 0.22, -0.24)
      .closePath();
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({
        color: kind === "guard" ? "#414951" : "#b4a18b",
        side: THREE.DoubleSide,
      }),
    );
    m.position.set(0, 1.02, 0.43);
    root.add(m);
  }
  if (["guard", "dealer", "grandpa", "guest"].includes(kind)) {
    lapel(-1);
    lapel(1);
    box(
      root,
      0,
      1.15,
      0.46,
      0.095,
      0.29,
      0.025,
      kind === "guard" ? "#252b30" : "#783443",
      0.01,
    );
    for (const side of [-1, 1])
      box(root, side * 0.07, 1.33, 0.45, 0.13, 0.08, 0.025, "#eee7d6", 0.01);
    for (const y of [0.86, 0.69]) ball(root, 0, y, 0.43, 0.027, "#b99b64");
  }
  if (kind === "guard") {
    for (const side of [-1, 1])
      box(head, side * 0.19, 0.055, 0.535, 0.3, 0.16, 0.08, "#0b131a", 0.03);
    box(head, 0, 0.06, 0.55, 0.1, 0.035, 0.025, "#939b9b", 0.008);
    box(root, 0.31, 1.2, 0.44, 0.12, 0.17, 0.03, "#bfa366", 0.02);
    box(root, 0, 0.6, 0.27, 1, 0.08, 0.4, "#171c22", 0.02);
    ball(head, 0.43, 0.02, 0.06, 0.055, "#414a52");
    root.scale.set(1.16, 1.12, 1.12);
    arms.forEach((arm, i) => {
      arm.rotation.z = (i ? 1 : -1) * 0.17;
      arm.rotation.x = -0.16;
    });
  }
  if (kind === "grandpa" || kind === "grandma") {
    for (const side of [-1, 1]) {
      const glasses = add(
        head,
        new THREE.TorusGeometry(0.11, 0.013, 8, 24),
        "#a58e65",
        side * 0.19,
        0.06,
        0.55,
      );
      glasses.scale.y = 0.86;
      box(head, side * 0.18, 0.18, 0.46, 0.15, 0.025, 0.035, "#aaa99e", 0.01);
    }
    box(head, 0, 0.06, 0.55, 0.14, 0.02, 0.02, "#a58e65", 0.006);
  }
  if (kind === "grandpa") {
    for (const side of [-1, 1])
      ball(head, side * 0.085, -0.15, 0.55, 0.09, "#b7b6aa").scale.set(
        1.2,
        0.42,
        0.4,
      );
    const cane = add(
      root,
      new THREE.CylinderGeometry(0.025, 0.025, 0.83, 12),
      "#5a4031",
      0.68,
      0.5,
      0.15,
    );
    cane.rotation.z = -0.07;
    const handle = add(
      root,
      new THREE.TorusGeometry(0.08, 0.025, 8, 16, Math.PI),
      "#5a4031",
      0.66,
      0.91,
      0.15,
    );
    root.scale.set(0.97, 0.92, 0.97);
  }
  if (kind === "grandma") {
    ball(head, 0, 0.34, -0.37, 0.18, "#a9a9a0");
    for (let i = 0; i < 7; i++)
      ball(
        root,
        (i - 3) * 0.07,
        1.33 - Math.sin((i * Math.PI) / 6) * 0.08,
        0.45,
        0.032,
        "#eee2bf",
      );
    const bag = box(root, 0.64, 0.55, 0.15, 0.3, 0.34, 0.21, "#654b57", 0.07);
    add(
      root,
      new THREE.TorusGeometry(0.085, 0.018, 8, 20),
      "#baa379",
      0.64,
      0.78,
      0.15,
    );
    root.scale.set(0.96, 0.95, 0.96);
  }
  if (kind === "young") {
    add(
      head,
      new THREE.SphereGeometry(0.39, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      "#a44d47",
      0,
      0.27,
      -0.02,
    );
    box(head, 0, 0.31, 0.29, 0.54, 0.07, 0.37, "#a44d47", 0.035);
    box(root, 0, 1.13, 0.43, 0.2, 0.34, 0.04, "#e6b665", 0.02);
    root.scale.set(0.83, 0.84, 0.83);
  }
  batchStatic(root);
  batchStatic(head);
  return { root, head, arms, style: role, kind, seed };
}
export function animateCasinoPanda(npc, time, reduced = false) {
  if (reduced) {
    npc.head.rotation.set(0, 0, 0);
    npc.root.rotation.z = 0;
    return;
  }
  const t = time + npc.seed * 0.83,
    wave = Math.sin(t * 1.3);
  if (npc.style === "guard") {
    npc.head.rotation.y = Math.sin(t * 0.47) * 0.25;
    npc.head.rotation.x = Math.sin(t * 0.32) * 0.025;
    return;
  }
  npc.head.rotation.y = Math.sin(t * 0.63) * 0.08;
  const excited = npc.mood === "excited",
    frustrated = npc.mood === "frustrated";
  npc.arms.forEach((a, i) => {
    a.rotation.x = excited
      ? -0.6 - 0.5 * Math.sin(t * 2)
      : frustrated
        ? -0.35 - 0.32 * Math.sin(t * 3.3)
        : -0.18 + 0.13 * Math.sin(t * 1.1 + i);
  });
  npc.root.rotation.z = wave * (frustrated ? 0.024 : 0.012);
}
