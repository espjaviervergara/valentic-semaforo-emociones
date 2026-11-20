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
    this.input.once('pointerdown', () => {
      soundManager.unlockAll();
      soundManager.playBGM('bgm_menu');
    });

    this.selectedDifficulty = 'challenge'; // 'challenge' o 'zen'

    // Fondo Pixel Art RPG nítido
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
    const bgLayer = map.createBlankLayer('floor', tiles, 0, 36);
    bgLayer.fill(0, 0, 0, 10, 11);
    bgLayer.fill(2, 10, 0, 10, 11);
    map.createLayer(0, tiles, 0, 36);

    this.add.rectangle(width / 2, height / 2, width, height, 0x090f1d, 0.48);

    // Personajes RPG animados
    const alex = this.add.sprite(760, 390, 'rpg_alex').play('rpg_alex_walk_right');
    this.tweens.add({
      targets: alex,
      x: 860,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      onYoyo: () => alex.play('rpg_alex_walk_left'),
      onRepeat: () => alex.play('rpg_alex_walk_right'),
    });
    this.add.sprite(880, 390, 'rpg_sombra_hostil').play('rpg_sombra_hostil_idle_left');

    // Valentic oficial en Alta Definición con halo y flotación
    const vGlow = this.add.circle(150, 330, 75, 0x38bdf8, 0.22);
    const valentic = this.add.image(150, 330, 'valentic').setScale(0.36);
    this.tweens.add({
      targets: [valentic, vGlow],
      y: 315,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    drawPanel(this, 50, 432, 200, 42, 0x0f172a, 0.94, 0x38bdf8);
    this.add.text(150, 453, '¡Tu guía emocional!', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#bae6fd',
    }).setOrigin(0.5);

    // Título principal
    drawPanel(this, 230, 20, 500, 90, 0x0f172a, 0.94, 0x38bdf8);
    this.add.text(width / 2, 48, 'VALENTIC', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(width / 2, 82, 'y el Semáforo de las Emociones', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#fbbf24',
    }).setOrigin(0.5);

    // Botones Principales
    createButton(this, width / 2, 150, 340, 48, '▶ Iniciar Aventura (Historia Completa)', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      border: 0x86efac,
      fontSize: '15px',
      onClick: () => {
        gameState.startNewAdventure(false, 1);
        this.scene.start('PrologueScene');
      },
    });

    createButton(this, width / 2, 206, 340, 44, '🎮 Zona de Minijuegos (5 Juegos)', {
      fill: 0x7c3aed,
      hover: 0x8b5cf6,
      border: 0xc4b5fd,
      fontSize: '15px',
      onClick: () => this.openMinigamesSelector(),
    });

    createButton(this, width / 2, 260, 340, 42, '📅 Seleccionar Día de la Semana (1 al 5)', {
      fill: 0x2563eb,
      hover: 0x3b82f6,
      border: 0x93c5fd,
      fontSize: '14.5px',
      onClick: () => this.openDaySelector(),
    });

    createButton(this, width / 2, 312, 340, 42, '📖 Mi Diario de Convivencia (5 Páginas)', {
      fill: 0x4f46e5,
      hover: 0x6366f1,
      border: 0xc7d2fe,
      fontSize: '14.5px',
      onClick: () => this.openDiaryModal(1),
    });

    createButton(this, width / 2, 364, 340, 42, '🎬 Ver Video de ValenTIC (Emociones)', {
      fill: 0x0284c7,
      hover: 0x0369a1,
      border: 0x7dd3fc,
      fontSize: '14.5px',
      onClick: () => {
        window.open('https://www.facebook.com/reel/3205881169617381', '_blank');
      },
    });

    createButton(this, width / 2, 416, 200, 36, '⚙ Opciones de Audio', {
      fill: 0x334155,
      hover: 0x475569,
      border: 0x94a3b8,
      fontSize: '13.5px',
      onClick: () => this.openSettingsModal(),
    });

    this.add.text(width / 2, 498, 'I.E. Ángela María Torres Suárez · RPG Educativo con ValenTIC', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1',
    }).setOrigin(0.5);
  }

  openDaySelector() {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(60);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.85).setInteractive());
    modal.add(drawPanel(this, 140, 50, width - 280, height - 100, 0x0f172a, 0.98, 0x38bdf8));

    modal.add(this.add.text(width / 2, 85, '📅 SELECCIONA EL DÍA DE LA SEMANA', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5));

    const days = [
      { day: 1, title: 'Día 1 (Lunes): La Mañana del Desafío', sub: 'Pausa Roja en el hogar y colegio.' },
      { day: 2, title: 'Día 2 (Martes): El Trabajo en Equipo', sub: 'La maqueta rota: reparar en vez de culpar.' },
      { day: 3, title: 'Día 3 (Miércoles): El Rumor en el Recreo', sub: 'Aclarar chismes con hechos y empatía.' },
      { day: 4, title: 'Día 4 (Jueves): La Ansiedad de Examen', sub: 'Técnica 4-7-8 contra la mente en blanco.' },
      { day: 5, title: 'Día 5 (Viernes): El Gran Festival Escolar', sub: 'Gran mediación y Graduación de Guardianes.' },
    ];

    days.forEach((d, i) => {
      const y = 140 + i * 54;
      const btn = createButton(this, width / 2, y, 480, 46, `${d.title}\n(${d.sub})`, {
        fill: i === 0 ? 0x16a34a : 0x1e293b,
        hover: 0x2563eb,
        border: 0x60a5fa,
        fontSize: '13px',
        onClick: () => {
          modal.destroy();
          gameState.startNewAdventure(true, d.day);
          this.scene.start('WorldScene');
        },
      });
      modal.add(btn);
    });

    modal.add(createButton(this, width / 2, 440, 160, 36, 'Volver', {
      fill: 0x334155,
      hover: 0x475569,
      onClick: () => modal.destroy(),
    }));
  }

  openMinigamesSelector() {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(60);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.88).setInteractive());
    modal.add(drawPanel(this, 40, 30, width - 80, height - 60, 0x0f172a, 0.98, 0xa855f7));

    modal.add(this.add.text(width / 2, 58, '🎮 CATÁLOGO DE LOS 5 MINIJUEGOS DE VALENTIC', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#f3e8ff',
    }).setOrigin(0.5));

    // Selector de Dificultad (⚡ Desafío con 3 vidas vs 🧘 Zen libre)
    const diffLabel = () => `Dificultad: ${this.selectedDifficulty === 'challenge' ? '⚡ Desafío (3 Vidas)' : '🧘 Modo Zen (Vidas Infinitas)'}`;
    const diffBtn = createButton(this, width / 2, 90, 340, 30, diffLabel(), {
      fill: this.selectedDifficulty === 'challenge' ? 0xdc2626 : 0x16a34a,
      hover: 0x2563eb,
      fontSize: '13px',
      onClick: () => {
        this.selectedDifficulty = this.selectedDifficulty === 'challenge' ? 'zen' : 'challenge';
        diffBtn.setLabel(diffLabel());
      },
    });
    modal.add(diffBtn);

    const minigames = [
      { key: 'flappy', name: '☁️ Flappy Nube', desc: 'Vuelo y esquivar tormentas.' },
      { key: 'popcorn', name: '🍿 Palomitas Calma', desc: 'Atrapa palomitas, evita bombas.' },
      { key: 'river', name: '🌊 Río Serenidad', desc: 'Navega esquivando remolinos.' },
      { key: 'mario', name: '🍄 Mario Saltador', desc: 'Plataformas, bloques [?] y enemigos.' },
      { key: 'subway', name: '🏃 Subway Runner', desc: '3 Carriles, saltos de vallas y trenes.' },
    ];

    minigames.forEach((mg, i) => {
      const colX = 130 + i * 145;
      modal.add(drawPanel(this, colX - 68, 125, 136, 260, 0x1e293b, 1, 0x60a5fa));
      modal.add(this.add.text(colX, 150, mg.name, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fde047',
        align: 'center',
        wordWrap: { width: 125 },
      }).setOrigin(0.5));

      modal.add(this.add.text(colX, 220, mg.desc, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '12px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: 120 },
      }).setOrigin(0.5));

      modal.add(createButton(this, colX, 335, 116, 40, '▶ Jugar', {
        fill: 0x7c3aed,
        hover: 0x8b5cf6,
        fontSize: '14px',
        onClick: () => {
          modal.destroy();
          this.scene.start('MinigameScene', {
            mode: 'free',
            type: mg.key,
            difficulty: this.selectedDifficulty,
          });
        },
      }));
    });

    modal.add(createButton(this, width / 2, 442, 170, 36, 'Volver al Menú', {
      fill: 0x334155,
      hover: 0x475569,
      onClick: () => modal.destroy(),
    }));
  }

  openDiaryModal(pageIndex = 1) {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(60);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.85).setInteractive());
    modal.add(drawPanel(this, 120, 60, width - 240, height - 120, 0xfefce8, 0.99, 0xb45309));

    const pages = gameState.story.diary_pages || [gameState.story.diary];
    const curPage = pages[Math.min(pages.length - 1, Math.max(0, pageIndex - 1))];

    modal.add(this.add.text(width / 2, 100, `📖 DIARIO DE CONVIVENCIA · PÁGINA ${pageIndex} DE ${pages.length}`, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#78350f',
    }).setOrigin(0.5));

    modal.add(this.add.text(width / 2, 138, curPage.title, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#92400e',
    }).setOrigin(0.5));

    modal.add(this.add.text(width / 2, 220, curPage.summary, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '16px',
      color: '#1e293b',
      align: 'center',
      wordWrap: { width: 620 },
      lineSpacing: 6,
    }).setOrigin(0.5));

    modal.add(this.add.text(width / 2, 316, `💡 ${curPage.tip}`, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#166534',
      align: 'center',
      wordWrap: { width: 620 },
    }).setOrigin(0.5));

    modal.add(createButton(this, width / 2, 362, 190, 32, '🔊 Escuchar Página', {
      fill: 0x0f766e,
      hover: 0x0d9488,
      border: 0x99f6e4,
      fontSize: '13px',
      onClick: () => soundManager.playVoice(`diary_p${pageIndex}`),
    }));

    // Botones de Anterior y Siguiente Página
    if (pageIndex > 1) {
      modal.add(createButton(this, 200, 410, 140, 38, '◀ Página Anterior', {
        fill: 0x92400e,
        hover: 0xb45309,
        fontSize: '13px',
        onClick: () => {
          modal.destroy();
          this.openDiaryModal(pageIndex - 1);
        },
      }));
    }

    if (pageIndex < pages.length) {
      modal.add(createButton(this, width - 200, 410, 140, 38, 'Página Siguiente ▸', {
        fill: 0x166534,
        hover: 0x15803d,
        fontSize: '13px',
        onClick: () => {
          modal.destroy();
          this.openDiaryModal(pageIndex + 1);
        },
      }));
    }

    modal.add(createButton(this, width / 2, 410, 150, 38, 'Cerrar Diario', {
      fill: 0x334155,
      hover: 0x475569,
      onClick: () => modal.destroy(),
    }));
  }

  openSettingsModal() {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(60);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.82).setInteractive());
    modal.add(drawPanel(this, 210, 80, 540, 385, 0x0f172a, 0.98, 0x60a5fa));

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

    const tipText = this.add.text(width / 2, 395, '💡 En iPhone, desactiva el modo silencio (interruptor lateral) para volumen máximo', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '11px',
      color: '#93c5fd',
    }).setOrigin(0.5);

    const close = createButton(this, width / 2, 430, 160, 34, 'Listo', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      onClick: () => modal.destroy(),
    });
    modal.add([b1, b2, b3, b4, tipText, close]);
  }
}
