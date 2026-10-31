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
