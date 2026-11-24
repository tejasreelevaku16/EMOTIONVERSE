// Synthesized WebAudio Ambience Service (FR-10)
// Generates procedural ambient pads and drones entirely in runtime code with 0 audio files.

import type { AudioMood } from '../game/atmosphereProfiles';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentMood: AudioMood | null = null;
  private activeNodes: { stop: () => void }[] = [];
  private isMuted: boolean = false;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        } catch {
          this.ctx = null;
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.4, now + 0.5);
    }
  }

  public isAudioMuted(): boolean {
    return this.isMuted;
  }

  private stopCurrentAmbience(): void {
    for (const node of this.activeNodes) {
      try {
        node.stop();
      } catch {
        // Ignore errors on stopping
      }
    }
    this.activeNodes = [];
  }

  public playMood(mood: AudioMood): void {
    if (this.currentMood === mood) return;
    this.currentMood = mood;

    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    this.stopCurrentAmbience();

    const moodGain = ctx.createGain();
    moodGain.gain.setValueAtTime(0, ctx.currentTime);
    moodGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1.5);
    moodGain.connect(this.masterGain);

    switch (mood) {
      case 'hope':
        this.synthesizeHope(ctx, moodGain);
        break;
      case 'sadness':
        this.synthesizeSadness(ctx, moodGain);
        break;
      case 'curiosity':
        this.synthesizeCuriosity(ctx, moodGain);
        break;
      case 'fear':
        this.synthesizeFear(ctx, moodGain);
        break;
      case 'ending':
        this.synthesizeEnding(ctx, moodGain);
        break;
    }
  }

  // Hope: Warm major triad pad (C4 = 261.63Hz, E4 = 329.63Hz, G4 = 392.00Hz)
  private synthesizeHope(ctx: AudioContext, destination: GainNode): void {
    const freqs = [130.81, 261.63, 329.63, 392.0];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.connect(destination);

    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.connect(filter);
      osc.start();
      this.activeNodes.push({ stop: () => osc.stop() });
    }
  }

  // Sadness: Low minor drone + filtered rain-like noise
  private synthesizeSadness(ctx: AudioContext, destination: GainNode): void {
    const freqs = [110.0, 130.81, 220.0]; // A2, C3, A3 minor drone
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.connect(destination);
      osc.start();
      this.activeNodes.push({ stop: () => osc.stop() });
    }

    // Procedural rain noise buffer
    try {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.setValueAtTime(800, ctx.currentTime);
      rainFilter.Q.setValueAtTime(1.5, ctx.currentTime);

      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.08, ctx.currentTime);

      noise.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(destination);
      noise.start();
      this.activeNodes.push({ stop: () => noise.stop() });
    } catch {
      // Audio buffer creation safe fallback
    }
  }

  // Curiosity: Airy rising sine tones with subtle vibrato
  private synthesizeCuriosity(ctx: AudioContext, destination: GainNode): void {
    const freqs = [174.61, 261.63, 349.23, 523.25]; // F3, C4, F4, C5
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);

      // Subtle LFO vibrato
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
      lfoGain.gain.setValueAtTime(4, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      osc.connect(destination);
      osc.start();
      this.activeNodes.push({
        stop: () => {
          osc.stop();
          lfo.stop();
        },
      });
    }
  }

  // Fear: Dissonant low drone with sub-rumble (detuned tritone)
  private synthesizeFear(ctx: AudioContext, destination: GainNode): void {
    const freqs = [55.0, 77.78, 110.0]; // A1, Eb2 (tritone), A2
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, ctx.currentTime);
    filter.connect(destination);

    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.connect(filter);
      osc.start();
      this.activeNodes.push({ stop: () => osc.stop() });
    }
  }

  // Ending: Harmonic ethereal chord
  private synthesizeEnding(ctx: AudioContext, destination: GainNode): void {
    const freqs = [130.81, 196.0, 261.63, 392.0, 523.25]; // C major open voicing
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.connect(destination);
      osc.start();
      this.activeNodes.push({ stop: () => osc.stop() });
    }
  }
}

export const audioService = new AudioService();
