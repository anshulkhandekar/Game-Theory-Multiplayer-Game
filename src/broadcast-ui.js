export function createBroadcastUI(view,scene,audio,send) {
 if(view!=='host')return {update(){}};
 const root=document.createElement('details');root.id='broadcast-director';root.hidden=true;root.innerHTML=`<summary>Projector broadcast</summary><div><div class="broadcast-modes"><button data-mode="auto">Automatic</button><button data-mode="player">Player</button><button data-mode="base">Team / base</button><button data-mode="sky">Sky view</button></div><div class="broadcast-target"><button data-prev aria-label="Previous camera target">‹</button><strong data-target-name></strong><button data-next aria-label="Next camera target">›</button></div><label><input type="checkbox" data-point> Enable point focus</label><p>With point focus enabled, right-click the admin scene to zoom there. Turn it off to reset.</p><label><input type="checkbox" data-projector-sound checked> Enable projector sound</label><button data-reset>Back to automatic</button><small data-health></small></div>`;document.querySelector('#app').append(root);
 let state,authed=false;
 const command=data=>send({type:'host',action:'broadcast',data});
 const targets=()=>state?.broadcast?.mode==='base'?(state.battlefield?.teams||[]):(state?.players||[]).filter(p=>p.connected&&!p.waitingLobby&&!p.kicked);
 root.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{const mode=el.dataset.mode;const list=mode==='base'?(state.battlefield?.teams||[]):(state.players||[]).filter(p=>p.connected&&!p.waitingLobby&&!p.kicked);command({mode,target:['auto','sky'].includes(mode)?null:list[0]?.id||null,manualEnabled:false});});
 const cycle=direction=>{const list=targets();if(!list.length)return;const index=list.findIndex(p=>p.id===state.broadcast.target);command({target:list[(Math.max(0,index)+direction+list.length)%list.length].id});};
 root.querySelector('[data-projector-sound]').onchange=e=>command({soundEnabled:e.target.checked});
 root.querySelector('[data-prev]').onclick=()=>cycle(-1);root.querySelector('[data-next]').onclick=()=>cycle(1);root.querySelector('[data-reset]').onclick=()=>command({mode:'auto',target:null,manualEnabled:false});root.querySelector('[data-point]').onchange=e=>command({manualEnabled:e.target.checked});
 document.querySelector('#scene').addEventListener('contextmenu',e=>{if(!authed||!state?.broadcast.manualEnabled)return;e.preventDefault();const focus=scene.pickBroadcastFocus(e.clientX,e.clientY);if(focus)command({focus});});
 return {update(s,auth=false){state=s;authed=auth;root.hidden=!auth;if(!s)return;const h=s.serverHealth;root.querySelector("[data-health]").textContent=h?`${h.connections} sockets · raw ${(h.rawMbps||0).toFixed(1)} Mbps · mean tick ${h.meanTickMs.toFixed(1)} ms`:"";const b=s.broadcast||{mode:'auto'};scene.previewBroadcast(!!b.manualEnabled);root.querySelectorAll('[data-mode]').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.mode===b.mode));el.disabled=(el.dataset.mode==='base'&&!s.battlefield)||(el.dataset.mode==='sky'&&!/^arena[1-5]$/.test(s.world));});const list=targets();root.querySelector('.broadcast-target').hidden=['auto','sky'].includes(b.mode);root.querySelector('[data-target-name]').textContent=list.find(p=>p.id===b.target)?.name||'Choose a target';root.querySelector('[data-point]').checked=!!b.manualEnabled;root.querySelector('[data-projector-sound]').checked=b.soundEnabled!==false;}};
}
export function scrollBroadcastLists(root,time) {
 const key=document.querySelector('#phase').textContent+'|'+document.querySelector('#headline').textContent;
 if(root.dataset.scrollKey!==key){root.dataset.scrollKey=key;root.dataset.scrollStarted=String(time);}
 for(const list of root.querySelectorAll('[data-broadcast-scroll]')){
  const maximum=list.scrollHeight-list.clientHeight;
  if(maximum>0){const period=Math.max(5,list.children.length*.65),phase=((time-Number(root.dataset.scrollStarted))/1000)% (period+2);list.scrollTop=maximum*Math.min(1,Math.max(0,(phase-1)/period));}
 }
}
