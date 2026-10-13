import * as THREE from "three";
const logo = new Image();
logo.src = "/assets/panda-logo.png";
const janeLogo = new Image();
janeLogo.src = "/assets/jane-street-logo.png";
const palette = {
  adsc: "#30256d",
  google: "#f4f2e9",
  janestreet: "#f3f1e9",
  amazon: "#263340",
  equilibrium: "#4d667d",
  poker: "#803d56",
  sweet: "#efacba",
  army: "#637354",
  space: "#394c81",
  noodle: "#f3cf86",
};
// All garments live inside the avatar rig; physics never sees these meshes.
export function dressBear(rig, arms, appearance, accent) {
  function piece(geometry, color, x, y, z, parent = rig) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const obj = new THREE.Mesh(geometry, material);
    obj.userData.wardrobeMaterial = true;
    obj.position.set(x, y, z);
    parent.add(obj);
    return obj;
  }
  function print(draw, x, y, z, w, h, parent = rig) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    draw(ctx);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    plane.userData.wardrobeMaterial = true;
    plane.position.set(x, y, z);
    parent.add(plane);
    return { ctx, texture };
  }
  const shirt = palette[appearance.shirt];
  if (shirt) {
    piece(
      new THREE.SphereGeometry(0.493, 24, 16, 0, Math.PI * 2, 0.28, 2.21),
      shirt,
      0,
      0.78,
      0,
    ).scale.set(1, 1.2, 0.85);
    // Sleeve caps share each shoulder hinge, including emotes.
    for (const arm of arms)
      piece(
        new THREE.SphereGeometry(0.195, 16, 10),
        shirt,
        0,
        -0.075,
        0,
        arm,
      ).scale.set(1.04, 0.97, 1.04);
    const collar = piece(
      new THREE.TorusGeometry(0.275, 0.026, 8, 28),
      shirt,
      0,
      1.25,
      0,
    );
    collar.rotation.x = Math.PI / 2;
    if (appearance.shirt === "adsc") {
      const draw = (ctx) => {
        ctx.clearRect(0, 0, 512, 256);
        if (logo.complete && logo.naturalWidth)
          ctx.drawImage(logo, 128, 0, 256, 256);
        else {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 90px sans-serif";
          ctx.fillText("ADSC", 90, 170);
        }
      };
      const badge = print(draw, 0.19, 1.01, 0.377, 0.26, 0.13);
      badge.texture.anisotropy = 4;
      if (!logo.complete)
        logo.addEventListener(
          "load",
          () => {
            draw(badge.ctx);
            badge.texture.needsUpdate = true;
          },
          { once: true },
        );
    } else if (appearance.shirt === "janestreet") {
      const draw = (ctx) => {
        ctx.clearRect(0, 0, 512, 256);
        if (janeLogo.complete && janeLogo.naturalWidth)
          ctx.drawImage(janeLogo, 24, 37, 464, 181);
      };
      const badge = print(draw, 0, 0.9, 0.44, 0.62, 0.31);
      badge.texture.anisotropy = 4;
      if (!janeLogo.complete)
        janeLogo.addEventListener(
          "load",
          () => {
            draw(badge.ctx);
            badge.texture.needsUpdate = true;
          },
          { once: true },
        );
    } else
      print(
        (ctx) => {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#fff";
          ctx.font = "bold 65px sans-serif";
          if (appearance.shirt === "google") {
            const letters = [
              "#4285f4",
              "#ea4335",
              "#fbbc05",
              "#4285f4",
              "#34a853",
              "#ea4335",
            ];
            ctx.font = "bold 78px sans-serif";
            [..."Google"].forEach((letter, i) => {
              ctx.fillStyle = letters[i];
              ctx.fillText(letter, 90 + i * 65, 125);
            });
          } else if (appearance.shirt === "amazon") {
            ctx.fillText("amazon", 256, 100);
            ctx.strokeStyle = "#ffb64c";
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.ellipse(255, 152, 110, 28, 0, 0, Math.PI);
            ctx.stroke();
          } else if (appearance.shirt === "equilibrium") {
            ctx.font = "bold 52px sans-serif";
            ctx.fillText("NASH", 256, 95);
            ctx.font = "32px sans-serif";
            ctx.fillText("equilibrium", 256, 155);
          } else if (appearance.shirt === "poker") {
            ctx.font = "100px serif";
            ctx.fillText("♠ ♥ ♣ ♦", 256, 125);
          } else if (appearance.shirt === "army") {
            ctx.fillStyle = "#e1d9ae";
            ctx.font = "bold 44px sans-serif";
            ctx.fillText("PANDA", 256, 90);
            ctx.fillText("PATROL", 256, 155);
          } else if (appearance.shirt === "space") {
            ctx.fillStyle = "#ffda82";
            ctx.font = "80px sans-serif";
            ctx.fillText("★", 256, 90);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 40px sans-serif";
            ctx.fillText("SPACE CADET", 256, 175, 470);
          } else if (appearance.shirt === "noodle") {
            ctx.fillStyle = "#775039";
            ctx.font = "bold 65px sans-serif";
            ctx.fillText("NOODLE", 256, 90);
            ctx.font = "bold 44px sans-serif";
            ctx.fillText("CLUB", 256, 166);
          } else {
            ctx.fillStyle = "#c34367";
            ctx.font = "bold 48px sans-serif";
            ctx.fillText("strawberry", 256, 100);
            ctx.font = "42px sans-serif";
            ctx.fillText("milk", 256, 155);
          }
        },
        0,
        0.9,
        0.435,
        0.57,
        0.285,
      );
  }
  if (appearance.shirt === "army") {
    for (const side of [-1, 1]) {
      piece(
        new THREE.BoxGeometry(0.13, 0.2, 0.045),
        "#414f3d",
        side * 0.31,
        0.85,
        0.335,
      ).rotation.z = -side * 0.15;
      piece(
        new THREE.BoxGeometry(0.13, 0.025, 0.055),
        "#c2b889",
        side * 0.31,
        0.95,
        0.36,
      );
    }
  }
  if (appearance.hat === "helmet") {
    piece(
      new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      "#627553",
      0,
      1.85,
      0,
    ).scale.y = 0.65;
    const brim = piece(
      new THREE.TorusGeometry(0.425, 0.04, 8, 24),
      "#354635",
      0,
      1.87,
      0,
    );
    brim.rotation.x = Math.PI / 2;
    piece(new THREE.BoxGeometry(0.12, 0.1, 0.025), "#ded3a2", 0, 2, 0.35);
  }
  if (appearance.hat === "frog") {
    piece(
      new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      "#7ebc78",
      0,
      1.85,
      0,
    ).scale.y = 0.65;
    for (const side of [-1, 1]) {
      piece(
        new THREE.SphereGeometry(0.12, 12, 8),
        "#7ebc78",
        side * 0.2,
        2.12,
        0.18,
      );
      piece(
        new THREE.SphereGeometry(0.075, 10, 8),
        "#f3efcc",
        side * 0.2,
        2.13,
        0.26,
      );
      piece(
        new THREE.SphereGeometry(0.035, 8, 6),
        "#263945",
        side * 0.2,
        2.13,
        0.32,
      );
    }
  }
  if (appearance.hat === "duck") {
    piece(
      new THREE.SphereGeometry(0.2, 12, 8),
      "#f5ce60",
      0,
      2.05,
      0,
    ).scale.set(1.3, 0.8, 1);
    piece(new THREE.SphereGeometry(0.13, 12, 8), "#f5ce60", 0, 2.22, 0.1);
    piece(new THREE.BoxGeometry(0.15, 0.055, 0.14), "#ed9251", 0, 2.2, 0.23);
    for (const side of [-1, 1])
      piece(
        new THREE.SphereGeometry(0.02, 8, 6),
        "#293b4b",
        side * 0.08,
        2.24,
        0.2,
      );
  }
  if (appearance.color === "bowtie") {
    for (const side of [-1, 1]) {
      const bow = piece(
        new THREE.SphereGeometry(0.11, 12, 8),
        accent,
        side * 0.1,
        1.12,
        0.3,
      );
      bow.scale.set(1.3, 0.65, 0.5);
      bow.rotation.z = side * 0.3;
    }
    piece(new THREE.SphereGeometry(0.055, 12, 8), "#f4e7dc", 0, 1.12, 0.33);
  }
  if (appearance.color === "tie") {
    piece(new THREE.SphereGeometry(0.06, 10, 8), accent, 0, 1.15, 0.29);
    const tie = piece(
      new THREE.ConeGeometry(0.075, 0.34, 4),
      accent,
      0,
      0.94,
      0.43,
    );
    tie.rotation.z = Math.PI;
    tie.scale.z = 0.35;
  }
  if (appearance.hat === "headphones") {
    const band = piece(
      new THREE.TorusGeometry(0.48, 0.047, 8, 32, Math.PI),
      "#44405c",
      0,
      1.58,
      0,
    );
    band.rotation.z = 0;
    for (const side of [-1, 1]) {
      piece(
        new THREE.SphereGeometry(0.17, 12, 8),
        "#292b3e",
        side * 0.48,
        1.55,
        0,
      ).scale.set(0.5, 1, 1);
      piece(
        new THREE.SphereGeometry(0.12, 12, 8),
        "#bba5ea",
        side * 0.55,
        1.55,
        0,
      ).scale.set(0.4, 1, 1);
    }
  }
  if (appearance.hat === "beanie") {
    piece(
      new THREE.SphereGeometry(0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      "#ad85cd",
      0,
      1.83,
      0,
    ).scale.y = 0.65;
    const brim = piece(
      new THREE.TorusGeometry(0.395, 0.055, 10, 28),
      "#8561a7",
      0,
      1.85,
      0,
    );
    brim.rotation.x = Math.PI / 2;
    piece(new THREE.SphereGeometry(0.095, 12, 8), "#e0cbee", 0, 2.12, 0);
  }
  if (["shades", "money", "heart"].includes(appearance.glasses)) {
    for (const side of [-1, 1]) {
      if (appearance.glasses === "shades") {
        const lens = piece(
          new THREE.BoxGeometry(0.25, 0.14, 0.045),
          "#161b28",
          side * 0.17,
          1.58,
          0.55,
        );
        lens.rotation.z = -side * 0.07;
      } else if (appearance.glasses === "money") {
        piece(
          new THREE.TorusGeometry(0.135, 0.022, 8, 24),
          "#eaca66",
          side * 0.17,
          1.58,
          0.55,
        );
        print(
          (ctx) => {
            ctx.textAlign = "center";
            ctx.fillStyle = "#eaca66";
            ctx.font = "bold 200px serif";
            ctx.fillText("$", 256, 205);
          },
          side * 0.17,
          1.58,
          0.56,
          0.2,
          0.1,
        );
      } else {
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.12);
        shape.bezierCurveTo(-0.28, 0.08, -0.13, 0.24, 0, 0.1);
        shape.bezierCurveTo(0.13, 0.24, 0.28, 0.08, 0, -0.12);
        piece(
          new THREE.ShapeGeometry(shape),
          "#eb739b",
          side * 0.17,
          1.58,
          0.56,
        ).scale.set(0.65, 0.65, 1);
      }
    }
    piece(
      new THREE.BoxGeometry(0.12, 0.025, 0.03),
      appearance.glasses === "money" ? "#eaca66" : "#34313d",
      0,
      1.58,
      0.55,
    );
  }
  if (appearance.glasses === "monocle") {
    piece(
      new THREE.TorusGeometry(0.145, 0.02, 8, 28),
      "#eaca66",
      0.17,
      1.58,
      0.55,
    );
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.3, 1.57, 0.5),
      new THREE.Vector3(0.4, 1.3, 0.4),
      new THREE.Vector3(0.34, 1.13, 0.3),
    ]);
    piece(
      new THREE.TubeGeometry(curve, 12, 0.009, 5, false),
      "#eaca66",
      0,
      0,
      0,
    );
  }
}
