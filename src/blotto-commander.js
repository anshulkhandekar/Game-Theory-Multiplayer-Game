import * as THREE from "three";
import { batchStatic } from "./static-batch.js";

// One static veteran officer, facing the practice table (-Z).
export function buildBlottoCommander(parent) {
  const root = new THREE.Group();
  root.name = "Colonel Blotto";
  root.position.set(22, 0, 46);
  parent.add(root);
  const uniform = "#435448",
    trim = "#d0ad63",
    dark = "#26343b";
  const paints = new Map();
  function piece(geometry, color, x, y, z, side = THREE.FrontSide) {
    const key = `${color}:${side}`;
    if (!paints.has(key)) {
      const metal = color === trim || color === "#afb6b4";
      const material = new THREE.MeshStandardMaterial({
        color,
        side,
        roughness: metal ? 0.42 : 0.84,
        metalness: metal ? 0.45 : 0,
      });
      material.userData.shared = true;
      paints.set(key, material);
    }
    const m = new THREE.Mesh(geometry, paints.get(key));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  }
  const ball = (x, y, z, r, color) =>
    piece(new THREE.SphereGeometry(r, 20, 12), color, x, y, z);
  const box = (x, y, z, w, h, d, color) =>
    piece(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  const cylinder = (x, y, z, top, bottom, height, color) =>
    piece(new THREE.CylinderGeometry(top, bottom, height, 24), color, x, y, z);
  const patch = (points, color, z) => {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) =>
      i ? shape.lineTo(x, y) : shape.moveTo(x, y),
    );
    shape.closePath();
    return piece(
      new THREE.ShapeGeometry(shape),
      color,
      0,
      0,
      z,
      THREE.DoubleSide,
    );
  };

  ball(0, 1.1, 0, 0.73, uniform).scale.set(1, 0.97, 0.86);
  ball(0, 2.1, 0, 0.65, "#eee9dc");
  for (const s of [-1, 1]) {
    ball(s * 0.48, 2.55, 0, 0.24, dark);
    ball(s * 0.25, 2.16, -0.55, 0.18, dark).scale.set(0.92, 1.07, 0.6);
    ball(s * 0.245, 2.18, -0.665, 0.065, "#101c23");
    ball(s * 0.23, 2.205, -0.72, 0.021, "#fff8e5");
    // Grey brows angle inward; small creases give him a weathered expression.
    box(s * 0.245, 2.335, -0.625, 0.23, 0.043, 0.045, "#a8aaa0").rotation.z =
      s * 0.16;
    box(s * 0.3, 2.025, -0.61, 0.11, 0.014, 0.025, "#abaea4").rotation.z =
      s * 0.1;
    ball(s * 0.37, 0.33, 0.07, 0.27, dark).scale.set(1, 0.78, 1.2);
    ball(s * 0.59, 1.3, -0.04, 0.22, uniform).scale.set(0.93, 1.5, 1);
    ball(s * 0.61, 1.04, -0.1, 0.18, dark);
    box(s * 0.52, 1.62, 0, 0.33, 0.075, 0.3, trim);
    for (const offset of [-0.08, 0, 0.08])
      box(s * 0.52 + offset, 1.665, -0.035, 0.023, 0.017, 0.2, "#efe1ad");
    patch(
      [
        [s * 0.1, 1.75],
        [s * 0.33, 1.62],
        [s * 0.15, 1.36],
      ],
      "#647563",
      -0.54,
    );
    ball(s * 0.105, 1.93, -0.645, 0.12, "#b7b9ae").scale.set(1.18, 0.42, 0.47);
  }
  ball(0, 2.035, -0.65, 0.13, "#f4efe1").scale.set(1.1, 0.8, 0.62);
  ball(0, 2.055, -0.737, 0.06, dark).scale.set(1, 0.64, 0.6);
  box(0, 1.868, -0.65, 0.15, 0.014, 0.023, dark);
  patch(
    [
      [-0.04, 1.68],
      [0.04, 1.68],
      [0.075, 1.37],
      [0, 1.3],
      [-0.075, 1.37],
    ],
    "#28352f",
    -0.585,
  );
  for (const y of [0.9, 1.08, 1.23]) ball(0, y, -0.626, 0.027, trim);
  box(0, 0.82, -0.585, 0.78, 0.075, 0.12, "#28352f");
  box(0, 0.82, -0.656, 0.13, 0.09, 0.03, trim);
  // Service ribbons and a hanging medal rather than a real-world insignia.
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 3; col++)
      box(
        0.2 + col * 0.072,
        1.57 - row * 0.073,
        -0.5 - row * 0.068,
        0.065,
        0.049,
        0.033,
        ["#ad6d63", "#cfbf86", "#6d8eaa"][(col + row) % 3],
      );
  box(0.34, 1.36, -0.595, 0.065, 0.11, 0.027, "#a26358");
  const medal = cylinder(0.34, 1.255, -0.632, 0.065, 0.065, 0.027, trim);
  medal.rotation.x = Math.PI / 2;
  box(-0.27, 1.49, -0.565, 0.18, 0.045, 0.025, "#c5ccbc");

  // Peaked olive cap, a dark band, gold piping and a simple star badge.
  cylinder(0, 2.69, 0, 0.58, 0.62, 0.25, uniform);
  cylinder(0, 2.595, 0, 0.627, 0.627, 0.082, dark);
  const piping = piece(
    new THREE.TorusGeometry(0.615, 0.014, 6, 32),
    trim,
    0,
    2.62,
    0,
  );
  piping.rotation.x = Math.PI / 2;
  ball(0, 2.565, -0.3, 0.51, dark).scale.set(1.23, 0.075, 0.85);
  const star = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5,
      r = i % 2 ? 0.046 : 0.096;
    star.push([Math.cos(a) * r, 2.705 + Math.sin(a) * r]);
  }
  patch(star, trim, -0.624);
  box(0.365, 2.33, -0.558, 0.018, 0.16, 0.015, "#b9b7a8").rotation.z = -0.35;
  batchStatic(root);
  return root;
}
