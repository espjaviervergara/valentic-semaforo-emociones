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

    const run = gameState.run || { calma: 100, shadowFollowing: false, day: 1 };
    const currentDay = run.day || 1;
    const stars = (run.calma >= 80 && !run.shadowFollowing) ? 3 : (run.calma >= 60 ? 2 : 1);
    gameState.unlockDiary(currentDay, stars);

    const pages = gameState.story.diary_pages || [gameState.story.diary];
    const pageData = pages[Math.min(pages.length - 1, currentDay - 1)];

    this.add.rectangle(width / 2, height / 2, width, height, 0x0b1120);
    drawPanel(this, 56, 30, width - 112, height - 60, 0x0f172a, 0.98, 0x22c55e);

    // Valentic exacto + Alex calmado + Sombra calma
    this.add.image(160, 280, 'valentic').setScale(0.35);
    this.add.image(820, 240, 'portrait_alex_calm').setScale(1);
    this.add.image(820, 350, 'portrait_sombra_calma').setScale(0.95);

    const titleText = currentDay === 5
      ? '🎓 ¡GRADUACIÓN: GUARDIÁN DE LA CONVIVENCIA!'
      : `¡COMPLETASTE EL DÍA ${currentDay} DE 5!`;

    this.add.text(490, 64, titleText, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: currentDay === 5 ? '24px' : '26px',
      fontStyle: 'bold',
      color: '#86efac',
    }).setOrigin(0.5);

    const starStr = '★ '.repeat(stars) + '☆ '.repeat(3 - stars);
    this.add.text(490, 100, `Calma final: ${run.calma}%   ·   ${starStr.trim()}`, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#fde047',
    }).setOrigin(0.5);

    // Página del Diario del día actual
    drawPanel(this, 266, 130, 468, 240, 0xfefce8, 1, 0xd97706);
    this.add.text(500, 156, `📖 ${pageData.title}`, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#78350f',
    }).setOrigin(0.5);

    this.add.text(500, 226, pageData.summary, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '15px',
      color: '#1e293b',
      align: 'center',
      wordWrap: { width: 420 },
      lineSpacing: 5,
    }).setOrigin(0.5);

    this.add.text(500, 320, `💡 ${pageData.tip}`, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#166534',
      align: 'center',
      wordWrap: { width: 420 },
    }).setOrigin(0.5);

    this.time.delayedCall(400, () => {
      soundManager.playVoice(`diary_p${currentDay}`);
    });

    // Botones de acción
    if (currentDay < 5) {
      createButton(this, 400, 435, 230, 44, `▶ Avanzar al Día ${currentDay + 1} ▸`, {
        fill: 0x16a34a,
        hover: 0x22c55e,
        fontSize: '16px',
        onClick: () => {
          soundManager.stopVoice();
          gameState.startNewAdventure(true, currentDay + 1);
          this.scene.start('WorldScene');
        },
      });

      createButton(this, 630, 435, 170, 44, 'Menú Principal', {
        fill: 0x334155,
        hover: 0x475569,
        fontSize: '15px',
        onClick: () => {
          soundManager.stopVoice();
          this.scene.start('MenuScene');
        },
      });
    } else {
      createButton(this, 490, 435, 260, 44, '🏆 Volver al Menú de Honor', {
        fill: 0xd97706,
        hover: 0xb45309,
        fontSize: '16px',
        onClick: () => {
          soundManager.stopVoice();
          this.scene.start('MenuScene');
        },
      });
    }
  }
}
