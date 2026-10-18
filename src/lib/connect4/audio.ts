// Web Audio API Sound Synthesizer & BGM Engine for Hemi Connect 4
// Zero-asset, zero-lag, self-contained dynamic soundtrack engine!

export type Connect4MusicMode = 'lobby' | 'game' | 'off';

class Connect4SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  // Background Music Synthesizer
  private isMusicEnabled: boolean = true;
  private musicVolume: number = 0.35;
  private currentMusicMode: Connect4MusicMode = 'off';
  private musicMasterGain: GainNode | null = null;
  private musicIntervalId: NodeJS.Timeout | null = null;
  private stepIndex: number = 0;
  private tempoBpm: number = 118;
  private isMusicPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMusic = localStorage.getItem('hemi_c4_music_enabled');
      if (savedMusic !== null) {
        this.isMusicEnabled = savedMusic === 'true';
      }
      const savedVol = localStorage.getItem('hemi_c4_music_vol');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v)) this.musicVolume = Math.max(0, Math.min(1, v));
      }
    }
  }

  private getContext(): AudioContext | null {
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

  // ==========================================
  // BGM CONTROLS
  // ==========================================
  public startMusic(mode: Connect4MusicMode) {
    if (mode === 'off') {
      this.stopMusic();
      return;
    }

    this.currentMusicMode = mode;
    if (!this.isMusicEnabled || !this.enabled) {
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    if (this.isMusicPlaying) {
      this.tempoBpm = mode === 'game' ? 126 : 116;
      return;
    }

    if (!this.musicMasterGain) {
      this.musicMasterGain = ctx.createGain();
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(4600, ctx.currentTime);
      this.musicMasterGain.connect(lowpass);
      lowpass.connect(ctx.destination);
    }

    this.musicMasterGain.gain.setValueAtTime(this.musicVolume, ctx.currentTime);
    this.tempoBpm = mode === 'game' ? 126 : 116;
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

  public setMusicEnabled(enabled: boolean) {
    this.isMusicEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hemi_c4_music_enabled', enabled ? 'true' : 'false');
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
    return this.isMusicEnabled && this.enabled;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('hemi_c4_music_vol', this.musicVolume.toString());
    }
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setValueAtTime(
        this.enabled && this.isMusicEnabled ? this.musicVolume : 0,
        this.ctx.currentTime
      );
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  // ==========================================
  // GENERATIVE BGM SEQUENCER
  // Theme: "Neon Matrix Gravity"
  // Chord Progression: Dm -> Bb -> F -> C
  // ==========================================
  private triggerMusicStep() {
    if (!this.isMusicEnabled || !this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.musicMasterGain) return;

    const step = this.stepIndex % 32;
    this.stepIndex++;
    const now = ctx.currentTime;
    const isGame = this.currentMusicMode === 'game';

    // 1. KICK DRUM
    const isKick = step % 8 === 0 || (isGame && step % 16 === 14);
    if (isKick) {
      this.synthesizeKick(ctx, now);
    }

    // 2. SNARE / CLAP
    const isSnare = step % 8 === 4;
    if (isSnare) {
      this.synthesizeSnare(ctx, now);
    }

    // 3. HI-HATS (rapid 16th with swing)
    const hatVol = step % 2 === 0 ? 0.07 : 0.035;
    this.synthesizeHat(ctx, now, hatVol, step % 4 === 2);

    // 4. BASSLINE: Rubbery bouncing arcade bass
    // 0-7: D1 (73.42Hz) -> Bb0 (58.27Hz) -> F1 (87.31Hz) -> C1 (65.41Hz)
    const bassNotes = [
      73.42, 73.42, 146.8, 73.42, 73.42, 110.0, 73.42, 146.8, // Dm
      58.27, 58.27, 116.5, 58.27, 58.27, 87.3, 58.27, 116.5,  // Bb
      87.31, 87.31, 174.6, 87.31, 87.31, 130.8, 87.31, 174.6, // F
      65.41, 65.41, 130.8, 65.41, 65.41, 98.0, 65.41, 130.8,  // C
    ];
    const bassFreq = bassNotes[step];
    if (bassFreq && (step % 2 === 0 || isGame)) {
      this.synthesizeBass(ctx, now, bassFreq);
    }

    // 5. CASCADE BELL ARPEGGIO (Falling disc motif)
    const bellNotes = [
      587.33, 698.46, 880.0, 1174.66, 880.0, 698.46, 587.33, 880.0, // Dm cascading
      466.16, 587.33, 698.46, 932.33, 698.46, 587.33, 466.16, 698.46, // Bb
      698.46, 880.0, 1046.5, 1396.9, 1046.5, 880.0, 698.46, 1046.5, // F
      523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 783.99, // C
    ];
    if (step % 4 === 0 || (isGame && step % 2 === 0)) {
      this.synthesizeBell(ctx, now, bellNotes[step], isGame ? 0.09 : 0.06);
    }
  }

  private synthesizeKick(ctx: AudioContext, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.1);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    if (this.musicMasterGain) gain.connect(this.musicMasterGain);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private synthesizeSnare(ctx: AudioContext, time: number) {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, time);
    osc.frequency.exponentialRampToValueAtTime(70, time + 0.08);
    oscGain.gain.setValueAtTime(0.12, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(oscGain);
    if (this.musicMasterGain) oscGain.connect(this.musicMasterGain);
    osc.start(time);
    osc.stop(time + 0.08);

    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, time);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.14, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    noise.connect(filter);
    filter.connect(noiseGain);
    if (this.musicMasterGain) noiseGain.connect(this.musicMasterGain);
    noise.start(time);
    noise.stop(time + 0.09);
  }

  private synthesizeHat(ctx: AudioContext, time: number, vol: number, isOpen: boolean) {
    const dur = isOpen ? 0.07 : 0.03;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);
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
    filter.frequency.setValueAtTime(420, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.14);
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(filter);
    filter.connect(gain);
    if (this.musicMasterGain) gain.connect(this.musicMasterGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private synthesizeBell(ctx: AudioContext, time: number, freq: number, vol: number) {
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
  playDrop(pitch = 280) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  playWin() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.35);
      });
    } catch {}
  }

  playTurnAlert() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }

  playClick() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }
}

export const c4Audio = new Connect4SoundEngine();
