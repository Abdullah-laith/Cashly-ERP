'use client';

const STORAGE_KEY = 'cashly-sound-enabled';
const ATTACK_SECONDS = 0.002;
const FLOOR_GAIN = 0.0001;

type AudioContextConstructor = typeof AudioContext;

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled = true;
let masterConnected = false;
let lastCustomSoundAt = 0;

if (typeof window !== 'undefined') {
  enabled = window.localStorage.getItem(STORAGE_KEY) !== 'false';
}

function getContext() {
  if (typeof window === 'undefined') return null;
  const Context = window.AudioContext || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Context) return null;
  audioContext ??= new Context({ latencyHint: 'interactive' });
  masterGain ??= audioContext.createGain();
  masterGain.gain.setValueAtTime(0.72, audioContext.currentTime);
  if (!masterConnected) {
    masterGain.connect(audioContext.destination);
    masterConnected = true;
  }
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function markCustomSound() {
  lastCustomSoundAt = Date.now();
}

function createFilter(context: AudioContext, frequency: number) {
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(frequency, context.currentTime);
  filter.Q.setValueAtTime(0.55, context.currentTime);
  return filter;
}

function envelope(gain: GainNode, start: number, duration: number, peak: number) {
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + ATTACK_SECONDS);
  gain.gain.exponentialRampToValueAtTime(FLOOR_GAIN, start + duration);
}

function oscillator(
  context: AudioContext,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType,
  from: number,
  to: number,
  filterFrequency: number,
  detune = 0,
) {
  const source = context.createOscillator();
  const gain = context.createGain();
  const filter = createFilter(context, filterFrequency);
  source.type = type;
  source.detune.setValueAtTime(detune, start);
  source.frequency.setValueAtTime(from, start);
  source.frequency.exponentialRampToValueAtTime(to, start + duration);
  envelope(gain, start, duration, peak);
  source.connect(filter).connect(gain).connect(masterGain || context.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function noise(context: AudioContext, start: number, duration: number, peak: number, filterFrequency: number) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const gain = context.createGain();
  const filter = createFilter(context, filterFrequency);
  source.buffer = buffer;
  envelope(gain, start, duration, peak);
  source.connect(filter).connect(gain).connect(masterGain || context.destination);
  source.start(start);
  source.stop(start + duration + 0.01);
}

function withContext(callback: (context: AudioContext, start: number) => void) {
  if (!enabled) return;
  const context = getContext();
  if (!context) return;
  callback(context, context.currentTime + 0.001);
  markCustomSound();
}

function playTap() {
  withContext((context, start) => {
    oscillator(context, start, 0.018, 0.07, 'sine', 520, 180, 1400);
    oscillator(context, start, 0.016, 0.012, 'triangle', 900, 360, 1400, -8);
  });
}

function playToggle() {
  withContext((context, start) => oscillator(context, start, 0.028, 0.045, 'sine', 320, 480, 1800));
}

function playAddCart() {
  withContext((context, start) => {
    oscillator(context, start, 0.045, 0.045, 'triangle', 440, 660, 1900);
    oscillator(context, start + 0.004, 0.04, 0.025, 'sine', 440, 660, 2200, 4);
  });
}

function playSaleSuccess() {
  withContext((context, start) => {
    oscillator(context, start, 0.38, 0.045, 'sine', 1046.5, 1046.5, 2200);
    oscillator(context, start + 0.095, 0.38, 0.04, 'sine', 1318.5, 1318.5, 2400);
    oscillator(context, start + 0.045, 0.38, 0.026, 'triangle', 784, 784, 1700, -3);
  });
}

function playSave() {
  withContext((context, start) => {
    oscillator(context, start, 0.18, 0.035, 'sine', 783.99, 783.99, 1800);
    oscillator(context, start + 0.07, 0.18, 0.03, 'sine', 1046.5, 1046.5, 2000);
  });
}

function playDelete() {
  withContext((context, start) => oscillator(context, start, 0.11, 0.04, 'sine', 260, 110, 600));
}

function playError() {
  withContext((context, start) => {
    oscillator(context, start, 0.08, 0.035, 'sine', 180, 180, 650);
    oscillator(context, start + 0.09, 0.08, 0.03, 'sine', 140, 140, 550);
  });
}

function playPrint() {
  withContext((context, start) => {
    noise(context, start, 0.065, 0.014, 2100);
    oscillator(context, start, 0.065, 0.012, 'sine', 520, 430, 1500);
  });
}

export const soundEngine = {
  playTap,
  playToggle,
  playAddCart,
  playSaleSuccess,
  playSave,
  playDelete,
  playError,
  playPrint,
  playSuccess: playSaleSuccess,
  isEnabled: () => enabled,
  isCustomSoundRecent: (withinMs = 60) => Date.now() - lastCustomSoundAt < withinMs,
  setEnabled: (next: boolean) => {
    enabled = next;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new CustomEvent('cashly-sound-change', { detail: next }));
    }
  },
};
