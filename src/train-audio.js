// Synthesized spatial cues, all behind an explicit user gesture and a gain ceiling.
export function createTrainAudio(){
  let context,master,rail,railGain,enabled=false,disposed=false;
  async function enable(value){
    enabled=value;
    if(!value){await context?.suspend();return false;}
    try{
      if(!context){
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
        context=new Audio();master=context.createGain();master.gain.value=.2;master.connect(context.destination);
        const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);let last=0;
        for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.023)/1.023;data[i]=last*3;}
        rail=context.createBufferSource();rail.buffer=buffer;rail.loop=true;
        const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=390;
        railGain=context.createGain();railGain.gain.value=.35;rail.connect(filter);filter.connect(railGain);railGain.connect(master);rail.start();
      }
      await context.resume();return context.state==='running';
    }catch{enabled=false;return false;}
  }
  function cue(kind,pan=0){
    if(disposed||!enabled||context?.state!=='running')return;
    const table={step:[64,.17,.24],rail:[150,.3,.35],knock:[83,.21,.28],click:[380,.07,.13],safe:[410,.75,.10],breath:[91,.6,.1],hit:[39,1.4,.3],bell:[510,1.1,.15],gasp:[150,.5,.2],switch:[120,.19,.16],voice:[105,1.5,.13],ending:[294,2.8,.1]};
    const [hz,duration,volume]=table[kind]||table.click,now=context.currentTime;
    const osc=context.createOscillator(),gain=context.createGain(),panner=context.createStereoPanner();
    osc.type=kind==='voice'?'triangle':'sine';osc.frequency.setValueAtTime(hz,now);osc.frequency.exponentialRampToValueAtTime(Math.max(25,hz*.55),now+duration);
    panner.pan.value=Math.max(-1,Math.min(1,pan));gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(panner);panner.connect(master);osc.start(now);osc.stop(now+duration+.04);osc.onended=()=>{osc.disconnect();gain.disconnect();panner.disconnect();};
  }
  function state(run){if(!context||!railGain)return;const quiet=['inspection','last-stop','escape'].includes(run.stage);railGain.gain.setTargetAtTime(quiet?.035:.35,context.currentTime,.7);}
  return {enable,cue,state,pause(){context?.suspend().catch(()=>{});},resume(){if(enabled)context?.resume().catch(()=>{});},get enabled(){return enabled;},dispose(){disposed=true;rail?.stop();context?.close().catch(()=>{});}};
}
