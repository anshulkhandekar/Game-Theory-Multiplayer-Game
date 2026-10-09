import * as THREE from "three";
import { move, canMove } from "../shared/movement.js";
import {
  platforms,
  practicePlatforms,
  practiceHazards,
  lobbyRegion,
  hazards,
  stageOf,
  isParkour,
  vaultsFor,
} from "../shared/world.js";
import { environmentTools, environmentAssetsReady } from "./environment.js";
const COLORS = {
  mint: "#64d9b5",
  pink: "#f18fae",
  blue: "#78acfa",
  yellow: "#ffda6a",
};
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor("#172337");
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#172337", 42, 85);
  const cameraRay = new THREE.Raycaster();
  const camera = new THREE.PerspectiveCamera(
    42,
    innerWidth / innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 27, 33);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight("#cdeaff", "#656179", 2.5));
  const sun = new THREE.DirectionalLight("#fff2d3", 3.5);
  sun.position.set(-10, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.07;
  Object.assign(sun.shadow.camera, {
    left: -45,
    right: 45,
    top: 50,
    bottom: -50,
  });
  scene.add(sun);
  const arena = new THREE.Group();
  scene.add(arena);
  const materials = new Map();
  function material(color) {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
      );
    return materials.get(color);
  }
  function mesh(geometry, color, x = 0, y = 0, z = 0, parent = arena) {
    const m = new THREE.Mesh(geometry, material(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function ring(radius, color, x, y, z, width = 0.06, parent = arena) {
    const m = mesh(
      new THREE.TorusGeometry(radius, width, 8, 64),
      color,
      x,
      y,
      z,
      parent,
    );
    m.rotation.x = Math.PI / 2;
    return m;
  }
  function label(text, color = "#ffffff", width = 4.5) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.font = "700 42px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#152334";
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 75, 500);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    sprite.scale.set(width, width / 4, 1);
    return sprite;
  }
  mesh(new THREE.CylinderGeometry(15.5, 16, 1, 64), "#425771", 0, -0.6);
  mesh(new THREE.CylinderGeometry(14.7, 14.7, 0.08, 64), "#70899d", 0, -0.06);
  ring(14.2, "#96b1bc", 0, 0.025, 0);
  ring(4, "#91a9b9", 0, 0.025, 0, 0.035);
  ring(4.5, "#91a9b9", 0, 0.025, 0, 0.035);
  mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.035, 6), "#516f83", 0, 0.025, 0);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const block = mesh(
      new THREE.BoxGeometry(3.7, 1.2, 0.7),
      i % 2 ? "#445571" : "#526682",
      Math.sin(a) * 15,
      0.3,
      Math.cos(a) * 15,
    );
    block.rotation.y = a;
    if (i % 3 === 0) {
      mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 2.7, 8),
        "#354966",
        Math.sin(a) * 15,
        1,
        Math.cos(a) * 15,
      );
      mesh(
        new THREE.SphereGeometry(0.23, 10, 8),
        "#ffdd90",
        Math.sin(a) * 15,
        2.4,
        Math.cos(a) * 15,
      );
    }
    if (i % 6 === 0) {
      const banner = mesh(
        new THREE.BoxGeometry(1.2, 2.6, 0.08),
        "#465c70",
        Math.sin(a) * 15,
        3,
        Math.cos(a) * 15,
      );
      banner.rotation.y = a;
    }
  }
  const environment = environmentTools({ mesh, ring, label });
  let vaultEffects = vaultsFor(1).map((v) =>
    environment.chamber(v, arena, true),
  );
  arena.userData.chambers = vaultEffects;
  // A separate lounge makes the waiting space feel distinct from scored play.
  const lounge = new THREE.Group();
  scene.add(lounge);
  mesh(
    new THREE.CylinderGeometry(15, 15, 0.7, 64),
    "#607078",
    0,
    -0.4,
    0,
    lounge,
  );
  mesh(
    new THREE.CylinderGeometry(6, 6, 0.03, 64),
    "#8f9a95",
    0,
    0.01,
    0,
    lounge,
  );
  ring(6, "#c0bdb1", 0, 0.04, 0, 0.04, lounge);
  for (let i = 0; i < 16; i++) {
    if (i === 0) continue;
    const a = (i * Math.PI) / 8,
      x = Math.sin(a) * 15,
      z = Math.cos(a) * 15;
    const wall = mesh(
      new THREE.BoxGeometry(5.8, 6, 0.5),
      "#465a65",
      x,
      2.6,
      z,
      lounge,
    );
    wall.rotation.y = a;
    const beam = mesh(
      new THREE.BoxGeometry(0.35, 7, 0.65),
      "#a78763",
      x,
      3,
      z,
      lounge,
    );
    beam.rotation.y = a;
    if (i % 2 === 0) {
      const window = mesh(
        new THREE.BoxGeometry(3.5, 2.8, 0.12),
        "#b6d6d7",
        x * 0.985,
        3.3,
        z * 0.985,
        lounge,
      );
      window.rotation.y = a;
      const lamp = mesh(
        new THREE.BoxGeometry(0.8, 0.2, 0.7),
        "#ffdda6",
        x * 0.88,
        4.6,
        z * 0.88,
        lounge,
      );
      lamp.rotation.y = a;
    }
  }
  for (const side of [-1, 1]) {
    const couch = new THREE.Group();
    couch.position.set(side * 9, 0, 0);
    couch.rotation.y = (-side * Math.PI) / 2;
    lounge.add(couch);
    mesh(new THREE.BoxGeometry(4, 0.55, 1.5), "#b9926c", 0, 0.45, 0, couch);
    mesh(new THREE.BoxGeometry(4, 1.2, 0.35), "#b9926c", 0, 1, -0.7, couch);
    for (const x of [-1.1, 0, 1.1])
      mesh(new THREE.BoxGeometry(1, 0.25, 1.1), "#c7af90", x, 0.8, 0, couch);
    mesh(
      new THREE.CylinderGeometry(1, 1, 0.25, 24),
      "#c3a783",
      side * 7,
      0.55,
      2,
      lounge,
    );
    mesh(
      new THREE.CylinderGeometry(0.45, 0.65, 0.7, 16),
      "#c3a783",
      side * 10,
      0.35,
      -7,
      lounge,
    );
    for (let j = 0; j < 5; j++)
      mesh(
        new THREE.SphereGeometry(0.55, 12, 8),
        "#5d8f78",
        side * 10 + Math.sin(j) * 0.3,
        1.1 + j * 0.25,
        -7 + Math.cos(j) * 0.3,
        lounge,
      );
  }
  mesh(
    new THREE.CylinderGeometry(15, 15, 0.3, 64),
    "#657477",
    0,
    7.4,
    0,
    lounge,
  );
  for (const x of [-8, -4, 0, 4, 8])
    mesh(new THREE.BoxGeometry(0.22, 0.3, 24), "#a78763", x, 7.15, 0, lounge);
  const parkour = new THREE.Group();
  scene.add(parkour);
  environment.decorateLobby(lounge);
  lounge.scale.set(1.35, 1, 1.35);
  let parkourScene = null;
  function rebuildParkour(stage) {
    parkour.traverse((o) => {
      o.geometry?.dispose();
      if (o.material?.map) {
        o.material.map.dispose();
        o.material.dispose();
      } else if (o.material && ![...materials.values()].includes(o.material))
        o.material.dispose();
    });
    parkour.clear();
    delete parkour.userData.cameraMeshes;
    parkourScene = environment.parkour(stage, parkour);
  }
  arena.visible = false;
  parkour.visible = false;
  let yaw = Math.PI,
    pitch = -0.32,
    currentWorld = "";
  const bears = new Map(),
    effects = [];
  function puff(x, y, z, color, count = 10) {
    if (low) return;
    for (let i = 0; i < count; i++) {
      const particle = mesh(
        new THREE.SphereGeometry(0.05, 4, 4),
        color,
        x,
        y,
        z,
      );
      scene.attach(particle);
      particle.castShadow = false;
      effects.push({
        particle,
        life: 0,
        duration: 0.55,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 2,
        vz: (Math.random() - 0.5) * 3,
      });
    }
  }
  function bear(player) {
    const root = new THREE.Group(),
      rig = new THREE.Group();
    root.add(rig);
    scene.add(root);
    const kind = player.appearance.bear,
      body =
        kind === "polar"
          ? "#eee9dc"
          : kind === "black"
            ? "#424251"
            : kind === "panda"
              ? "#f2efdf"
              : "#ab795b",
      dark = kind === "panda" ? "#34343f" : body;
    mesh(
      new THREE.SphereGeometry(0.48, 24, 16),
      body,
      0,
      0.78,
      0,
      rig,
    ).scale.set(1, 1.2, 0.85);
    mesh(new THREE.SphereGeometry(0.5, 24, 16), body, 0, 1.5, 0, rig);
    mesh(new THREE.SphereGeometry(0.17, 16, 12), dark, 0, 0.67, -0.4, rig);
    const arms = [],
      feet = [];
    for (const side of [-1, 1]) {
      mesh(
        new THREE.SphereGeometry(0.18, 12, 8),
        dark,
        side * 0.36,
        1.88,
        0,
        rig,
      );
      mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        kind === "panda" ? "#34343f" : body,
        side * 0.17,
        1.57,
        0.42,
        rig,
      );
      mesh(
        new THREE.SphereGeometry(0.06, 10, 8),
        "#202333",
        side * 0.17,
        1.57,
        0.49,
        rig,
      );
      mesh(
        new THREE.SphereGeometry(0.025, 8, 6),
        "#ffffff",
        side * 0.16,
        1.59,
        0.53,
        rig,
      );
      const arm = new THREE.Group();
      arm.position.set(side * 0.48, 1, 0);
      rig.add(arm);
      mesh(
        new THREE.SphereGeometry(0.17, 12, 8),
        dark,
        side * 0.03,
        -0.18,
        0,
        arm,
      ).scale.y = 1.5;
      arms.push(arm);
      const foot = new THREE.Group();
      foot.position.set(side * 0.27, 0.36, 0);
      rig.add(foot);
      mesh(
        new THREE.SphereGeometry(0.18, 12, 8),
        dark,
        0,
        -0.13,
        0.06,
        foot,
      ).scale.set(1, 1, 1.2);
      feet.push(foot);
    }
    mesh(
      new THREE.SphereGeometry(0.21, 12, 8),
      "#e8ceae",
      0,
      1.36,
      0.4,
      rig,
    ).scale.set(1, 0.65, 0.6);
    mesh(new THREE.SphereGeometry(0.065, 10, 8), "#252938", 0, 1.41, 0.51, rig);
    ring(0.39, COLORS[player.appearance.color], 0, 1.03, 0, 0.095, rig);
    mesh(
      new THREE.BoxGeometry(0.12, 0.35, 0.09),
      COLORS[player.appearance.color],
      0.18,
      0.85,
      0.42,
      rig,
    );
    if (player.appearance.hat === "cap") {
      mesh(
        new THREE.SphereGeometry(0.38, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        COLORS[player.appearance.color],
        0,
        1.91,
        0,
        rig,
      );
      mesh(
        new THREE.BoxGeometry(0.55, 0.045, 0.32),
        COLORS[player.appearance.color],
        0,
        1.94,
        0.3,
        rig,
      );
    }
    if (player.appearance.hat === "crown") {
      mesh(
        new THREE.CylinderGeometry(0.3, 0.36, 0.25, 8),
        "#ffd45a",
        0,
        1.98,
        0,
        rig,
      );
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        mesh(
          new THREE.ConeGeometry(0.075, 0.2, 4),
          "#ffd45a",
          Math.sin(a) * 0.27,
          2.18,
          Math.cos(a) * 0.27,
          rig,
        );
      }
    }
    // Bear materials are private copies: transparency must never affect world materials.
    const avatarMaterials = [];
    rig.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      avatarMaterials.push(o.material);
    });
    const name = label(player.name, "#ffffff", 3);
    name.position.y = 2.65;
    root.add(name);
    const marker = ring(0.65, "#94ffda", 0, 0.025, 0, 0.045, root);
    marker.visible = false;
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 24),
      new THREE.MeshBasicMaterial({
        color: "#15263a",
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);
    return {
      root,
      avatarMaterials,
      name,
      rig,
      arms,
      feet,
      marker,
      shadow,
      position: { ...player },
      gait: 0,
      grounded: true,
      squash: 0,
    };
  }
  function disposeTree(root) {
    root.traverse((o) => {
      o.geometry?.dispose();
      if (o.material && !materials.has(o.material.color?.getStyle())) {
        if (o.material instanceof THREE.SpriteMaterial) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      }
    });
    scene.remove(root);
  }
  let low = false,
    previousRound = -1,
    previousPhase = "",
    received = performance.now(),
    snapshot,
    localId,
    local = null;
  function update(state, id) {
    received = performance.now();
    snapshot = state;
    if (currentWorld !== state.world) {
      currentWorld = state.world;
      yaw = Math.PI;
      pitch = -0.32;
      camera.fov = currentWorld === "arena1" ? 42 : 65;
      camera.updateProjectionMatrix();
      const player = state.players.find((p) => p.id === id);
      if (currentWorld === "arena1") {
        camera.position.set(0, 27, 33);
        camera.lookAt(0, 0, 0);
      } else {
        camera.position.set(
          player?.x || 0,
          (player?.y || 0) + 3.2,
          (player?.z || 0) + 5.2,
        );
        camera.lookAt(player?.x || 0, (player?.y || 0) + 1.6, player?.z || 0);
      }
      arena.visible = currentWorld === "arena1";
      lounge.visible = currentWorld === "lobby";
      parkour.visible = isParkour(currentWorld);
      if (parkour.visible) rebuildParkour(stageOf(currentWorld));
      vaultEffects =
        currentWorld === "arena1"
          ? arena.userData.chambers
          : parkourScene?.chambers || [];
    }
    localId = id;
    scene.fog.near = !id && isParkour(currentWorld) ? 100 : 42;
    scene.fog.far = !id && isParkour(currentWorld) ? 180 : 85;
    const p = state.players.find((p) => p.id === id);
    if (p) {
      const reset =
        !local ||
        state.round !== previousRound ||
        state.phase !== previousPhase ||
        local.respawns !== p.respawns ||
        Math.hypot(local.x - p.x, local.z - p.z) > 2;
      if (reset) local = { ...p, jumpHeld: false };
      else {
        local.x += (p.x - local.x) * 0.3;
        local.z += (p.z - local.z) * 0.3;
        local.y += (p.y - local.y) * 0.3;
        local.vy = p.vy;
        if ((p.launchedUntil || 0) > (local.launchedUntil || 0)) {
          local.vx = p.vx;
          local.vz = p.vz;
        }
        local.launchedUntil = p.launchedUntil || 0;
        local.hazardCooldown = p.hazardCooldown || 0;
      }
    }
    if (state.phase === "results" && previousPhase !== "results")
      state.results.forEach((r) => {
        const p = state.players.find((p) => p.id === r.id);
        if (p && r.payout > 0) puff(p.x, 1, p.z, "#ffe394", 18);
      });
    previousRound = state.round;
    previousPhase = state.phase;
    if (state.world !== "lobby")
      state.vaults.forEach((v, i) => {
        const fx = vaultEffects[i];
        if (!fx) return;
        const me = state.players.find((p) => p.id === id),
          n = state.occupancy[v.id],
          inside =
            me?.zone === v.id &&
            me?.eligible &&
            ["active", "practice"].includes(state.phase);
        const text = inside
          ? `Inside · ${(v.reward / Math.max(1, n)).toFixed(1)} each`
          : n
            ? `${n} inside · ${(v.reward / n).toFixed(1)} each`
            : "Enter chamber";
        if (text !== fx.lastText) {
          fx.status.material.map.dispose();
          fx.status.material.dispose();
          fx.status.material = label(
            text,
            inside ? "#a7ffd2" : "#d7e8e8",
            3.3,
          ).material;
          fx.lastText = text;
        }
        fx.glow.emissiveIntensity = inside ? 0.75 : n ? 0.35 : 0.12;
        fx.lamp.intensity = low ? 0 : inside ? 12 : n ? 7 : 2;
      });
  }
  function cameraMeshes(root) {
    const meshes = [];
    root.traverse((o) => {
      if (o.isMesh && o.visible) meshes.push(o);
    });
    return meshes;
  }
  const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  function frame(dt, time, input) {
    if (lounge.userData.board)
      lounge.userData.board.position.y =
        2.3 +
        (matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : Math.sin(time * 1.1) * 0.07);
    if (snapshot) {
      const mine = snapshot.players.find((p) => p.id === localId);
      if (local && mine && canMove(snapshot, mine))
        move(
          local,
          input,
          dt,
          snapshot.world,
          snapshot.worldTime +
            Math.min((performance.now() - received) / 1000, 0.1),
        );
      const live = new Set();
      for (const p of snapshot.players) {
        if (!p.connected) continue;
        live.add(p.id);
        let b = bears.get(p.id);
        if (!b) {
          b = bear(p);
          if (p.id === localId && currentWorld !== "arena1")
            b.rig.rotation.y = yaw;
          b.root.position.set(p.x, p.y, p.z);
          bears.set(p.id, b);
        }
        if (
          b.lastRespawns !== undefined &&
          (p.respawns || 0) > b.lastRespawns
        ) {
          if (p.lastRespawn === "spikes") {
            puff(
              b.root.position.x,
              b.root.position.y + 1,
              b.root.position.z,
              "#dce8e6",
              24,
            );
          }
          b.spawnAt = time;
        }
        b.lastRespawns = p.respawns || 0;
        const self = p.id === localId;
        const ghost =
          !!localId &&
          !self &&
          currentWorld !== "lobby" &&
          ["loading", "countdown", "active", "practice"].includes(
            snapshot.phase,
          );
        const opacity = ghost ? 0.22 : 1;
        if (b.opacity !== opacity) {
          b.opacity = opacity;
          b.avatarMaterials.forEach((m) => {
            m.transparent = ghost;
            m.opacity = opacity;
            m.depthWrite = !ghost;
          });
          b.rig.traverse((o) => {
            if (o.isMesh) o.castShadow = !ghost;
          });
          b.name.material.opacity = ghost ? 0.3 : 1;
        }
        const age = Math.min((performance.now() - received) / 1000, 0.1);
        const moving = canMove(snapshot, p),
          target =
            self && local
              ? local
              : {
                  x: p.x + (moving ? (p.vx || 0) * age : 0),
                  y: p.y,
                  z: p.z + (moving ? (p.vz || 0) * age : 0),
                  vx: p.vx,
                  vz: p.vz,
                };
        b.root.position.lerp(
          new THREE.Vector3(target.x, target.y, target.z),
          1 - Math.exp(-dt * (self ? 24 : 14)),
        );
        const speed = moving ? Math.hypot(target.vx || 0, target.vz || 0) : 0;
        if (speed > 0.15)
          b.rig.rotation.y +=
            angleDelta(b.rig.rotation.y, Math.atan2(target.vx, target.vz)) *
            (1 - Math.exp(-dt * 18));

        b.gait += dt * speed * 2.8;
        const airborne = !(self ? local?.grounded : p.grounded);
        if (b.grounded && airborne)
          puff(b.root.position.x, 0.1, b.root.position.z, "#d5e6e7", 6);
        if (!b.grounded && !airborne) {
          b.squash = 0.18;
          puff(b.root.position.x, 0.08, b.root.position.z, "#d5e6e7", 9);
        }
        b.grounded = !airborne;
        b.squash *= Math.exp(-dt * 12);
        b.rig.scale.set(
          1 + b.squash,
          1 - b.squash + (airborne ? 0.035 : 0),
          1 + b.squash,
        );
        b.rig.position.y =
          speed > 0.1 && !airborne
            ? Math.abs(Math.sin(b.gait)) * 0.055
            : Math.sin(time * 2 + p.x) * 0.015;
        b.rig.rotation.z = airborne
          ? 0
          : Math.sin(b.gait) * Math.min(speed / 6, 1) * 0.055;
        b.arms.forEach((arm, i) => {
          arm.rotation.y = 0;
          arm.rotation.x = airborne
            ? -0.6
            : Math.sin(b.gait + i * Math.PI) * Math.min(speed / 6, 1) * 0.55;
          arm.rotation.z = airborne ? (i === 0 ? 0.6 : -0.6) : 0;
        });
        b.feet.forEach(
          (foot, i) =>
            (foot.rotation.x = airborne
              ? 0.25
              : Math.sin(b.gait + i * Math.PI) * Math.min(speed / 6, 1) * 0.7),
        );
        b.arms.forEach((arm, i) => {
          arm.position.set(i ? 0.48 : -0.48, 1, 0);
          arm.scale.setScalar(1);
        });
        const emoteAge =
          p.emoteAge + Math.min((performance.now() - received) / 1000, 0.1);
        if (currentWorld === "lobby" && emoteAge < 3 && speed < 0.2) {
          const blend = Math.min(1, emoteAge / 0.3, (3 - emoteAge) / 0.4);
          const ease = blend * blend * (3 - 2 * blend);
          if (p.emoteName === "wave") {
            const a = b.arms[1];
            a.position.set(0.48 + 0.12 * ease, 1 + 0.27 * ease, 0.12 * ease);
            a.scale.y = 1 + 0.55 * ease;
            a.rotation.z = (2.6 + Math.sin(emoteAge * 10) * 0.22) * ease;
            a.rotation.x = Math.sin(emoteAge * 10) * 0.2 * ease;
          }
          if (p.emoteName === "scuba") {
            const left = b.arms[0],
              right = b.arms[1];
            // Nose hand stays in front of the muzzle; the other arm points outward.
            left.position.set(
              -0.48 + 0.16 * ease,
              1 + 0.42 * ease,
              0.56 * ease,
            );
            left.rotation.z = 1.7 * ease;
            left.scale.y = 1 + 0.55 * ease;
            right.position.set(
              0.48 + 0.12 * ease,
              1 + 0.16 * ease,
              0.15 * ease,
            );
            right.scale.y = 1 + 0.7 * ease;
            right.rotation.z = Math.sin(emoteAge * 8) * 0.23 * ease;
            right.rotation.y = Math.sin(emoteAge * 8) * 0.35 * ease;
            right.rotation.x = (-Math.PI / 2) * ease;
            b.rig.rotation.z = Math.sin(emoteAge * 3) * 0.06 * ease;
          }
          if (p.emoteName === "dance") {
            b.rig.rotation.z = Math.sin(emoteAge * 10) * 0.17;
            b.arms.forEach(
              (a, i) =>
                (a.rotation.z =
                  (i ? -1 : 1) * (0.8 + Math.sin(emoteAge * 10) * 0.25)),
            );
          }
        }
        if (b.spawnAt !== undefined && time - b.spawnAt < 0.5) {
          const scale = Math.min(1, Math.max(0.08, (time - b.spawnAt) / 0.5));
          b.rig.scale.multiplyScalar(scale);
        }
        b.name.visible = !(self && currentWorld !== "arena1");
        b.marker.visible = self && currentWorld === "arena1";
        b.marker.position.y = 0.03 - b.root.position.y;
        b.marker.scale.setScalar(1 + Math.sin(time * 3) * 0.03);
        b.shadow.position.set(
          b.root.position.x,
          (isParkour(currentWorld) ? (p.grounded ? p.y : -7) : 0) + 0.14,
          b.root.position.z,
        );
        b.shadow.scale.setScalar(1 / (1 + b.root.position.y * 0.3));
        b.shadow.material.opacity = 0.18 / (1 + b.root.position.y);
      }
      for (const [id, b] of bears)
        if (!live.has(id)) {
          disposeTree(b.root);
          scene.remove(b.shadow);
          b.shadow.geometry.dispose();
          b.avatarMaterials.forEach((m) => m.dispose());
          b.shadow.material.dispose();
          bears.delete(id);
        }
      const following = local && mine?.connected ? local : null;
      if (isParkour(currentWorld) && !localId) {
        camera.position.lerp(
          stageOf(currentWorld) >= 3
            ? new THREE.Vector3(0, 48, 46)
            : new THREE.Vector3(0, 36, 24),
          1 - Math.exp(-dt * 6),
        );
        camera.lookAt(0, 2, stageOf(currentWorld) >= 3 ? 0 : -16);
      } else if (currentWorld === "arena1") {
        const cx = following ? following.x * 0.13 : 0,
          cz = following ? following.z * 0.09 : 0;
        camera.position.lerp(
          new THREE.Vector3(cx, 27, 33 + cz),
          1 - Math.exp(-dt * 6),
        );
        camera.lookAt(cx * 0.6, 0, cz * 0.6);
      } else {
        const target = new THREE.Vector3(
          following?.x || 0,
          (following?.y || 0) + 1.6,
          following?.z || 0,
        );
        const direction = new THREE.Vector3(
          Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          Math.cos(yaw) * Math.cos(pitch),
        );
        const desired = target.clone().addScaledVector(direction, -5.2);
        desired.y = Math.max((following?.y || 0) + 0.4, desired.y);
        const offset = desired.clone().sub(target),
          distance = offset.length();
        cameraRay.set(target, offset.normalize());
        cameraRay.far = distance;
        cameraRay.near = 0.05;
        const root = currentWorld === "lobby" ? lounge : parkour;
        const hit = cameraRay
          .intersectObjects(
            (root.userData.cameraMeshes ||= cameraMeshes(root)),
            false,
          )
          .find((h) => h.object.isMesh && h.object.visible);
        if (hit && currentWorld !== "lobby") {
          desired
            .copy(target)
            .addScaledVector(offset, Math.max(0.45, hit.distance - 0.3));
          camera.position.copy(desired);
        } else camera.position.lerp(desired, 1 - Math.exp(-dt * 18));
        camera.lookAt(target.clone().addScaledVector(direction, 12));
      }
      if (
        (isParkour(currentWorld) && parkourScene) ||
        currentWorld === "lobby"
      ) {
        const at =
          snapshot.worldTime +
          (snapshot.paused ||
          !["active", "practice", "ready", "instructions"].includes(
            snapshot.phase,
          )
            ? 0
            : Math.min((performance.now() - received) / 1000, 0.1));
        const stage = stageOf(currentWorld);
        const environmentState =
          currentWorld === "lobby" ? lounge.userData.practice : parkourScene;
        (currentWorld === "lobby"
          ? practicePlatforms(at)
          : platforms(at, stage)
        ).forEach((p) => {
          const group = environmentState.platformMeshes.get(p.id);
          if (!group) return;
          group.position.set(
            p.x,
            p.flipping ? p.baseY - p.baseH / 2 : p.y,
            p.z,
          );
          group.rotation.x = p.flipAngle || 0;
          group.scale.set(p.scale || 1, 1, p.scale || 1);
        });
        (currentWorld === "lobby"
          ? practiceHazards(at)
          : hazards(at, stage)
        ).forEach((h) => {
          const fx = environmentState.spikeMeshes.get(h.id);
          if (!fx) return;
          if (h.kind === "puncher") {
            fx.group.position.set(h.baseX, h.y, h.baseZ);
            fx.glove.position.x = h.reach * h.extension;
            fx.spring.scale.y = Math.max(0.04, h.reach * h.extension);
            fx.spring.position.x = (h.reach * h.extension) / 2;
            fx.wall.rotation.x =
              h.state === "warning" ? Math.sin(at * 45) * 0.018 : 0;
          } else {
            fx.group.position.set(h.x, h.y, h.z);
            fx.spikes.scale.y = Math.max(0.015, h.extension);
          }
          fx.glow.color.set(
            h.state === "active"
              ? "#ef685d"
              : h.state === "warning"
                ? "#ffca66"
                : "#628f7f",
          );
          fx.glow.emissive.copy(fx.glow.color);
          fx.glow.emissiveIntensity =
            h.state === "warning" ? 0.5 + Math.sin(at * 16) * 0.3 : 0.35;
        });
      }
      vaultEffects.forEach(
        (fx) => (fx.lamp.intensity = low ? 0 : fx.lamp.intensity),
      );
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life += dt;
      e.particle.position.x += e.vx * dt;
      e.particle.position.y += e.vy * dt;
      e.particle.position.z += e.vz * dt;
      e.vy -= 8 * dt;
      e.particle.scale.setScalar(Math.max(0, 1 - e.life / e.duration));
      if (e.life >= e.duration) {
        scene.remove(e.particle);
        e.particle.geometry.dispose();
        effects.splice(i, 1);
      }
    }
    renderer.render(scene, camera);
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);
  return {
    async ready() {
      await environmentAssetsReady();
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      await renderer.compileAsync(scene, camera);
    },
    update,
    frame,
    look(dt, keys) {
      if (currentWorld === "arena1") return;
      yaw -=
        (Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"))) *
        dt *
        1.8;
      pitch = Math.max(
        -1.25,
        Math.min(
          1.45,
          pitch +
            (Number(keys.has("ArrowUp")) - Number(keys.has("ArrowDown"))) *
              dt *
              1.3,
        ),
      );
    },
    movement(input) {
      if (currentWorld === "arena1") return input;
      const length = Math.max(1, Math.hypot(input.x, input.z));
      input = { ...input, x: input.x / length, z: input.z / length };
      const forward = -input.z,
        side = input.x;
      return {
        ...input,
        x: Math.sin(yaw) * forward - Math.cos(yaw) * side,
        z: Math.cos(yaw) * forward + Math.sin(yaw) * side,
      };
    },
    setQuality(value) {
      low = value;
      renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = !low;
    },
  };
}
