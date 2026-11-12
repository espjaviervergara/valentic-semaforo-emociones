import { gameState } from '../systems/GameState.js';
import { soundManager } from '../systems/SoundManager.js';
import { createButton, drawPanel } from '../ui/UIHelpers.js';

export class PrologueScene extends Phaser.Scene {
  constructor() {
    super('PrologueScene');
  }

  create() {
    const { width, height } = this.scale;
    soundManager.attach(this);
    soundManager.playBGM('bgm_menu');

    this.add.rectangle(width / 2, height / 2, width, height, 0x0b1120);
    drawPanel(this, 60, 48, width - 120, height - 96, 0x0f172a, 0.98, 0x38bdf8);

    // Valentic exacto en la izquierda
    this.add.image(186, 276, 'valentic').setScale(1);

    // Escena visual a la derecha según el paso del prólogo
    this.visualBox = drawPanel(this, 310, 84, 536, 178, 0x1e293b, 1, 0x475569);
    this.visualGroup = this.add.container(0, 0);

    this.stepIndicator = this.add.text(578, 108, 'Historia 1 de 3', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#93c5fd',
    }).setOrigin(0.5);

    this.storyText = this.add.text(318, 294, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#f8fafc',
      wordWrap: { width: 528 },
      lineSpacing: 8,
    });

    this.replayBtn = createButton(this, 420, 434, 170, 42, '▶ Repetir voz', {
      fill: 0x0f766e,
      hover: 0x0d9488,
      border: 0x99f6e4,
      onClick: () => soundManager.replayVoice(),
    });

    this.nextBtn = createButton(this, 710, 434, 240, 46, 'Siguiente ▸', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      border: 0x86efac,
      fontSize: '17px',
      onClick: () => this.advance(),
    });

    this.index = -1;
    this.advance();
  }

  renderSlideVisual(idx) {
    this.visualGroup.removeAll(true);
    if (idx === 0) {
      this.visualGroup.add(this.add.image(490, 184, 'portrait_elena').setScale(1));
      this.visualGroup.add(this.add.text(575, 184, '➔', { fontSize: '30px', color: '#fbbf24' }).setOrigin(0.5));
      this.visualGroup.add(this.add.image(660, 184, 'portrait_alex_tense').setScale(1));
    } else if (idx === 1) {
      this.visualGroup.add(this.add.image(505, 184, 'portrait_sombra_hostil').setScale(1));
      this.visualGroup.add(this.add.text(585, 184, '⚡', { fontSize: '30px', color: '#ef4444' }).setOrigin(0.5));
      this.visualGroup.add(this.add.image(665, 184, 'portrait_sombra_calma').setScale(1));
    } else if (idx === 2) {
      const lights = [
        { x: 430, c: 0xef4444, t: 'ROJO\nRespira' },
        { x: 580, c: 0xf59e0b, t: 'AMARILLO\nPiensa' },
        { x: 730, c: 0x22c55e, t: 'VERDE\nHabla bien' },
      ];
      lights.forEach((l) => {
        this.visualGroup.add(this.add.circle(l.x, 166, 26, l.c).setStrokeStyle(3, 0xffffff));
        this.visualGroup.add(this.add.text(l.x, 218, l.t, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#f8fafc',
          align: 'center',
        }).setOrigin(0.5));
      });
    } else {
      // Diapositiva 4: Controles claros paso a paso
      const cards = [
        { x: 400, title: 'CAMINAR', body: 'Flechas / WASD\no toca el piso' },
        { x: 578, title: 'HABLAR / PUERTAS', body: 'Tecla E, ESPACIO\no botón verde' },
        { x: 756, title: 'RESPIRAR (ROJO)', body: 'Mantén ESPACIO\no el botón azul' },
      ];
      cards.forEach((card) => {
        this.visualGroup.add(drawPanel(this, card.x - 78, 134, 156, 110, 0x0f172a, 1, 0x38bdf8));
        this.visualGroup.add(this.add.text(card.x, 156, card.title, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#fde047',
        }).setOrigin(0.5));
        this.visualGroup.add(this.add.text(card.x, 200, card.body, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
        }).setOrigin(0.5));
      });
    }
  }

  advance() {
    this.index += 1;
    const slides = gameState.story.prologue;
    if (this.index >= slides.length) {
      soundManager.stopVoice();
      this.scene.start('WorldScene');
      return;
    }
    const item = slides[this.index];
    this.stepIndicator.setText(`Historia ${this.index + 1} de ${slides.length}`);
    this.storyText.setText(item.text);
    this.renderSlideVisual(this.index);
    soundManager.playVoice(item.voiceKey);

    if (this.index === slides.length - 1) {
      this.nextBtn.setLabel('¡Empezar en mi Cuarto! ▸');
    }
  }
}
