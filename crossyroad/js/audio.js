// Tiny synthesized sound effects via the WebAudio API - no audio files needed.

let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function beep({ freq = 440, duration = 0.08, type = 'square', gain = 0.15, slideTo = null }) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + duration);
    amp.gain.setValueAtTime(gain, ac.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(amp).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration + 0.02);
  } catch (e) {
    // Audio may be blocked before first user gesture; ignore.
  }
}

export const sfx = {
  hop: () => beep({ freq: 520, duration: 0.06, type: 'square', gain: 0.08, slideTo: 640 }),
  score: () => beep({ freq: 700, duration: 0.05, type: 'sine', gain: 0.1, slideTo: 900 }),
  death: () => beep({ freq: 220, duration: 0.35, type: 'sawtooth', gain: 0.18, slideTo: 60 }),
  warning: () => beep({ freq: 900, duration: 0.09, type: 'square', gain: 0.09 }),
  powerup: () => {
    beep({ freq: 520, duration: 0.07, type: 'sine', gain: 0.12, slideTo: 780 });
    setTimeout(() => beep({ freq: 780, duration: 0.09, type: 'sine', gain: 0.12, slideTo: 1040 }), 60);
  },
  shieldBreak: () => beep({ freq: 300, duration: 0.18, type: 'triangle', gain: 0.14, slideTo: 140 }),
};

export function unlockAudio() {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { /* ignore */ }
}
