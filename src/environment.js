import * as THREE from "three";
import {
  arenaBounds,
  platforms,
  jumpPads,
  practicePlatforms,
  practiceHazards,
  vaultsFor,
  hazards,
  chamberSolids,
  STAGES,
} from "../shared/world.js";

const assetPromises = [];
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
export async function environmentAssetsReady() {
  await Promise.all(assetPromises);
}
const branding = {};
function wallArt(parent, kind, w, h, x, y, z, angle = 0) {
  let texture = branding[kind];
  if (!texture) {
    let complete;
    assetPromises.push(new Promise((resolve) => (complete = resolve)));
    texture = branding[kind] = loader.load(
      `/assets/${kind}.png`,
      complete,
      undefined,
      complete,
    );
  }
  texture.userData.shared = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  art.position.set(x, y, z);
  art.rotation.y = angle;
  parent.add(art);
}
function signpost(parent, x, z, angle = 0) {
  const stand = new THREE.Group();
  stand.position.set(x, 0, z);
  stand.rotation.y = angle;
  parent.add(stand);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 3.5, 0.12),
      new THREE.MeshStandardMaterial({ color: "#bcaa88" }),
    );
    post.position.set(side * 0.8, 1.75, 0);
    stand.add(post);
  }
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 2.5, 0.15),
    new THREE.MeshStandardMaterial({ color: "#a6b6b4" }),
  );
  back.position.y = 2.6;
  stand.add(back);
  wallArt(stand, "panda-logo", 2.3, 2.3, 0, 2.6, 0.08);
}
// Local canvas prints stay attached to the wall rather than facing the camera.
function posterTexture(title, kind, color) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 1024;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#e3e7df";
  ctx.fillRect(0, 0, 768, 1024);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 768, 22);
  ctx.font = "bold 58px sans-serif";
  ctx.fillText(title, 48, 110, 672);
  ctx.fillStyle = "#344b5b";
  ctx.font = "24px sans-serif";
  const subtitles = [
    "A coordination game",
    "One pool. Many choices.",
    "Individual choices, shared outcomes.",
  ];
  ctx.fillText(subtitles[kind], 48, 160, 672);
  if (kind === 0) {
    const cells = ["4, 4", "0, 2", "2, 0", "3, 3"];
    ctx.font = "26px sans-serif";
    ctx.fillText("Both choose at the same time", 48, 252);
    for (let i = 0; i < 4; i++) {
      let x = 80 + (i % 2) * 304,
        y = 300 + Math.floor(i / 2) * 230;
      ctx.fillStyle = i === 0 ? color : "#c4d0ca";
      ctx.fillRect(x, y, 290, 214);
      ctx.fillStyle = "#24323b";
      ctx.font = "bold 55px sans-serif";
      ctx.fillText(cells[i], x + 76, y + 126);
    }
    ctx.font = "25px sans-serif";
    ctx.fillText("Example payoffs for two players", 48, 840);
  } else if (kind === 1) {
    ctx.font = "bold 55px sans-serif";
    ctx.fillText("Reward ÷ occupants", 48, 300, 660);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = color;
      const height = 370 / (i + 1);
      ctx.fillRect(76 + i * 102, 740 - height, 68, height);
      ctx.fillStyle = "#344b5b";
      ctx.font = "25px sans-serif";
      ctx.fillText(String(i + 1), 96 + i * 102, 786);
    }
    ctx.font = "25px sans-serif";
    ctx.fillText("More people, smaller shares.", 48, 870);
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(385, 340 + i * 165, 65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#344b5b";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(["Choose", "Observe", "Reconsider"][i], 385, 350 + i * 165);
    }
    ctx.textAlign = "left";
    ctx.font = "25px sans-serif";
    ctx.fillText("You can change vaults until time ends.", 48, 870, 680);
  }
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#667b7d";
  ctx.fillText("Crowd Rush / Game theory workshop", 48, 968);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
// Fixed plane lettering follows the board perspective instead of billboarding.
function lettering(
  lines,
  width,
  height,
  color = "#e0e8d9",
  background = "#28463f",
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1536, 768);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    ctx.font = `bold ${lines.length > 2 ? 108 : 140}px sans-serif`;
    ctx.fillText(line, 768, (768 * (i + 1)) / (lines.length + 1), 1380);
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map,
      roughness: 0.85,
      emissive: color,
      emissiveIntensity: 0.025,
    }),
  );
}
export function environmentTools({ mesh, ring, label }) {
  function poster(parent, x, y, z, angle, kind = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = angle;
    parent.add(group);
    mesh(
      new THREE.BoxGeometry(2.08, 2.78, 0.09),
      "#a78763",
      0,
      0,
      -0.04,
      group,
    );
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(1.96, 2.62),
      new THREE.MeshStandardMaterial({
        map: posterTexture(
          ["Coordination", "Sharing a vault", "Strategy"][kind],
          kind,
          ["#638b87", "#c5a269", "#637f99"][kind],
        ),
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    paper.position.z = 0.018;
    paper.rotation.z = kind === 1 ? -0.025 : 0.016;
    group.add(paper);
    for (const side of [-1, 1])
      mesh(
        new THREE.BoxGeometry(0.24, 0.08, 0.03),
        "#c5c7b6",
        side * 0.65,
        1.28,
        0.05,
        group,
      );
    return group;
  }
  function chamber(v, parent, overhead = false) {
    const group = new THREE.Group();
    group.position.set(v.x, v.y || 0, v.z);
    group.rotation.y = v.angle || 0;
    parent.add(group);
    const glow = new THREE.MeshStandardMaterial({
      color: v.color,
      emissive: v.color,
      emissiveIntensity: 0.12,
      roughness: 0.45,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(5.35, 0.035, 5.35),
      glow,
    );
    floor.position.y = 0.024;
    floor.receiveShadow = true;
    group.add(floor);
    // Wall panels and ribs use exactly the same dimensions as the collision world.
    for (const b of chamberSolids({ ...v, x: 0, z: 0, y: 0, angle: 0 })) {
      const solid = mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d),
        "#405564",
        b.x,
        b.y,
        b.z,
        group,
      );
      if (b.id.endsWith("roof")) {
        // A grated roof keeps bears readable from overhead; its solid collider is retained.
        solid.visible = false;
        for (let i = -2; i <= 2; i++)
          mesh(
            new THREE.BoxGeometry(0.1, 0.18, 5.8),
            "#718491",
            i,
            3.4,
            0,
            group,
          );
      }
    }
    for (const x of [-2.7, 2.7])
      for (const z of [-2.7, 2.7])
        mesh(new THREE.BoxGeometry(0.2, 3.55, 0.2), v.color, x, 1.75, z, group);
    mesh(new THREE.BoxGeometry(3.8, 0.22, 0.3), v.color, 0, 3.1, 2.85, group);
    const threshold = mesh(
      new THREE.BoxGeometry(3.8, 0.05, 0.22),
      v.color,
      0,
      0.06,
      2.6,
      group,
    );
    threshold.material = glow;
    for (let i = -2; i <= 2; i++)
      mesh(
        new THREE.BoxGeometry(0.14, 2.5, 0.12),
        "#718491",
        i,
        1.65,
        -2.64,
        group,
      );
    const wheel = mesh(
      new THREE.TorusGeometry(0.55, 0.08, 8, 24),
      v.color,
      0,
      1.65,
      -2.61,
      group,
    );
    for (const a of [0, Math.PI / 2]) {
      const spoke = mesh(
        new THREE.BoxGeometry(1, 0.08, 0.08),
        v.color,
        0,
        1.65,
        -2.58,
        group,
      );
      spoke.rotation.z = a;
    }
    const sign = label(v.name, v.color, overhead ? 4 : 3.4);
    sign.position.set(0, 4, 0);
    group.add(sign);
    const status = label("Enter chamber", "#d7e8e8", 3.3);
    status.position.set(0, 2.55, 3.02);
    group.add(status);
    const lamp = new THREE.PointLight(v.color, 0, 9, 2);
    lamp.position.set(0, 2.7, 0);
    group.add(lamp);
    return {
      group,
      glow,
      status,
      lamp,
      lastText: "",
      wheel,
      id: v.id,
      color: v.color,
    };
  }
  function decorateLobby(lounge) {
    for (let i = 0; i < 3; i++) {
      const angle = (i - 1) * 0.48;
      poster(
        lounge,
        Math.sin(angle) * 13.9,
        2.7,
        -Math.cos(angle) * 13.9,
        -angle,
        i,
      );
    }
    for (const side of [-1, 1]) {
      mesh(
        new THREE.BoxGeometry(1.3, 0.55, 1.3),
        "#7c9a8f",
        side * 4.7,
        0.275,
        7.5,
        lounge,
      );
      mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 0.5, 12),
        "#9b835f",
        side * 7,
        0.25,
        2,
        lounge,
      );
    }
    for (const x of [-8, 8]) {
      const lamp = new THREE.PointLight("#ffdda7", 16, 15, 2);
      lamp.position.set(x, 4, 1);
      lounge.add(lamp);
      mesh(
        new THREE.CylinderGeometry(0.42, 0.6, 0.5, 16),
        "#e9d0a1",
        x,
        3.8,
        1,
        lounge,
      );
      mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 3.6, 8),
        "#3c515d",
        x,
        1.8,
        1,
        lounge,
      );
      // Books, mugs, and a small tabletop bear give the lounge a lived-in workshop feel.
      for (let j = 0; j < 3; j++)
        mesh(
          new THREE.BoxGeometry(0.7, 0.1, 0.45),
          ["#78918d", "#b08d60", "#617d96"][j],
          x < 0 ? -7 : 7,
          0.73 + j * 0.11,
          2,
          lounge,
        );
      mesh(
        new THREE.CylinderGeometry(0.14, 0.12, 0.25, 12),
        "#e6e9dd",
        x < 0 ? -7.5 : 7.5,
        0.82,
        2.3,
        lounge,
      );
    }
    const board = new THREE.Group();
    board.position.set(-6, 2.3, 12.5);
    lounge.add(board);
    mesh(new THREE.BoxGeometry(3.4, 2.1, 0.22), "#47655f", 0, 0, 0, board);
    const chalk = lettering(
      ["WASD  Move", "Arrows  Look", "Space  Jump"],
      3.2,
      1.9,
    );
    chalk.rotation.y = Math.PI;
    chalk.position.z = -0.12;
    board.add(chalk);
    lounge.userData.board = board;
    wallArt(lounge, "club-banner", 8, 1.83, 0, 5.3, -14.1);
    signpost(lounge, 11, -3, -Math.PI / 2);
    const practice = new THREE.Group();
    practice.scale.set(1 / 1.35, 1, 1 / 1.35);
    lounge.add(practice);
    const platformMeshes = new Map(),
      spikeMeshes = new Map();
    lounge.userData.practice = { platformMeshes, spikeMeshes };
    // Hall and gym are in world units; the circular lounge retains its original scale.
    mesh(
      new THREE.BoxGeometry(10.4, 0.5, 12),
      "#536e79",
      0,
      -0.25,
      23,
      practice,
    );
    mesh(new THREE.BoxGeometry(0.3, 6, 12), "#446773", -5.4, 3, 23, practice);
    mesh(new THREE.BoxGeometry(0.3, 6, 6), "#446773", 5.4, 3, 20, practice);
    mesh(new THREE.BoxGeometry(0.3, 1, 6), "#698781", 5.4, 5.5, 26, practice);
    mesh(new THREE.BoxGeometry(10.8, 0.25, 12), "#698781", 0, 6, 23, practice);
    mesh(
      new THREE.BoxGeometry(24, 0.5, 33),
      "#536e79",
      0,
      -0.25,
      45.5,
      practice,
    );
    for (const x of [-12.3, 12.3])
      mesh(new THREE.BoxGeometry(0.5, 16, 33), "#3e596e", x, 8, 45.5, practice);
    mesh(new THREE.BoxGeometry(24, 16, 0.5), "#3e596e", 0, 8, 62.2, practice);
    for (let z = 32; z <= 60; z += 7) {
      const light = new THREE.PointLight(
        z % 2 ? "#d6bbff" : "#a1ead5",
        20,
        15,
        2,
      );
      light.position.set(0, 10, z);
      practice.add(light);
      for (const x of [-12, 12])
        mesh(
          new THREE.BoxGeometry(0.15, 12, 0.3),
          "#8eb3ad",
          x,
          6,
          z,
          practice,
        );
    }
    for (const p of practicePlatforms(0))
      platformMesh(p, practice, platformMeshes, "#435e72");
    for (const p of jumpPads("lobby")) {
      mesh(
        new THREE.CylinderGeometry(1.1, 1.2, 0.1, 24),
        "#ba9cff",
        p.x,
        0.05,
        p.z,
        practice,
      );
      ring(0.85, "#edf1de", p.x, 0.12, p.z, 0.09, practice);
    }
    hazardDecor(practice, practiceHazards(0), spikeMeshes);
    const practiceSign = lettering(
      ["Game 1 · Crowd Rush practice", "Parkour hall"],
      5,
      1.4,
    );
    practiceSign.position.set(0, 5, 29);
    practiceSign.rotation.y = Math.PI;
    practice.add(practiceSign);
    const finish = lettering(
      ["Top landing", "Drop down to return to the lobby"],
      7,
      2,
    );
    finish.position.set(0, 10, 61.8);
    finish.rotation.y = Math.PI;
    practice.add(finish);
    for (let i = 0; i < 14; i++) {
      const a = (i * Math.PI * 2) / 14;
      const bulb = mesh(
        new THREE.SphereGeometry(0.09, 8, 6),
        "#ffe5a7",
        Math.sin(a) * 10,
        5.8 + Math.cos(a * 2) * 0.3,
        Math.cos(a) * 10,
        lounge,
      );
      bulb.material = new THREE.MeshBasicMaterial({ color: "#ffe5a7" });
    }
  }
  function platformMesh(p, parent, platformMeshes, palette) {
    const group = new THREE.Group();
    group.position.set(p.x, p.flipping ? p.baseY - p.baseH / 2 : p.y, p.z);
    group.rotation.y = p.angle || 0;
    parent.add(group);
    platformMeshes.set(p.id, group);
    mesh(
      new THREE.BoxGeometry(p.baseW || p.w, p.baseH || p.h, p.baseD || p.d),
      palette,
      0,
      -p.h / 2,
      0,
      group,
    );
    mesh(
      new THREE.BoxGeometry(p.baseW || p.w, 0.035, p.baseD || p.d),
      p.color || "#9db0b6",
      0,
      0.015,
      0,
      group,
    );
    for (const side of [-1, 1])
      mesh(
        new THREE.BoxGeometry(p.w, 0.07, 0.06),
        "#b8c7c4",
        0,
        -0.06,
        (side * p.d) / 2,
        group,
      );
    if (p.moving)
      for (let i = -1; i <= 1; i++) {
        const stripe = mesh(
          new THREE.BoxGeometry(0.18, 0.04, p.d * 0.65),
          "#edf0cd",
          i * 0.45,
          0.045,
          0,
          group,
        );
        stripe.rotation.y = 0.25;
      }
    if (p.id === "spawn") {
      ring(3, "#d5d7b8", 0, 0.06, 0, 0.035, group);
      for (const x of [-3.8, 3.8])
        mesh(
          new THREE.BoxGeometry(0.22, 0.06, 6),
          "#d5d7b8",
          x,
          0.04,
          0,
          group,
        );
    }
    if (p.flipping) {
      group.children.forEach(
        (child) => (child.position.y += (p.baseH || p.h) / 2),
      );
      group.rotation.x = p.flipAngle || 0;
    }
  }
  function hazardDecor(parent, hazards, spikeMeshes) {
    for (const h of hazards) {
      const group = new THREE.Group();
      if (h.kind === "puncher") {
        group.position.set(h.baseX, h.y, h.baseZ);
        group.rotation.y = Math.atan2(-h.nz, h.nx);
        parent.add(group);
        const wall = mesh(
          new THREE.BoxGeometry(0.45, 2.8, 2.3),
          "#526675",
          -0.35,
          0.5,
          0,
          group,
        );
        for (const z of [-0.95, 0.95])
          mesh(
            new THREE.BoxGeometry(0.12, 2.9, 0.15),
            "#b0b9a5",
            -0.08,
            0.5,
            z,
            group,
          );
        const spring = mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 1, 10),
          "#acb9bb",
          0,
          0,
          0,
          group,
        );
        spring.rotation.z = -Math.PI / 2;
        const glove = mesh(
          new THREE.SphereGeometry(0.58, 14, 10),
          "#ce715e",
          0,
          0,
          0,
          group,
        );
        glove.scale.set(0.85, 0.9, 1);
        mesh(
          new THREE.BoxGeometry(0.24, 0.32, 0.48),
          "#ce715e",
          0,
          -0.36,
          0.36,
          glove,
        );
        const glow = new THREE.MeshStandardMaterial({
          color: "#d6ae55",
          emissive: "#d6ae55",
          emissiveIntensity: 0.4,
        });
        const warning = mesh(
          new THREE.BoxGeometry(0.05, 0.2, 1.6),
          "#d6ae55",
          -0.09,
          1.65,
          0,
          group,
        );
        warning.material = glow;
        spikeMeshes.set(h.id, { group, glove, spring, wall, warning, glow });
        continue;
      }
      group.position.set(h.x, h.y, h.z);
      parent.add(group);
      mesh(
        new THREE.BoxGeometry(h.w, 0.09, h.d),
        "#273d4b",
        0,
        0.045,
        0,
        group,
      );
      const spikes = new THREE.Group();
      group.add(spikes);
      for (let x = -h.w / 2 + 0.2; x < h.w / 2; x += 0.38)
        for (let z = -h.d / 2 + 0.2; z < h.d / 2; z += 0.38)
          mesh(
            new THREE.ConeGeometry(0.16, 0.85, 5),
            "#aebfc3",
            x,
            0.425,
            z,
            spikes,
          );
      const warning = mesh(
        new THREE.BoxGeometry(h.w + 0.06, 0.03, h.d + 0.06),
        "#d6ae55",
        0,
        0.1,
        0,
        group,
      );
      const glow = new THREE.MeshStandardMaterial({
        color: "#d6ae55",
        emissive: "#d6ae55",
        emissiveIntensity: 0.4,
      });
      warning.material = glow;
      spikeMeshes.set(h.id, { group, spikes, warning, glow });
    }
  }
  function parkour(stage, parent) {
    const platformMeshes = new Map(),
      spikeMeshes = new Map(),
      chambers = [];
    const palette = { 2: "#355e70", 3: "#426e68", 4: "#5b526e", 5: "#465b78" }[
      stage
    ];
    platforms(0, stage).forEach((p) =>
      platformMesh(p, parent, platformMeshes, palette),
    );
    for (const pad of jumpPads(`arena${stage}`)) {
      const parentPad = platformMeshes.get(pad.id);
      ring(0.65, "#f4e9ff", 0, 0.06, 0, 0.11, parentPad);
      const arrow = lettering(["↑"], 0.7, 0.7, "#ffffff", "#715596");
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.y = 0.075;
      parentPad.add(arrow);
    }
    vaultsFor(stage).forEach((v) => chambers.push(chamber(v, parent)));
    const { side, front, rear } = arenaBounds(stage);
    const depth = 7 - rear;
    mesh(
      new THREE.BoxGeometry(side * 2 + 12, 0.6, depth + front + 20),
      "#203644",
      0,
      -7.2,
      (-depth + front) / 2 + 4,
      parent,
    );
    // Solid perimeter buildings sit outside routes; their repeated ribs frame the arena.
    for (const x of [-side, side]) {
      mesh(
        new THREE.BoxGeometry(1, 28, depth + front),
        palette,
        x,
        3,
        (-depth + front) / 2 + 4,
        parent,
      );
      for (let z = front; z > -depth; z -= 8) {
        mesh(new THREE.BoxGeometry(1.5, 20, 1.3), "#647a84", x, 3, z, parent);
        mesh(
          new THREE.BoxGeometry(0.14, 4, 0.8),
          "#e0bd7e",
          x - Math.sign(x) * 0.8,
          4,
          z,
          parent,
        );
      }
      const hints = {
        2: ["What if the paths split?", "Keep speed through gaps"],
        3: ["What if the walls punched?", "Could a vault float above us?"],
        4: ["What if the floor fought back?", "Would you wait or jump?"],
        5: ["Is the highest vault worth it?", "Amber warns before a strike"],
      }[stage];
      const hint = lettering(hints, 13, 6, "#e2e8d9", palette);
      hint.position.set(x - Math.sign(x) * 0.7, 7, -8);
      hint.rotation.y = (-Math.sign(x) * Math.PI) / 2;
      parent.add(hint);
    }
    if (stage >= 3)
      mesh(
        new THREE.BoxGeometry(side * 2, 20, 0.7),
        palette,
        0,
        3,
        front,
        parent,
      );
    wallArt(parent, "club-banner", 16, 3.67, 0, 10, rear + 0.5);
    wallArt(parent, "panda-logo", 4, 4, -side + 0.7, 5, 15, Math.PI / 2);
    wallArt(parent, "panda-logo", 3, 3, side - 0.7, 9, -26, -Math.PI / 2);
    mesh(new THREE.BoxGeometry(side * 2, 20, 0.7), palette, 0, 3, rear, parent);
    for (const x of [-24, -12, 0, 12, 24]) {
      mesh(
        new THREE.BoxGeometry(0.7, 20, 1.1),
        "#607782",
        x,
        3,
        rear + 0.5,
        parent,
      );
      mesh(
        new THREE.BoxGeometry(6, 2, 0.12),
        "#91b5bd",
        x,
        8,
        rear + 0.6,
        parent,
      );
    }
    const sign = label(STAGES[stage - 1].name, "#dce7e3", 10);
    sign.position.set(0, 9, rear + 1);
    parent.add(sign);
    for (const v of vaultsFor(stage)) {
      const light = new THREE.PointLight(v.color, 20, 13, 2);
      light.position.set(v.x, v.y + 5, v.z);
      parent.add(light);
      if (v.id === "sky") continue;
      // Beams and pylons below landings communicate structure without hiding jump gaps.
      mesh(
        new THREE.CylinderGeometry(0.32, 0.5, v.y + 6, 10),
        "#496273",
        v.x,
        (v.y - 6) / 2,
        v.z,
        parent,
      );
    }
    hazardDecor(parent, hazards(0, stage), spikeMeshes);
    return { platformMeshes, spikeMeshes, chambers };
  }
  return { poster, chamber, decorateLobby, parkour };
}
