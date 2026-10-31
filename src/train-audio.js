import {trainInspectorPosition} from './train-state.js';

// Heel, sole scrape and a short metal-floor resonance. Kept above phone-speaker bass cutoff.
export function synthesizeTrainStep(sampleRate,seed=17,heavy=false){
  const data=new Float32Array(Math.round(sampleRate*.42));let random=seed>>>0,low=0,previous=0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate;random=(Math.imul(random,1664525)+1013904223)>>>0;
    const noise=random/2147483648-1;low+=.17*(noise-low);const grit=noise-previous;previous=noise;
    const heel=Math.exp(-t*42)*(1-Math.exp(-t*1100));
    const toe=t>.085?Math.exp(-(t-.085)*32)*(1-Math.exp(-(t-.085)*300)):0;
    const sole=Math.sin(2*Math.PI*(heavy?185:245)*t)*.46+Math.sin(2*Math.PI*430*t)*.2;
    const ring=(Math.sin(2*Math.PI*810*t)+.4*Math.sin(2*Math.PI*1240*t))*Math.exp(-t*23)*.075;
    data[i]=(sole+low*.8+grit*.2)*heel+(low*.65+grit*.12)*toe+ring;
  }
  return data;
}

export function createTrainAudio({contextFactory}={}){
  let context,master,rail,railGain,room,roomGain,enabled=false,disposed=false;
  const voices=new Set(),steps=[];
  async function enable(value){
    enabled=Boolean(value);
    if(!enabled){await context?.suspend();return false;}
    try{
      if(!context){
        const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
        if(!contextFactory&&!Audio){enabled=false;return false;}
        context=contextFactory?contextFactory():new Audio();
        master=context.createGain();master.gain.value=.3;
        const ceiling=context.createDynamicsCompressor();ceiling.threshold.value=-8;ceiling.knee.value=6;ceiling.ratio.value=4;
        master.connect(ceiling);ceiling.connect(context.destination);
        const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);let last=0;
        for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.023)/1.023;data[i]=last*3;}
        rail=context.createBufferSource();rail.buffer=buffer;rail.loop=true;
        const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=320;
        railGain=context.createGain();railGain.gain.value=.16;rail.connect(filter);filter.connect(railGain);railGain.connect(master);rail.start();
        room=context.createConvolver();roomGain=context.createGain();roomGain.gain.value=.16;
        const impulse=context.createBuffer(2,Math.round(context.sampleRate*.48),context.sampleRate);
        for(let ch=0;ch<2;ch++){const channel=impulse.getChannelData(ch);for(let i=0;i<channel.length;i++)channel[i]=(Math.random()*2-1)*Math.exp(-i/context.sampleRate*14)*.24;}
        room.buffer=impulse;room.connect(roomGain);roomGain.connect(master);
        for(let i=0;i<6;i++){const samples=synthesizeTrainStep(context.sampleRate,51+i*211,i>=3),b=context.createBuffer(1,samples.length,context.sampleRate);b.copyToChannel(samples,0);steps.push(b);}
      }
      await context.resume();enabled=context.state==='running';return enabled;
    }catch{enabled=false;return false;}
  }
  const running=()=>!disposed&&enabled&&context?.state==='running';
  function finishVoice(source,nodes){
    voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
  }
  function impact({x=0,y=0,z=0,volume=1,variant=0,rate=1,heavy=true}={}){
    if(!running())return;
    const source=context.createBufferSource(),gain=context.createGain(),pan=context.createPanner();
    source.buffer=steps[(heavy?3:0)+Math.abs(variant%3)];source.playbackRate.value=rate;gain.gain.value=volume;
    pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=2;pan.maxDistance=30;pan.rolloffFactor=1;
    pan.positionX.value=x;pan.positionY.value=y;pan.positionZ.value=z;
    source.connect(gain);gain.connect(pan);pan.connect(master);pan.connect(room);
    finishVoice(source,[gain,pan]);source.start();
  }
  function footstep(run,inspector=false,index=0){
    const p=inspector?trainInspectorPosition(run):run.position,side=index%2===0?-.15:.15;
    impact({x:p.x+side*Math.cos(run.position.yaw),y:.08,z:p.z,volume:inspector?1.45:.35,variant:index,heavy:inspector,rate:inspector?.87:1.12});
  }
  function door(index=0){impact({x:-2.22,y:1.4,z:-6.5,volume:.95,variant:index,rate:.64});}
  function cue(kind,pan=0){
    if(!running())return;
    const table={rail:[150,.3,.35],knock:[183,.21,.28],click:[380,.07,.13],safe:[410,.75,.10],breath:[191,.6,.1],hit:[79,1.4,.3],bell:[510,1.1,.15],gasp:[250,.5,.2],switch:[320,.19,.16],voice:[205,1.5,.12],ending:[294,2.8,.1],warning:[740,.22,.12],tick:[920,.08,.065],brake:[1200,1.6,.045],seal:[170,.4,.22]};
    const [hz,duration,volume]=table[kind]||table.click,now=context.currentTime;
    const osc=context.createOscillator(),gain=context.createGain(),panner=context.createStereoPanner();
    osc.type=['voice','brake'].includes(kind)?'triangle':'sine';osc.frequency.setValueAtTime(hz,now);osc.frequency.exponentialRampToValueAtTime(Math.max(55,hz*(kind==='brake'?.13:.55)),now+duration);
    panner.pan.value=Math.max(-1,Math.min(1,pan));gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(panner);panner.connect(master);finishVoice(osc,[gain,panner]);osc.start(now);osc.stop(now+duration+.04);
  }
  function state(run){
    if(!context||!railGain)return;
    const quiet=['false-stop','inspection','last-stop','escape'].includes(run.stage);
    railGain.gain.setTargetAtTime(quiet?.015:.16,context.currentTime,.45);
    const listener=context.listener;
    listener.positionX.value=run.position.x;listener.positionY.value=run.crouch?.32:1.63;listener.positionZ.value=run.position.z;
    listener.forwardX.value=-Math.sin(run.position.yaw);listener.forwardY.value=0;listener.forwardZ.value=-Math.cos(run.position.yaw);
    listener.upX.value=0;listener.upY.value=1;listener.upZ.value=0;
  }
  return {enable,cue,state,footstep,door,pause(){context?.suspend().catch(()=>{});},resume(){if(enabled)context?.resume().catch(()=>{});},get enabled(){return enabled;},dispose(){disposed=true;rail?.stop();for(const voice of voices){try{voice.stop();}catch{}}context?.close().catch(()=>{});}};
}
