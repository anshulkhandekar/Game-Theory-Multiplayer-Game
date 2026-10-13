import * as THREE from "three";
export function floorArrow(parent, x, z, direction = -1, color = "#d6b972") {
  const shape = new THREE.Shape();
  shape
    .moveTo(-1.1, -0.16)
    .lineTo(0.25, -0.16)
    .lineTo(0.25, -0.43)
    .lineTo(0.95, 0)
    .lineTo(0.25, 0.43)
    .lineTo(0.25, 0.16)
    .lineTo(-1.1, 0.16)
    .closePath();
  const arrow = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  arrow.rotation.x = -Math.PI / 2;
  arrow.rotation.z = direction < 0 ? Math.PI : 0;
  arrow.position.set(x, 0.025, z);
  arrow.receiveShadow = true;
  parent.add(arrow);
  return arrow;
}
