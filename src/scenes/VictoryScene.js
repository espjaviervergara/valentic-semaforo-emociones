import { gameState } from '../systems/GameState.js';
import { soundManager } from '../systems/SoundManager.js';
import { createButton, drawPanel } from '../ui/UIHelpers.js';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create() {
    const { width, height } = this.scale;
    soundManager.attach(this);
    soundManager.stopVoice();
    soundManager.playBGM('bgm_menu');
    soundManager.playVictory();

    const run = gameState.run;
    const stars = (run.calma >= 80 && !run.shadowFollowing) ? 3 : (run.calma >= 60 ? 2 : 1);
    gameState.unlockDiary(stars);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0b1120);
    drawPanel(this, 56, 36, width - 112, height - 72, 0x0f172a, 0.98, 0x22c55e);

    // Valentic exacto + Alex calmado + Sombra calma
    this.add.image(170, 290, 'valentic').setScale(0.35);
    this.add.image(810, 250, 'portrait_alex_calm').setScale(1);
    this.add.image(810, 362, 'portrait_sombra_calma').setScale(0.95);

    this.add.text(490, 74, '¡COMPLETASTE EL DÍA 1!', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#86efac',
    }).setOrigin(0.5);

    const starStr = '★ '.repeat(stars) + '☆ '.repeat(3 - stars);
    this.add.text(490, 114, `Calma final: ${run.calma}%   ·   ${starStr.trim()}`, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fde047',
    }).setOrigin(0.5);

    // Página 1 del Diario desbloqueada
    drawPanel(this, 276, 150, 444, 232, 0xfefce8, 1, 0xd97706);
    this.add.text(498, 178, `📖 ${gameState.story.diary.title}`, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#78350f',
    }).setOrigin(0.5);

    this.add.text(498, 246, gameState.story.diary.summary, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '16px',
      color: '#1e293b',
      align: 'center',
      wordWrap: { width: 404 },
      lineSpacing: 5,
    }).setOrigin(0.5);

    this.add.text(498, 336, `💡 ${gameState.story.diary.tip}`, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14.5px',
      fontStyle: 'bold',
      color: '#166534',
      align: 'center',
      wordWrap: { width: 404 },
    }).setOrigin(0.5);

    this.time.delayedCall(600, () => soundManager.playVoice('valentic_victory'));

    createButton(this, 326, 444, 180, 42, '▶ Escuchar Diario', {
      fill: 0x0f766e,
      hover: 0x0d9488,
      border: 0x99f6e4,
      fontSize: '14.5px',
      onClick: () => soundManager.playVoice('diary_p1'),
    });

    createButton(this, 520, 444, 170, 42, 'Jugar de nuevo', {
      fill: 0x2563eb,
      hover: 0x3b82f6,
      fontSize: '15px',
      onClick: () => {
        soundManager.stopVoice();
        gameState.startNewAdventure(false);
        this.scene.start('WorldScene');
      },
    });

    createButton(this, 700, 444, 150, 42, 'Menú Principal', {
      fill: 0x334155,
      hover: 0x475569,
      fontSize: '15px',
      onClick: () => {
        soundManager.stopVoice();
        this.scene.start('MenuScene');
      },
    });
  }
}
