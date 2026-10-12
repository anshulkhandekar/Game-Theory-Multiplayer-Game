import { batchStatic } from "./static-batch.js";
import { aircraftAt, sceneryExtent } from "../shared/battlefield-ambience.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Deterministic tiled detail: one small texture per map, no downloaded ground assets.
export function groundTexture(round, color) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d");
  c.fillStyle = color;
  c.fillRect(0, 0, 512, 512);
  let seed = round * 937;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 14000; i++) {
    const x = random() * 512,
      y = random() * 512;
    c.fillStyle =
      random() > 0.5 ? "rgba(255,240,205,.16)" : "rgba(25,38,32,.16)";
    if (round === 2) {
      c.strokeStyle = c.fillStyle;
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + random() * 3 - 1.5, y - 2 - random() * 5);
      c.stroke();
    } else {
      const size = round === 1 ? 1 + random() * 2 : 1 + random() * 7;
      c.fillRect(x, y, size, size * 0.5);
    }
  }
  if (round >= 3)
    for (let i = 0; i < 65; i++) {
      c.strokeStyle =
        round === 5 ? "rgba(244,139,69,.4)" : "rgba(32,40,45,.18)";
      c.lineWidth = 1 + random() * 2;
      let x = random() * 512,
        y = random() * 512;
      c.beginPath();
      c.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += random() * 35 - 17;
        y += random() * 35 - 17;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(90, 70);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export function terminalPrint(enemy, lane) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const c = canvas.getContext("2d");
  c.fillStyle = "#152e3c";
  c.fillRect(0, 0, 768, 384);
  c.strokeStyle = "#78dcd7";
  c.lineWidth = 10;
  c.strokeRect(8, 8, 752, 368);
  c.textAlign = "center";
  c.fillStyle = "#c1f4eb";
  c.font = "bold 64px sans-serif";
  c.fillText(enemy, 384, 102);
  c.fillStyle = "#f6d58b";
  c.font = "40px sans-serif";
  c.fillText(lane === 0 ? "Supply front" : "Field " + lane, 384, 171);
  c.fillStyle = "#7dda95";
  c.fillRect(45, 214, 678, 114);
  c.fillStyle = "#173830";
  c.font = "bold 42px sans-serif";
  c.fillText("Press E · Purchase units", 384, 284);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function createAtmosphere(parent, round, positions) {
  const root = new THREE.Group();
  parent.add(root);
  const steel = "#536674",
    dark = "#273745",
    ivory = "#c6ccc7",
    purple = "#7557a4";
  const mat = (color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
  const materials = new Map();
  function piece(group, color, x, y, z, w, h, d, geometry) {
    if (!materials.has(color)) materials.set(color, mat(color));
    const m = new THREE.Mesh(
      geometry || new THREE.BoxGeometry(w, h, d),
      materials.get(color),
    );
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }
  const box = (...args) => piece(...args);
  const backdropZ = sceneryExtent(positions).hangarZ;
  const fortress = new THREE.Group();
  fortress.position.set(0, 0, backdropZ);
  fortress.scale.setScalar(0.85);
  root.add(fortress);
  // Different distant infrastructure makes each landscape read as its own location.
  const district = new THREE.Group();
  root.add(district);
  const extent = sceneryExtent(positions);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = side * (extent.x + 55 + i * 9),
        z = (i - 1.5) * extent.z * 0.52;
      if (round === 1) {
        // Sandstone outpost ruins and an elevated aqueduct.
        box(district, "#af885c", x, 4, z, 12, 8, 9);
        box(district, "#dfbc7c", x, 8.5, z, 14, 1, 11);
        for (const dx of [-4, 0, 4])
          box(district, "#5b5749", x + dx, 4, z + 4.6, 1.6, 3, 0.1);
        box(district, "#c49e68", x + side * 16, 3, z, 2, 6, 2);
        box(district, "#c49e68", x + side * 8, 6, z, 18, 1.1, 2);
        box(district, "#697c55", x, 10, z, 6, 2, 5);
      } else if (round === 2) {
        // Hillside relay farm: silos, watch cabins and mast arrays.
        box(district, "#557d69", x, 3, z, 14, 6, 9);
        const roof = box(district, "#859681", x, 6.5, z, 16, 1.2, 11);
        roof.rotation.z = 0.08;
        piece(
          district,
          "#bcc6b5",
          x + 10,
          5,
          z,
          0,
          0,
          0,
          new THREE.CylinderGeometry(3, 3, 10, 12),
        );
        box(district, steel, x, 12, z, 1, 17, 1);
        for (let y = 14; y < 20; y += 2)
          box(district, ivory, x, y, z, 8, 0.2, 0.2);
      } else if (round === 3) {
        // Alpine research stations with radomes and cable pylons.
        box(district, "#71818b", x, 3, z, 16, 6, 12);
        piece(
          district,
          "#d9e7e3",
          x,
          7,
          z,
          0,
          0,
          0,
          new THREE.SphereGeometry(5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        );
        for (const dx of [-12, 12])
          box(district, steel, x + dx, 8, z, 1, 16, 1);
        box(district, ivory, x, 15, z, 27, 0.3, 0.3);
        box(district, "#8bbbc5", x + 6, 10, z, 3, 3, 3);
      } else if (round === 4) {
        // Canyon processing yards with smokestacks and pipe gantries.
        box(district, "#815f51", x, 4, z, 18, 8, 12);
        for (const dx of [-5, 5]) {
          piece(
            district,
            "#b79879",
            x + dx,
            11,
            z,
            0,
            0,
            0,
            new THREE.CylinderGeometry(1.6, 2.3, 14, 10),
          );
          box(district, "#404d54", x + dx, 18, z, 4, 0.8, 4);
        }
        box(district, "#caa36f", x, 10, z + 9, 25, 0.6, 0.6);
        for (const dx of [-12, 12])
          box(district, steel, x + dx, 5, z + 9, 0.6, 10, 0.6);
      } else {
        // Volcanic fortress satellites and exposed energy conduits.
        box(district, "#343944", x, 6, z, 17, 12, 12);
        box(district, "#66596f", x, 14, z, 11, 4, 8);
        for (const dx of [-6, 0, 6])
          box(district, "#df8651", x + dx, 8, z + 6.1, 0.4, 8, 0.15);
        box(district, "#a97055", x, 1, z + 10, 28, 0.5, 2);
        for (const dx of [-10, 10])
          box(district, steel, x + dx, 12, z, 2, 24, 2);
      }
    }
    // Bunkered service tunnel and approach beacons on the otherwise empty side.
    box(district, dark, side * (extent.x * 0.5), 5, extent.z + 65, 35, 10, 17);
    box(
      district,
      steel,
      side * (extent.x * 0.5),
      10.5,
      extent.z + 65,
      38,
      1,
      20,
    );
    for (let j = 0; j < 8; j++)
      box(
        district,
        round === 5 ? "#ee945d" : "#a0d5d4",
        side * (extent.x * 0.5) - 14 + j * 4,
        6,
        extent.z + 74,
        0.3,
        3,
        0.15,
      );
  }
  batchStatic(district);
  // A sloping, monumental portal frames the fleet staging inside the hangar.
  for (const side of [-1, 1]) {
    const tower = box(fortress, steel, side * 52, 24, 0, 30, 48, 40);
    tower.rotation.z = -side * 0.12;
    box(fortress, dark, side * 51, 2, 21, 36, 4, 7);
    for (let y = 8; y < 42; y += 7)
      box(fortress, ivory, side * 52, y, 21, 25, 0.6, 1);
    box(fortress, dark, side * 73, 13, -8, 18, 26, 38);
    box(fortress, purple, side * 72, 22, 12, 7, 15, 0.5);
    box(fortress, steel, side * 72, 33, 0, 2, 20, 2);
  }
  box(fortress, steel, 0, 49, 0, 110, 14, 42);
  box(fortress, dark, 0, 2, 0, 85, 4, 54);
  box(fortress, dark, 0, 24, -20, 88, 46, 2);
  for (const x of [-38, 38]) box(fortress, "#82d9d7", x, 21, 20, 1.2, 36, 1);
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(68, 15.6),
    new THREE.MeshStandardMaterial({
      map: new THREE.TextureLoader().load("/assets/club-banner.png"),
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  banner.material.map.colorSpace = THREE.SRGBColorSpace;
  banner.position.set(0, 50, 21.3);
  fortress.add(banner);
  // Worn edges and bolt strips leave the actual club artwork legible.
  for (let i = 0; i < 19; i++) {
    box(
      fortress,
      dark,
      -33 + i * 3.65,
      42.3 + (i % 3) * 0.2,
      21.5,
      1.1,
      0.25 + (i % 4) * 0.13,
      0.12,
    );
    if (i % 3 === 0)
      box(fortress, ivory, -32 + i * 3.6, 57.1, 21.5, 0.22, 0.22, 0.12);
  }
  const flags = [];
  const logo = new THREE.TextureLoader().load("/assets/panda-logo.png");
  logo.colorSpace = THREE.SRGBColorSpace;
  for (const side of [-1, 1]) {
    const flag = new THREE.Group();
    flag.position.set(side * 47, 61, 3);
    fortress.add(flag);
    box(flag, steel, 0, -4, 0, 0.5, 20, 0.5);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 8),
      new THREE.MeshStandardMaterial({
        map: logo,
        side: THREE.DoubleSide,
        color: "#ded0f7",
      }),
    );
    cloth.position.set(6, 0, 0);
    flag.add(cloth);
    flags.push(cloth);
  }
  function ship(helicopter = false) {
    const g = new THREE.Group();
    const body = box(g, steel, 0, 0, 0, 2, 1.6, 6);
    body.rotation.x = 0.08;
    box(g, "#a1d8e6", 0, 0.65, 1.1, 1.55, 0.7, 2);
    box(
      g,
      ivory,
      0,
      -0.25,
      -0.6,
      helicopter ? 3 : 10,
      0.18,
      helicopter ? 1.5 : 2.6,
    );
    box(g, dark, 0, 0.3, -4, 0.5, 1, 4);
    if (helicopter) {
      box(g, dark, 0, 1.3, -0.2, 0.3, 1, 0.3);
      const rotor = box(g, ivory, 0, 1.8, -0.2, 11, 0.1, 0.3);
      g.userData.rotor = rotor;
      for (const x of [-1.2, 1.2]) box(g, dark, x, -1, 0, 0.13, 0.15, 5);
    } else {
      const fin = box(g, purple, 0, 1.6, -3, 0.2, 2, 2);
      fin.rotation.x = 0.3;
      box(g, "#f4ad66", 0, 0, -3.5, 1, 0.8, 0.4);
    }
    return g;
  }
  for (let i = 0; i < 5; i++) {
    const parked = ship(i % 3 === 0);
    parked.position.set((i - 2) * 13, 4, -7 + (i % 2) * 9);
    parked.rotation.y = i % 2 ? 0.4 : -0.3;
    fortress.add(parked);
  }
  const aircraft = Array.from({ length: 8 }, (_, i) => {
    const g = ship(i >= 6);
    root.add(g);
    return g;
  });
  function titan(side, index) {
    const g = new THREE.Group();
    root.add(g);
    const sphere = (group, color, x, y, z, r, sx = 1, sy = 1, sz = 1) => {
      const m = piece(
        group,
        color,
        x,
        y,
        z,
        0,
        0,
        0,
        new THREE.SphereGeometry(r, 14, 10),
      );
      m.scale.set(sx, sy, sz);
      return m;
    };
    box(g, steel, 0, 8, 0, 4.7, 4.8, 3.2);
    for (const side of [-1, 1]) {
      const armor = box(g, ivory, side * 1.25, 8.8, 1.75, 2.2, 2.3, 0.5);
      armor.rotation.z = side * 0.12;
      box(g, dark, side * 1.25, 7.1, 1.85, 1.8, 0.5, 0.25);
      sphere(g, dark, side * 2.65, 9.2, 0, 0.85);
      sphere(g, steel, side * 1.8, 13.25, 0, 0.83);
      sphere(g, dark, side * 1.8, 13.25, 0.55, 0.5);
    }
    sphere(g, ivory, 0, 11.8, 0, 2.2, 1, 0.86, 0.88);
    sphere(g, ivory, 0, 11.3, 1.7, 0.85, 1.2, 0.7, 0.5);
    sphere(g, dark, 0, 11.5, 2.1, 0.27);
    box(g, purple, 0, 8.5, 2.1, 1.1, 1.1, 0.18);
    const arms = [];
    for (const s of [-1, 1]) {
      sphere(g, dark, s * 0.85, 12.05, 1.65, 0.7, 0.85, 1.05, 0.35);
      const light = sphere(
        g,
        side < 0 ? "#f4a18a" : "#83e3da",
        s * 0.85,
        12.1,
        1.92,
        0.22,
        0.75,
        0.5,
        0.3,
      );
      light.material.emissive = new THREE.Color(
        side < 0 ? "#ef775f" : "#6ed8d5",
      );
      const arm = new THREE.Group();
      arm.position.set(s * 2.6, 9, 0);
      g.add(arm);
      arms.push(arm);
      box(arm, steel, s * 0.3, -1.2, 0, 1.35, 2.6, 1.6);
      sphere(arm, dark, s * 0.3, -2.4, 0, 0.65);
      box(arm, ivory, s * 0.35, -2.8, 1.1, 1.7, 1.6, 2.8);
      box(arm, dark, s * 0.35, -2.7, 3, 1, 1, 2.4);
      for (const y of [-2.3, -2.8, -3.3])
        box(arm, steel, s * 0.35, y, 3.8, 1.1, 0.2, 0.8);
      box(arm, purple, s * 0.35, -2.2, 1.2, 1.8, 0.3, 2);
    }
    const legs = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(s * 1.5, 6, 0);
      g.add(leg);
      box(leg, steel, 0, -1.6, 0, 1.6, 3.2, 1.6);
      sphere(leg, dark, 0, -3, 0, 0.72);
      box(leg, ivory, 0, -3.5, 0.7, 1.7, 1.8, 0.7);
      box(leg, dark, 0, -4.2, 0, 1.4, 2, 1.4);
      box(leg, steel, 0, -4.8, 0.5, 2, 1.6, 3);
      legs.push(leg);
    }
    g.position.set(side * (66 + index * 19), 0, backdropZ + 45 + index * 9);
    g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    return { g, legs, arms, side, index };
  }
  const robots = [titan(-1, 0), titan(1, 0), titan(-1, 1), titan(1, 1)];
  // Merge static parts by paint inside each moving rig to bound background draw calls.
  function mergeParts(group, skip = new Set()) {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert(),
      parts = new Map(),
      remove = [];
    for (const child of group.children) {
      if (!child.isMesh || skip.has(child)) continue;
      const key = child.material.uuid;
      if (!parts.has(key))
        parts.set(key, { material: child.material, geometry: [] });
      const g = child.geometry.clone();
      g.applyMatrix4(inverse.clone().multiply(child.matrixWorld));
      parts.get(key).geometry.push(g);
      remove.push(child);
    }
    for (const child of remove) {
      group.remove(child);
      child.geometry.dispose();
    }
    for (const part of parts.values()) {
      const merged = mergeGeometries(part.geometry);
      part.geometry.forEach((g) => g.dispose());
      group.add(new THREE.Mesh(merged, part.material));
    }
  }
  robots.forEach((r) => {
    r.legs.forEach((l) => mergeParts(l));
    r.arms.forEach((a) => mergeParts(a));
    mergeParts(r.g);
  });
  aircraft.forEach((g) => mergeParts(g, new Set([g.userData.rotor])));
  for (const child of fortress.children.filter((g) => g.isGroup))
    mergeParts(child, new Set(flags));
  mergeParts(fortress);
  const tracers = robots.map((r) => {
    const m = box(root, "#ffc484", 0, 0, 0, 0.18, 0.18, 3);
    m.material.emissive = new THREE.Color("#e99452");
    return m;
  });
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 1024;
  skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext("2d"),
    skyGradient = skyCtx.createLinearGradient(0, 0, 0, 512);
  skyGradient.addColorStop(0, round === 5 ? "#79788f" : "#75a4cb");
  skyGradient.addColorStop(0.65, round === 5 ? "#d0a9b5" : "#c9e3ec");
  skyGradient.addColorStop(1, round === 5 ? "#dcafa0" : "#e9e6ce");
  skyCtx.fillStyle = skyGradient;
  skyCtx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 70; i++) {
    const x = (Math.sin(i * 73.1) + 1) * 512,
      y = 140 + (Math.cos(i * 11.7) + 1) * 100,
      r = 25 + (i % 40);
    const cloud = skyCtx.createRadialGradient(x, y, 0, x, y, r);
    cloud.addColorStop(
      0,
      round === 5 ? "rgba(104,94,116,.22)" : "rgba(255,255,255,.45)",
    );
    cloud.addColorStop(1, "rgba(255,255,255,0)");
    skyCtx.fillStyle = cloud;
    skyCtx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  sky.renderOrder = -10;
  root.add(sky);
  const impactSites = robots.map((r) => ({
    x: r.g.position.x + 10 * r.side,
    z: r.g.position.z + 8,
  }));
  for (const x of [-45, 0, 45])
    if (!positions.some((p) => Math.hypot(p.x - x, p.z) < 34))
      impactSites.push({ x, z: 0 });
  const bursts = impactSites.map((p, i) => {
    const flash = piece(
      root,
      "#ffba72",
      p.x,
      1,
      p.z,
      0,
      0,
      0,
      new THREE.IcosahedronGeometry(1, 1),
    );
    const dust = piece(
      root,
      "#69717a",
      p.x,
      2,
      p.z,
      0,
      0,
      0,
      new THREE.IcosahedronGeometry(1, 1),
    );
    flash.material = new THREE.MeshBasicMaterial({
      color: "#ffba72",
      transparent: true,
      opacity: 0.85,
    });
    dust.material = new THREE.MeshBasicMaterial({
      color: "#69717a",
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    return { flash, dust, p, i };
  });
  return {
    frame(time, reduced, low, cameraPosition) {
      if (cameraPosition) sky.position.copy(cameraPosition);
      bursts.forEach(({ flash, dust, p, i }) => {
        const age = (time + i * 2.1) % 11;
        flash.visible = !reduced && (!low || i === 0) && age < 0.3;
        dust.visible = !reduced && (!low || i === 0) && age < 2.4;
        flash.scale.setScalar(0.3 + age * 10);
        dust.scale.setScalar(1 + age * 2);
        dust.position.y = 1 + age * 2.5;
        dust.material.opacity = Math.max(0, 0.4 - age * 0.16);
      });
      flags.forEach(
        (f, i) =>
          (f.rotation.y = reduced ? 0 : Math.sin(time * 1.3 + i) * 0.12),
      );
      const routes = aircraftAt(reduced ? 15 : time, positions);
      aircraft.forEach((g, i) => {
        const route = routes[i];
        g.visible = !low || i === 0 || i === 6;
        g.position.set(route.x, route.y, route.z);
        g.rotation.y = route.angle;
        if (g.userData.rotor)
          g.userData.rotor.rotation.y = reduced ? 0 : time * 24;
      });
      robots.forEach((r, i) => {
        r.g.visible = !low || i < 2;
        r.g.position.x =
          r.side * (66 + r.index * 19) +
          (reduced ? 0 : Math.sin(time * 0.3 + i) * 6);
        r.legs.forEach(
          (l, j) =>
            (l.rotation.x = reduced
              ? 0
              : Math.sin(time * 1.5 + i + j * Math.PI) * 0.16),
        );
        r.arms.forEach(
          (a, j) =>
            (a.rotation.x = reduced ? 0 : Math.sin(time * 2 + i + j) * 0.08),
        );
        const fall = ((time + i * 9) % 36) / 36;
        r.g.rotation.z = reduced
          ? 0
          : i % 2 && fall > 0.76
            ? Math.sin(((fall - 0.76) / 0.24) * Math.PI) * 0.65
            : 0;
        const shot = tracers[i];
        const t = (time * 0.8 + i * 0.24) % 1;
        shot.visible = !reduced && !low && t < 0.5;
        shot.position.set(
          r.g.position.x * (1 - t * 2),
          7,
          backdropZ + 46 + r.index * 9,
        );
        shot.rotation.y = Math.PI / 2;
      });
    },
  };
}
