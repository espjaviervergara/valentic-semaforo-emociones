import { gameState } from './GameState.js';

const BGM_VOL = 0.14;
const BGM_DUCK = 0.04;

class SoundManager {
  constructor() {
    this.ctx = null;
    this.phaserSound = null;
    this.cacheAudio = null;
    this.bgmKey = null;
    this.bgm = null;
    this.voiceKey = null;
    this.voice = null;
  }

  attach(scene) {
    if (!scene) return;
    this.phaserSound = scene.sound;
    this.cacheAudio = scene.cache?.audio;
    this.syncVolumes();
  }

  syncVolumes() {
    const muted = gameState.save.settings.muted;
    const voiceOn = gameState.save.settings.voiceEnabled;
    if (this.bgm) {
      if (muted) {
        this.bgm.setVolume(0);
      } else {
        const speaking = Boolean(this.voice && this.voice.isPlaying);
        this.bgm.setVolume(speaking ? BGM_DUCK : BGM_VOL);
      }
    }
    if (this.voice && (muted || !voiceOn)) {
      this.stopVoice();
    }
  }

  playBGM(key) {
    if (!this.phaserSound || !this.cacheAudio?.exists(key)) return;
    if (this.bgmKey === key && this.bgm) {
      if (!this.bgm.isPlaying) {
        this.bgm.play({ loop: true, volume: gameState.save.settings.muted ? 0 : BGM_VOL });
      }
      this.syncVolumes();
      return;
    }
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
    }
    this.bgmKey = key;
    this.bgm = this.phaserSound.add(key, {
      loop: true,
      volume: gameState.save.settings.muted ? 0 : BGM_VOL,
    });
    this.bgm.play();
  }

  stopVoice() {
    if (this.voice) {
      this.voice.off('complete');
      if (this.voice.isPlaying) this.voice.stop();
      this.voice.destroy();
      this.voice = null;
    }
    this.syncVolumes();
  }

  playVoice(key, onComplete = null) {
    if (!key) {
      if (onComplete) onComplete();
      return;
    }
    this.voiceKey = key;
    this.stopVoice();

    if (
      gameState.save.settings.muted
      || !gameState.save.settings.voiceEnabled
      || !this.phaserSound
      || !this.cacheAudio?.exists(key)
    ) {
      if (onComplete) onComplete();
      return;
    }

    const v = this.phaserSound.add(key, { volume: 0.95 });
    this.voice = v;
    this.syncVolumes();
    v.once('complete', () => {
      if (this.voice === v) {
        this.voice = null;
        v.destroy();
        this.syncVolumes();
      }
      if (onComplete) onComplete();
    });
    v.play();
  }

  replayVoice() {
    if (this.voiceKey) this.playVoice(this.voiceKey);
  }

  ensureCtx() {
    if (gameState.save.settings.muted) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  tone(freq, dur = 0.1, type = 'triangle', vol = 0.07, delay = 0) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  playClick() { this.tone(540, 0.06, 'square', 0.05); }
  playPickup() { this.tone(587, 0.08, 'triangle', 0.07, 0); this.tone(880, 0.12, 'triangle', 0.07, 0.07); }
  playAlert() { this.tone(240, 0.14, 'sawtooth', 0.07, 0); this.tone(185, 0.18, 'sawtooth', 0.07, 0.14); }
  playSparkOut() { this.tone(660, 0.09, 'sine', 0.07); }
  playSuccess() { this.tone(523, 0.09, 'triangle', 0.07, 0); this.tone(659, 0.1, 'triangle', 0.07, 0.08); this.tone(784, 0.16, 'triangle', 0.08, 0.16); }
  playError() { this.tone(220, 0.14, 'sawtooth', 0.07, 0); this.tone(165, 0.2, 'sawtooth', 0.07, 0.12); }
  playTick() { this.tone(760, 0.04, 'triangle', 0.04); }
  playStep() { this.tone(150, 0.03, 'sine', 0.02); }
  playVictory() { [523, 659, 784, 1046].forEach((n, i) => this.tone(n, 0.2, 'triangle', 0.08, i * 0.1)); }

  // Nuevos sonidos para minijuegos
  playPop() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.07);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playJump() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.1);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playGlow() {
    this.tone(784, 0.1, 'sine', 0.06, 0);
    this.tone(1046, 0.14, 'sine', 0.06, 0.06);
  }
}

export const soundManager = new SoundManager();
