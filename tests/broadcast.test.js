import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultBroadcast,updateBroadcast,broadcastCamera} from '../shared/broadcast.js';
import {Game} from '../server/game.js';
test('Broadcast changes are validated, ephemeral and reset manual focus',()=>{
 const g=new Game();g.command('broadcast',{manualEnabled:true});g.command('broadcast',{focus:{x:2,z:5,angle:0,distance:20}});assert.equal(g.snapshot().broadcast.focus.x,2);
 assert.throws(()=>g.command('broadcast',{focus:{x:NaN,z:0,angle:0,distance:20}}));assert.throws(()=>g.command('broadcast',{mode:'hacked'}));
 g.command('broadcast',{manualEnabled:false});assert.equal(g.broadcast.focus,null);assert.equal(new Game({saved:g.save()}).broadcast.mode,'auto');
 assert.throws(()=>updateBroadcast(defaultBroadcast(),{focus:{x:0,z:0,angle:0,distance:20}},g));
});
test('Automatic casino moves between pairs and overview; Battlefield locks camera to bases before combat',()=>{
 const s={broadcast:defaultBroadcast(),players:[],world:'casino',poker:{tables:[{x:7,z:0}]}};
 assert.equal(broadcastCamera(s,1).target.x,0);assert.equal(broadcastCamera(s,8).target.x,7);
 const battlefield={teams:[{id:'a'},{id:'b'}],fronts:[{id:'f',a:'a',b:'b',lane:1}],phase:'countdown'};
 const b={...s,world:'battlefield1',battlefield};for(const time of [1,8,15,22]){const shot=broadcastCamera(b,time);assert.ok(Math.abs(shot.target.z)===46);assert.equal(shot.position.y,22);}
 assert.deepEqual(broadcastCamera(s,1,true),broadcastCamera(s,2,true));
});
