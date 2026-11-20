import { gameState } from '../systems/GameState.js';
import { soundManager } from '../systems/SoundManager.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0b1120);
    this.add.text(width / 2, height / 2 - 38, 'ValenTIC y el Semáforo de las Emociones', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '23px',
      fontStyle: 'bold',
      color: '#f8fafc',
    }).setOrigin(0.5);

    const track = this.add.rectangle(width / 2, height / 2 + 8, 340, 16, 0x1e293b).setStrokeStyle(2, 0x475569);
    const bar = this.add.rectangle(width / 2 - 166, height / 2 + 8, 4, 10, 0x38bdf8).setOrigin(0, 0.5);
    const label = this.add.text(width / 2, height / 2 + 36, 'Cargando mundo RPG...', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      color: '#94a3b8',
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      bar.width = Math.max(4, 332 * v);
      label.setText(`Cargando mundo RPG... ${Math.round(v * 100)}%`);
    });

    this.load.json('rpg_story', './src/data/rpg_story.json');

    // Tileset crisp 48x48 (3x de 16x16)
    this.load.image('rpg_tileset', './assets/tilesets/rpg_tileset.png');

    // Mascota oficial de Valentic en Alta Definición
    this.load.image('valentic', './assets/sprites/valentic_hd.png');
    this.load.image('valentic_hd', './assets/sprites/valentic_hd.png');

    // Spritesheets RPG 4 direcciones x 3 frames (48x72 cada frame)
    [
      'rpg_alex',
      'rpg_elena',
      'rpg_mateo',
      'rpg_sofia',
      'rpg_ricardo',
      'rpg_sombra_hostil',
      'rpg_sombra_calma',
    ].forEach((key) => {
      this.load.spritesheet(key, `./assets/sprites/${key}.png`, {
        frameWidth: 48,
        frameHeight: 72,
      });
    });

    // Retratos Pixel Art nítidos (96x96)
    [
      'portrait_alex_tense',
      'portrait_alex_calm',
      'portrait_elena',
      'portrait_mateo',
      'portrait_sofia',
      'portrait_ricardo',
      'portrait_sombra_hostil',
      'portrait_sombra_calma',
    ].forEach((pk) => {
      this.load.image(pk, `./assets/sprites/${pk}.png`);
    });

    // Música ambiental (MP3 primero para máxima compatibilidad móvil, fallback M4A y WAV)
    ['bgm_menu', 'bgm_hogar', 'bgm_colegio', 'bgm_tenso'].forEach((bk) => {
      this.load.audio(bk, [
        `./assets/audio/bgm/${bk}.mp3`,
        `./assets/audio/bgm/${bk}.m4a`,
        `./assets/audio/bgm/${bk}.wav`,
      ]);
    });
  }

  create() {
    gameState.story = this.cache.json.get('rpg_story');
    soundManager.attach(this);

    // Activar filtrado lineal para que Valentic HD se vea ultrasuave y sin píxeles cortados
    if (this.textures.exists('valentic')) {
      this.textures.get('valentic').setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    if (this.textures.exists('valentic_hd')) {
      this.textures.get('valentic_hd').setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    // Registrar animaciones de caminar en 4 direcciones
    const chars = [
      'rpg_alex',
      'rpg_elena',
      'rpg_mateo',
      'rpg_sofia',
      'rpg_ricardo',
      'rpg_sombra_hostil',
      'rpg_sombra_calma',
    ];
    const dirs = ['down', 'left', 'right', 'up'];
    chars.forEach((key) => {
      dirs.forEach((dir, row) => {
        const start = row * 3;
        this.anims.create({
          key: `${key}_walk_${dir}`,
          frames: [
            { key, frame: start + 1 },
            { key, frame: start },
            { key, frame: start + 2 },
            { key, frame: start },
          ],
          frameRate: 8,
          repeat: -1,
        });
        this.anims.create({
          key: `${key}_idle_${dir}`,
          frames: [{ key, frame: start }],
          frameRate: 1,
        });
      });
    });

    this.scene.start('MenuScene');
  }
}
