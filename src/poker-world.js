import { createCasinoPanda, animateCasinoPanda } from "./casino-characters.js";
import { createSlotMachine } from "./casino-machines.js";
import * as THREE from "three";
import { batchStatic } from "./static-batch.js";
import { createPlayingCard } from "./playing-cards.js";
import { tableLayout } from "../shared/poker.js";
import { BLOTTO_WALLS } from "../shared/blotto.js";
const C = {
  wood: "#39251e",
  brass: "#ba9250",
  felt: "#174b3b",
  velvet: "#582b37",
  ink: "#192529",
  ivory: "#e9dfc7",
};
function kit(root) {
  const paints = new Map();
  const mat = (color) => {
    if (!paints.has(color))
      paints.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: color === C.brass ? 0.32 : 0.8,
          metalness: color === C.brass ? 0.65 : 0,
        }),
      );
    return paints.get(color);
  };
  const shape = (g, c, x, y, z) => {
    const m = new THREE.Mesh(g, mat(c));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const box = (x, y, z, w, h, d, c) =>
    shape(new THREE.BoxGeometry(w, h, d), c, x, y, z);
  const cyl = (x, y, z, r, h, c) =>
    shape(new THREE.CylinderGeometry(r, r, h, 20), c, x, y, z);
  const sphere = (x, y, z, r, c) =>
    shape(new THREE.SphereGeometry(r, 12, 8), c, x, y, z);
  return { box, cyl, sphere, shape };
}
const panda = createCasinoPanda;
function table(parent, x, z, index, label) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  parent.add(root);
  const k = kit(root);
  k.cyl(0, 0.6, 0, 0.42, 1.2, C.wood);
  k.cyl(0, 0.12, 0, 1.2, 0.18, C.brass);
  const rim = k.cyl(0, 1.3, 0, 2.1, 0.25, C.wood);
  rim.scale.z = 0.7;
  const trim = k.cyl(0, 1.44, 0, 1.94, 0.035, C.brass);
  trim.scale.z = 0.7;
  const felt = k.cyl(0, 1.465, 0, 1.87, 0.04, C.felt);
  felt.scale.z = 0.7;
  for (const s of [-1, 1]) {
    k.cyl(0, 0.56, s * 2.15, 0.54, 0.16, C.velvet);
    k.cyl(0, 0.28, s * 2.15, 0.1, 0.55, C.brass);
    k.box(0, 0.95, s * 2.6, 1.1, 0.85, 0.17, C.velvet);
    for (const x of [-0.56, 0.56])
      k.box(x, 0.72, s * 2.15, 0.1, 0.6, 0.7, C.wood);
    for (let i = 0; i < 5; i++)
      k.cyl(
        s * 0.95,
        1.53 + i * 0.045,
        s * 0.72,
        0.15,
        0.04,
        i % 2 ? C.ivory : C.velvet,
      );
  }
  if (label) {
    const title = label("Table " + (index + 1), "#e9d5a4", 2.7);
    title.position.set(0, 3, 0);
    title.userData.tableLabel = true;
    root.add(title);
  }
  batchStatic(root);
  return root;
}
function cardBack(k, x, y, z) {
  k.box(x, y, z, 0.65, 0.025, 0.95, "#345b70");
  k.box(x, y + 0.015, z, 0.5, 0.01, 0.78, C.brass);
  k.box(x, y + 0.025, z, 0.45, 0.01, 0.72, "#345b70");
}
function casinoShell(parent, label, small = false) {
  const root = new THREE.Group();
  parent.add(root);
  const k = kit(root);
  const half = small ? 8 : 24,
    depth = small ? 12 : 25;
  k.box(0, -0.2, 0, half * 2, 0.4, depth * 2, C.wood);
  k.box(0, 0.008, 0, half * 2 - 1, 0.02, depth * 2 - 1, "#34232c");
  for (let x = -half + 1; x < half; x += 2)
    for (let z = -depth + 1; z < depth; z += 2) {
      const m = k.box(x, 0.028, z, 0.22, 0.025, 0.22, C.brass);
      m.rotation.y = Math.PI / 4;
    }
  for (const s of [-1, 1]) {
    k.box(
      s * half,
      small ? 2.75 : 3.6,
      0,
      0.5,
      small ? 5.5 : 7.2,
      depth * 2,
      C.wood,
    );
    if (!small || s === 1)
      k.box(
        0,
        small ? 2.75 : 3.6,
        s * depth,
        half * 2,
        small ? 5.5 : 7.2,
        0.5,
        C.wood,
      );
    k.box(s * (half - 0.29), 1.45, 0, 0.08, 0.1, depth * 2, C.brass);
    if (!small || s === 1)
      k.box(0, 1.45, s * (depth - 0.29), half * 2, 0.1, 0.08, C.brass);
    k.box(
      s * (half - 0.28),
      small ? 5.1 : 6.7,
      0,
      0.12,
      0.18,
      depth * 2,
      C.brass,
    );
    for (let z = -depth + 3; z < depth; z += 5) {
      k.box(
        s * (half - 0.31),
        small ? 3.1 : 3.7,
        z,
        0.06,
        small ? 2.6 : 3.6,
        3.5,
        C.velvet,
      );
      k.box(s * (half - 0.4), small ? 4.7 : 5.3, z, 0.25, 0.65, 0.4, C.brass);
      for (const offset of [-1.75, 1.75])
        k.box(
          s * (half - 0.36),
          small ? 3.1 : 3.7,
          z + offset,
          0.08,
          small ? 2.7 : 3.7,
          0.065,
          C.brass,
        );
      for (const y of small ? [1.75, 4.45] : [1.85, 5.55])
        k.box(s * (half - 0.36), y, z, 0.08, 0.065, 3.55, C.brass);
    }
  }
  const roof = k.box(
    0,
    small ? 5.65 : 7.4,
    0,
    half * 2,
    0.3,
    depth * 2,
    C.wood,
  );
  roof.castShadow = false;
  if (!small) {
    for (const x of [-13, 13]) {
      const light = new THREE.PointLight("#ffd6a0", 65, 48, 2);
      light.position.set(x, 5, 0);
      root.add(light);
    }
  }
  // Detailed chandelier rigs use emissive bulbs, not a light per bulb.
  for (const x of small ? [0] : [-12, 0, 12])
    for (const z of small ? [0] : [-12, 2, 15]) {
      const offset = small ? -1.6 : 0;
      k.cyl(x, 6.4 + offset, z, 0.035, 1.8, C.brass);
      const hoop = k.shape(
        new THREE.TorusGeometry(1.4, 0.065, 8, 24),
        C.brass,
        x,
        5.8 + offset,
        z,
      );
      hoop.rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        k.cyl(
          x + Math.cos(a) * 1.4,
          5.7 + offset,
          z + Math.sin(a) * 1.4,
          0.07,
          0.35,
          C.brass,
        );
        const bulb = k.sphere(
          x + Math.cos(a) * 1.4,
          5.95 + offset,
          z + Math.sin(a) * 1.4,
          0.13,
          "#ffe1a0",
        );
        bulb.material = new THREE.MeshStandardMaterial({
          color: "#ffe1a0",
          emissive: "#ffbc5d",
          emissiveIntensity: 1.2,
        });
      }
    }
  const rigs = [],
    machines = [],
    wheels = [];
  if (!small) {
    for (let i = 0; i < 8; i++) {
      const z = -17 + i * 4.5,
        x = -21;
      machines.push(createSlotMachine(root, x, z, Math.PI / 2, i));
      const npc = panda(root, x + 2.1, z, "player", -Math.PI / 2, i);
      npc.mood = ["excited", "frustrated", "hopeful"][i % 3];
      rigs.push(npc);
      if (i % 3 === 0) {
        const line = label(
          i === 0 ? "One more spin…" : "Jackpot!",
          "#f0dfac",
          2.6,
        );
        line.position.set(x + 2, 3, z);
        root.add(line);
      }
    }
    // Roulette vignette, bar, cashier grille and watchful corner guards.
    for (const z of [-15, 0, 15]) {
      k.box(20, 1, z, 3, 2, 4.5, C.wood);
      k.box(20, 2.04, z, 3.2, 0.12, 4.6, C.felt);
      k.cyl(20, 2.2, z, 1, 0.18, C.brass);
      const wheel = new THREE.Group();
      wheel.position.set(20, 2.3, z);
      root.add(wheel);
      const wk = kit(wheel);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const wedge = wk.box(
          Math.cos(a) * 0.7,
          0.01,
          Math.sin(a) * 0.7,
          0.22,
          0.05,
          0.22,
          i % 2 ? "#282722" : "#862f36",
        );
        wedge.rotation.y = -a;
      }
      wk.sphere(0.82, 0.1, 0, 0.06, C.ivory);
      batchStatic(wheel);
      wheels.push(wheel);
      rigs.push(panda(root, 17.5, z, "dealer", Math.PI / 2));
      rigs.push(panda(root, 20, z + 3, "player", Math.PI, (z + 15) / 15 + 1));
    }
    k.box(0, 1.1, -22, 12, 2.2, 1.5, C.wood);
    k.box(0, 2.3, -22, 12.5, 0.2, 2, C.brass);
    for (let i = -5; i <= 5; i++) {
      k.cyl(
        i,
        2.65,
        -22,
        0.1,
        0.5,
        ["#426e55", "#a25645", "#bd9c63"][(i + 5) % 3],
      );
      k.cyl(i, 2.99, -22, 0.04, 0.18, C.brass);
    }
    for (const x of [-22, 22])
      for (const z of [-22, 22])
        rigs.push(
          panda(
            root,
            x,
            z,
            "guard",
            x > 0 ? -Math.PI / 2 : Math.PI / 2,
            rigs.length,
          ),
        );
    const sign = label("Kuhn Poker · Panda Casino", "#ead6a7", 12);
    sign.position.set(0, 5.4, -24.6);
    root.add(sign);
    const bar = label("Refreshments", "#cfb885", 7);
    bar.position.set(0, 3.4, -22);
    root.add(bar);
  }
  batchStatic(root, new Set([roof]));
  return {
    root,
    roof,
    rigs,
    machines,
    wheels,
    frame(time, reduced, low) {
      machines.forEach((m) => m.frame(time, reduced));
      wheels.forEach((w, i) => (w.rotation.y = reduced ? 0 : time * 0.34 + i));
      rigs.forEach((npc, i) => {
        npc.root.visible = !low || npc.style === "guard" || i % 3 === 0;
        animateCasinoPanda(npc, time, reduced);
      });
    },
  };
}
export function createPokerWorld(scene, label) {
  const shell = casinoShell(scene, label);
  shell.root.visible = false;
  const tables = new THREE.Group();
  shell.root.add(tables);
  let count = 0,
    phase = "instructions";
  const prototypes = Object.fromEntries(
    ["J", "Q", "K"].map((r, i) => [
      r,
      createPlayingCard(r, ["club", "heart", "spade"][i]),
    ]),
  );
  const visibleCards = new THREE.Group();
  shell.root.add(visibleCards);
  let cardKey = "";
  const payouts = new THREE.Group();
  shell.root.add(payouts);
  const payoutKeys = new Set(),
    payoutSprites = [];
  function clearPayout(sprite) {
    payouts.remove(sprite);
    sprite.material.map?.dispose();
    sprite.material.dispose();
  }

  return {
    root: shell.root,
    update(state, id) {
      shell.root.visible = state.world === "casino";
      phase = state.poker?.phase;
      if (!shell.root.visible) {
        payoutKeys.clear();
        payoutSprites.splice(0).forEach((p) => clearPayout(p.sprite));
        return;
      }
      if (!id)
        for (const t of state.poker.tables) {
          const key = `${state.round}:${state.poker.round}:${t.id}:${t.hand}`;
          if (t.result && !payoutKeys.has(key)) {
            payoutKeys.add(key);
            t.players.forEach((_, i) => {
              const n = t.result.net[i],
                sprite = label(
                  `${n > 0 ? "+" : ""}${n} chip${Math.abs(n) === 1 ? "" : "s"}`,
                  n > 0 ? "#95ffae" : "#ff9b93",
                  2.6,
                );
              sprite.position.set(t.x, 3.2, t.z + (i ? -2.15 : 2.15));
              payouts.add(sprite);
              payoutSprites.push({ sprite, born: performance.now() / 1000 });
            });
          }
        }

      const n = state.poker?.tables.length || 0;
      if (n !== count) {
        while (tables.children.length) {
          const child = tables.children[0];
          child.traverse((o) => {
            o.geometry?.dispose();
            if (o.material) {
              o.material.map?.dispose();
              o.material.dispose();
            }
          });
          tables.remove(child);
        }
        count = n;
        tableLayout(n).forEach((t) => {
          const r = table(tables, t.x, t.z, t.id, label);
          const k = kit(r);
          cardBack(k, -0.6, 1.52, 0);
          cardBack(k, 0.6, 1.52, 0);
          batchStatic(r);
        });
      }
      const own = state.poker?.tables.find((t) => t.players.includes(id));
      const key = JSON.stringify([
        own?.id,
        own?.hand,
        own?.ownCard,
        own?.cards,
        own?.status,
      ]);
      if (key !== cardKey) {
        cardKey = key;
        visibleCards.clear();
        if (own?.ownCard) {
          own.players.forEach((p, i) => {
            const rank = p === id ? own.ownCard : own.cards?.[i];
            if (!rank) return;
            const card = prototypes[rank].clone();
            card.rotation.x = -Math.PI / 2;
            card.position.set(own.x, 1.55, own.z + (i ? -0.8 : 0.8));
            visibleCards.add(card);
          });
        }
      }
    },
    frame(time, reduced, low, id, overview = false) {
      shell.roof.visible = !!id && !overview;
      tables.traverse((o) => {
        if (o.userData.tableLabel)
          o.visible = overview || phase === "instructions";
      });
      for (let i = payoutSprites.length - 1; i >= 0; i--) {
        const p = payoutSprites[i],
          age = performance.now() / 1000 - p.born;
        p.sprite.material.opacity = Math.max(0, 1 - age / 4);
        p.sprite.position.y = 3.2 + (reduced ? 0 : age * 0.28);
        if (age > 4) {
          clearPayout(p.sprite);
          payoutSprites.splice(i, 1);
        }
      }
      shell.frame(time, reduced, low);
    },
    tableCamera(state, id) {
      const t = state.poker?.tables.find((t) => t.players.includes(id));
      if (!t || state.poker.phase === "instructions") return null;
      const side = t.players.indexOf(id) === 0 ? 1 : -1;
      return {
        position: new THREE.Vector3(t.x, 3.5, t.z + side * 3.4),
        target: new THREE.Vector3(t.x, 1.35, t.z - side * 0.5),
      };
    },
  };
}
export function buildPokerPractice(parent, label) {
  const corridor = new THREE.Group();
  parent.add(corridor);
  const k = kit(corridor);
  k.box(-15.6, -0.25, 26, 20.8, 0.5, 6, C.wood);
  k.box(-13, -0.25, 29.5, 2, 0.5, 1, C.wood);
  k.box(-13, 5.65, 26.5, 26, 0.3, 7, C.wood);
  for (const x of [-9, -19]) {
    k.box(x, 5.4, 26.5, 1.5, 0.14, 0.65, C.brass);
    k.box(x, 5.31, 26.5, 1.2, 0.05, 0.45, C.ivory);
  }
  for (const b of BLOTTO_WALLS) k.box(-b.x, b.y, b.z, b.w, b.h, b.d, C.wood);
  const lounge = casinoShell(parent, label, true);
  lounge.root.position.set(-22, 0, 41);
  // Shared mirrored walls define the entrance; remove the small shell's front wall.
  lounge.root.traverse((o) => {
    if (o.isMesh && o.geometry.type === "BoxGeometry" && o.position.z === -12)
      o.visible = false;
  });
  table(lounge.root, 0, 0, 0, label);
  lounge.rigs.push(panda(lounge.root, 0, -2.1, "dealer", 0, 2));
  for (let i = 0; i < 3; i++) {
    lounge.machines.push(
      createSlotMachine(lounge.root, -6, -7 + i * 4, Math.PI / 2, i, 0.8),
    );
    lounge.rigs.push(
      panda(lounge.root, -4.5, -7 + i * 4, "player", -Math.PI / 2, i),
    );
  }
  const sign = label("Game 3 · Kuhn Poker", "#efd8a0", 6);
  sign.position.set(-7, 3.7, 26.5);
  corridor.add(sign);
  const welcome = label("Press E · Your own panda dealer", "#efd8a0", 7);
  welcome.position.set(-22, 3.4, 43);
  corridor.add(welcome);
  welcome.userData.practiceSign = true;
  batchStatic(corridor);
  return lounge;
}
