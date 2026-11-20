import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { PrologueScene } from './scenes/PrologueScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';
import { MinigameScene } from './scenes/MinigameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 540,
  backgroundColor: '#0b1120',
  pixelArt: false,
  roundPixels: true,
  antialias: true,
  input: {
    activePointers: 4,
  },
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
    MinigameScene,
  ],
};

window.valenticRpgGame = new Phaser.Game(config);
