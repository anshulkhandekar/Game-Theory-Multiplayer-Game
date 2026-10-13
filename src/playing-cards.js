import * as THREE from "three";
function suit(ctx, type, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.beginPath();
  if (type === "heart") {
    ctx.moveTo(0, 0.8);
    ctx.bezierCurveTo(-1.3, -0.1, -0.9, -1.2, 0, -0.45);
    ctx.bezierCurveTo(0.9, -1.2, 1.3, -0.1, 0, 0.8);
  } else if (type === "spade") {
    ctx.moveTo(0, -0.9);
    ctx.bezierCurveTo(-0.4, -0.4, -1.2, 0.2, -0.7, 0.55);
    ctx.bezierCurveTo(-0.3, 0.8, -0.1, 0.45, 0, 0.25);
    ctx.bezierCurveTo(0.1, 0.45, 0.3, 0.8, 0.7, 0.55);
    ctx.bezierCurveTo(1.2, 0.2, 0.4, -0.4, 0, -0.9);
  } else {
    for (const [cx, cy] of [
      [0, -0.45],
      [-0.5, 0.15],
      [0.5, 0.15],
    ]) {
      ctx.moveTo(cx + 0.43, cy);
      ctx.arc(cx, cy, 0.43, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  if (type !== "heart") {
    ctx.beginPath();
    ctx.moveTo(-0.27, 0.9);
    ctx.lineTo(0, 0.25);
    ctx.lineTo(0.27, 0.9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function court(ctx, rank, ink) {
  ctx.save();
  ctx.translate(256, 360);
  for (let half = 0; half < 2; half++) {
    ctx.save();
    ctx.rotate(half * Math.PI);
    ctx.fillStyle = "#d3a34f";
    ctx.beginPath();
    ctx.moveTo(-105, 0);
    ctx.lineTo(-80, -77);
    ctx.lineTo(80, -77);
    ctx.lineTo(105, 0);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(-85, 0);
    ctx.lineTo(-57, -77);
    ctx.lineTo(42, -77);
    ctx.lineTo(87, 0);
    ctx.fill();
    ctx.strokeStyle = "#f0d99b";
    ctx.lineWidth = 8;
    for (let i = -60; i < 80; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - 24, -65);
      ctx.stroke();
    }
    ctx.fillStyle = "#f1d8ac";
    ctx.strokeStyle = "#34414b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -112, 29, 39, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#303a48";
    for (const x of [-11, 11]) ctx.fillRect(x, -120, 5, 4);
    ctx.fillRect(-3, -116, 4, 17);
    ctx.fillRect(-11, -95, 23, 3);
    ctx.strokeStyle = "#8a612a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-30, -134);
    ctx.lineTo(-30, -87);
    ctx.moveTo(30, -134);
    ctx.lineTo(30, -87);
    ctx.stroke();
    ctx.fillStyle = "#e9b550";
    ctx.strokeStyle = "#455466";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-35, -142);
    ctx.lineTo(-43, -162);
    ctx.lineTo(-18, -152);
    ctx.lineTo(0, -173);
    ctx.lineTo(18, -152);
    ctx.lineTo(43, -162);
    ctx.lineTo(35, -142);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#34414b";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-83, -12);
    ctx.lineTo(-83, -148);
    ctx.stroke();
    ctx.fillStyle = "#efc56a";
    ctx.beginPath();
    ctx.arc(-83, -151, rank === "Q" ? 12 : 7, 0, Math.PI * 2);
    ctx.fill();
    if (rank === "K") {
      ctx.fillStyle = "#d6a34b";
      ctx.beginPath();
      ctx.moveTo(-15, -91);
      ctx.lineTo(0, -66);
      ctx.lineTo(15, -91);
      ctx.fill();
    }
    if (rank === "J") {
      ctx.strokeStyle = "#efefe0";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(22, -153);
      ctx.lineTo(44, -181);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
export function createPlayingCard(rank, type) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext("2d"),
    ink = type === "heart" ? "#a63340" : "#23394f";
  ctx.fillStyle = "#fbf8ed";
  ctx.beginPath();
  ctx.roundRect(5, 5, 502, 710, 24);
  ctx.fill();
  ctx.strokeStyle = "#a5a08f";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(113, 178, 286, 364);
  court(ctx, rank, ink);
  for (let corner = 0; corner < 2; corner++) {
    ctx.save();
    if (corner) {
      ctx.translate(512, 720);
      ctx.rotate(Math.PI);
    }
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.font = "bold 64px Georgia,serif";
    ctx.fillText(rank, 49, 87);
    suit(ctx, type, 49, 126, 23);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const card = new THREE.Group();
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.87, 1.23, 0.025),
    new THREE.MeshStandardMaterial({ color: "#e5dfcb", roughness: 0.6 }),
  );
  card.add(edge);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 1.21),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  face.position.z = 0.014;
  card.add(face);
  const backCanvas = document.createElement("canvas");
  backCanvas.width = 256;
  backCanvas.height = 360;
  const b = backCanvas.getContext("2d");
  b.fillStyle = "#eee7d4";
  b.fillRect(0, 0, 256, 360);
  b.fillStyle = "#315a83";
  b.fillRect(10, 10, 236, 340);
  b.strokeStyle = "#e0d6b4";
  b.lineWidth = 2;
  b.strokeRect(19, 19, 218, 322);
  b.strokeStyle = "#829cbc";
  b.lineWidth = 1;
  for (let i = -360; i < 360; i += 15) {
    b.beginPath();
    b.moveTo(i, 22);
    b.lineTo(i + 310, 338);
    b.stroke();
    b.beginPath();
    b.moveTo(i + 310, 22);
    b.lineTo(i, 338);
    b.stroke();
  }
  const backTexture = new THREE.CanvasTexture(backCanvas);
  backTexture.colorSpace = THREE.SRGBColorSpace;
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 1.21),
    new THREE.MeshBasicMaterial({ map: backTexture }),
  );
  back.position.z = -0.014;
  back.rotation.y = Math.PI;
  card.add(back);
  return card;
}
