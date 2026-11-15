/**
 * Web Audio Synthesizer for SnapLens Camera Sound Effects & Micro-interactions
 * 100% royalty-free, zero external latency, synthesized natively with the Web Audio API.
 */

const STORAGE_KEY_SOUND_MUTED = 'snaplens_camera_sound_muted';

let audioCtx = null;
let cachedNoiseBuffer = null;
let isMutedState = null;
let lastSoundTimestamp = 0;
const MIN_SOUND_INTERVAL_MS = 30; // Prevent overlapping rapid audio glitches

/**
 * Reads initial sound muted state from localStorage (defaults to false / sound ON)
 */
export function isSoundMuted() {
  if (isMutedState === null) {
    try {
      isMutedState = localStorage.getItem(STORAGE_KEY_SOUND_MUTED) === 'true';
    } catch {
      isMutedState = false;
    }
  }
  return isMutedState;
}

/**
 * Updates sound muted state and persists user preference
 */
export function setSoundMuted(muted) {
  isMutedState = Boolean(muted);
  try {
    localStorage.setItem(STORAGE_KEY_SOUND_MUTED, String(isMutedState));
  } catch (e) {
    console.debug('Storage error writing sound preference:', e);
  }
  return isMutedState;
}

/**
 * Toggles sound muted state
 */
export function toggleSoundMuted() {
  return setSoundMuted(!isSoundMuted());
}

/**
 * Gets or initializes the Web Audio Context, handling autoplay restrictions
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  // Handle browser autoplay policy (suspended state)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Initializes/resumes audio on user interaction
 */
export function initAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// Automatically listen for first user interaction to unlock audio
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    initAudio();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

/**
 * Pre-computes a noise buffer for realistic mechanical shutter clicks & lens whooshes
 */
function getNoiseBuffer(ctx) {
  if (!cachedNoiseBuffer || cachedNoiseBuffer.sampleRate !== ctx.sampleRate) {
    const duration = 0.25;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    cachedNoiseBuffer = buffer;
  }
  return cachedNoiseBuffer;
}

/**
 * Helper to check rate-limiting and mute status
 */
function canPlayAudio() {
  if (isSoundMuted()) return false;
  const now = performance.now();
  if (now - lastSoundTimestamp < MIN_SOUND_INTERVAL_MS) {
    return false;
  }
  lastSoundTimestamp = now;
  return true;
}

/**
 * 1. Camera Open Sound
 * Subtle lens initialization chime / lens wake whoosh
 */
export function playCameraOpenSound() {
  if (!canPlayAudio()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ascending dual chime (C5 523.25Hz -> E5 659.25Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.08);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second higher bell chime
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.07);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.18);

    gain2.gain.setValueAtTime(0.001, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.15, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.29);

    // Soft aperture servo hum in background
    const servoOsc = ctx.createOscillator();
    const servoGain = ctx.createGain();
    servoOsc.type = 'triangle';
    servoOsc.frequency.setValueAtTime(140, now);
    servoOsc.frequency.exponentialRampToValueAtTime(260, now + 0.12);

    servoGain.gain.setValueAtTime(0.04, now);
    servoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    servoOsc.connect(servoGain);
    servoGain.connect(ctx.destination);
    servoOsc.start(now);
    servoOsc.stop(now + 0.15);
  } catch (err) {
    console.debug('playCameraOpenSound error:', err);
  }
}

/**
 * 2. Photo Mode Sound
 * Short, crisp, tactile switch snap
 */
export function playPhotoModeSound() {
  if (!canPlayAudio()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Fast high mechanical click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.035);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch (err) {
    console.debug('playPhotoModeSound error:', err);
  }
}

/**
 * 3. Video Mode Sound
 * Distinctive mode shift slider tone (deeper with electronic ramp)
 */
export function playVideoModeSound() {
  if (!canPlayAudio()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.065);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (err) {
    console.debug('playVideoModeSound error:', err);
  }
}

/**
 * 4. Realistic Photo Capture Sound
 * Dual mechanical shutter click: mirror slap + aperture curtain release
 */
export function playShutterSound() {
  if (!canPlayAudio()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Stage 1: High crisp aperture blade click (transient)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(250, now + 0.035);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.04);

    // Stage 2: Mechanical shutter noise friction burst
    const noiseBuffer = getNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1800, now);
    noiseFilter.Q.setValueAtTime(3.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);
    noiseSource.stop(now + 0.05);

    // Stage 3: Low mirror slap & rear curtain latch (40ms after first click)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(380, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.14);
    gain2.gain.setValueAtTime(0.45, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.15);
  } catch (err) {
    console.debug('playShutterSound error:', err);
  }
}

/**
 * 5. Video Recording Start Sound
 * Subtle modern ascending double-beep
 */
export function playRecordStartSound() {
  if (!canPlayAudio()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Beep 1 (587Hz D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.055);

    // Beep 2 (880Hz A5) - higher tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.065);
    gain2.gain.setValueAtTime(0.25, now + 0.065);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.065);
    osc2.stop(now + 0.16);
  } catch (err) {
    console.debug('playRecordStartSound error:', err);
  }
}

/**
 * 5. Video Recording Stop Sound
 * Subtle modern descending double-beep
 */
export function playRecordStopSound() {
  if (!canPlayAudio()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Beep 1 (880Hz A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.055);

    // Beep 2 (587Hz D5) - lower tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(587.33, now + 0.065);
    gain2.gain.setValueAtTime(0.22, now + 0.065);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.065);
    osc2.stop(now + 0.17);
  } catch (err) {
    console.debug('playRecordStopSound error:', err);
  }
}

/**
 * 6. Camera Switching Sound
 * Subtle servo-gyro whoosh when flipping between front and rear lenses
 */
export function playCameraSwitchSound() {
  if (!canPlayAudio()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Filtered noise whoosh
    const noiseBuffer = getNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.exponentialRampToValueAtTime(1100, now + 0.06);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.14);
    filter.Q.setValueAtTime(2.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);
    noiseSource.stop(now + 0.16);

    // Pitch sweep glide
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.14);

    oscGain.gain.setValueAtTime(0.01, now);
    oscGain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } catch (err) {
    console.debug('playCameraSwitchSound error:', err);
  }
}

/**
 * Filter / Lens pop sound
 */
export function playFilterPopSound() {
  if (!canPlayAudio()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.035);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) {}
}
