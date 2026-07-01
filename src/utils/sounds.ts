// Sound effects using Web Audio API — no files needed

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

/** Main send sound (dipanggil pas kirim pesan) */
export function playSendSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Audio not available — no problem
  }
}

/** Main notification sound */
function playDefaultNotif() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(660, ctx.currentTime);
  osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
  osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

function playMesinTik() {
  const ctx = getAudioCtx();
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(400 + i * 100, ctx.currentTime + i * 0.08);
    gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.06);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.06);
  }
}

function playWalkie() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.setValueAtTime(800, ctx.currentTime + 0.06);
  osc.frequency.setValueAtTime(600, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.18);
}

function playGamelan() {
  const ctx = getAudioCtx();
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.2);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.2);
  });
}

function playKucing() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);
  // "Meow" effect: pitch bend up then down
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.1);
  osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

/**
 * Play notification sound sesuai preferensi user.
 * @param soundName — kode sound dari user preferences (default, mesintik, walkie, gamelan, kucing)
 */
export function playNotificationSound(soundName: string = 'default') {
  try {
    switch (soundName) {
      case 'mesintik': playMesinTik(); break;
      case 'walkie': playWalkie(); break;
      case 'gamelan': playGamelan(); break;
      case 'kucing': playKucing(); break;
      default: playDefaultNotif();
    }
  } catch (e) {
    // Audio not available
  }
}
