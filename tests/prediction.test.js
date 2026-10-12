import test from 'node:test';
import assert from 'node:assert/strict';
import {Predictor, interpolatePlayers} from '../shared/prediction.js';
import {move, MOVEMENT} from '../shared/movement.js';
import {platforms} from '../shared/world.js';
import {Game} from '../server/game.js';
const state={world:'lobby',phase:'lobby',worldTime:0,paused:false};
const spawn=()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,grounded:true,jumpHeld:false,connected:true});
test('delayed and burst snapshots replay unacknowledged input without pulling back the moving player',()=>{
  const predictor=new Predictor(), server=spawn();
  predictor.reconcile(server,state,0,true);
  const snapshots=[];let maximumError=0;
  for(let seq=1;seq<=2400;seq++) {
    const input={x:Math.sin(seq*.04),z:Math.cos(seq*.04),jump:seq===30};
    predictor.input(seq,input,.05);move(server,input,.05,'lobby',seq*.05);
    snapshots.push({player:{...server},state:{...state,worldTime:seq*.05},ack:seq});
    // 150ms snapshot delay; also a 350ms delivery gap followed by a burst.
    if(seq>3 && !(seq % 400 >=80 && seq % 400 <=86)) {
      const old=snapshots[seq-4];
      const before={...predictor.player};
      predictor.reconcile(old.player,old.state,old.ack);
      maximumError=Math.max(maximumError,Math.hypot(before.x-predictor.player.x,before.y-predictor.player.y,before.z-predictor.player.z));
    }
  }
  assert.ok(maximumError<1e-8,`reconciliation error ${maximumError}`);
  assert.ok(predictor.pending.length<=10);
});
test('reconciliation restores ground/support/jump state and discards pending inputs on round reset',()=>{
  const predictor=new Predictor();const p=spawn();
  predictor.reconcile(p,state,0,true);predictor.input(1,{jump:true},.05);
  predictor.reconcile({...p,support:'spawn',jumpHeld:true},{...state,phase:'loading'},1,true);
  assert.equal(predictor.pending.length,0);assert.equal(predictor.player.grounded,true);
  assert.equal(predictor.player.jumpHeld,true);
  assert.equal(predictor.preview({jump:true},.05).y,0);
});
test('snapshot interpolation smooths positions and snaps teleports/respawns',()=>{
  const a={...spawn(),x:0},b={...spawn(),x:2};
  assert.equal(interpolatePlayers(a,b,.5).x,1);
  assert.equal(interpolatePlayers(a,{...b,respawns:1},.5).x,2);
  assert.equal(interpolatePlayers(a,{...b,x:10},.5).x,10);
});
test('ground braking stops promptly and carries a stationary bear with a moving platform',()=>{
  const surface=platforms(0,5).find(p=>p.moving && p.walkable!==false);
  const p={...spawn(),x:surface.x,z:surface.z,y:surface.y,support:surface.id};
  const initial={x:p.x,z:p.z};
  for(let i=1;i<=6;i++)move(p,{},.05,'arena5',i*.05);
  const later=platforms(.3,5).find(q=>q.id===surface.id);
  assert.ok(Math.abs(p.x-initial.x-(later.x-surface.x))<.01);
  assert.ok(Math.abs(p.z-initial.z-(later.z-surface.z))<.01);
  const q=spawn();q.vx=MOVEMENT.speed;move(q,{},.1,'lobby',.1);
  assert.equal(q.vx,0);assert.ok(q.x<.4);
});
test('owner-only acknowledgements track simulated inputs and remain private',()=>{
  const g=new Game(),p=g.join(null,'A');p.inputSequence=9;p.input={x:1,z:0};
  g.tick(.05);assert.equal(g.snapshotFor(p.id).prediction.ack,9);
  assert.equal(g.snapshot().prediction,undefined);
  assert.ok(g.snapshot().players.every(q=>!('inputSequence' in q)&&!('jumpHeld' in q)));
});
test('moving-platform replay matches authority at round five under delayed acknowledgements',()=>{
  const surface=platforms(0,5).find(p=>p.moving);
  const initial={...spawn(),x:surface.x,z:surface.z,y:surface.y,support:surface.id,eligible:true};
  const server={...initial},predictor=new Predictor();
  const s={...state,world:'arena5',phase:'active'};
  predictor.reconcile(initial,s,0,true);
  const history=[];
  for(let seq=1;seq<=30;seq++){
    predictor.input(seq,{},.05);move(server,{},.05,'arena5',seq*.05);
    history.push({...server});
    if(seq>4){
      predictor.reconcile(history[seq-5],{...s,worldTime:(seq-4)*.05},seq-4);
      assert.ok(Math.hypot(predictor.player.x-server.x,predictor.player.y-server.y,predictor.player.z-server.z)<1e-6);
    }
  }
});
