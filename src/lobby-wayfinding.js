import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
export const SKIN_LOCKER = { x: 12, z: 6 };
export const nearSkinLocker = (p) =>
  !!p && Math.hypot(p.x - SKIN_LOCKER.x, p.z - SKIN_LOCKER.z) < 3;
export function createLobbyWayfinding(parent, label) {
  const arrows = [];
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * 3.55, 2.7, 24);
    parent.add(g);
    const shape = new THREE.Shape()
      .moveTo(-1.1, -0.22)
      .lineTo(0.15, -0.22)
      .lineTo(0.15, -0.62)
      .lineTo(1.1, 0)
      .lineTo(0.15, 0.62)
      .lineTo(0.15, 0.22)
      .lineTo(-1.1, 0.22)
      .closePath();
    const m = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.07,
        bevelThickness: 0.06,
      }),
      new THREE.MeshStandardMaterial({
        color: side === 1 ? "#c6b7f0" : "#f0d17d",
        emissive: side === 1 ? "#74629d" : "#ae8240",
        emissiveIntensity: 0.35,
        metalness: 0.4,
        roughness: 0.4,
      }),
    );
    // Hall is approached facing +z, so arrows face the approaching player.
    m.rotation.y = side === 1 ? 0 : Math.PI;
    g.add(m);
    const text = label(
      side === 1 ? "Battlefield practice" : "Poker practice",
      side === 1 ? "#e3d6ff" : "#ffe0a0",
      4,
    );
    text.position.set(0, 1.1, 0);
    g.add(text);
    arrows.push(g);
  }
  const root = new THREE.Group();
  root.position.set(SKIN_LOCKER.x, 0, SKIN_LOCKER.z);
  root.rotation.y = -Math.PI / 2;
  parent.add(root);
  const wood = new THREE.MeshStandardMaterial({
      color: "#554366",
      roughness: 0.6,
    }),
    brass = new THREE.MeshStandardMaterial({
      color: "#d7bd80",
      metalness: 0.45,
      roughness: 0.35,
    });
  function box(w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.06), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  }
  box(2.4, 3.3, 0.8, 0, 1.65, 0, wood);
  for (const x of [-0.59, 0.59]) {
    box(
      1.1,
      3.06,
      0.09,
      x,
      1.65,
      0.44,
      new THREE.MeshStandardMaterial({ color: "#a294b0", roughness: 0.7 }),
    );
    box(0.08, 0.36, 0.12, x + (x < 0 ? 0.35 : -0.35), 1.5, 0.52, brass);
    for (let i = 0; i < 3; i++)
      box(0.52, 0.035, 0.035, x, 2.65 - i * 0.14, 0.51, wood);
  }
  const sign = label("Skin locker · Enter to change", "#ffdf9e", 5);
  sign.position.set(0, 4.3, 0);
  root.add(sign);
  const down = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 4), brass);
  down.rotation.z = Math.PI;
  down.position.set(0, 3.65, 0);
  root.add(down);
  return {
    frame(time, reduced) {
      arrows.forEach((a, i) => {
        a.position.y = 2.7 + (reduced ? 0 : Math.sin(time * 2 + i) * 0.13);
      });
      down.position.y = 3.7 + (reduced ? 0 : Math.sin(time * 2) * 0.1);
    },
  };
}
