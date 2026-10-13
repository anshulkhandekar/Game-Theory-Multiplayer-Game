// Standalone socket/process checks. Uses an OS-assigned port and disposable state only.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import WebSocket from "ws";
import { Game } from "../server/game.js";
import { snapshotDecoder } from "../shared/snapshot-stream.js";

test(
  "production admission, private streams, process recovery, corrupt file preservation",
  { timeout: 45000 },
  async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "game-integration-")),
      file = path.join(dir, "scores.json");
    const secrets = {
      HOST_KEY: "integration-host-secret-123",
      EVENT_CODE: "integration-event-123",
      SPECTATOR_KEY: "integration-screen-secret-123",
    };
    let child, port;
    const sockets = [];
    async function stop() {
      if (child && child.exitCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
    }
    t.after(async () => {
      for (const ws of sockets) ws.terminate();
      await stop();
      fs.rmSync(dir, { recursive: true, force: true });
    });
    async function start() {
      child = spawn(process.execPath, ["server/index.js"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...secrets,
          PORT: "0",
          NODE_ENV: "production",
          STATE_FILE: file,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      await new Promise((resolve, reject) => {
        let text = "";
        child.stdout.on("data", (d) => {
          text += d;
          const m = /localhost:(\d+)/.exec(text);
          if (m) {
            port = +m[1];
            resolve();
          }
        });
        child.once("exit", (code) => reject(Error("Server exited " + code)));
      });
    }
    const http = () => `http://127.0.0.1:${port}`;
    async function connect(code, view = "player") {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/socket?view=${view}`, {
        headers: { "x-workshop-code": code },
      });
      sockets.push(ws);
      ws.messages = [];
      const decode = snapshotDecoder();
      ws.on("message", (raw) => {
        const m = JSON.parse(raw);
        if (m.type === "state") m.state = decode(m.state);
        ws.messages.push(m);
      });
      await once(ws, "open");
      return ws;
    }
    const send = (ws, m) => ws.send(JSON.stringify(m));
    async function wait(ws, predicate) {
      const until = Date.now() + 4000;
      while (Date.now() < until) {
        const m = ws.messages.find(predicate);
        if (m) return m;
        await new Promise((r) => setTimeout(r, 20));
      }
      throw Error("Missing expected message");
    }
    const g = new Game(),
      p = g.join(null, "Retained");
    p.earnings = 123;
    g.recordRound("crowd",1,[{id:p.id,vault:"bronze",payout:123,occupants:1,reward:123}]);
    fs.writeFileSync(file, JSON.stringify(g.save()));
    await start();
    assert.equal((await fetch(http() + "/health")).status, 200);
    assert.equal((await fetch(http() + "/")).status, 401);
    const denied = new WebSocket(`ws://127.0.0.1:${port}`);
    denied.on("error", () => {});
    const [_, response] = await once(denied, "unexpected-response");
    assert.equal(response.statusCode, 401);
    response.resume();
    denied.terminate();
    const login = await fetch(http() + "/access?view=player", {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: secrets.EVENT_CODE }),
    });
    assert.equal(login.status, 303);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Strict/);
    assert.equal(
      (await fetch(http() + "/?view=host", { headers: { cookie } })).status,
      401,
    );
    const player = await connect(secrets.EVENT_CODE);
    await new Promise((r) => setTimeout(r, 120));
    assert.ok(!player.messages.some((m) => m.type === "state"));
    send(player, { type: "preview" });
    const preview = await wait(player, (m) => m.type === "state");
    assert.equal(preview.state.players.length, 0);
    send(player, { type: "observe" });
    await wait(
      player,
      (m) => m.type === "error" && /projector/.test(m.message),
    );
    send(player, {
      type: "join",
      id: p.token,
      name: p.name,
      pageId: "11111111-1111-4111-8111-111111111111",
    });
    const identity = await wait(player, (m) => m.type === "identity");
    assert.equal(identity.id, p.id);
    const state = await wait(
      player,
      (m) => m.type === "state" && m.state.players.length === 1,
    );
    assert.equal(state.state.players[0].earnings, 123);
    assert.ok(!JSON.stringify(state).includes(p.token));
    const host = await connect(secrets.HOST_KEY, "host");
    await wait(host, (m) => m.type === "auth" && m.ok);
    const history = await wait(host,m=>m.type==="history");
    assert.equal(history.rounds[0].players[0].payout,123);
    send(player, { type: "host", action: "lobby" });
    await wait(
      player,
      (m) => m.type === "error" && /Unauthorized/.test(m.message),
    );
    const projector = await connect(secrets.SPECTATOR_KEY, "projector");
    send(projector, { type: "observe" });
    await wait(projector, (m) => m.type === "state");
    assert.ok(!projector.messages.some(m=>m.type==="history"));
    assert.ok(!player.messages.some(m=>m.type==="history"));
    send(host,{type:"host",action:"broadcast",data:{soundEnabled:false}});
    await wait(projector,m=>m.type==="state"&&m.state.broadcast.soundEnabled===false);
    send(host,{type:"host",action:"broadcast",data:{soundEnabled:true}});
    send(projector, { type: "join", name: "Forbidden" });
    await wait(
      projector,
      (m) => m.type === "error" && /cannot join/.test(m.message),
    );
    for (let i = 0; i < 3; i++) {
      const ws = await connect(secrets.SPECTATOR_KEY);
      send(ws, { type: "observe" });
      await wait(ws, (m) => m.type === "state");
    }
    const excess = await connect(secrets.SPECTATOR_KEY);
    send(excess, { type: "observe" });
    await wait(excess, (m) => m.type === "error" && /limit/.test(m.message));
    send(host,{type:"host",action:"lobbyChat",data:{enabled:false}});
    await wait(player,m=>m.type==="state"&&m.state.lobbyChatEnabled===false);
    send(player,{type:"chat",text:"Should not be accepted"});
    await wait(player,m=>m.type==="error"&&/chat is disabled/.test(m.message));
    const other=await connect(secrets.EVENT_CODE);send(other,{type:"join",name:"Teammate"});await wait(other,m=>m.type==="identity");
    send(host,{type:"host",action:"battlefield"});await wait(host,m=>m.type==="state"&&m.state.battlefield?.phase==="matching");
    send(host,{type:"host",action:"battle:match"});await wait(host,m=>m.type==="state"&&m.state.battlefield?.phase==="staging");
    send(player,{type:"battle",action:"chat",data:{text:"First team private"}});send(other,{type:"battle",action:"chat",data:{text:"Second team private"}});
    await wait(host,m=>m.type==="teamChats"&&m.messages.length===2);
    const privateView=await wait(other,m=>m.type==="state"&&m.state.battlefield?.messages.some(q=>q.text==="Second team private"));
    assert.ok(!privateView.state.battlefield.messages.some(q=>q.text==="First team private"));
    assert.ok(!player.messages.some(m=>m.type==="teamChats"));assert.ok(!projector.messages.some(m=>m.type==="teamChats"));
    send(host,{type:"host",action:"lobby"});await wait(host,m=>m.type==="state"&&m.state.world==="lobby"&&m.state.lobbyChatEnabled===false);
    for (const ws of sockets) ws.terminate();
    await stop();
    await start();
    const again = await connect(secrets.EVENT_CODE);
    send(again, { type: "join", id: p.token, name: p.name });
    await wait(again, (m) => m.type === "identity" && m.id === p.id);
    const recovered = await wait(again, (m) => m.type === "state");
    assert.equal(recovered.state.phase, "lobby");
    assert.equal(recovered.state.players[0].earnings, 123);
    again.terminate();
    await stop();
    fs.writeFileSync(file, "{broken");
    const broken = spawn(process.execPath, ["server/index.js"], {
      env: {
        ...process.env,
        ...secrets,
        PORT: "0",
        NODE_ENV: "production",
        STATE_FILE: file,
      },
      stdio: "ignore",
    });
    const [code] = await once(broken, "exit");
    assert.notEqual(code, 0);
    assert.equal(fs.readFileSync(file, "utf8"), "{broken");
  },
);
