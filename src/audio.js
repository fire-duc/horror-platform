// Opt-in synthetic ambience: no audio downloads, autoplay or sudden loud cues.
let context, gain, oscillators = [];
export async function setSound(enabled) {
  if (!enabled) {
    if (context && context.state === 'running') await context.suspend();
    return true;
  }
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    if (!context) {
      context = new Audio();
      gain = context.createGain();
      gain.gain.value = .026;
      gain.connect(context.destination);
      for (const frequency of [55,82.6,110.3]) {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();
        oscillators.push(oscillator);
      }
    }
    await context.resume();
    return context.state === 'running';
  } catch { return false; }
}
document.addEventListener('visibilitychange',() => {
  if (document.hidden && context?.state === 'running') context.suspend().catch(() => {});
});

export function playCue(kind) {
  if(!context || context.state!=='running')return;
  const notes={tap:[175,.09],key:[640,.13],bell:[420,1.1],knock:[82,.16],ring:[560,.4],lost:[37,1.9],door:[66,.8],blink:[48,.7],walk:[95,.5],signal:[190,.3],disconnect:[240,.7],connect:[480,.5]};
  const [frequency,duration]=notes[kind]||[110,.45];
  const voice=context.createOscillator(),envelope=context.createGain(),now=context.currentTime;
  voice.type=kind==='key'||kind==='ring'?'triangle':'sine';
  voice.frequency.setValueAtTime(frequency,now);
  voice.frequency.exponentialRampToValueAtTime(Math.max(24,frequency*(kind==='bell'?.96:.55)),now+duration);
  envelope.gain.setValueAtTime(0,now);
  envelope.gain.linearRampToValueAtTime(kind==='bell'?.038:.024,now+.025);
  envelope.gain.exponentialRampToValueAtTime(.0001,now+duration);
  voice.connect(envelope);envelope.connect(context.destination);
  voice.start(now);voice.stop(now+duration+.03);
  voice.onended=()=>{voice.disconnect();envelope.disconnect();};
}
