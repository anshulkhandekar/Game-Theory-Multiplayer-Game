import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {move,canMove} from '../shared/movement.js';
import {platforms,STAGING_DOME,arenaBounds,vaultsFor,chamberSolids} from '../shared/world.js';
test('leaderboard broadcasts never end rounds or change scores; lobby broadcasts standings',()=>{
 const g=new Game(); const p=g.join(null,'Test');g.command('ready');g.command('start');
 const phase=g.phase;g.command('leaderboard');assert.equal(g.phase,phase);assert.equal(p.earnings,0);assert.equal(g.snapshot().leaderboardSerial,1);
 g.command('lobby');assert.equal(g.snapshot().leaderboardSerial,2);
});
test('prepared players move inside staging; unread players stay put and gate opens for play',()=>{
 const state={phase:'loading',world:'arena2',paused:false};const p={x:0,z:1,y:0,vx:0,vy:0,vz:0,grounded:true,support:'spawn',eligible:true,loaded:false};
 assert.equal(canMove(state,p),false);p.loaded=true;assert.equal(canMove(state,p),true);
 for(let i=0;i<150;i++)move(p,{x:1},.02,'arena2',0,true);
 const edge=p.x; assert.ok(edge>4 && edge<6); assert.ok((p.x+.32)**2+(p.y+2.05)**2<=STAGING_DOME.radius**2+.001);assert.equal(p.respawns,undefined);
 move(p,{x:1},.1,'arena2',0,false);assert.ok(p.x>edge);
});
test('enlarged spawn has a clear gap to every first route and Sky pad',()=>{
 for(const stage of [2,3,4,5]){
 const blocks=platforms(0,stage),spawn=blocks.find(p=>p.id==='spawn');assert.equal(spawn.w,12);
 for(const p of blocks.filter(p=>p.index===1 || p.id==='sky-pad-0'))assert.ok(Math.abs(p.x)-p.w/2>6 || Math.abs(p.z-1)-p.d/2>6);
 }
});

test('staging dome contains diagonal movement and jumping at its curved edge',()=>{
 const p={x:0,z:1,y:0,vx:0,vy:0,vz:0,grounded:true,support:'spawn'};
 for(let i=0;i<200;i++){
   move(p,{x:1,z:1,jump:i%30===0},.02,'arena5',0,true);
   assert.ok((Math.hypot(p.x,p.z-1)+.32)**2+(p.y+2.05)**2<=36+.001);
 }
});
test('all vault floors and rotated chamber walls have clearance from the arena perimeter',()=>{
 for(const stage of [2,3,4,5]){
   const bounds=arenaBounds(stage);
   for(const v of vaultsFor(stage)){
     if(v.id==='sky')continue;
     for(const box of [{...v,w:7,d:7},...chamberSolids(v)]){
       const reach=(box.w+box.d)/2;
       assert.ok(Math.abs(box.x)+reach+1<bounds.side);
       assert.ok(box.z+reach+1<bounds.front);
       assert.ok(box.z-reach-1>bounds.rear);
     }
   }
 }
});
