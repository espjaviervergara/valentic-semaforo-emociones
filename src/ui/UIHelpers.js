import { soundManager } from '../systems/SoundManager.js';

export function drawPanel(scene, x, y, w, h, fill = 0x0f172a, alpha = 0.95, border = 0x64748b) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(2.5, border, 1);
  g.strokeRoundedRect(x, y, w, h, 10);
  return g;
}

export function createButton(scene, x, y, w, h, label, opts = {}) {
  const {
    fill = 0x2563eb,
    hover = 0x3b82f6,
    border = 0x93c5fd,
    textColor = '#ffffff',
    fontSize = '16px',
    onClick = () => {},
  } = opts;

  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();

  const paint = (c, s) => {
    bg.clear();
    bg.fillStyle(c, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    bg.lineStyle(2, s, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
  };
  paint(fill, border);

  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Trebuchet MS, sans-serif',
    fontSize,
    fontStyle: 'bold',
    color: textColor,
    align: 'center',
    wordWrap: { width: w - 18 },
  }).setOrigin(0.5);

  const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  hit.on('pointerover', () => {
    paint(hover, 0xffffff);
    container.setScale(1.02);
  });
  hit.on('pointerout', () => {
    paint(fill, border);
    container.setScale(1);
  });
  hit.on('pointerdown', () => {
    soundManager.playClick();
    onClick();
  });

  container.add([bg, text, hit]);
  container.setLabel = (t) => text.setText(t);
  return container;
}

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
