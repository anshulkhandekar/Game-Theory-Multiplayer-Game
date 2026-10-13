// Original synthesized lounge arrangement; no downloaded music or per-machine loops.
export function createCasinoAudio({context,enabled,noise,mix=()=>1}) {
 const voices=new Set();
 let musicBeat=-1,machineBeat=-1,dealKey='',count=-1,world='',lastDeal=-1000;
 function tone(f,t,d,v,type='sine',pan=0) {
  const c=context(),o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.type=type;o.frequency.value=f;p.pan.value=pan;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(p);p.connect(c.destination);const voice={source:o,gain:g};voices.add(voice);o.start(t);o.stop(t+d+.02);o.onended=()=>{voices.delete(voice);o.disconnect();g.disconnect();p.disconnect();};
 }
 function card() {
  const c=context();if(!enabled()||c?.state!=='running')return;
  for(let i=0;i<3;i++){const n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();const t=c.currentTime+i*.055;n.buffer=noise();f.type='highpass';f.frequency.value=2800;g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.0001,t+.07);n.connect(f);f.connect(g);g.connect(c.destination);const voice={source:n,gain:g};voices.add(voice);n.start(t);n.stop(t+.08);n.onended=()=>{voices.delete(voice);n.disconnect();f.disconnect();g.disconnect();};}
 }
 function horn() {
  const c=context();if(!enabled()||c?.state!=='running')return;
  const t=c.currentTime;
  for(const f of [73.42,110,146.83]){const o=c.createOscillator(),filter=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(f*.94,t);o.frequency.linearRampToValueAtTime(f,t+.35);filter.type='lowpass';filter.frequency.value=480;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.035,t+.3);g.gain.setValueAtTime(.035,t+1.1);g.gain.exponentialRampToValueAtTime(.0001,t+2.4);o.connect(filter);filter.connect(g);g.connect(c.destination);const voice={source:o,gain:g};voices.add(voice);o.start(t);o.stop(t+2.5);o.onended=()=>{voices.delete(voice);o.disconnect();filter.disconnect();g.disconnect();};}
 }
 function update(s,listener,projector=false) {
  const c=context();if(!enabled()||c?.state!=='running'||!s||s.paused||s.poker?.paused)return;
  const casino=s.world==='casino',practice=s.world==='lobby'&&listener&&listener.x<-5&&listener.z>23, lobby=projector&&s.world==='lobby';
  if(!casino&&!practice&&!lobby){world='';dealKey='';musicBeat=-1;machineBeat=-1;return;}
  if(world!==s.world){world=s.world;musicBeat=machineBeat=-1;count=-1;dealKey='';}
  const time=s.worldTime||0,t=c.currentTime;
  // A quiet swung piano/bass seventh-chord progression, four bars long.
  const beat=Math.floor(time*2.6);
  if(beat!==musicBeat){musicBeat=beat;const chords=[[130.81,164.81,196,246.94],[146.83,174.61,220,261.63],[98,123.47,146.83,174.61],[130.81,164.81,196,246.94]],ch=chords[Math.floor(beat/8)%4];const volume=(lobby&&!practice?.006:projector?.012:.009)*mix()*(s.poker?.phase==='countdown'?.35:1);
   if(beat%2===0){tone(ch[0]/2,t,.6,volume*1.1,'triangle');ch.slice(1).forEach((f,i)=>tone(f,t+i*.012,.55,volume*.6));}
   tone(ch[(beat*3)%4]*2,t+(beat%2?.055:0),.19,volume*.5);
  }
  const sources=casino?Array.from({length:8},(_,i)=>({x:-21,z:-17+i*4.5})):Array.from({length:3},(_,i)=>({x:-28,z:34+i*4}));
  const closest=listener?sources.reduce((a,b)=>Math.hypot(a.x-listener.x,a.z-listener.z)<Math.hypot(b.x-listener.x,b.z-listener.z)?a:b):sources[0];
  const volume=(projector?.008:!listener?.018:Math.max(0,1-Math.hypot(closest.x-listener.x,closest.z-listener.z)/14)**2*.035)*mix()*(projector&&s.poker?.phase==='countdown'?.35:1);
  const cycle=Math.floor(time*2);
  if((casino||practice)&&cycle!==machineBeat){machineBeat=cycle;if(volume>.001){if(cycle%16<6)tone(180+(cycle%3)*90,t,.055,volume*.5,'triangle');if(cycle%16===7)[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,t+i*.11,.19,volume));}}
  const b=s.poker;
  if(b?.phase==='countdown'){const n=Math.ceil(b.countdown);if(n!==count){if(projector&&count<0){card();lastDeal=time;}count=n;if(n>0)tone(440,t,.1,.025);}}
  const table=b?.tables.find(t=>t.players.includes(listener?.id));
  const k=b?.phase==='playing'?(projector?b.tables.map(t=>t.hand).join(','):table?.hand):'';
  const full=k?`${s.round}:${b.round}:${k}`:'';
  if(full&&full!==dealKey){dealKey=full;if(!projector || time-lastDeal>=2){card();lastDeal=time;}}
 }
 function stop(){const c=context();for(const v of voices){v.gain.gain.cancelScheduledValues(c.currentTime);v.gain.gain.setValueAtTime(0,c.currentTime);try{v.source.stop();}catch{}}voices.clear();}
 return {update,card,horn,stop};
}
