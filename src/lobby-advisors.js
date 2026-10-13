import * as THREE from "three";
import { ADVISORS, nearbyAdvisor } from "../shared/lobby-advisors.js";
export function createLobbyAdvisors(parent, bear, label) {
  const models = ADVISORS.map((a, i) => {
    const m = bear({
      name: a.name,
      appearance: {
        bear: "panda",
        color: i === 2 ? "tie" : "none",
        shirt: ["adsc", "army", "poker"][i],
        hat: i === 0 ? "beanie" : i === 2 ? "cap" : "none",
        glasses: i === 0 ? "round" : i === 2 ? "shades" : "none",
      },
    });
    parent.add(m.root);
    parent.add(m.shadow);
    m.root.position.set(a.x, 0, a.z);
    m.shadow.position.set(a.x, 0.015, a.z);
    m.root.scale.set(
      ...[
        [0.82, 0.82, 0.82],
        [1.35, 1.15, 1.12],
        [1, 1, 1],
      ][i],
    );
    m.name.visible = false;
    const title = label(a.name, a.color, 1.55);
    title.position.set(a.x - (i === 1 ? 1.2 : 0), [2.12, 2.65, 2.35][i], a.z);
    parent.add(title);
    const mat = new THREE.MeshStandardMaterial({
      color: a.color,
      roughness: 0.7,
    });
    const add = (geometry, color, x, y, z) => {
      const o = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
      );
      o.position.set(x, y, z);
      m.rig.add(o);
      return o;
    };
    if (i === 0) {
      // A little notebook, tucked under a paw.
      add(
        new THREE.BoxGeometry(0.35, 0.44, 0.09),
        "#77609a",
        -0.42,
        0.82,
        0.3,
      ).rotation.z = 0.15;
      add(
        new THREE.BoxGeometry(0.27, 0.36, 0.015),
        "#f5e7c5",
        -0.42,
        0.82,
        0.355,
      ).rotation.z = 0.15;
      m.arms[0].rotation.x = -0.7;
    } else if (i === 1) {
      // Broad shoulders and a soft angular chin keep the face recognisably a bear.
      for (const side of [-1, 1])
        add(
          new THREE.SphereGeometry(0.23, 12, 8),
          "#34343f",
          side * 0.48,
          1.07,
          0.05,
        );
      const jaw = add(
        new THREE.CylinderGeometry(0.26, 0.19, 0.15, 5),
        "#f2efdf",
        0,
        1.22,
        0.27,
      );
      jaw.rotation.y = Math.PI / 5;
      m.arms.forEach((arm, j) => {
        arm.rotation.x = -0.8;
        arm.rotation.z = j ? 0.55 : -0.55;
      });
    } else {
      for (const piece of m.rig.children) {
        if (piece.isMesh && piece.position.y >= 1.9)
          piece.material.color.set("#292c40");
      }
      for (const side of [-1, 1]) {
        add(
          new THREE.BoxGeometry(0.18, 0.46, 0.06),
          "#292c40",
          side * 0.23,
          0.87,
          0.43,
        ).rotation.z = side * 0.28;
        add(
          new THREE.BoxGeometry(0.11, 0.18, 0.04),
          "#eee5d2",
          side * 0.12,
          1.13,
          0.4,
        ).rotation.z = side * 0.45;
      }
      const chain = add(
        new THREE.TorusGeometry(0.27, 0.025, 6, 18),
        "#eac669",
        0,
        1.06,
        0.39,
      );
      chain.scale.y = 0.65;
      add(
        new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14),
        "#d8ad58",
        0.48,
        0.84,
        0.25,
      ).rotation.x = Math.PI / 2;
      m.arms[1].rotation.x = -0.65;
    }
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1, 0.13, 24),
      mat,
    );
    plinth.position.set(a.x, 0.025, a.z);
    parent.add(plinth);
    return { m };
  });
  return {
    frame(time, reduced, player) {
      const near = nearbyAdvisor(player);
      models.forEach(({ m }, i) => {
        m.rig.position.y = reduced ? 0 : Math.sin(time * 1.7 + i * 2) * 0.022;
        m.rig.rotation.y = reduced ? 0 : Math.sin(time * 0.55 + i) * 0.12;
        m.marker.visible = near?.id === ADVISORS[i].id;
      });
    },
    pick(camera, canvas, event, player) {
      const near = nearbyAdvisor(player);
      if (!near) return null;
      const rect = canvas.getBoundingClientRect(),
        ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((event.clientY - rect.top) / rect.height) * 2,
        ),
        camera,
      );
      return ray.intersectObject(models[ADVISORS.indexOf(near)].m.root, true)
        .length
        ? near
        : null;
    },
  };
}
export function createAdvisorUI({ audio, clearKeys }) {
  const box = document.createElement("section");
  box.className = "advisor-dialog";
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Panda strategy advice");
  document.body.append(box);
  const hint = document.createElement("button");
  hint.className = "advisor-hint";
  hint.hidden = true;
  document.body.append(hint);
  let near = null,
    active = null,
    page = 0,
    lastShot = null;
  function close() {
    box.hidden = true;
    active = null;
  }
  function draw() {
    const a = active,
      t = a.tips[page];
    box.style.setProperty("--advisor-accent", a.color);
    box.innerHTML = `<div class="advisor-heading"><div><small>${a.game}${a.id === "ace" ? " · Preview" : ""}</small><h2>${a.name}</h2><p>${a.role}</p></div><button type="button" data-close aria-label="Close advice">×</button></div><div class="advisor-tip" aria-live="polite"><small>${t[0]} · ${page + 1} / ${a.tips.length}</small><h3>${t[1]}</h3><p>${t[2]}</p></div><nav aria-label="Advice pages"><button data-prev ${page === 0 ? "disabled" : ""}>Previous</button><button data-next>${page === a.tips.length - 1 ? "Back to basics" : "Next tip →"}</button></nav><small class="advisor-exit">Walk away or press Esc to close.</small>`;
    box.querySelector("[data-close]").onclick = close;
    box.querySelector("[data-prev]").onclick = () => {
      page--;
      audio.cue("softClick");
      draw();
    };
    box.querySelector("[data-next]").onclick = () => {
      page = (page + 1) % a.tips.length;
      audio.cue("softClick");
      draw();
    };
  }
  function open(a = near) {
    if (!a || a.id !== near?.id) return false;
    active = a;
    page = 0;
    clearKeys();
    audio.cue("softClick");
    draw();
    box.hidden = false;
    hint.hidden = true;
    return true;
  }
  hint.onclick = () => open();
  return {
    open,
    close,
    update(state, id) {
      const p = state.players.find((p) => p.id === id);
      near =
        state.world === "lobby" && !state.battlefield ? nearbyAdvisor(p) : null;
      if (active && active.id !== near?.id) close();
      hint.hidden = !near || !!active;
      hint.textContent = near ? `E · Ask ${near.name} about ${near.game}` : "";
      if (state.world === "lobby" && p?.lobbyTankAt != null) {
        if (lastShot != null && p.lobbyTankAt !== lastShot)
          audio.cue("lobbyTank");
        lastShot = p.lobbyTankAt;
      } else lastShot = null;
    },
  };
}
