import { LOBBY_TANK } from "../shared/lobby-showcase.js";
import { createPlayingCard } from "./playing-cards.js";
import * as THREE from "three";
import { batchStatic } from "./static-batch.js";
// A small overhead exhibition stays inside the main lounge; practice remains separate.
export function createLobbyShowcase(parent, label) {
  const root = new THREE.Group();
  root.position.set(0, 2.4, -10);
  parent.add(root);
  const paints = new Map(),
    exhibits = [],
    heads = [],
    cards = [],
    bubbles = [];
  let turret, shot, sparkle;
  const box = (g, color, x, y, z, w, h, d, geometry) => {
    if (!paints.has(color))
      paints.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.75 }),
      );
    const m = new THREE.Mesh(
      geometry || new THREE.BoxGeometry(w, h, d),
      paints.get(color),
    );
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  box(root, "#74618e", 0, -0.1, 0, 11, 0.2, 2);
  box(root, "#dcc99b", 0, -0.23, 0, 11.4, 0.08, 2.2);
  for (const x of [-4.6, 4.6])
    box(root, "#596574", x, -0.25, -1.7, 0.16, 0.25, 3.4);
  const names = ["Crowd Rush", "Battlefield", "Poker Showdown"];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    g.position.x = (i - 1) * 3.7;
    g.position.y = 0.18;
    root.add(g);
    exhibits.push(g);
    box(g, "#d7ddd0", 0, 0, 0, 2.5, 0.12, 1.7);
    const caption = label(names[i], "#efd7a0", 2.8);
    caption.position.set(g.position.x, 0.2, 1.2);
    root.add(caption);
    if (i === 0) {
      box(g, "#718792", 0, 0.4, 0, 1.65, 0.7, 1.1);
      for (const x of [-0.7, 0.7])
        box(g, "#f2cf78", x, 0.95, 0, 0.12, 0.9, 1.25);
      box(g, "#f2cf78", 0, 1.35, 0, 1.55, 0.12, 1.25);
      for (const side of [-1, 1]) {
        const head = new THREE.Group();
        head.position.set(side * 0.55, 0.8, 0.75);
        g.add(head);
        heads.push(head);
        box(
          head,
          "#f1efdf",
          0,
          0,
          0,
          0,
          0,
          0,
          new THREE.SphereGeometry(0.25, 12, 8),
        );
        for (const dx of [-0.14, 0.14]) {
          box(
            head,
            "#303340",
            dx,
            0.21,
            -0.02,
            0,
            0,
            0,
            new THREE.SphereGeometry(0.085, 8, 6),
          );
          box(
            head,
            "#303340",
            dx * 0.65,
            0.025,
            0.225,
            0,
            0,
            0,
            new THREE.SphereGeometry(0.07, 8, 6),
          ).scale.y = 1.25;
          box(
            head,
            "#ffffff",
            dx * 0.65 + 0.015,
            0.035,
            0.286,
            0,
            0,
            0,
            new THREE.SphereGeometry(0.019, 6, 4),
          );
        }
        box(
          head,
          "#303340",
          0,
          -0.07,
          0.24,
          0,
          0,
          0,
          new THREE.SphereGeometry(0.035, 8, 6),
        );
        batchStatic(head);
      }
      const phrases = [
        "Gold is crowded!",
        "But... shiny!",
        "Let’s split it?",
        "Count me in!",
      ];
      for (let j = 0; j < 4; j++) {
        const canvas = document.createElement("canvas");
        canvas.width = 384;
        canvas.height = 120;
        const c = canvas.getContext("2d");
        c.fillStyle = "#fff8e6";
        c.beginPath();
        c.roundRect(5, 5, 374, 88, 24);
        c.fill();
        c.beginPath();
        c.moveTo(j % 2 ? 250 : 110, 88);
        c.lineTo(j % 2 ? 235 : 125, 116);
        c.lineTo(j % 2 ? 220 : 140, 88);
        c.fill();
        c.fillStyle = "#383044";
        c.font = "bold 28px sans-serif";
        c.textAlign = "center";
        c.fillText(phrases[j], 192, 59);
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(canvas),
            depthWrite: false,
          }),
        );
        sprite.position.set(j % 2 ? 0.45 : -0.45, 1.95, 0.9);
        sprite.scale.set(2.35, 0.73, 1);
        sprite.visible = false;
        g.add(sprite);
        bubbles.push(sprite);
      }
    } else if (i === 1) {
      box(g, "#516a57", 0, 0.37, 0, 1.85, 0.4, 1.1);
      for (const side of [-1, 1]) {
        box(g, "#283b3f", side * 0.88, 0.25, 0, 0.22, 0.38, 1.35);
        for (const z of [-0.42, 0, 0.42])
          box(
            g,
            "#b0bba2",
            side * 1.01,
            0.26,
            z,
            0,
            0,
            0,
            new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10),
          ).rotation.z = Math.PI / 2;
      }
      turret = new THREE.Group();
      turret.position.y = 0.72;
      g.add(turret);
      box(turret, "#819873", 0, 0, 0, 0.9, 0.4, 0.75);
      box(turret, "#465a48", 0, 0.01, 0.95, 0.12, 0.12, 1.35);
      box(turret, "#e5ce90", 0, 0.3, 0, 0.26, 0.05, 0.24);
      batchStatic(turret);
      shot = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 6),
        new THREE.MeshBasicMaterial({ color: "#ffdc89" }),
      );
      parent.add(shot);
      shot.visible = false;
    } else {
      for (let j = 0; j < 3; j++) {
        const card = createPlayingCard(
          ["J", "Q", "K"][j],
          ["club", "heart", "spade"][j],
        );
        card.position.set((j - 1) * 0.72, 0.85, j * 0.035);
        card.rotation.z = (j - 1) * -0.16;
        g.add(card);
        cards.push(card);
      }
    }
    batchStatic(g);
  }
  sparkle = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13),
    new THREE.MeshBasicMaterial({ color: "#fff3ba", transparent: true }),
  );
  exhibits[2].add(sparkle);
  const garland = new THREE.Group();
  parent.add(garland);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2,
      x = Math.sin(a) * 12,
      z = Math.cos(a) * 12;
    box(garland, "#677277", x, 6.35, z, 0.025, 0.45, 0.025);
    const bulb = box(
      garland,
      ["#c4a8e2", "#f0d19a", "#a9d7c6"][i % 3],
      x,
      6.05,
      z,
      0,
      0,
      0,
      new THREE.SphereGeometry(0.1, 8, 6),
    );
  }
  batchStatic(root);
  batchStatic(garland);
  return {
    frame(time, reduced, low, players = [], worldTime = 0) {
      // Exactly three rigs; no growing particle arrays, physics or additional lights.
      exhibits.forEach((g, i) => {
        g.position.y =
          0.18 + (reduced ? 0 : Math.sin(time * 0.9 + i * 2) * 0.09);
        g.rotation.y = reduced ? 0 : Math.sin(time * 0.35 + i) * 0.15;
      });
      heads.forEach((h, i) => {
        h.position.y = 0.8 + (reduced ? 0 : Math.sin(time * 2.8 + i * 2) * 0.1);
        h.rotation.z = reduced ? 0 : Math.sin(time * 1.4 + i * 2) * 0.12;
        h.rotation.y = reduced ? 0 : Math.sin(time * 0.9 + i * 2) * 0.22;
      });
      bubbles.forEach((b, i) => {
        b.visible = i === (reduced ? 0 : Math.floor(time / 3) % 4);
      });
      const recent = players
        .filter(
          (p) =>
            p.connected &&
            p.lobbyTankAt != null &&
            worldTime - p.lobbyTankAt >= 0 &&
            worldTime - p.lobbyTankAt < 0.55,
        )
        .sort((a, b) => b.lobbyTankAt - a.lobbyTankAt)[0];
      const elapsed = recent ? worldTime - recent.lobbyTankAt : 99;
      const target = recent
        ? Math.atan2(recent.x - LOBBY_TANK.x, recent.z - LOBBY_TANK.z)
        : null;
      turret.rotation.y =
        target != null
          ? target - exhibits[1].rotation.y
          : reduced
            ? 0
            : Math.sin(time * 0.8) * 0.65;
      turret.position.z = reduced
        ? 0
        : elapsed < 0.2
          ? -Math.sin((elapsed / 0.2) * Math.PI) * 0.09
          : 0;
      shot.visible = !!recent && !reduced;
      if (recent) {
        const d = Math.hypot(recent.x, recent.z - LOBBY_TANK.z) || 1,
          travel = (elapsed / 0.55) * 3;
        shot.position.set(
          ((recent.x / d) * travel) / 1.35,
          3.3 - elapsed * 3,
          -10 + (((recent.z - LOBBY_TANK.z) / d) * travel) / 1.35,
        );
      }
      cards.forEach((c, i) => {
        c.position.y =
          0.85 + (reduced ? 0 : Math.sin(time * 1.8 + i * 1.5) * 0.09);
        c.rotation.y = reduced ? 0 : Math.sin(time * 0.9 + i) * 0.17;
        c.rotation.z =
          (i - 1) * -0.16 + (reduced ? 0 : Math.sin(time * 1.3 + i) * 0.045);
      });
      sparkle.visible = !low && !reduced;
      sparkle.position.set(
        Math.sin(time * 0.7) * 0.9,
        1.2 + Math.cos(time * 0.7) * 0.45,
        0.13,
      );
      sparkle.rotation.z = time;
      sparkle.material.opacity = 0.25 + Math.abs(Math.sin(time * 1.7)) * 0.65;
      garland.visible = !low;
    },
  };
}
