import { createBattlefieldAudio } from "./battlefield-audio.js";
import { EMOTE_SECONDS } from "../shared/emotes.js";
import { platforms, practicePlatforms, hazards, practiceHazards, stageOf, isParkour } from "../shared/world.js";
import { audibleStructures, soundDistance } from "../shared/sound.js";
// Audio unlocks on the first user gesture; saved mute preference wins over defaults.
export function createAudio() {
  let context, enabled = localStorage.getItem('bear-muted') !== 'true';
  let remoteEnabled = localStorage.getItem("bear-remote-muted") !== "true";
  let activeKey = '', generation = 0, timer, voices = new Set(), desired;
  const buffers = new Map(), remoteChannels = new Map();
  const motors = new Map(), hazardStates = new Map();
  let noiseBuffer, environmentWorld = "", lastEnvironment = 0, lastHazardAt = -1000;
  function noise() {
    if (!noiseBuffer) {
      noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i=0; i<data.length; i++) data[i]=Math.random()*2-1;
    }
    return noiseBuffer;
  }
  function impact(kind, volume = .035, pan = 0) {
    if (!enabled || context?.state !== "running") return;
    const source=context.createBufferSource(), filter=context.createBiquadFilter(), gain=context.createGain(), panner=context.createStereoPanner();
    source.buffer=noise(); filter.type=kind==="spike"?"bandpass":"lowpass";
    const t=context.currentTime, duration=kind==="explosion"?.65:kind==="gun"?.065:kind==="spike"?.18:kind==="fall"?.2:.11;
    filter.frequency.setValueAtTime(kind==="gun"?3400:kind==="explosion"?380:kind==="spike"?2400:650,t);
    filter.frequency.exponentialRampToValueAtTime(kind==="gun"?600:kind==="explosion"?45:kind==="spike"?900:130,t+duration);
    gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    panner.pan.value=pan;source.connect(filter);filter.connect(gain);gain.connect(panner);panner.connect(context.destination);
    source.start();source.stop(t+duration);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();panner.disconnect();};
  }
  function silenceEnvironment() {
    for (const node of motors.values()) { node.source.stop();node.source.disconnect();node.filter.disconnect();node.gain.disconnect();node.pan.disconnect(); }
    motors.clear();hazardStates.clear();environmentWorld="";
  }
  function environment(state, player, yaw=0) {
    if (!enabled || context?.state!=="running" || !state || !player?.connected || state.paused || !["lobby","ready","instructions","active","practice"].includes(state.phase)) {
      if(motors.size || hazardStates.size)silenceEnvironment();return;
    }
    const now=performance.now();if(now-lastEnvironment<80)return;lastEnvironment=now;
    if(environmentWorld!==state.world){silenceEnvironment();environmentWorld=state.world;}
    const time=state.worldTime, stage=stageOf(state.world);
    const ps=state.world==="lobby"?practicePlatforms(time):isParkour(state.world)?platforms(time,stage):[];
    const beforePlatforms=state.world==="lobby"?practicePlatforms(time-.04):isParkour(state.world)?platforms(time-.04,stage):[];
    const hs=state.world==="lobby"?practiceHazards(time):isParkour(state.world)?hazards(time,stage):[];
    const nearby=audibleStructures(ps.filter(p=>p.moving||p.shrinking),player);
    const selected=new Set(nearby.map(p=>p.id));
    for(const [id,node] of motors) if(!selected.has(id)) {node.gain.gain.setTargetAtTime(0,context.currentTime,.12);if(now-node.lastHeard>500){node.source.stop();node.source.disconnect();node.filter.disconnect();node.gain.disconnect();node.pan.disconnect();motors.delete(id);}}
    for(const p of nearby){
      let node=motors.get(p.id);
      if(!node){const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),pan=context.createStereoPanner();source.buffer=noise();source.loop=true;filter.type="lowpass";gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(context.destination);source.start();node={source,filter,gain,pan};motors.set(p.id,node);}
      node.lastHeard=now;
      const before=beforePlatforms.find(previous=>previous.id===p.id);
      const motion=!before?0:p.shrinking
        ? Math.min(1,Math.abs((p.scale||1)-(before.scale||1))/.04*.4)
        : Math.min(1,Math.hypot(p.x-before.x,p.z-before.z)/.04/4);
      node.filter.frequency.setTargetAtTime(p.shrinking?200+motion*650:140+motion*180,context.currentTime,.08);
      node.gain.gain.setTargetAtTime(soundDistance(p,player)*(p.shrinking?.018:.012)*motion,context.currentTime,.1);
      node.pan.pan.setTargetAtTime(Math.max(-.8,Math.min(.8,((p.x-player.x)*-Math.cos(yaw)+(p.z-player.z)*Math.sin(yaw))/8)),context.currentTime,.1);
    }
    for(const h of hs){const previous=hazardStates.get(h.id);hazardStates.set(h.id,h.state);const volume=soundDistance(h,player);
      if (h.kind === "spikes" && previous && previous !== "warning" && h.state === "warning" && volume > .015) impact("mechanism", volume * .022);
      if(previous && previous!=="active" && h.state==="active" && volume>.015 && now-lastHazardAt>180){
        lastHazardAt=now;impact(h.kind==="spikes"?"spike":"punch",volume*(h.kind === "spikes" ? .035 : .065),Math.max(-.8,Math.min(.8,((h.x-player.x)*-Math.cos(yaw)+(h.z-player.z)*Math.sin(yaw))/8)));
      }
    }
  }
  const battleAudio=createBattlefieldAudio({context:()=>context,enabled:()=>enabled,noise,cue});
  function battlefield(state,player,yaw=0){battleAudio.update(state,player,yaw);}
  function stopRemote(id) {
    const channel = remoteChannels.get(id);
    if (!channel) return;
    channel.cancelled = true; clearTimeout(channel.timer);
    channel.gain.gain.setTargetAtTime(0, context.currentTime, .05);
    for (const source of channel.sources) { try { source.stop(context.currentTime + .22); } catch {} }
    setTimeout(() => { channel.gain.disconnect(); channel.pan.disconnect(); }, 300);
    remoteChannels.delete(id);
  }
  function remoteEmotes(state, listener, ownId, yaw = 0) {
    const wanted = new Set();
    if (enabled && remoteEnabled && context?.state === "running" && state && listener?.connected && !state.paused) {
      for (const p of state.players) {
        if (p.id === ownId || !p.connected || !p.emoteActive || !!p.waitingLobby !== !!listener.waitingLobby) continue;
        const distance = Math.hypot(p.x-listener.x, p.z-listener.z, (p.y||0)-(listener.y||0));
        if (distance >= 24) continue;
        wanted.add(p.id);
        const key = `${p.emoteName}:${p.emoteAt}`;
        let channel = remoteChannels.get(p.id);
        if (channel?.key !== key) {
          stopRemote(p.id);
          const gain = context.createGain(), pan = context.createPanner();
          pan.panningModel = "HRTF"; pan.rolloffFactor = 0;
          gain.gain.value = 0; gain.connect(pan); pan.connect(context.destination);
          channel = {key, gain, pan, sources: new Set(), cancelled: false};
          remoteChannels.set(p.id, channel);
          const current = channel, requestedAt = performance.now();
          if (!buffers.has(p.emoteName)) buffers.set(p.emoteName, fetch(`/audio/${p.emoteName}.mp3`).then(r => {if (!r.ok) throw Error("Audio unavailable"); return r.arrayBuffer();}).then(b => context.decodeAudioData(b)));
          buffers.get(p.emoteName).then(buffer => {
            if (current.cancelled) return;
            const offset = Math.max(0, (p.emoteAge || 0) + (performance.now()-requestedAt)/1000);
            const duration = Math.min(buffer.duration, EMOTE_SECONDS[p.emoteName]);
            if (offset >= duration) return;
            const source = context.createBufferSource(), envelope = context.createGain();
            source.buffer = buffer; source.connect(envelope); envelope.connect(gain);
            const t = context.currentTime, remaining = duration-offset, fade = Math.min(.1,remaining/3);
            envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(1,t+fade);
            envelope.gain.setValueAtTime(1,t+remaining-fade);envelope.gain.linearRampToValueAtTime(0,t+remaining);
            current.sources.add(source);source.start(t,offset,remaining);
            source.onended = () => {current.sources.delete(source);source.disconnect();envelope.disconnect();};
          }).catch(() => {if (remoteChannels.get(p.id) === current) stopRemote(p.id); buffers.delete(p.emoteName);});
        }
        channel.gain.gain.setTargetAtTime(.035 * Math.pow(1-distance/24, 2),context.currentTime,.1);
        const dx=p.x-listener.x, dz=p.z-listener.z;
        channel.pan.positionX.setTargetAtTime(-dx*Math.cos(yaw)+dz*Math.sin(yaw),context.currentTime,.08);
        channel.pan.positionY.setTargetAtTime((p.y||0)-(listener.y||0),context.currentTime,.08);
        channel.pan.positionZ.setTargetAtTime(-dx*Math.sin(yaw)-dz*Math.cos(yaw),context.currentTime,.08);
      }
    }
    for (const id of remoteChannels.keys()) if (!wanted.has(id)) stopRemote(id);
  }
  async function unlock() {
    context ||= new AudioContext();
    if (enabled && context.state !== "running") await context.resume();
  }
  function cue(kind) {
    if (!enabled || context?.state !== 'running') return;
    const settings = {
      hover: [[180], .003, .09], softClick: [[160], .008, .045], click: [[105], .035, .06],
      urgent: [[950], .018, .028],
      pad: [[90, 135, 180], .055, .32], jump: [[220, 330], .024, .09], ready: [[660, 880], .03, .1],
      tick: [[440], .025, .1], go: [[523,659,784], .035,.18],
      vault: [[660,880], .025,.12], results: [[523,659,784,1046], .03,.18],
    };
    const [notes, volume, length] = settings[kind] || settings.softClick;
    if (kind === 'click' || kind === 'softClick') { impact('punch', kind === 'click' ? .035 : .012); return; }
    notes.forEach((frequency,i) => {
      const osc=context.createOscillator(), gain=context.createGain(), t=context.currentTime+i*.045;
      osc.type=kind==='click'?'triangle':'sine'; osc.frequency.setValueAtTime(frequency,t);
      if(kind==='jump') osc.frequency.exponentialRampToValueAtTime(frequency*1.4,t+length);
      gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(volume,t+.008);
      gain.gain.exponentialRampToValueAtTime(.001,t+length);
      osc.connect(gain); gain.connect(context.destination);
      if (kind === "pad") {
        const delay = context.createDelay(), echo = context.createGain();
        delay.delayTime.value = .16; echo.gain.value = .3;
        gain.connect(delay); delay.connect(echo); echo.connect(context.destination);
        setTimeout(() => {delay.disconnect(); echo.disconnect();}, 1200);
      }
      osc.start(t); osc.stop(t+length+.01);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    });
  }
  function stop() {
    generation++; clearTimeout(timer); activeKey='';
    for(const voice of voices) {
      const t=context.currentTime;
      voice.gain.gain.cancelScheduledValues(t); voice.gain.gain.setTargetAtTime(0,t,.05);
      try { voice.source.stop(t+.22); } catch {}
    }
  }
  async function emote(name,key,age=0) {
    desired = name ? {name,key,age} : null;
    if(!name || !enabled || context?.state!=='running') { if(activeKey)stop(); return; }
    if(activeKey===key) return;
    stop(); activeKey=key; const run=generation, requestedAt=performance.now();
    try {
      if(!buffers.has(name)) buffers.set(name, fetch(`/audio/${name}.mp3`).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)));
      const buffer=await buffers.get(name);
      if(run!==generation || !enabled)return;
      const duration=Math.min(buffer.duration,EMOTE_SECONDS[name]), offset=Math.max(0,age+(performance.now()-requestedAt)/1000);
      if(offset>=duration)return;
      const source=context.createBufferSource(), gain=context.createGain();
      source.buffer=buffer; source.connect(gain); gain.connect(context.destination);
      const t=context.currentTime, remaining=duration-offset, fade=Math.min(.1,remaining/3), end=t+remaining;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.09,t+fade);
      gain.gain.setValueAtTime(.09,end-fade);gain.gain.linearRampToValueAtTime(0,end);
      const voice={source,gain};voices.add(voice);source.start(t,offset,remaining);
      source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();};
    }catch {buffers.delete(name);if(run===generation)activeKey='';}
  }
  return {
    cue, unlock, emote, stop, environment, impact, remoteEmotes, battlefield,
    get enabled(){return enabled;},
    get remoteEnabled(){return remoteEnabled;},
    toggleRemote(){remoteEnabled=!remoteEnabled;localStorage.setItem("bear-remote-muted",String(!remoteEnabled));if(!remoteEnabled)for(const id of remoteChannels.keys())stopRemote(id);return remoteEnabled;},
    async toggle(){ enabled=!enabled;localStorage.setItem('bear-muted',String(!enabled));
      if(!enabled){battleAudio.stop();stop();silenceEnvironment();for (const id of remoteChannels.keys()) stopRemote(id);}else {await unlock();if(desired)emote(desired.name,desired.key,desired.age);}return enabled; },
  };
}
