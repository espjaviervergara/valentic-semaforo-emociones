const STORAGE_KEY = 'valentic_semaforo_rpg_v2';

const DEFAULT_SAVE = {
  diaryUnlocked: false,
  unlockedDay: 5,
  diaryPages: [1, 2, 3, 4, 5],
  bestStars: 0,
  settings: {
    muted: false,
    voiceEnabled: true,
    noTimerMode: false,
    showDpad: true,
  },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

class GameStateManager {
  constructor() {
    this.save = this.load();
    this.story = null;
    this.run = null;
  }

  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_SAVE),
        ...parsed,
        settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings || {}) },
      };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.save));
    } catch {
      // ignore storage restrictions
    }
  }

  startNewAdventure(skipTutorial = false, day = 1) {
    this.run = {
      day: day || 1,
      mapId: skipTutorial ? (day === 1 ? 'hogar' : 'colegio') : 'cuarto',
      calma: 100,
      tension: 0,
      vinculos: 3,
      autocuidado: skipTutorial ? 1 : 0,
      backpackTaken: skipTutorial || day > 1,
      mirrorDone: skipTutorial || day > 1,
      sofiaTalked: false,
      sofiaPatioTalked: false,
      ricardoTalked: false,
      elenaResolved: false,
      elenaGood: false,
      mateoResolved: false,
      mateoGood: false,
      aulaResolved: false,
      aulaGood: false,
      patioResolved: false,
      patioGood: false,
      shadowFollowing: false,
    };
  }

  toggleMuted() {
    this.save.settings.muted = !this.save.settings.muted;
    this.persist();
    return this.save.settings.muted;
  }

  toggleVoice() {
    this.save.settings.voiceEnabled = !this.save.settings.voiceEnabled;
    this.persist();
    return this.save.settings.voiceEnabled;
  }

  toggleNoTimer() {
    this.save.settings.noTimerMode = !this.save.settings.noTimerMode;
    this.persist();
    return this.save.settings.noTimerMode;
  }

  toggleDpad() {
    this.save.settings.showDpad = !this.save.settings.showDpad;
    this.persist();
    return this.save.settings.showDpad;
  }

  addCalma(delta) {
    if (!this.run) return;
    this.run.calma = clamp(this.run.calma + delta, 0, 100);
  }

  addTension(delta) {
    if (!this.run) return;
    this.run.tension = clamp(this.run.tension + delta, 0, 100);
  }

  unlockDiary(day, stars) {
    this.save.diaryUnlocked = true;
    if (!this.save.diaryPages.includes(day)) {
      this.save.diaryPages.push(day);
    }
    this.save.unlockedDay = Math.max(this.save.unlockedDay, Math.min(5, day + 1));
    this.save.bestStars = Math.max(this.save.bestStars, stars);
    this.persist();
  }
}

export const gameState = new GameStateManager();
