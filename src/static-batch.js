import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
// Only direct, opaque, untextured children: animated rigs and interaction meshes stay intact.
export function batchStatic(group, excluded = new Set()) {
  const paints = new Map();
  for (const child of [...group.children]) {
    if (
      !child.isMesh ||
      excluded.has(child) ||
      child.material.map ||
      child.material.transparent ||
      Array.isArray(child.material)
    )
      continue;
    const m = child.material;
    const key = [
      m.type,
      m.color?.getHex(),
      m.emissive?.getHex(),
      m.emissiveIntensity,
      m.roughness,
      m.metalness,
      m.side,
      Object.keys(child.geometry.attributes).sort().join(","),
    ].join(":");
    child.updateMatrix();
    if (!paints.has(key))
      paints.set(key, { material: m, parts: [], originals: [] });
    const paint = paints.get(key);
    let geometry = child.geometry.clone().applyMatrix4(child.matrix);
    // Rounded furniture is unindexed; normalize copies so it can share a batch
    // with indexed spheres/cylinders without merge errors or lost detail.
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    paint.parts.push(geometry);
    paint.originals.push(child);
  }
  for (const { material, parts, originals } of paints.values()) {
    if (parts.length < 2) {
      parts.forEach((g) => g.dispose());
      continue;
    }
    const geometry = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    if (!geometry) continue;
    for (const child of originals) {
      group.remove(child);
      child.geometry.dispose();
      if (child.material !== material && !child.material.userData.shared)
        child.material.dispose();
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = originals.some((m) => m.castShadow);
    mesh.receiveShadow = originals.some((m) => m.receiveShadow);
    group.add(mesh);
  }
}
