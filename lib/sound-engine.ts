const STORAGE_KEY = 'cashly-sound-enabled';

type SoundName = 'tap' | 'toggle' | 'success' | 'error';

let audioContext: AudioContext | null = null;
let enabled = true;
let masterGain: GainNode | null = null;

if (typeof window !== 'undefined') {
  enabled = window.localStorage.getItem(STORAGE_KEY) !== 'false';
}

function getContext() {
  if (typeof window === 'undefined') return null;
  audioContext ??= new AudioContext({ latencyHint: 'interactive' });
  masterGain ??= audioContext.createGain();
  masterGain.gain.value = 0.82;
  masterGain.connect(audioContext.destination);
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function tone(
  frequency: number,
  start: number,
  duration: number,
  gainValue: number,
  type: OscillatorType = 'sine',
  detune = 0,
) {
  const context = getContext();
  if (!context || !enabled) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.detune.setValueAtTime(detune, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(masterGain || context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playTap() {
  if (!enabled) return;
  const context = getContext();
  if (!context) return;
  const start = context.currentTime + 0.001;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(1100, start);
  oscillator.frequency.exponentialRampToValueAtTime(450, start + 0.014);
  gain.gain.setValueAtTime(0.06, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.014);
  oscillator.connect(gain).connect(masterGain || context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.034);
}

function play(name: Exclude<SoundName, 'tap'>) {
  if (!enabled) return;
  const context = getContext();
  if (!context) return;
  const start = context.currentTime + 0.001;
  if (name === 'toggle') {
    tone(390, start, 0.075, 0.032, 'sine');
    tone(560, start + 0.025, 0.09, 0.022, 'sine');
  }
  if (name === 'success') {
    tone(523.25, start, 0.17, 0.035, 'sine');
    tone(783.99, start + 0.07, 0.24, 0.028, 'sine');
  }
  if (name === 'error') {
    tone(205, start, 0.12, 0.028, 'triangle');
    tone(155, start + 0.07, 0.14, 0.022, 'triangle');
  }
}

export const soundEngine = {
  playTap,
  playToggle: () => play('toggle'),
  playSuccess: () => play('success'),
  playError: () => play('error'),
  isEnabled: () => enabled,
  setEnabled: (next: boolean) => {
    enabled = next;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new CustomEvent('cashly-sound-change', { detail: next }));
    }
  },
};
