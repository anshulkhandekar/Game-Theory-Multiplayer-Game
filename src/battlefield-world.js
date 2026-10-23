import { batchStatic } from "./static-batch.js";
import { weaponCycle } from "../shared/battlefield-ambience.js";
import {
  groundTexture,
  terminalPrint,
  createAtmosphere,
} from "./battlefield-atmosphere.js";
import { unitParts } from "./battlefield-assets.js";
import * as THREE from "three";
import {
  BATTLE_ROUNDS,
  UNITS,
  teamPositions,
  frontPatch,
  frontPath,
  terminalPosition,
  HOME_RADIUS,
  barriersRaised,
  battlefieldBounds,
} from "../shared/battlefield.js";
export function createBattlefieldWorld(scene, label) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  let terrainKey = "",
    armyKey = "",
    battle,
    worldTime = 0,
    bases = [],
    shots = [],
    projectiles = [],
    terminals = [],
    printers = [],
    records = new Map(),
    batches = [],
    previewOrders = {},
    atmosphere,
    barriers = [],
    muzzleMesh,
    muzzleRecords = [];
  const terrain = new THREE.Group(),
    army = new THREE.Group();
  root.add(terrain, army);
  const dispose = (group) => {
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    group.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      if (o.geometry && !o.geometry.userData.shared) geometries.add(o.geometry);
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (!m.userData.shared) materials.add(m);
          if (m.map) textures.add(m.map);
        }
      }
    });
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
    group.clear();
  };
  function mesh(group, geometry, color, x, y, z) {
    const m = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  const box = (g, color, x, y, z, w, h, d) =>
    mesh(g, new THREE.BoxGeometry(w, h, d), color, x, y, z);
  function text(g, str, color, x, y, z, w = 8) {
    const s = label(str, color, w);
    s.position.set(x, y, z);
    g.add(s);
  }
  function update(state) {
    battle = state.battlefield;
    worldTime = state.worldTime;
    root.visible = !!battle && state.world.startsWith("battlefield");
    if (!root.visible) return;
    const config = BATTLE_ROUNDS[battle.round - 1],
      positions = teamPositions(battle.teams),
      key = JSON.stringify([
        battle.round,
        battle.teams.map((t) => [t.id, t.color]),
      ]);
    if (key !== terrainKey) {
      terrainKey = key;
      armyKey = "";
      dispose(terrain);
      bases = [];
      barriers = [];
      terminals = [];
      printers = [];
      records.clear();
      previewOrders = {};
      const ground = mesh(
        terrain,
        new THREE.PlaneGeometry(850, 700, 1, 1),
        config.ground,
        0,
        -0.05,
        0,
      );
      ground.rotation.x = -Math.PI / 2;
      ground.material.map = groundTexture(battle.round, config.ground);
      atmosphere = createAtmosphere(terrain, battle.round, positions);
      for (let i = 0; i < 125; i++) {
        const x = Math.sin(i * 81.71) * 250,
          z = Math.cos(i * 31.19) * 190;
        if (positions.some((p) => Math.hypot(x - p.x, z - p.z) < 22)) continue;
        if (battle.round === 1) {
          mesh(
            terrain,
            new THREE.ConeGeometry(6 + (i % 6), 3 + (i % 4), 12),
            i % 2 ? "#d3a76b" : "#e2c184",
            x,
            1,
            z,
          );
          if (i % 8 === 0) {
            box(terrain, "#8c7248", x, 2, z, 0.5, 4, 0.5);
            for (let j = 0; j < 4; j++) {
              const leaf = box(terrain, "#619779", x, 4, z, 4, 0.15, 0.8);
              leaf.rotation.y = (j * Math.PI) / 2;
              leaf.rotation.z = 0.3;
            }
          }
        } else if (battle.round === 2) {
          if (i % 3 === 0) {
            box(terrain, "#77563c", x, 1.6, z, 0.5, 3, 0.5);
            mesh(terrain, new THREE.ConeGeometry(2, 4, 7), "#478560", x, 4, z);
          } else
            mesh(
              terrain,
              new THREE.IcosahedronGeometry(0.4 + (i % 2) * 0.2, 0),
              ["#efacc7", "#efe397", "#a19cdd"][i % 3],
              x,
              0.3,
              z,
            );
        } else {
          const h = 5 + (i % 12);
          mesh(
            terrain,
            new THREE.ConeGeometry(5 + (i % 7), h, 5),
            battle.round === 3
              ? "#708990"
              : battle.round === 4
                ? "#b56846"
                : "#443c54",
            x,
            h / 2 - 1,
            z,
          );
          if (battle.round === 3 && i % 3 === 0)
            mesh(
              terrain,
              new THREE.ConeGeometry(3, h / 4, 5),
              "#eff1ed",
              x,
              h - 2,
              z,
            );
          if (battle.round === 5 && i % 7 === 0) {
            const lava = box(terrain, "#ef945b", x, 0.02, z, 7, 0.05, 2);
            lava.material.emissive.set("#e35c35");
            lava.material.emissiveIntensity = 0.5;
          }
        }
      }
      if (battle.round === 1) {
        const water = mesh(
          terrain,
          new THREE.CircleGeometry(8, 32),
          "#71c5c5",
          0,
          0.02,
          0,
        );
        water.rotation.x = -Math.PI / 2;
      }
      batchStatic(terrain);
      for (const t of battle.teams) {
        const p = positions.find((p) => p.id === t.id),
          base = new THREE.Group();
        base.position.set(p.x, 0, p.z);
        terrain.add(base);
        // Open-front canvas barracks, with enough space for three bears at once.
        box(base, "#9d9278", 0, 0.03, 0, 15, 0.06, 12);
        box(base, "#697b58", 0, 1.7, -5.8, 14, 3.4, 0.2);
        for (const x of [-7, 7]) {
          box(base, "#697b58", x, 1.7, -1.5, 0.2, 3.4, 8.5);
          for (const z of [-5.7, 5.7]) {
            box(base, "#435360", x, 2.1, z, 0.22, 4.2, 0.22);
            box(base, "#c5b89a", x, 4.25, z, 0.5, 0.15, 0.5);
          }
        }
        for (const sign of [-1, 1]) {
          const roof = box(
            base,
            t.color,
            sign * 3.55,
            4.45,
            0,
            7.7,
            0.18,
            12.5,
          );
          roof.rotation.z = -sign * 0.23;
        }
        box(base, "#435360", 0, 5.3, 0, 0.18, 0.2, 12.8);
        for (const x of [-5.6, 5.6]) {
          const flap = box(base, "#657655", x, 2, 5.7, 2.5, 3.7, 0.15);
          flap.rotation.z = x < 0 ? -0.1 : 0.1;
        }
        box(base, "#c8c7c3", 8, 3.5, 0, 0.15, 7, 0.15);
        box(base, t.color, 9, 6.2, 0, 2, 1.1, 0.08);
        text(base, t.name, t.color, 0, 6.7, 0, 10);
        for (const x of [-9, 9]) {
          box(base, "#6d7756", x, 0.75, -3, 2, 1.5, 2);
          for (const z of [-3.9, -2.1])
            box(base, "#374c3f", x, 0.75, z, 2.1, 1.6, 0.12);
          box(base, "#d4bc6c", x, 1.56, -3, 0.8, 0.05, 0.8);
        }
        const ring = mesh(
          base,
          new THREE.CylinderGeometry(2, 2, 0.12, 24),
          "#405365",
          0,
          0.16,
          -2,
        );
        ring.material.metalness = 0.45;
        const glow = mesh(
          base,
          new THREE.TorusGeometry(1.8, 0.055, 6, 32),
          "#69d7dd",
          0,
          0.27,
          -2,
        );
        glow.rotation.x = Math.PI / 2;
        glow.material.emissive.set("#45bacc");
        glow.material.emissiveIntensity = 1;
        const scanner = mesh(
          base,
          new THREE.CylinderGeometry(1.8, 1.8, 0.03, 24),
          "#79edf0",
          0,
          0.3,
          -2,
        );
        scanner.material.transparent = true;
        scanner.material.opacity = 0.4;
        scanner.material.emissive.set("#5ad5ed");
        scanner.material.emissiveIntensity = 1;
        scanner.visible = false;
        const lasers = [];
        for (const x of [-2.2, 2.2]) {
          box(base, "#405365", x, 2, -2, 0.25, 4, 0.25);
          const laser = box(base, "#f9c36a", x, 1.8, -2, 0.04, 3.3, 0.04);
          laser.material.emissive.set("#ffb452");
          laser.material.emissiveIntensity = 1.5;
          lasers.push(laser);
        }
        box(base, "#405365", 0, 4.05, -2, 4.6, 0.25, 0.35);
        batchStatic(base, new Set([scanner, ...lasers]));
        printers.push({ team: t.id, scanner, lasers });
        for (const f of battle.fronts.filter((f) =>
          [f.a, f.b].includes(t.id),
        )) {
          const pos = terminalPosition(battle.teams, t.id, f.lane),
            terminal = new THREE.Group();
          terminal.position.set(pos.x - p.x, 0, pos.z - p.z);
          base.add(terminal);
          box(terminal, "#405365", 0, 0.7, 0, 0.28, 1.4, 0.28);
          box(terminal, "#344350", 0, 1.65, 0, 2.75, 1.65, 0.22);
          const screen = box(
            terminal,
            "#67cbd8",
            0,
            1.75,
            0.14,
            2.45,
            1.25,
            0.05,
          );
          screen.material.emissive.set("#48a0b5");
          screen.material.emissiveIntensity = 0.28;
          const enemy = battle.teams.find(
            (x) => x.id === (f.a === t.id ? f.b : f.a),
          );
          // Screen artwork is a plane anchored to its housing, never a billboard sprite.
          const print = new THREE.Mesh(
            new THREE.PlaneGeometry(2.45, 1.25),
            new THREE.MeshBasicMaterial({
              map: terminalPrint(enemy.name, f.lane),
              toneMapped: false,
            }),
          );
          print.position.set(0, 1.75, 0.18);
          terminal.add(print);
          const button = box(
            terminal,
            "#7cd38c",
            0,
            1.08,
            0.15,
            1.9,
            0.18,
            0.11,
          );
          const arrow = mesh(
            terminal,
            new THREE.ConeGeometry(0.3, 0.55, 3),
            "#f7d481",
            0,
            3.25,
            0,
          );
          arrow.rotation.z = Math.PI;
          terminals.push({
            team: t.id,
            front: f.id,
            screen,
            button,
            arrow,
            print,
            position: pos,
          });
          // Three separate outlined defensive patches, facing the selected opponent.
          const layout = frontPatch(battle.teams, f, t.id),
            angle = layout.angle;
          const patch = new THREE.Group();
          patch.position.set(layout.x, 0.015, layout.z);
          patch.rotation.y = angle;
          terrain.add(patch);
          box(patch, "#7f9376", 0, 0, 0, 12, 0.025, 15);
          for (const x of [-6, 6])
            box(patch, t.color, x, 0.03, 0, 0.1, 0.06, 15);
          for (const z of [-7.5, 7.5])
            box(patch, t.color, 0, 0.03, z, 12, 0.06, 0.1);
          text(
            patch,
            `${f.lane === 0 ? "Supply" : "Field " + f.lane} · vs ${enemy.name}`,
            t.color,
            0,
            2.3,
            0,
            6,
          );
          f[`patch${t.id}`] = {
            x: patch.position.x,
            z: patch.position.z,
            angle,
          };
        }
        const border = mesh(
          terrain,
          new THREE.TorusGeometry(HOME_RADIUS, 0.12, 6, 80),
          t.color,
          p.x,
          0.13,
          p.z,
        );
        border.rotation.x = Math.PI / 2;
        barriers.push(border);
        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          barriers.push(
            box(
              terrain,
              "#485a5f",
              p.x + Math.sin(angle) * HOME_RADIUS,
              0.45,
              p.z + Math.cos(angle) * HOME_RADIUS,
              0.2,
              0.9,
              0.2,
            ),
          );
        }
        bases.push({ id: t.id, base });
      }
      const bounds = battlefieldBounds(battle.teams);
      for (const x of [-bounds.x, bounds.x])
        box(terrain, "#576873", x, 0.3, 0, 0.4, 0.6, bounds.z * 2);
      for (const z of [-bounds.z, bounds.z])
        box(terrain, "#576873", 0, 0.3, z, bounds.x * 2, 0.6, 0.4);
      for (const f of battle.fronts) {
        const path = frontPath(battle.teams, f);
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1],
            b = path[i];
          const line = box(
            terrain,
            f.lane === 0 ? "#f4d282" : "#a7bfaf",
            (a.x + b.x) / 2,
            0.015,
            (a.z + b.z) / 2,
            1.1,
            0.02,
            Math.hypot(b.x - a.x, b.z - a.z),
          );
          line.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        }
        const middle =
          path.length === 2
            ? { x: (path[0].x + path[1].x) / 2, z: (path[0].z + path[1].z) / 2 }
            : { x: path[1].x, z: (path[1].z + path[2].z) / 2 };
        text(
          terrain,
          `${f.lane === 0 ? "Supply" : "Field " + f.lane} · ${f.value} territory`,
          "#ffffff",
          middle.x,
          1.6,
          middle.z,
          battle.teams.length === 2 ? 6 : 8,
        );
      }
    }
    if (battle.phase === "planning") previewOrders = { ...battle.orders };
    const displayed = ["final", "countdown"].includes(battle.phase)
      ? { ...previewOrders, ...battle.orders }
      : battle.orders;
    const next = JSON.stringify([state.round, battle.phase, displayed]);
    if (next !== armyKey) {
      armyKey = next;
      dispose(army);
      shots = [];
      batches = [];
      muzzleRecords = [];
      muzzleMesh = null;
      projectiles = [];
      const groups = new Map(),
        live = new Set();
      for (const f of battle.fronts)
        for (const side of ["a", "b"]) {
          const t = battle.teams.find((t) => t.id === f[side]),
            p = positions.find((p) => p.id === t.id),
            enemy = positions.find((p) => p.id === f[side === "a" ? "b" : "a"]),
            order = displayed[`${t.id}:${f.id}`];
          if (!order || !Object.values(order).some(Boolean)) continue;
          const layout = frontPatch(battle.teams, f, t.id),
            angle = layout.angle,
            ux = Math.sin(angle),
            uz = Math.cos(angle);
          const anchor = new THREE.Vector3(layout.x, 0, layout.z);
          for (const u of [...UNITS, { id: "fort", name: "Forts", cost: 5 }]) {
            const count = Math.min(
                order[u.id] || 0,
                u.id === "troop"
                  ? 8
                  : u.id === "tank" || u.id === "heavy"
                    ? 3
                    : 2,
              ),
              groupKey = u.id + t.color;
            for (let i = 0; i < count; i++) {
              const recordKey = `${t.id}:${f.id}:${u.id}:${i}`,
                latest = battle.deployments
                  .filter(
                    (d) =>
                      d.team === t.id && d.front === f.id && d.unit === u.id,
                  )
                  .at(-1);
              let record = records.get(recordKey);
              if (!record) {
                record = {
                  birth: latest?.time ?? state.worldTime - 10,
                  spawn: new THREE.Vector3(p.x, 0, p.z - 2),
                  gate: new THREE.Vector3(p.x, 0, p.z + 8),
                };
                records.set(recordKey, record);
              }
              live.add(recordKey);
              record.position = new THREE.Vector3();
              record.angle = angle + Math.PI;
              record.type = u.id;
              record.index = i;
              const columns = u.id === "troop" ? 4 : count,
                spacing = u.id === "troop" ? 1.4 : 3.1;
              const lateral = ((i % columns) - (columns - 1) / 2) * spacing,
                depth = {
                  troop: 0,
                  tank: 3,
                  heavy: -2.5,
                  artillery: -5,
                  fort: -7,
                }[u.id];
              record.destination = anchor
                .clone()
                .add(new THREE.Vector3(uz * lateral, 0, -ux * lateral))
                .addScaledVector(
                  new THREE.Vector3(ux, 0, uz),
                  depth + Math.floor(i / columns) * 1.8,
                );
              record.path = [record.spawn, record.gate];
              if (record.destination.z < p.z + 4) {
                const side = ux >= 0 ? 1 : -1;
                record.path.push(
                  new THREE.Vector3(p.x + side * 11, 0, p.z + 8),
                  new THREE.Vector3(p.x + side * 11, 0, record.destination.z),
                );
              }
              record.path.push(record.destination);
              record.length = record.path
                .slice(1)
                .reduce(
                  (sum, point, i) => sum + point.distanceTo(record.path[i]),
                  0,
                );
              record.target = new THREE.Vector3(enemy.x, 1, enemy.z);
              if (!groups.has(groupKey))
                groups.set(groupKey, {
                  type: u.id,
                  color: t.color,
                  records: [],
                });
              groups.get(groupKey).records.push(record);
              shots.push(record);
            }
          }
          const shell = mesh(
            army,
            new THREE.SphereGeometry(0.22, 6, 4),
            "#ffc067",
            anchor.x,
            1,
            anchor.z,
          );
          shell.material.emissive.set("#f89c45");
          shell.material.emissiveIntensity = 1;
          const impact = mesh(
            army,
            new THREE.IcosahedronGeometry(0.7, 0),
            "#f8a05b",
            enemy.x,
            1,
            enemy.z,
          );
          impact.material.emissive.set("#e77a3c");
          impact.material.emissiveIntensity = 0.8;
          projectiles.push({
            shell,
            impact,
            start: anchor.clone().setY(1),
            end: new THREE.Vector3(enemy.x, 1, enemy.z),
            offset: f.lane * 0.2,
          });
          const summary = [...UNITS, { id: "fort", name: "Fortifications" }]
            .filter((u) => order[u.id])
            .map((u) => `${order[u.id]} ${u.name.toLowerCase()}`)
            .join(" · ");
          text(
            army,
            summary || `${order.fort} forts`,
            t.color,
            anchor.x,
            3.5,
            anchor.z,
            9,
          );
        }
      muzzleRecords = shots
        .filter((s) => s.type !== "fort" && s.index < 2)
        .slice(0, 240);
      if (muzzleRecords.length) {
        muzzleMesh = new THREE.InstancedMesh(
          new THREE.IcosahedronGeometry(1, 0),
          new THREE.MeshBasicMaterial({ color: "#ffd98b" }),
          muzzleRecords.length,
        );
        muzzleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        muzzleMesh.frustumCulled = false;
        army.add(muzzleMesh);
      }
      for (const [key] of records) if (!live.has(key)) records.delete(key);
      for (const g of groups.values()) {
        const instances = unitParts(g.type, g.color).map((part) => {
          const mesh = new THREE.InstancedMesh(
            part.geometry,
            part.material,
            g.records.length,
          );
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.frustumCulled = false;
          mesh.userData.motion = part.motion;
          mesh.castShadow = false;
          army.add(mesh);
          return mesh;
        });
        batches.push({ instances, records: g.records });
      }
    }
  }
  function frame(elapsed, reduced, low, cameraPosition) {
    if (!root.visible) return;
    const fighting = ["reveal", "results"].includes(battle.phase),
      progress =
        battle.phase === "results"
          ? 10
          : Math.max(0, 10 - battle.remaining + (battle.paused ? 0 : elapsed));
    const clock = worldTime + (battle.paused ? 0 : elapsed),
      matrix = new THREE.Matrix4(),
      quaternion = new THREE.Quaternion(),
      scale = new THREE.Vector3(),
      muzzlePosition = new THREE.Vector3(),
      muzzleScale = new THREE.Vector3(),
      axis = new THREE.Vector3(0, 1, 0),
      limbMatrix = new THREE.Matrix4(),
      pivot = new THREE.Matrix4(),
      back = new THREE.Matrix4(),
      swing = new THREE.Matrix4();
    for (const batch of batches) {
      batch.records.forEach((s, i) => {
        const age = Math.max(0, clock - s.birth),
          travel = Math.min(1, Math.max(0, (age - 0.8) / 4));
        let facing = s.angle;
        if (reduced) s.position.copy(s.destination);
        else if (age < 0.8) s.position.copy(s.spawn);
        else {
          let distance = travel * s.length;
          for (let j = 1; j < s.path.length; j++) {
            const from = s.path[j - 1],
              to = s.path[j],
              length = from.distanceTo(to);
            if (distance <= length || j === s.path.length - 1) {
              s.position
                .copy(from)
                .lerp(to, Math.min(1, distance / Math.max(0.001, length)));
              if (travel < 1) facing = Math.atan2(from.x - to.x, from.z - to.z);
              break;
            }
            distance -= length;
          }
        }
        if (fighting) {
          facing = Math.atan2(
            s.position.x - s.target.x,
            s.position.z - s.target.z,
          );
          s.facing = facing;
          if (!reduced && s.type !== "fort") {
            const advance = Math.min(0.23, progress * 0.028);
            s.position.lerp(s.target, advance);
            if (s.type === "troop")
              s.position.y =
                0.06 + Math.abs(Math.sin(clock * 10 + s.index)) * 0.1;
          }
        } else s.facing = facing;
        if (s.type === "troop" && !reduced && travel > 0 && travel < 1)
          s.position.y += Math.abs(Math.sin(age * 11)) * 0.12;
        quaternion.setFromAxisAngle(axis, facing);
        scale.setScalar(low && i % 2 ? 0 : 1);
        scale.y *= reduced ? 1 : Math.min(1, Math.max(0.02, age / 0.8));
        matrix.compose(s.position, quaternion, scale);
        for (const instance of batch.instances) {
          if (
            ["barrel", "rifle"].includes(instance.userData.motion) &&
            !reduced
          ) {
            const phase = weaponCycle(clock, s.type, s.index),
              recoil =
                fighting && battle.phase === "reveal" && phase < 0.16
                  ? Math.sin((phase / 0.16) * Math.PI) *
                    (s.type === "tank" ? 0.28 : 0.12)
                  : 0;
            swing.makeTranslation(0, 0, recoil);
            limbMatrix.copy(matrix).multiply(swing);
            instance.setMatrixAt(i, limbMatrix);
          } else if (instance.userData.motion && !reduced) {
            const left = instance.userData.motion === "leftLeg",
              x = left ? -0.23 : 0.23;
            const angle =
              (travel > 0 && travel < 1) || (fighting && progress < 8)
                ? Math.sin(age * 10 + (left ? 0 : Math.PI)) * 0.5
                : 0;
            pivot.makeTranslation(x, 0.63, 0);
            back.makeTranslation(-x, -0.63, 0);
            swing.makeRotationX(angle);
            limbMatrix
              .copy(matrix)
              .multiply(pivot)
              .multiply(swing)
              .multiply(back);
            instance.setMatrixAt(i, limbMatrix);
          } else instance.setMatrixAt(i, matrix);
        }
      });
      for (const instance of batch.instances)
        instance.instanceMatrix.needsUpdate = true;
    }
    if (muzzleMesh) {
      muzzleRecords.forEach((s, i) => {
        const local = {
          troop: [0.37, 0.8, -1.05],
          heavy: [0, 1.18, -1.9],
          tank: [0, 1.76, -2.98],
          artillery: [0, 2.43, -2.85],
        }[s.type];
        const visible =
          battle.phase === "reveal" &&
          !reduced &&
          (!low || i % 2 === 0) &&
          weaponCycle(clock, s.type, s.index) < 0.09;
        const pos = muzzlePosition.set(...local);
        quaternion.setFromAxisAngle(axis, s.facing ?? s.angle);
        pos.applyQuaternion(quaternion).add(s.position);
        matrix.compose(
          pos,
          quaternion,
          muzzleScale.setScalar(
            visible
              ? { troop: 0.16, heavy: 0.3, tank: 0.6, artillery: 0.7 }[s.type]
              : 0,
          ),
        );
        muzzleMesh.setMatrixAt(i, matrix);
      });
      muzzleMesh.instanceMatrix.needsUpdate = true;
    }
    for (const p of projectiles) {
      const t = (progress * 1.4 + p.offset) % 1;
      p.shell.visible = fighting && battle.phase === "reveal" && !reduced;
      p.impact.visible = p.shell.visible && t > 0.82;
      p.shell.position.copy(p.start).lerp(p.end, t);
      p.shell.position.y += Math.sin(t * Math.PI) * 3;
      p.impact.scale.setScalar(0.4 + t * 2);
    }
    for (const p of printers) {
      const recent = battle.deployments
          .filter(
            (d) => d.team === p.team && clock - d.time < 1.4 && clock >= d.time,
          )
          .at(-1),
        active = !!recent && !reduced;
      p.scanner.visible = active;
      p.scanner.position.y = 0.3 + ((clock - (recent?.time || 0)) % 1) * 2.4;
      p.lasers.forEach((l) => {
        l.visible = active;
      });
    }
    atmosphere?.frame(clock, reduced, low, cameraPosition);
    barriers.forEach((o) => (o.visible = barriersRaised(battle.phase)));
    for (const t of terminals) {
      t.arrow.visible =
        t.team === battle.team &&
        ["staging", "instructions", "planning", "final"].includes(battle.phase);
      t.arrow.position.y = 3.25 + (reduced ? 0 : Math.sin(clock * 2.5) * 0.2);
      t.button.scale.z = reduced ? 1 : 1 + Math.sin(clock * 2) * 0.04;
    }
    for (const { id, base } of bases) {
      const losses = battle.results.filter((r) =>
        r.a === id
          ? r.leftPoints < r.rightPoints
          : r.b === id
            ? r.rightPoints < r.leftPoints
            : false,
      ).length;
      const collapse = fighting && losses >= 2 ? Math.min(1, progress / 7) : 0;
      base.rotation.z = reduced ? 0 : collapse * 0.3;
      base.scale.y = 1 - collapse * 0.65;
    }
  }
  const ray = new THREE.Raycaster();
  function nearest(player) {
    if (!player || !battle || !root.visible) return null;
    return (
      terminals
        .filter(
          (t) =>
            t.team === battle.team &&
            Math.hypot(player.x - t.position.x, player.z - t.position.z) <= 7,
        )
        .sort(
          (a, b) =>
            Math.hypot(player.x - a.position.x, player.z - a.position.z) -
            Math.hypot(player.x - b.position.x, player.z - b.position.z),
        )[0]?.front || null
    );
  }
  function pick(camera, canvas, event, player) {
    const allowed = terminals.filter(
      (t) =>
        t.team === battle?.team &&
        player &&
        Math.hypot(player.x - t.position.x, player.z - t.position.z) <= 7,
    );
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = ray.intersectObjects(
      allowed.flatMap((t) => [t.screen, t.button, t.print]),
      false,
    )[0];
    return hit
      ? allowed.find(
          (t) =>
            t.screen === hit.object ||
            t.button === hit.object ||
            t.print === hit.object,
        )?.front
      : null;
  }
  return { update, frame, root, nearest, pick };
}
