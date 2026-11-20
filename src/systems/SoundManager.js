import { gameState } from './GameState.js';

const BGM_VOL = 0.14;
const BGM_DUCK = 0.04;
const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

class SoundManager {
  constructor() {
    this.ctx = null;
    this.phaserSound = null;
    this.cacheAudio = null;

    // BGM state (reproducción HTML5 para eludir el interruptor de silencio de iOS WebKit y evitar saturación de decodificadores)
    this.bgmKey = null;
    this.bgmAudio = null;
    this.pendingBgmKey = null;

    // Voice state
    this.voiceKey = null;
    this.voiceAudio = null;

    // Estado de desbloqueo
    this.isUnlocked = false;
    this._unlockRegistered = false;

    if (typeof window !== 'undefined') {
      this.ensureUnlockListeners();
    }
  }

  attach(scene) {
    if (!scene) return;
    this.phaserSound = scene.sound;
    this.cacheAudio = scene.cache?.audio;
    this.ensureUnlockListeners();
    this.syncVolumes();
  }

  ensureUnlockListeners() {
    if (this._unlockRegistered || typeof window === 'undefined') return;
    this._unlockRegistered = true;

    const onUserGesture = () => {
      this.unlockAll();
    };

    ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, onUserGesture, { capture: true, passive: true });
    });
    if (typeof document !== 'undefined' && document.body) {
      ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach((evt) => {
        document.body.addEventListener(evt, onUserGesture, { capture: true, passive: true });
      });
    }
  }

  unlockAll() {
    // 1. Silent HTML5 Audio Element playback:
    // Eleva la sesión AVAudioSession en iOS WebKit a AVAudioSessionCategoryPlayback (ignora interruptor de silencio de iPhone)
    try {
      const silentAudio = document.createElement('audio');
      silentAudio.setAttribute('playsinline', 'true');
      silentAudio.setAttribute('webkit-playsinline', 'true');
      silentAudio.preload = 'auto';
      silentAudio.src = SILENT_WAV;
      silentAudio.volume = 0.001;
      const p = silentAudio.play();
      if (p !== undefined) {
        p.then(() => {
          silentAudio.pause();
          silentAudio.remove();
        }).catch(() => {});
      }
    } catch (e) {}

    // 2. WebAudio Context Resume + Silent Buffer Kickstart
    const ctx = this.ensureCtx();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch (e) {}
    }

    // 3. Desbloqueo interno de Phaser Sound Manager
    if (this.phaserSound) {
      try {
        this.phaserSound.locked = false;
        this.phaserSound.unlocked = true;
        if (this.phaserSound.context && this.phaserSound.context.state === 'suspended') {
          this.phaserSound.context.resume().catch(() => {});
        }
      } catch (e) {}
    }

    this.isUnlocked = true;

    // 4. Iniciar BGM pendiente si estaba encolada antes del primer toque
    if (this.pendingBgmKey) {
      const key = this.pendingBgmKey;
      this.pendingBgmKey = null;
      this.playBGM(key);
    } else if (this.bgmAudio && this.bgmAudio.paused && !gameState.save.settings.muted) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  syncVolumes() {
    const muted = gameState.save.settings.muted;
    const voiceOn = gameState.save.settings.voiceEnabled;

    if (this.bgmAudio) {
      if (muted) {
        this.bgmAudio.volume = 0;
      } else {
        const speaking = Boolean(this.voiceAudio && !this.voiceAudio.paused && !this.voiceAudio.ended);
        this.bgmAudio.volume = speaking ? BGM_DUCK : BGM_VOL;
      }
    }

    if (this.voiceAudio && (muted || !voiceOn)) {
      this.stopVoice();
    }
  }

  playBGM(key) {
    if (!key) return;

    // Si ya está reproduciendo la misma pista, solo ajustar volumen
    if (this.bgmKey === key && this.bgmAudio) {
      if (this.bgmAudio.paused && !gameState.save.settings.muted) {
        this.bgmAudio.play().catch(() => {
          this.pendingBgmKey = key;
        });
      }
      this.syncVolumes();
      return;
    }

    this.stopBGM();
    this.bgmKey = key;

    const audio = new Audio();
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.loop = true;
    audio.preload = 'auto';

    const speaking = Boolean(this.voiceAudio && !this.voiceAudio.paused && !this.voiceAudio.ended);
    audio.volume = gameState.save.settings.muted ? 0 : (speaking ? BGM_DUCK : BGM_VOL);

    // Múltiples fuentes con fallback automático
    const sources = [
      `./assets/audio/bgm/${key}.mp3`,
      `./assets/audio/bgm/${key}.m4a`,
      `./assets/audio/bgm/${key}.wav`,
    ];
    let srcIdx = 0;
    audio.src = sources[srcIdx];

    audio.onerror = () => {
      srcIdx++;
      if (srcIdx < sources.length) {
        audio.src = sources[srcIdx];
        if (!audio.paused) {
          audio.play().catch(() => {});
        }
      }
    };

    this.bgmAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Bloqueado temporalmente por política de autoplay antes de interacción del usuario
        this.pendingBgmKey = key;
      });
    }
  }

  stopBGM() {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
        this.bgmAudio.onerror = null;
        this.bgmAudio.src = '';
      } catch (e) {}
      this.bgmAudio = null;
    }
  }

  stopVoice() {
    if (this.voiceAudio) {
      try {
        this.voiceAudio.pause();
        this.voiceAudio.currentTime = 0;
        this.voiceAudio.onended = null;
        this.voiceAudio.onerror = null;
        this.voiceAudio.src = '';
      } catch (e) {}
      this.voiceAudio = null;
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
    ) {
      if (onComplete) onComplete();
      return;
    }

    const audio = new Audio();
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.preload = 'auto';
    audio.volume = 0.95;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (this.voiceAudio === audio) {
        this.voiceAudio = null;
        this.syncVolumes();
      }
      if (onComplete) onComplete();
    };

    audio.onended = finish;

    // Fallback: MP3 primero, luego M4A
    const sources = [
      `./assets/audio/voices/${key}.mp3`,
      `./assets/audio/voices/${key}.m4a`,
    ];
    let srcIdx = 0;
    audio.src = sources[srcIdx];

    audio.onerror = () => {
      srcIdx++;
      if (srcIdx < sources.length) {
        audio.src = sources[srcIdx];
        audio.play().catch(() => finish());
      } else {
        finish();
      }
    };

    this.voiceAudio = audio;
    this.syncVolumes(); // Atenúa BGM mientras habla el personaje

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn(`Voz en cola o bloqueada para ${key}:`, err);
        finish();
      });
    }
  }

  replayVoice() {
    if (this.voiceKey) {
      this.playVoice(this.voiceKey);
    }
  }

  ensureCtx() {
    if (gameState.save.settings.muted) return null;
    const ctx = this.phaserSound?.context || this.ctx;
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return ctx;
    }
    if (!this.ctx && typeof window !== 'undefined') {
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

  // Sonidos para minijuegos
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
