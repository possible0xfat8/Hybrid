/**
 * Synthesized Web Audio API sound effects and dynamic BGM engine for Hemi Chess.
 * Self-contained, zero-asset, zero-network-lag grandmaster soundtrack!
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playMoveSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Silently ignore audio context block/errors
  }
}

export function playCaptureSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore
  }
}

export function playCheckSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    [880, 1174].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.15);
    });
  } catch {
    // Ignore
  }
}

export function playGameStartSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    [440, 554.37, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);

      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.09);
      osc.stop(ctx.currentTime + i * 0.09 + 0.2);
    });
  } catch {
    // Ignore
  }
}

export function playGameOverSound(won: boolean) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = won ? [523.25, 659.25, 783.99, 1046.5] : [440, 392, 349.23, 293.66];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = won ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

      gain.gain.setValueAtTime(won ? 0.2 : 0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
  } catch {
    // Ignore
  }
}

// ========================================================
// HEMI CHESS BACKGROUND MUSIC (BGM) SYNTHESIZER
// Theme: "Grandmaster Neo-Noir Tactical Focus"
// Chords: Dm -> Gm -> A7 -> Dm (Majestic blitz calculation)
// ========================================================

export type ChessMusicMode = 'lobby' | 'game' | 'off';

class ChessMusicEngine {
  private isMusicEnabled: boolean = true;
  private musicVolume: number = 0.32;
  private currentMode: ChessMusicMode = 'off';
  private masterGain: GainNode | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private stepIndex: number = 0;
  private tempoBpm: number = 112;
  private isPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMusic = localStorage.getItem('hemi_chess_music_enabled');
      if (savedMusic !== null) {
        this.isMusicEnabled = savedMusic === 'true';
      }
      const savedVol = localStorage.getItem('hemi_chess_music_vol');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v)) this.musicVolume = Math.max(0, Math.min(1, v));
      }
    }
  }

  public startMusic(mode: ChessMusicMode) {
    if (mode === 'off') {
      this.stopMusic();
      return;
    }

    this.currentMode = mode;
    if (!this.isMusicEnabled) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (this.isPlaying) {
      this.tempoBpm = mode === 'game' ? 122 : 110;
      return;
    }

    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(4200, ctx.currentTime);
      this.masterGain.connect(lowpass);
      lowpass.connect(ctx.destination);
    }

    this.masterGain.gain.setValueAtTime(this.musicVolume, ctx.currentTime);
    this.tempoBpm = mode === 'game' ? 122 : 110;
    this.stepIndex = 0;
    this.isPlaying = true;

    const stepDurationMs = (60 / this.tempoBpm / 4) * 1000;

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.triggerStep();
    }, stepDurationMs);
  }

  public stopMusic() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    const ctx = getAudioContext();
    if (this.masterGain && ctx) {
      this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    }
    this.isPlaying = false;
  }

  public setMusicEnabled(enabled: boolean) {
    this.isMusicEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hemi_chess_music_enabled', enabled ? 'true' : 'false');
    }
    if (!enabled) {
      this.stopMusic();
    } else {
      if (this.currentMode !== 'off') {
        this.startMusic(this.currentMode);
      }
    }
  }

  public isMusicOn(): boolean {
    return this.isMusicEnabled;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('hemi_chess_music_vol', this.musicVolume.toString());
    }
    const ctx = getAudioContext();
    if (this.masterGain && ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMusicEnabled ? this.musicVolume : 0,
        ctx.currentTime
      );
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getCurrentMode(): ChessMusicMode {
    return this.currentMode;
  }

  private triggerStep() {
    if (!this.isMusicEnabled) return;
    const ctx = getAudioContext();
    if (!ctx || !this.masterGain) return;

    const step = this.stepIndex % 32;
    this.stepIndex++;
    const now = ctx.currentTime;
    const isGame = this.currentMode === 'game';

    // 1. Kick on 0, 8, 16, 24
    if (step % 8 === 0 || (isGame && step % 16 === 12)) {
      this.synthesizeKick(ctx, now);
    }

    // 2. Chess Clock Tick on steps 4, 12, 20, 28 (like an analog tournament clock!)
    if (step % 4 === 2) {
      this.synthesizeClockTick(ctx, now, step % 8 === 2);
    }

    // 3. Subtle Hi-Hat
    const hatVol = step % 4 === 0 ? 0.05 : 0.025;
    this.synthesizeHat(ctx, now, hatVol);

    // 4. Sub-Bassline (Dm -> Gm -> A -> Dm)
    const bassNotes = [
      73.42, 73.42, 146.83, 73.42, 73.42, 110.0, 73.42, 146.83, // Dm
      98.0, 98.0, 196.0, 98.0, 98.0, 146.83, 98.0, 196.0,       // Gm
      110.0, 110.0, 220.0, 110.0, 110.0, 164.81, 110.0, 220.0,  // A7
      73.42, 73.42, 110.0, 73.42, 146.83, 110.0, 73.42, 110.0,  // Dm resolve
    ];
    const bassFreq = bassNotes[step];
    if (bassFreq && (step % 2 === 0 || isGame)) {
      this.synthesizeBass(ctx, now, bassFreq);
    }

    // 5. Neo-Classical Thoughtful Piano / Bell Arpeggio
    const arpNotes = [
      293.66, 349.23, 440.0, 587.33, 440.0, 349.23, 293.66, 440.0, // Dm
      392.0, 466.16, 587.33, 783.99, 587.33, 466.16, 392.0, 587.33, // Gm
      440.0, 554.37, 659.25, 880.0, 659.25, 554.37, 440.0, 659.25, // A7
      587.33, 440.0, 349.23, 293.66, 349.23, 440.0, 587.33, 880.0, // Dm
    ];
    if (step % 4 === 0 || (isGame && step % 2 === 0)) {
      this.synthesizeArp(ctx, now, arpNotes[step], isGame ? 0.08 : 0.05);
    }
  }

  private synthesizeKick(ctx: AudioContext, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.1);
    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private synthesizeClockTick(ctx: AudioContext, time: number, isHigh: boolean) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHigh ? 960 : 720, time);
    osc.frequency.exponentialRampToValueAtTime(200, time + 0.02);
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.03);
  }

  private synthesizeHat(ctx: AudioContext, time: number, vol: number) {
    const dur = 0.025;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    noise.connect(filter);
    filter.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    noise.start(time);
    noise.stop(time + dur);
  }

  private synthesizeBass(ctx: AudioContext, time: number, freq: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    osc.connect(filter);
    filter.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.16);
  }

  private synthesizeArp(ctx: AudioContext, time: number, freq: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.22);
  }
}

export const chessMusic = new ChessMusicEngine();
