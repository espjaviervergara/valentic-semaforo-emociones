import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { PrologueScene } from './scenes/PrologueScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 540,
  backgroundColor: '#0b1120',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    MenuScene,
    PrologueScene,
    WorldScene,
    VictoryScene,
  ],
};

window.valenticRpgGame = new Phaser.Game(config);
