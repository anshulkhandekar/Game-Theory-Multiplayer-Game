import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";
import { batchStatic } from "./static-batch.js";
export function polishLobby(parent) {
  const root = new THREE.Group();
  parent.add(root);
  const mats = new Map();
  const mesh = (g, c, x, y, z) => {
    if (!mats.has(c))
      mats.set(
        c,
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 }),
      );
    const m = new THREE.Mesh(g, mats.get(c));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const box = (x, y, z, w, h, d, c) =>
    mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
  // Inlaid rug, segmented woven border, buttoned cushions and furniture feet.
  const rug = mesh(
    new THREE.CylinderGeometry(5.9, 5.9, 0.015, 48),
    "#5c6579",
    0,
    0.01,
    0,
  );
  rug.receiveShadow = true;
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24;
    const stitch = box(
      Math.sin(a) * 5.6,
      0.025,
      Math.cos(a) * 5.6,
      0.08,
      0.015,
      0.35,
      "#bc9f71",
    );
    stitch.rotation.y = a;
  }
  for (const s of [-1, 1]) {
    const couch = new THREE.Group();
    couch.position.set(s * 9, 0, 0);
    couch.rotation.y = (-s * Math.PI) / 2;
    root.add(couch);
    const pillowMaterial = new THREE.MeshStandardMaterial({
      color: s < 0 ? "#8b96b0" : "#8ea89a",
      roughness: 0.95,
    });
    for (const x of [-1.3, 1.3]) {
      const pillow = new THREE.Mesh(
        new RoundedBoxGeometry(0.72, 0.63, 0.23, 3, 0.1),
        pillowMaterial,
      );
      pillow.position.set(x, 1.17, -0.43);
      pillow.rotation.x = -0.16;
      pillow.rotation.z = x < 0 ? -0.06 : 0.06;
      pillow.castShadow = true;
      couch.add(pillow);
    }
    for (const z of [-1.5, 1.5])
      for (const x of [s * 8.4, s * 9.6])
        mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 0.3, 10),
          "#493c36",
          x,
          0.15,
          z,
        );
    // One hollow ceramic cup, with an inset drink and a vertically curved handle.
    const mug = new THREE.Group();
    mug.position.set(s * 7.35, 0.6875, 2.4);
    mug.rotation.y = s * 0.6;
    root.add(mug);
    const ceramic = new THREE.MeshStandardMaterial({
      color: "#f0e7d8",
      roughness: 0.28,
    });
    const profile = [
      [0, 0.015],
      [0.12, 0.015],
      [0.15, 0.04],
      [0.17, 0.28],
      [0.15, 0.28],
      [0.13, 0.065],
      [0, 0.065],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), ceramic);
    cup.castShadow = true;
    mug.add(cup);
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.025, 10, 32),
      ceramic,
    );
    handle.position.set(0.21, 0.16, 0);
    handle.scale.y = 1.12;
    mug.add(handle);
    const coffee = new THREE.Mesh(
      new THREE.CircleGeometry(0.142, 32),
      new THREE.MeshStandardMaterial({ color: "#513421", roughness: 0.32 }),
    );
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = 0.235;
    mug.add(coffee);
    const saucer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.25, 0.025, 32),
      ceramic,
    );
    saucer.position.y = 0;
    mug.add(saucer);
    batchStatic(mug);
    // Open cabinet: a thin back, side panels and shelves expose the books to the room.
    const cabinet = new THREE.Group();
    cabinet.position.set(s * 12.4, 0, 4.9);
    cabinet.rotation.y = (-s * Math.PI) / 2;
    root.add(cabinet);
    const add = (x, y, z, w, h, d, color) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        mats.get(color) ||
          new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
      );
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      cabinet.add(m);
      return m;
    };
    add(0, 1.6, -0.57, 2.7, 3.2, 0.1, "#5a4536");
    for (const x of [-1.3, 1.3]) add(x, 1.6, 0, 0.13, 3.2, 1.25, "#896849");
    for (const y of [0.16, 1.1, 2.04, 3.14])
      add(0, y, 0, 2.7, 0.1, 1.25, "#a58059");
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 7; i++) {
        const x = -1.02 + i * 0.3,
          h = 0.55 + ((i + row) % 3) * 0.09,
          y = 0.21 + row * 0.94 + h / 2,
          color = ["#65877b", "#8b748a", "#b48c59", "#60758c"][(i + row) % 4];
        add(x, y, 0.08, 0.19, h, 0.63, "#e4d8b9");
        for (const side of [-1, 1])
          add(x + side * 0.105, y, 0.08, 0.025, h + 0.045, 0.68, color);
        add(x, y, 0.43, 0.24, h + 0.045, 0.04, color);
        for (const band of [-1, 1])
          add(x, y + band * h * 0.3, 0.454, 0.14, 0.018, 0.007, "#d8be85");
      }
    batchStatic(cabinet);
    for (let j = 0; j < 4; j++) {
      const leaf = mesh(
        new THREE.SphereGeometry(0.23, 10, 6),
        "#467660",
        s * 10 + Math.sin(j * 2) * 0.45,
        1.8 + j * 0.18,
        -7 + Math.cos(j * 2) * 0.45,
      );
      leaf.scale.set(0.6, 1.4, 0.7);
      leaf.rotation.z = s * 0.4;
    }
  }
  function poster(kind, x, z, angle) {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 1024;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#e9e3d4";
    ctx.fillRect(0, 0, 768, 1024);
    ctx.fillStyle = "#293e48";
    ctx.font = "bold 48px Georgia";
    const titles = [
      "Allocation simplex",
      "Information sets",
      "Mixed-strategy indifference",
    ];
    ctx.fillText(titles[kind], 38, 86, 695);
    ctx.font = "25px sans-serif";
    const line = (text, y) => ctx.fillText(text, 38, y, 690);
    const stroke = (points) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    };
    ctx.strokeStyle = "#355c65";
    ctx.lineWidth = 5;
    if (kind === 0) {
      line("Colonel Blotto · three fronts", 145);
      stroke([
        [384, 230],
        [110, 690],
        [658, 690],
        [384, 230],
      ]);
      for (let i = 1; i < 5; i++) {
        const t = i / 5;
        stroke([
          [384 - 274 * t, 230 + 460 * t],
          [384 + 274 * t, 230 + 460 * t],
        ]);
      }
      ctx.font = "30px Georgia";
      line("x₁ + x₂ + x₃ = B", 810);
      line("xᵢ ≥ 0", 865);
      ctx.font = "23px sans-serif";
      line("Every point is a feasible budget allocation.", 945);
    }
    if (kind === 1) {
      line("Kuhn Poker · hidden information", 145);
      const nodes = [
        [384, 230],
        [160, 390],
        [608, 390],
        [85, 560],
        [235, 560],
        [530, 560],
        [680, 560],
      ];
      stroke([
        [384, 230],
        [160, 390],
      ]);
      stroke([
        [384, 230],
        [608, 390],
      ]);
      for (let i = 0; i < 4; i++) stroke([nodes[i < 2 ? 1 : 2], nodes[i + 3]]);
      for (const [x, y] of nodes) {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, 7);
        ctx.fill();
      }
      ctx.setLineDash([12, 9]);
      stroke([
        [160, 390],
        [608, 390],
      ]);
      ctx.setLineDash([]);
      ctx.font = "23px sans-serif";
      ctx.fillText("You: J · Rival: Q", 70, 340);
      ctx.fillText("You: J · Rival: K", 480, 340);
      ctx.fillText("Check", 48, 620);
      ctx.fillText("Bet", 210, 620);
      ctx.fillText("Check", 493, 620);
      ctx.fillText("Bet", 653, 620);
      ctx.font = "25px sans-serif";
      line("Dashed links: indistinguishable histories.", 730);
      line("A player knows their card, not the deal.", 790);
      line("A strategy must act on what is observed.", 850);
      line("Beliefs turn actions into evidence.", 930);
    }
    if (kind === 2) {
      line("Randomize to make rivals indifferent", 145);
      ctx.font = "35px Georgia";
      line("E[u(A)] = E[u(B)]", 315);
      line("p · u(A,L) + (1−p) · u(A,R)", 430);
      line("= p · u(B,L) + (1−p) · u(B,R)", 500);
      ctx.font = "25px sans-serif";
      line("Support actions share expected payoff.", 655);
      line("Bluffs keep a call from being automatic.", 720);
      line("Calls keep a bluff from being automatic.", 785);
      line("A mix is a distribution—not indecision.", 930);
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const group = new THREE.Group();
    group.position.set(x, 3, z);
    group.rotation.y = angle;
    root.add(group);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 3.7, 0.13),
      new THREE.MeshStandardMaterial({ color: "#745b47" }),
    );
    group.add(frame);
    const print = new THREE.Mesh(
      new THREE.PlaneGeometry(2.58, 3.48),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }),
    );
    print.position.z = 0.075;
    group.add(print);
  }
  poster(0, 13.7, 1, -Math.PI / 2);
  poster(1, -13.7, 1, Math.PI / 2);
  poster(2, 10, 9.3, -Math.PI * 0.73);
  batchStatic(root);
}
