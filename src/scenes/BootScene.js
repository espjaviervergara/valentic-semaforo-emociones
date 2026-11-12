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

    // Mascota oficial de Valentic intacta
    this.load.image('valentic', './assets/sprites/valentic_semaforo.png');

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

    // Música ambiental
    ['bgm_menu', 'bgm_hogar', 'bgm_colegio', 'bgm_tenso'].forEach((bk) => {
      this.load.audio(bk, `./assets/audio/bgm/${bk}.m4a`);
    });

    // Voces RPG
    [
      'pro_1', 'pro_2', 'pro_3', 'pro_4',
      'tut_welcome', 'tut_backpack', 'tut_mirror_prompt', 'tut_mirror_done', 'tut_door_hint',
      'npc_sofia', 'npc_sofia_patio', 'npc_ricardo', 'diary_p1',
      'valentic_green_guide', 'valentic_victory',
      'hogar_elena_prov', 'hogar_elena_red_tip', 'hogar_elena_dec_prompt',
      'hogar_elena_shadow', 'hogar_elena_cnv_clean', 'hogar_elena_good', 'hogar_elena_bad',
      'colegio_mateo_prov', 'colegio_mateo_red_tip', 'colegio_mateo_dec_prompt',
      'colegio_mateo_shadow', 'colegio_mateo_cnv_clean', 'colegio_mateo_good', 'colegio_mateo_bad',
      'colegio_aula_prov', 'colegio_aula_red_tip', 'colegio_aula_dec_prompt',
      'colegio_aula_shadow', 'colegio_aula_cnv_clean', 'colegio_aula_good', 'colegio_aula_bad',
      'colegio_patio_prov', 'colegio_patio_red_tip', 'colegio_patio_dec_prompt',
      'colegio_patio_shadow', 'colegio_patio_cnv_clean', 'colegio_patio_good', 'colegio_patio_bad',
    ].forEach((vk) => {
      this.load.audio(vk, `./assets/audio/voices/${vk}.mp3`);
    });
  }

  create() {
    gameState.story = this.cache.json.get('rpg_story');
    soundManager.attach(this);

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
