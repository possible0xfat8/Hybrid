/**
 * Web Audio Arcade Synthesizer & BGM Engine
 * Zero-asset, zero-network-lag, dynamic generative arcade music engine:
 * - "Cyber Arcade Groove" BGM: Energetic, thrilling bassline, cyber synth chords, 
 *   arpeggiated melodies, dynamic hi-hat/kick percussions tailored for competitive Uno.
 * - Dynamic mode adaptation: 
 *   - 'lobby': Cool, stylish, anticipation-building funk synth groove with rolling bass.
 *   - 'game': Thrilling, high-energy, tempo-synced arcade beat that keeps players on edge!
 * - Sound FX: Instant synthesized card deal, play, whoosh, +2/+4 impacts, alarms, fanfares.
 */

export type MusicTrackMode = 'lobby' | 'game' | 'off';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;

  // Background Music Synthesizer Engine
  private isMusicEnabled: boolean = true;
  private musicVolume: number = 0.38;
  private currentMusicMode: MusicTrackMode = 'off';
  private musicMasterGain: GainNode | null = null;
  private musicIntervalId: any = null;
  private stepIndex: number = 0;
  private tempoBpm: number = 124; // Energetic, cool tempo
  private isMusicPlaying: boolean = false;

  constructor() {
    // Lazy init on first user gesture
    if (typeof window !== 'undefined') {
      const savedMusic = localStorage.getItem('hemi_uno_music_enabled');
      if (savedMusic !== null) {
        this.isMusicEnabled = savedMusic === 'true';
      }
      const savedVol = localStorage.getItem('hemi_uno_music_vol');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v)) this.musicVolume = Math.max(0, Math.min(1, v));
      }
    }
  }

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setValueAtTime(
        muted || !this.isMusicEnabled ? 0 : this.musicVolume,
        this.ctx.currentTime
      );
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('hemi_uno_music_vol', this.musicVolume.toString());
    }
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setValueAtTime(
        this.isMuted || !this.isMusicEnabled ? 0 : this.musicVolume,
        this.ctx.currentTime
      );
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setMusicEnabled(enabled: boolean) {
    this.isMusicEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hemi_uno_music_enabled', enabled ? 'true' : 'false');
    }
    if (!enabled) {
      this.stopMusic();
    } else {
      if (this.currentMusicMode !== 'off') {
        this.startMusic(this.currentMusicMode);
      }
    }
  }

  public isMusicOn(): boolean {
    return this.isMusicEnabled && !this.isMuted;
  }

  public getCurrentMusicMode(): MusicTrackMode {
    return this.currentMusicMode;
  }

  // ==========================================
  // BACKGROUND MUSIC SYNTHESIZER
  // ==========================================
  public startMusic(mode: MusicTrackMode) {
    if (mode === 'off') {
      this.stopMusic();
      return;
    }

    this.currentMusicMode = mode;
    if (!this.isMusicEnabled || this.isMuted) {
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    if (this.isMusicPlaying) {
      // If already playing in the same mode, just ensure correct tempo
      this.tempoBpm = mode === 'game' ? 128 : 120;
      return;
    }

    // Initialize master gain for music channel
    if (!this.musicMasterGain) {
      this.musicMasterGain = ctx.createGain();
      // Add subtle lowpass master warmth
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(4200, ctx.currentTime);
      this.musicMasterGain.connect(lowpass);
      lowpass.connect(ctx.destination);
    }

    this.musicMasterGain.gain.setValueAtTime(this.musicVolume, ctx.currentTime);
    this.tempoBpm = mode === 'game' ? 128 : 120;
    this.stepIndex = 0;
    this.isMusicPlaying = true;

    // 16th note sequencing interval
    const stepDurationMs = (60 / this.tempoBpm / 4) * 1000;
    
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
    }

    this.musicIntervalId = setInterval(() => {
      this.triggerMusicStep();
    }, stepDurationMs);
  }

  public stopMusic() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
    }
    this.isMusicPlaying = false;
  }

  /**
   * Generates a 16-step or 32-step thrilling electronic synth groove
   * Chords progression: Am -> F -> C -> G (Classic epic arcade tension)
   */
  private triggerMusicStep() {
    if (!this.isMusicEnabled || this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.musicMasterGain) return;

    const step = this.stepIndex % 32;
    this.stepIndex++;
    const now = ctx.currentTime;
    const isGame = this.currentMusicMode === 'game';

    // 1. DRUMS (Punchy electronic kick, snare, hi-hat)
    // Kick on beats 0, 4, 8, 12, 16, 20, 24, 28 + offbeat syncopation
    const isKick = step % 8 === 0 || (step % 16 === 14 && isGame);
    if (isKick) {
      this.synthesizeKick(ctx, now);
    }

    // Snare / Clap on beat 4, 12, 20, 28
    const isSnare = step % 8 === 4;
    if (isSnare) {
      this.synthesizeSnare(ctx, now);
    }

    // Hi-hats: rapid 16th notes with velocity swing
    const hatVolume = step % 2 === 0 ? 0.08 : 0.04;
    this.synthesizeHat(ctx, now, hatVolume, step % 4 === 2);

    // 2. BASSLINE: Thrilling, driving rolling cyberpunk bass (A -> F -> C -> G)
    // 32-step cycle:
    // 0-7: A1 (55Hz)
    // 8-15: F1 (43.65Hz)
    // 16-23: C2 (65.41Hz)
    // 24-31: G1 (49Hz)
    const bassNotes = [
      55.0, 55.0, 110.0, 55.0, 55.0, 82.4, 55.0, 110.0, // A minor driving
      43.65, 43.65, 87.3, 43.65, 43.65, 65.4, 43.65, 87.3, // F major groove
      65.41, 65.41, 130.8, 65.41, 65.41, 98.0, 65.41, 130.8, // C major momentum
      49.0, 49.0, 98.0, 49.0, 49.0, 73.4, 49.0, 98.0, // G major build
    ];
    const bassFreq = bassNotes[step];
    if (bassFreq && (step % 2 === 0 || isGame)) {
      this.synthesizeBass(ctx, now, bassFreq);
    }

    // 3. SYNTH ARPEGGIO & CHORDS: Cool arcade melodic lead
    // Scale: A Dorian / Pentatonic [A, C, D, E, G, A]
    const arpNotes = [
      440, 523.25, 659.25, 880, 659.25, 523.25, 783.99, 880,
      349.23, 440, 523.25, 698.46, 523.25, 440, 659.25, 783.99,
      523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 880, 1046.5,
      392.0, 493.88, 587.33, 783.99, 587.33, 493.88, 659.25, 880,
    ];
    if (step % 4 === 0 || (isGame && step % 2 === 0)) {
      const arpFreq = arpNotes[step];
      this.synthesizeArp(ctx, now, arpFreq, isGame ? 0.09 : 0.06);
    }
  }

  // --- Drum Synthesizers ---
  private synthesizeKick(ctx: AudioContext, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.09);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    if (this.musicMasterGain) gain.connect(this.musicMasterGain);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private synthesizeSnare(ctx: AudioContext, time: number) {
    // Tone body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);
    oscGain.gain.setValueAtTime(0.12, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(oscGain);
    if (this.musicMasterGain) oscGain.connect(this.musicMasterGain);
    osc.start(time);
    osc.stop(time + 0.08);

    // Noise snap
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.14, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    if (this.musicMasterGain) noiseGain.connect(this.musicMasterGain);
    noise.start(time);
    noise.stop(time + 0.09);
  }

  private synthesizeHat(ctx: AudioContext, time: number, vol: number, isOpen: boolean) {
    const dur = isOpen ? 0.08 : 0.03;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    if (this.musicMasterGain) gain.connect(this.musicMasterGain);
    noise.start(time);
    noise.stop(time + dur);
  }

  private synthesizeBass(ctx: AudioContext, time: number, freq: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, time);
    filter.frequency.exponentialRampToValueAtTime(110, time + 0.14);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    if (this.musicMasterGain) gain.connect(this.musicMasterGain);
    osc.start(time);
    osc.stop(time + 0.16);
  }

  private synthesizeArp(ctx: AudioContext, time: number, freq: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    if (this.musicMasterGain) gain.connect(this.musicMasterGain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  // ==========================================
  // GAMEPLAY SOUND FX
  // ==========================================
  public play(name: string) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (name) {
      case 'deal': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.3 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case 'play': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);

        gain.gain.setValueAtTime(0.4 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'draw':
      case 'card_draw': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);

        gain.gain.setValueAtTime(0.25 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'wild': {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.06;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0.25 * this.volume, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.15);
        });
        break;
      }

      case 'special': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);

        gain.gain.setValueAtTime(0.45 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      case 'timer': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.setValueAtTime(180, now + 0.1);

        gain.gain.setValueAtTime(0.3 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'last_card': {
        [0, 0.14].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now + offset);

          gain.gain.setValueAtTime(0.4 * this.volume, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.1);
        });
        break;
      }

      case 'victory': {
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + idx * 0.1;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.3 * this.volume, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.8);
        });
        break;
      }

      case 'emote': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);

        gain.gain.setValueAtTime(0.3 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      default:
        break;
    }
  }
}

export const soundEngine = new SoundEngine();
