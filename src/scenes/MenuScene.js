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

    // Fondo Pixel Art RPG nítido construido con tiles 48x48
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
    const alex = this.add.sprite(750, 390, 'rpg_alex').play('rpg_alex_walk_right');
    this.tweens.add({
      targets: alex,
      x: 850,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      onYoyo: () => alex.play('rpg_alex_walk_left'),
      onRepeat: () => alex.play('rpg_alex_walk_right'),
    });
    this.add.sprite(880, 390, 'rpg_sombra_hostil').play('rpg_sombra_hostil_idle_left');

    // Valentic oficial en Alta Definición con animación suave de flotación
    const vGlow = this.add.circle(158, 335, 75, 0x38bdf8, 0.22);
    const valentic = this.add.image(158, 335, 'valentic').setScale(0.36);
    this.tweens.add({
      targets: [valentic, vGlow],
      y: 320,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    drawPanel(this, 58, 436, 200, 42, 0x0f172a, 0.94, 0x38bdf8);
    this.add.text(158, 457, '¡Tu guía emocional!', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#bae6fd',
    }).setOrigin(0.5);

    // Título principal
    drawPanel(this, 230, 24, 500, 94, 0x0f172a, 0.94, 0x38bdf8);
    this.add.text(width / 2, 54, 'VALENTIC', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(width / 2, 90, 'y el Semáforo de las Emociones', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fbbf24',
    }).setOrigin(0.5);

    // Botones de acción principales
    createButton(this, width / 2, 160, 340, 52, '▶ Jugar Aventura\n(Historia + Tutorial paso a paso)', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      border: 0x86efac,
      fontSize: '15.5px',
      onClick: () => {
        gameState.startNewAdventure(false);
        this.scene.start('PrologueScene');
      },
    });

    createButton(this, width / 2, 226, 340, 44, '🎮 Zona de Minijuegos de ValenTIC', {
      fill: 0x7c3aed,
      hover: 0x8b5cf6,
      border: 0xc4b5fd,
      fontSize: '15.5px',
      onClick: () => this.openMinigamesSelector(),
    });

    createButton(this, width / 2, 282, 340, 44, '🎬 Ver Video de ValenTIC (Emociones)', {
      fill: 0x0284c7,
      hover: 0x0369a1,
      border: 0x7dd3fc,
      fontSize: '15px',
      onClick: () => this.openVideoPrompt(),
    });

    createButton(this, width / 2, 338, 340, 44, `📖 Mi Diario ${gameState.save.diaryUnlocked ? '(Desbloqueado ✓)' : '(1 página)'}`, {
      fill: 0x4f46e5,
      hover: 0x6366f1,
      border: 0xc7d2fe,
      fontSize: '15px',
      onClick: () => this.openDiaryModal(),
    });

    // Fila inferior de utilidades
    createButton(this, width / 2 - 95, 396, 175, 38, '▶ Ir a Día 1', {
      fill: 0x2563eb,
      hover: 0x3b82f6,
      border: 0x93c5fd,
      fontSize: '14px',
      onClick: () => {
        gameState.startNewAdventure(true);
        this.scene.start('WorldScene');
      },
    });

    createButton(this, width / 2 + 95, 396, 175, 38, '⚙ Opciones', {
      fill: 0x334155,
      hover: 0x475569,
      border: 0x94a3b8,
      fontSize: '14px',
      onClick: () => this.openSettingsModal(),
    });

    this.add.text(width / 2, 506, 'I.E. Ángela María Torres Suárez · RPG Educativo con ValenTIC', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1',
    }).setOrigin(0.5);
  }

  openMinigamesSelector() {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(60);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.85).setInteractive());
    modal.add(drawPanel(this, 120, 50, width - 240, height - 100, 0x0f172a, 0.98, 0xa855f7));

    modal.add(this.add.text(width / 2, 85, '🎮 ZONA DE MINIJUEGOS DE VALENTIC', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#f3e8ff',
    }).setOrigin(0.5));

    modal.add(this.add.text(width / 2, 116, 'Modo Libre y Relajante: ¡Juega todo lo que quieras sin límites ni perder!', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      color: '#c084fc',
    }).setOrigin(0.5));

    // Tarjeta 1: Flappy Nube
    modal.add(drawPanel(this, 150, 146, 200, 230, 0x1e293b, 1, 0x38bdf8));
    modal.add(this.add.text(250, 172, '☁️ Flappy Nube', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#38bdf8',
    }).setOrigin(0.5));
    modal.add(this.add.text(250, 224, 'Vuela flotando por los cielos y atrapa todas las estrellas de calma.', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: 180 },
    }).setOrigin(0.5));
    modal.add(createButton(this, 250, 336, 160, 40, '▶ Jugar Vuelo', {
      fill: 0x0284c7,
      hover: 0x0369a1,
      onClick: () => {
        modal.destroy();
        this.scene.start('MinigameScene', { mode: 'free', type: 'flappy' });
      },
    }));

    // Tarjeta 2: Palomitas (Popcorn Doodle)
    modal.add(drawPanel(this, 380, 146, 200, 230, 0x1e293b, 1, 0xf59e0b));
    modal.add(this.add.text(480, 172, '🍿 Palomitas Calma', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '16.5px',
      fontStyle: 'bold',
      color: '#fbbf24',
    }).setOrigin(0.5));
    modal.add(this.add.text(480, 224, '¡Toca las palomitas en el aire antes de que caigan! Estilo Google Doodle.', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: 180 },
    }).setOrigin(0.5));
    modal.add(createButton(this, 480, 336, 160, 40, '▶ Jugar Palomitas', {
      fill: 0xd97706,
      hover: 0xb45309,
      onClick: () => {
        modal.destroy();
        this.scene.start('MinigameScene', { mode: 'free', type: 'popcorn' });
      },
    }));

    // Tarjeta 3: Río de la Serenidad
    modal.add(drawPanel(this, 610, 146, 200, 230, 0x1e293b, 1, 0x22c55e));
    modal.add(this.add.text(710, 172, '🌊 Río de Serenidad', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '16.5px',
      fontStyle: 'bold',
      color: '#4ade80',
    }).setOrigin(0.5));
    modal.add(this.add.text(710, 224, 'Navega suavemente y recolecta los orbes de colores del semáforo.', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: 180 },
    }).setOrigin(0.5));
    modal.add(createButton(this, 710, 336, 160, 40, '▶ Jugar Río', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      onClick: () => {
        modal.destroy();
        this.scene.start('MinigameScene', { mode: 'free', type: 'river' });
      },
    }));

    // Botón Cerrar
    modal.add(createButton(this, width / 2, 436, 160, 38, 'Volver al Menú', {
      fill: 0x334155,
      hover: 0x475569,
      onClick: () => modal.destroy(),
    }));
  }

  openVideoPrompt() {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(60);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.85).setInteractive());
    modal.add(drawPanel(this, 180, 80, width - 360, height - 160, 0x0f172a, 0.98, 0x38bdf8));

    modal.add(this.add.image(width / 2, 160, 'valentic').setScale(0.24));

    modal.add(this.add.text(width / 2, 240, '🎬 Video Oficial de ValenTIC', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5));

    modal.add(this.add.text(width / 2, 280, 'ValenTIC te enseña cómo reconocer y calmar tus emociones.\nSe abrirá en una nueva pestaña para que lo veas con calma.', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14.5px',
      color: '#bae6fd',
      align: 'center',
      wordWrap: { width: 500 },
      lineSpacing: 4,
    }).setOrigin(0.5));

    modal.add(createButton(this, width / 2, 350, 280, 48, '▶ Abrir Video en Facebook Reel', {
      fill: 0x0284c7,
      hover: 0x0369a1,
      fontSize: '16px',
      onClick: () => {
        window.open('https://www.facebook.com/reel/3205881169617381', '_blank');
      },
    }));

    modal.add(createButton(this, width / 2, 412, 160, 36, 'Regresar', {
      fill: 0x334155,
      hover: 0x475569,
      fontSize: '14px',
      onClick: () => modal.destroy(),
    }));
  }

  openDiaryModal() {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(60);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.82).setInteractive());
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
    const modal = this.add.container(0, 0).setDepth(60);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.82).setInteractive());
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
