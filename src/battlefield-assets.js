import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
// Small authored models, merged by paint color and later instanced across the map.
const cache = new Map();
export function unitParts(type, teamColor) {
  const key = type + teamColor;
  if (cache.has(key)) return cache.get(key);
  const paints = new Map(),
    group = new THREE.Group();
  let motion = null;
  const add = (geometry, color, x, y, z, rotation = {}) => {
    const mesh = new THREE.Mesh(geometry);
    mesh.position.set(x, y, z);
    Object.assign(mesh.rotation, rotation);
    mesh.updateMatrix();
    const g = (
      geometry.index ? geometry.toNonIndexed() : geometry.clone()
    ).applyMatrix4(mesh.matrix);
    geometry.dispose();
    const paintKey = color + "|" + (motion || "body");
    if (!paints.has(paintKey))
      paints.set(paintKey, { color, motion, geometries: [] });
    paints.get(paintKey).geometries.push(g);
    group.add(mesh);
  };
  const box = (color, x, y, z, w, h, d, rotation) =>
    add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rotation);
  const ball = (color, x, y, z, r) =>
    add(new THREE.SphereGeometry(r, 10, 8), color, x, y, z);
  const cyl = (color, x, y, z, r, length, rotation) =>
    add(new THREE.CylinderGeometry(r, r, length, 10), color, x, y, z, rotation);
  const steel = "#435360",
    rubber = "#26333d",
    olive = "#65785a",
    white = "#eeeae0",
    trim = "#c5c9b8";
  if (type === "troop") {
    box(olive, 0, 0.83, 0, 0.68, 0.78, 0.48);
    box(teamColor, 0, 0.96, -0.25, 0.52, 0.22, 0.08);
    box(steel, 0, 0.84, 0.3, 0.5, 0.6, 0.23);
    box(trim, 0, 1.1, 0.43, 0.3, 0.12, 0.08);
    ball(white, 0, 1.47, 0, 0.34);
    ball(rubber, -0.26, 1.73, 0, 0.12);
    ball(rubber, 0.26, 1.73, 0, 0.12);
    ball(rubber, -0.13, 1.48, -0.28, 0.1);
    ball(rubber, 0.13, 1.48, -0.28, 0.1);
    ball(white, -0.13, 1.5, -0.35, 0.035);
    ball(white, 0.13, 1.5, -0.35, 0.035);
    ball(olive, 0, 1.7, 0.02, 0.34);
    box(teamColor, 0, 1.73, -0.3, 0.25, 0.08, 0.08);
    for (const x of [-0.23, 0.23]) {
      motion = x < 0 ? "leftLeg" : "rightLeg";
      box(steel, x, 0.34, 0, 0.24, 0.6, 0.25);
      box(rubber, x, 0.11, -0.08, 0.3, 0.2, 0.4);
      motion = null;
      ball(olive, x * 1.8, 1.1, 0, 0.18);
      box(olive, x * 1.85, 0.84, -0.12, 0.2, 0.42, 0.2);
    }
    motion = "rifle";
    box(rubber, 0.37, 0.8, -0.4, 0.13, 0.14, 0.7);
    cyl(steel, 0.37, 0.8, -0.84, 0.045, 0.3, { x: Math.PI / 2 });
    motion = null;
    box(trim, -0.36, 0.93, -0.18, 0.13, 0.14, 0.2);
    cyl(steel, 0.17, 1.42, 0.35, 0.025, 0.7);
  } else if (type === "heavy") {
    box(rubber, 0, 0.24, 0, 1.8, 0.48, 1.6);
    box(olive, 0, 0.5, 0, 1.6, 0.35, 1.4);
    cyl(steel, 0, 0.85, 0, 0.38, 0.5);
    box(teamColor, 0, 1.15, 0, 1.3, 0.55, 0.9);
    box(trim, 0, 1.5, 0.1, 0.7, 0.14, 0.6);
    motion = "barrel";
    for (const x of [-0.34, 0.34]) {
      cyl(steel, x, 1.18, -0.95, 0.09, 1.5, { x: Math.PI / 2 });
      cyl(rubber, x, 1.18, -1.7, 0.13, 0.16, { x: Math.PI / 2 });
    }
    motion = null;
    for (const x of [-0.77, 0.77]) {
      box(steel, x, 0.9, 0.25, 0.22, 0.45, 0.7);
      box(trim, x, 1.08, 0.25, 0.25, 0.08, 0.7);
    }
    for (const x of [-0.83, 0.83])
      for (const z of [-0.48, 0, 0.48])
        cyl(trim, x, 0.28, z, 0.16, 0.1, { z: Math.PI / 2 });
    ball("#74e3ee", 0, 1.22, -0.49, 0.12);
  } else if (type === "tank") {
    for (const x of [-1.05, 1.05]) {
      box(rubber, x, 0.4, 0, 0.5, 0.8, 3.1);
      for (let z = -1.2; z <= 1.2; z += 0.6)
        cyl(steel, x * 1.2, 0.4, z, 0.29, 0.1, { z: Math.PI / 2 });
      for (let z = -1.35; z < 1.5; z += 0.3)
        box(trim, x, 0.78, z, 0.51, 0.08, 0.1);
    }
    box(olive, 0, 0.83, 0, 1.85, 0.8, 2.9);
    box(teamColor, 0, 1.1, -1.46, 1.5, 0.22, 0.08);
    box(steel, 0, 1.3, 0.93, 1.5, 0.12, 0.65);
    for (let x = -0.5; x < 0.6; x += 0.2)
      box(rubber, x, 1.38, 0.92, 0.07, 0.06, 0.55);
    cyl(steel, 0, 1.35, 0, 0.7, 0.22);
    box(olive, 0, 1.68, -0.1, 1.35, 0.6, 1.3);
    cyl(trim, 0, 2.02, 0.13, 0.29, 0.1);
    motion = "barrel";
    cyl(steel, 0, 1.76, -1.6, 0.13, 2.3, { x: Math.PI / 2 });
    cyl(rubber, 0, 1.76, -2.8, 0.19, 0.25, { x: Math.PI / 2 });
    motion = null;
    box(teamColor, 0, 1.98, -0.75, 0.4, 0.16, 0.08);
    box(steel, 0.47, 2.13, 0.1, 0.25, 0.15, 0.25);
    ball("#ffe5a1", -0.63, 0.95, -1.47, 0.12);
    ball("#ffe5a1", 0.63, 0.95, -1.47, 0.12);
    for (const x of [-0.5, 0.5])
      cyl(steel, x, 1.13, 1.5, 0.12, 0.5, { x: Math.PI / 2 });
    cyl(steel, -0.6, 2.23, 0.4, 0.025, 0.95);
  } else if (type === "artillery") {
    box(olive, 0, 0.85, 0, 1.6, 0.65, 3);
    box(teamColor, 0, 1.2, 0.95, 1.5, 0.4, 0.8);
    box(steel, 0, 1.3, -0.45, 1.15, 0.25, 1.7);
    for (const x of [-0.95, 0.95])
      for (const z of [-1, 0, 1]) {
        cyl(rubber, x, 0.4, z, 0.43, 0.3, { z: Math.PI / 2 });
        cyl(trim, x * 1.17, 0.4, z, 0.21, 0.1, { z: Math.PI / 2 });
      }
    box(olive, 0, 1.75, -0.2, 1.15, 0.7, 1.3);
    motion = "barrel";
    cyl(steel, 0, 2.13, -1.4, 0.15, 2.5, { x: Math.PI / 2 + 0.25 });
    cyl(rubber, 0, 2.43, -2.6, 0.21, 0.26, { x: Math.PI / 2 + 0.25 });
    motion = null;
    for (const x of [-0.6, 0.6]) box(steel, x, 1.5, 0, 0.2, 0.7, 0.2);
    cyl(trim, 0, 2.17, 0.16, 0.28, 0.12);
  } else {
    box("#b4ad96", 0, 0.5, 0, 2.4, 1, 1.5);
    box(teamColor, 0, 1.03, 0, 2.5, 0.12, 1.6);
    for (const x of [-0.8, 0, 0.8]) box(steel, x, 0.65, -0.77, 0.4, 0.17, 0.08);
  }
  const parts = [...paints.values()].map(({ color, motion, geometries }) => {
    const geometry = mergeGeometries(geometries);
    for (const g of geometries) g.dispose();
    geometry.userData.shared = true;
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.76 });
    material.userData.shared = true;
    return { geometry, material, motion };
  });
  cache.set(key, parts);
  return parts;
}
