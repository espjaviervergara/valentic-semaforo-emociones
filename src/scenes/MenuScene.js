import { gameState } from '../systems/GameState.js';
import { soundManager } from '../systems/SoundManager.js';
import { createButton, drawPanel } from '../ui/UIHelpers.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;
    soundManager.attach(this);
    soundManager.stopVoice();
    soundManager.playBGM('bgm_menu');
    this.input.once('pointerdown', () => soundManager.playBGM('bgm_menu'));

    // Fondo Pixel Art RPG nítido construido con los mismos tiles 48x48
    const map = this.make.tilemap({
      data: [
        [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        [4, 5, 8, 5, 5, 12, 5, 5, 8, 5, 6, 6, 7, 7, 7, 19, 8, 19, 13, 4],
        [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4],
        [4, 0, 17, 17, 0, 0, 0, 0, 0, 0, 2, 2, 16, 2, 16, 2, 16, 2, 2, 4],
        [4, 0, 17, 17, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4],
        [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4],
        [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 16, 2, 16, 2, 16, 2, 2, 4],
        [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4],
        [4, 18, 0, 0, 0, 0, 0, 0, 18, 0, 2, 2, 2, 2, 2, 2, 2, 2, 18, 4],
        [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4],
        [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      ],
      tileWidth: 48,
      tileHeight: 48,
    });
    const tiles = map.addTilesetImage('rpg_tileset', 'rpg_tileset', 48, 48);
    const bgLayer = map.createBlankLayer('floor', tiles, 0, 12);
    bgLayer.fill(0, 0, 0, 10, 11);
    bgLayer.fill(2, 10, 0, 10, 11);
    map.createLayer(0, tiles, 0, 12);

    this.add.rectangle(width / 2, height / 2, width, height, 0x090f1d, 0.48);

    // Personajes RPG animados en el escenario de bienvenida
    const alex = this.add.sprite(740, 390, 'rpg_alex').play('rpg_alex_walk_right');
    this.tweens.add({
      targets: alex,
      x: 840,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      onYoyo: () => alex.play('rpg_alex_walk_left'),
      onRepeat: () => alex.play('rpg_alex_walk_right'),
    });
    this.add.sprite(876, 390, 'rpg_sombra_hostil').play('rpg_sombra_hostil_idle_left');

    // Valentic oficial de campaña a escala nativa 1x (cero deformación)
    this.add.image(158, 344, 'valentic').setScale(1);
    drawPanel(this, 68, 444, 180, 44, 0x0f172a, 0.92, 0x38bdf8);
    this.add.text(158, 466, '¡Tu guía emocional!', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#bae6fd',
    }).setOrigin(0.5);

    // Título limpio y aireado
    drawPanel(this, 240, 34, 480, 102, 0x0f172a, 0.94, 0x38bdf8);
    this.add.text(width / 2, 68, 'VALENTIC', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(width / 2, 108, 'y el Semáforo de las Emociones', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#fbbf24',
    }).setOrigin(0.5);

    // 3 botones principales claros + 1 botón de opciones
    createButton(this, width / 2, 204, 330, 56, '▶ Jugar Aventura\n(Historia + Tutorial paso a paso)', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      border: 0x86efac,
      fontSize: '16px',
      onClick: () => {
        gameState.startNewAdventure(false);
        this.scene.start('PrologueScene');
      },
    });

    createButton(this, width / 2, 278, 330, 48, '▶ Ir directo al Día 1 (Casa y Colegio)', {
      fill: 0x2563eb,
      hover: 0x3b82f6,
      border: 0x93c5fd,
      fontSize: '15.5px',
      onClick: () => {
        gameState.startNewAdventure(true);
        this.scene.start('WorldScene');
      },
    });

    createButton(this, width / 2, 342, 330, 46, `📖 Mi Diario ${gameState.save.diaryUnlocked ? '(Desbloqueado ✓)' : '(1 página)'}`, {
      fill: 0x4f46e5,
      hover: 0x6366f1,
      border: 0xc7d2fe,
      fontSize: '15.5px',
      onClick: () => this.openDiaryModal(),
    });

    createButton(this, width / 2, 404, 210, 40, '⚙ Opciones y Audio', {
      fill: 0x334155,
      hover: 0x475569,
      border: 0x94a3b8,
      fontSize: '14px',
      onClick: () => this.openSettingsModal(),
    });

    this.add.text(width / 2, 502, 'I.E. Ángela María Torres Suárez · RPG Educativo Pixel Art', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1',
    }).setOrigin(0.5);
  }

  openDiaryModal() {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(50);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.78).setInteractive());
    modal.add(drawPanel(this, 140, 88, width - 280, height - 176, 0xfefce8, 0.99, 0xb45309));

    modal.add(this.add.text(width / 2, 128, gameState.story.diary.title, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#78350f',
    }).setOrigin(0.5));

    if (gameState.save.diaryUnlocked) {
      soundManager.playVoice('diary_p1');
      modal.add(this.add.text(width / 2, 224, gameState.story.diary.summary, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#1e293b',
        align: 'center',
        wordWrap: { width: 600 },
        lineSpacing: 6,
      }).setOrigin(0.5));
      modal.add(this.add.text(width / 2, 326, `💡 ${gameState.story.diary.tip}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#166534',
        align: 'center',
        wordWrap: { width: 600 },
      }).setOrigin(0.5));
    } else {
      modal.add(this.add.text(width / 2, 256, '🔒 Completa la aventura del Día 1 para desbloquear tu primera página del Diario.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#475569',
        align: 'center',
        wordWrap: { width: 560 },
      }).setOrigin(0.5));
    }

    modal.add(createButton(this, width / 2, 408, 170, 40, 'Cerrar', {
      fill: 0x334155,
      hover: 0x475569,
      onClick: () => {
        soundManager.stopVoice();
        modal.destroy();
      },
    }));
  }

  openSettingsModal() {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(50);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.78).setInteractive());
    modal.add(drawPanel(this, 220, 96, 520, 348, 0x0f172a, 0.98, 0x60a5fa));

    modal.add(this.add.text(width / 2, 134, 'Opciones del Juego', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5));

    const vLabel = () => `Voces habladas: ${gameState.save.settings.voiceEnabled ? 'Activadas' : 'Apagadas'}`;
    const mLabel = () => `Audio general: ${gameState.save.settings.muted ? 'Silencio' : 'Activo'}`;
    const tLabel = () => `Reloj de La Sombra: ${gameState.save.settings.noTimerMode ? 'Sin límite (tranquilo)' : '30 segundos'}`;
    const dLabel = () => `Controles táctiles en pantalla: ${gameState.save.settings.showDpad ? 'Sí' : 'No'}`;

    const b1 = createButton(this, width / 2, 190, 410, 42, vLabel(), {
      fill: 0x0f766e,
      hover: 0x0d9488,
      onClick: () => {
        gameState.toggleVoice();
        soundManager.syncVolumes();
        b1.setLabel(vLabel());
      },
    });
    const b2 = createButton(this, width / 2, 242, 410, 42, mLabel(), {
      fill: 0x1d4ed8,
      hover: 0x2563eb,
      onClick: () => {
        gameState.toggleMuted();
        soundManager.syncVolumes();
        b2.setLabel(mLabel());
      },
    });
    const b3 = createButton(this, width / 2, 294, 410, 42, tLabel(), {
      fill: 0x7c3aed,
      hover: 0x8b5cf6,
      onClick: () => {
        gameState.toggleNoTimer();
        b3.setLabel(tLabel());
      },
    });
    const b4 = createButton(this, width / 2, 346, 410, 42, dLabel(), {
      fill: 0x334155,
      hover: 0x475569,
      onClick: () => {
        gameState.toggleDpad();
        b4.setLabel(dLabel());
      },
    });
    const close = createButton(this, width / 2, 404, 160, 38, 'Listo', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      onClick: () => modal.destroy(),
    });
    modal.add([b1, b2, b3, b4, close]);
  }
}
