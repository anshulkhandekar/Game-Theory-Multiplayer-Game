import {teamPositions,frontPatch} from './battlefield.js';
import {aircraftAt} from './battlefield-ambience.js';
export const defaultBroadcast=()=>({mode:'auto',target:null,manualEnabled:false,focus:null,revision:0});
export function updateBroadcast(current,data,state) {
 const next={...current,revision:current.revision+1};
 if(data.mode!==undefined){if(!['auto','player','base'].includes(data.mode))throw Error('Choose an available broadcast mode');next.mode=data.mode;next.focus=null;}
 if(data.target!==undefined){if(data.target!==null && typeof data.target!=='string')throw Error('Invalid camera target');next.target=data.target;next.focus=null;}
 if(data.manualEnabled!==undefined){if(typeof data.manualEnabled!=='boolean')throw Error('Invalid manual camera option');next.manualEnabled=data.manualEnabled;next.focus=null;}
 if(data.focus!==undefined){if(!next.manualEnabled)throw Error('Enable point focus first');const f=data.focus;if(!f || !['x','z','angle','distance'].every(k=>Number.isFinite(f[k]))||Math.abs(f.x)>1000||Math.abs(f.z)>1000||Math.abs(f.angle)>Math.PI*2||f.distance<6||f.distance>500)throw Error('Invalid camera focus');next.focus={x:f.x,z:f.z,angle:f.angle,distance:f.distance,world:state.world};}
 return next;
}
const orbit=(target,radius,height,angle)=>({target,position:{x:target.x+Math.sin(angle)*radius,y:height,z:target.z+Math.cos(angle)*radius}});
export function broadcastCamera(s,time,reduced=false) {
 const b=s.broadcast||defaultBroadcast(),angle=reduced?.6:time*.07;
 if(b.manualEnabled && b.focus?.world===s.world){const f=b.focus;return orbit({x:f.x,y:1,z:f.z},f.distance,f.distance*.7,f.angle);}
 if(b.mode==='player'){const p=s.players.find(p=>p.id===b.target&&p.connected&&!p.waitingLobby);if(p)return orbit({x:p.x,y:(p.y||0)+1.4,z:p.z},8,(p.y||0)+6,.5);}
 const battle=s.battlefield;
 if(battle && s.world.startsWith('battlefield')){
  const bases=teamPositions(battle.teams);if(!bases.length)return null;
  const index=Math.floor(time/7)%bases.length,base=bases.find(p=>b.mode==='base'&&p.id===b.target)||bases[index];
  const close=()=>orbit({x:base.x,y:1,z:base.z},28,22,angle);
  if(b.mode==='base'||['final','countdown'].includes(battle.phase))return close();
  if(battle.phase==='reveal'){
   const f=battle.fronts?.[Math.floor(time/4)%(battle.fronts?.length||1)];
   if(f){const a=frontPatch(battle.teams,f,f.a),c=frontPatch(battle.teams,f,f.b);return orbit({x:(a.x+c.x)/2,y:1,z:(a.z+c.z)/2},32,24,angle);}
   return close();
  }
  const shot=Math.floor(time/7)%4;
  if(shot===1 || battle.phase==='results')return close();
  if(shot===2){const jet=aircraftAt(time,bases)[0];return {target:jet,position:{x:jet.x+34,y:jet.y+16,z:jet.z+36}};}
  const radius=Math.max(100,...bases.map(p=>Math.hypot(p.x,p.z)+55));return orbit({x:0,y:0,z:0},radius,radius*.65,angle);
 }
 if(s.world==='casino'){
  const tables=s.poker?.tables||[],slot=Math.floor(time/7),table=tables[slot%Math.max(1,tables.length)];
  if(table && slot%3!==0){return orbit({x:table.x,y:1,z:table.z},7,6,reduced?.6:time*.05);}
  return orbit({x:0,y:1,z:0},19,9,angle);
 }
 if(s.world==='arena1')return orbit({x:0,y:0,z:0},33,27,angle*.5);
 if(s.world.startsWith('parkour'))return {position:{x:0,y:s.stage>=3?48:36,z:s.stage>=3?46:24},target:{x:0,y:2,z:s.stage>=3?0:-16}};
 return orbit({x:0,y:1,z:0},18,12,angle);
}
