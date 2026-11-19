import { gameState } from '../systems/GameState.js';
import { soundManager } from '../systems/SoundManager.js';
import { createButton, drawPanel } from '../ui/UIHelpers.js';

export class MinigameScene extends Phaser.Scene {
  constructor() {
    super('MinigameScene');
  }

  init(data) {
    this.mode = data.mode || 'story'; // 'story' o 'free'
    this.minigameType = data.type || 'flappy'; // 'flappy', 'popcorn', 'river'
    this.onComplete = data.onComplete || null;
    this.energy = this.mode === 'story' ? 20 : 0;
    this.targetEnergy = 100;
    this.score = 0;
    this.isGameOver = false;
    this.invulnerableTimer = 0;
  }

  create() {
    const { width, height } = this.scale;
    soundManager.attach(this);
    soundManager.playBGM('bgm_hogar');

    // Contenedor principal de capas
    this.bgLayer = this.add.container(0, 0);
    this.gameLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0).setDepth(20);

    // Configurar minijuego según el tipo
    if (this.minigameType === 'flappy') {
      this.setupFlappy();
    } else if (this.minigameType === 'popcorn') {
      this.setupPopcorn();
    } else {
      this.setupRiver();
    }

    this.setupUI();
  }

  setupUI() {
    const { width, height } = this.scale;

    // Panel superior de información
    drawPanel(this, 16, 12, width - 32, 54, 0x0f172a, 0.92, 0x38bdf8);

    // Botón Volver (en modo libre siempre visible; en modo historia como auxilio)
    createButton(this, 74, 38, 96, 34, '↩ Menú', {
      fill: 0x334155,
      hover: 0x475569,
      fontSize: '13px',
      onClick: () => {
        if (this.mode === 'story') {
          this.scene.start('WorldScene');
        } else {
          this.scene.start('MenuScene');
        }
      },
    });

    // Título del Minijuego
    let title = 'ValenTIC: Vuelo de la Calma';
    if (this.minigameType === 'popcorn') title = 'ValenTIC: Palomitas de la Calma';
    if (this.minigameType === 'river') title = 'ValenTIC: Río de la Serenidad';

    this.titleText = this.add.text(width / 2, 28, title, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f8fafc',
    }).setOrigin(0.5);

    this.subText = this.add.text(width / 2, 48, this.getInstructionText(), {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      color: '#93c5fd',
    }).setOrigin(0.5);

    // Barra de energía (Modo Historia) o Contador de Estrellas (Modo Libre)
    if (this.mode === 'story') {
      this.add.text(width - 230, 26, '⚡ Batería de Calma', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fbbf24',
      });
      this.energyTrack = this.add.rectangle(width - 130, 44, 180, 14, 0x1e293b).setStrokeStyle(1.5, 0x64748b);
      this.energyBar = this.add.rectangle(width - 220, 44, 1, 10, 0x22c55e).setOrigin(0, 0.5);
      this.updateEnergyBar();
    } else {
      this.scoreText = this.add.text(width - 130, 36, `⭐ Estrellas: ${this.score}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fbbf24',
      }).setOrigin(0.5);
    }
  }

  getInstructionText() {
    if (this.minigameType === 'flappy') {
      return 'Toca la pantalla o ESPACIO para flotar · ¡Recoge estrellas!';
    } else if (this.minigameType === 'popcorn') {
      return '¡Toca las palomitas en el aire antes de que caigan!';
    } else {
      return 'Mueve arriba o abajo · ¡Recoge los orbes del semáforo!';
    }
  }

  updateEnergyBar() {
    if (!this.energyBar) return;
    const pct = Phaser.Math.Clamp(this.energy / this.targetEnergy, 0, 1);
    this.energyBar.width = Math.max(2, 176 * pct);
    if (pct < 0.4) {
      this.energyBar.fillColor = 0xef4444;
    } else if (pct < 0.75) {
      this.energyBar.fillColor = 0xf59e0b;
    } else {
      this.energyBar.fillColor = 0x22c55e;
    }
  }

  addEnergy(amt) {
    if (this.isGameOver) return;
    if (this.mode === 'story') {
      this.energy = Math.min(this.targetEnergy, this.energy + amt);
      this.updateEnergyBar();
      if (this.energy >= this.targetEnergy) {
        this.winStoryMinigame();
      }
    } else {
      this.score += 1;
      if (this.scoreText) {
        this.scoreText.setText(`⭐ Estrellas: ${this.score}`);
      }
    }
  }

  winStoryMinigame() {
    this.isGameOver = true;
    soundManager.playVictory();
    const { width, height } = this.scale;

    const modal = this.add.container(0, 0).setDepth(30);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.75).setInteractive());
    modal.add(drawPanel(this, width / 2 - 240, height / 2 - 130, 480, 260, 0x0f172a, 0.98, 0x22c55e));

    modal.add(this.add.image(width / 2, height / 2 - 40, 'valentic').setScale(0.25));

    modal.add(this.add.text(width / 2, height / 2 + 25, '¡ENERGÍA DE CALMA AL 100%! 🌟', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#4ade80',
    }).setOrigin(0.5));

    modal.add(this.add.text(width / 2, height / 2 + 55, 'ValenTIC y Alex están listos para seguir adelante.', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '15px',
      color: '#e2e8f0',
    }).setOrigin(0.5));

    modal.add(createButton(this, width / 2, height / 2 + 95, 220, 42, '¡Continuar Aventura! ▸', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      onClick: () => {
        if (this.onComplete) {
          this.onComplete();
        } else {
          this.scene.start('WorldScene');
        }
      },
    }));
  }

  // ==========================================
  // MINIJUEGO 1: FLAPPY NUBE (VUELO DE CALMA)
  // ==========================================
  setupFlappy() {
    const { width, height } = this.scale;

    // Fondo Cielo degradado
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x38bdf8, 0x38bdf8, 0x0284c7, 0x0369a1, 1);
    sky.fillRect(0, 0, width, height);
    this.bgLayer.add(sky);

    // Nubes de fondo decorativas
    this.bgClouds = [];
    for (let i = 0; i < 5; i += 1) {
      const c = this.add.ellipse(Phaser.Math.Between(40, width), Phaser.Math.Between(80, height - 100), Phaser.Math.Between(100, 180), Phaser.Math.Between(35, 60), 0xffffff, 0.4);
      this.bgClouds.push({ obj: c, speed: Phaser.Math.FloatBetween(0.4, 0.9) });
      this.bgLayer.add(c);
    }

    // Suelo de pasto verde relajante
    const grass = this.add.rectangle(width / 2, height - 20, width, 40, 0x15803d);
    this.bgLayer.add(grass);

    // Mascota Valentic
    this.valentic = this.add.image(140, height / 2, 'valentic').setScale(0.16);
    this.valentic.vy = 0;
    this.gameLayer.add(this.valentic);

    // Halo brillante
    this.halo = this.add.circle(140, height / 2, 38, 0xfef08a, 0.35);
    this.gameLayer.add(this.halo);

    // Listas de obstáculos y coleccionables
    this.stormClouds = [];
    this.stars = [];

    // Controles: Tocar pantalla o pulsar espacio
    const flap = () => {
      if (this.isGameOver) return;
      this.valentic.vy = -5.4;
      soundManager.playJump();
      this.createPuff(this.valentic.x, this.valentic.y + 20);
    };

    this.input.on('pointerdown', (pointer) => {
      if (pointer.y > 68) flap();
    });

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

    // Temporizadores de generación
    this.time.addEvent({
      delay: 1500,
      callback: () => this.spawnStar(),
      loop: true,
    });

    if (this.mode === 'story') {
      this.time.addEvent({
        delay: 2400,
        callback: () => this.spawnStormCloud(),
        loop: true,
      });
    }
  }

  createPuff(x, y) {
    const puff = this.add.circle(x, y, 8, 0xffffff, 0.7);
    this.tweens.add({
      targets: puff,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      y: y + 15,
      duration: 350,
      onComplete: () => puff.destroy(),
    });
  }

  spawnStar() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(90, height - 80);
    const star = this.add.text(width + 20, y, '⭐', { fontSize: '26px' }).setOrigin(0.5);
    this.stars.push(star);
    this.gameLayer.add(star);
  }

  spawnStormCloud() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(110, height - 90);
    const container = this.add.container(width + 50, y);
    const cloud = this.add.ellipse(0, 0, 90, 48, 0x334155, 0.9);
    const lightning = this.add.text(0, 0, '⚡', { fontSize: '20px', color: '#fbbf24' }).setOrigin(0.5);
    container.add([cloud, lightning]);
    this.stormClouds.push(container);
    this.gameLayer.add(container);
  }

  updateFlappy(delta) {
    const { width, height } = this.scale;

    // Teclado
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.valentic.vy = -5.4;
      soundManager.playJump();
      this.createPuff(this.valentic.x, this.valentic.y + 20);
    }

    // Física de Valentic
    this.valentic.vy += 0.22;
    this.valentic.y += this.valentic.vy;
    this.valentic.y = Phaser.Math.Clamp(this.valentic.y, 80, height - 45);
    if (this.valentic.y >= height - 45) this.valentic.vy = 0;

    // Suave inclinación de vuelo
    this.valentic.rotation = Phaser.Math.Clamp(this.valentic.vy * 0.05, -0.3, 0.4);
    this.halo.x = this.valentic.x;
    this.halo.y = this.valentic.y;

    // Scroll nubes de fondo
    this.bgClouds.forEach((c) => {
      c.obj.x -= c.speed;
      if (c.obj.x < -100) c.obj.x = width + 100;
    });

    // Mover Estrellas
    for (let i = this.stars.length - 1; i >= 0; i -= 1) {
      const s = this.stars[i];
      s.x -= 3.2;
      // Colisión con Valentic
      const dist = Phaser.Math.Distance.Between(this.valentic.x, this.valentic.y, s.x, s.y);
      if (dist < 46) {
        soundManager.playPickup();
        this.addEnergy(10);
        this.createStarBurst(s.x, s.y);
        s.destroy();
        this.stars.splice(i, 1);
      } else if (s.x < -30) {
        s.destroy();
        this.stars.splice(i, 1);
      }
    }

    // Mover Nubes de Tormenta
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      this.valentic.alpha = (Math.floor(this.time.now / 100) % 2 === 0) ? 0.4 : 1;
    } else {
      this.valentic.alpha = 1;
    }

    for (let i = this.stormClouds.length - 1; i >= 0; i -= 1) {
      const cloud = this.stormClouds[i];
      cloud.x -= 2.6;
      const dist = Phaser.Math.Distance.Between(this.valentic.x, this.valentic.y, cloud.x, cloud.y);
      if (dist < 50 && this.invulnerableTimer <= 0) {
        soundManager.playError();
        this.cameras.main.shake(200, 0.005);
        this.invulnerableTimer = 1400;
        this.energy = Math.max(10, this.energy - 6);
        this.updateEnergyBar();
      }
      if (cloud.x < -80) {
        cloud.destroy();
        this.stormClouds.splice(i, 1);
      }
    }
  }

  createStarBurst(x, y) {
    for (let i = 0; i < 6; i += 1) {
      const spark = this.add.circle(x, y, 4, 0xfef08a);
      const angle = (Math.PI * 2 * i) / 6;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 32,
        y: y + Math.sin(angle) * 32,
        alpha: 0,
        scale: 0.2,
        duration: 300,
        onComplete: () => spark.destroy(),
      });
    }
  }

  // ==========================================
  // MINIJUEGO 2: PALOMITAS DE LA CALMA (POPCORN DOODLE)
  // ==========================================
  setupPopcorn() {
    const { width, height } = this.scale;

    // Fondo cálido y acogedor (sala de cine / cocina alegre)
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x312e81, 0x4338ca, 1);
    bg.fillRect(0, 0, width, height);
    this.bgLayer.add(bg);

    // Valentic con un recipiente de calma en la parte inferior
    this.valentic = this.add.image(width / 2, height - 70, 'valentic').setScale(0.24);
    this.gameLayer.add(this.valentic);

    this.bowl = this.add.ellipse(width / 2, height - 25, 170, 40, 0xf59e0b, 0.85).setStrokeStyle(3, 0xfde047);
    this.gameLayer.add(this.bowl);
    this.bowlText = this.add.text(width / 2, height - 25, 'CALMA', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.gameLayer.add(this.bowlText);

    this.popcorns = [];

    // Generar palomitas saltarinas
    this.time.addEvent({
      delay: 750,
      callback: () => this.spawnPopcorn(),
      loop: true,
    });
  }

  spawnPopcorn() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const startX = Phaser.Math.Between(80, width - 80);
    const popcorn = this.add.container(startX, height + 20);

    // Gráfico de palomita esponjosa
    const p1 = this.add.circle(0, 0, 16, 0xfef08a);
    const p2 = this.add.circle(-8, -6, 12, 0xffedd5);
    const p3 = this.add.circle(8, -6, 12, 0xffedd5);
    const emoji = this.add.text(0, -2, '🍿', { fontSize: '18px' }).setOrigin(0.5);

    popcorn.add([p1, p2, p3, emoji]);
    popcorn.vx = Phaser.Math.FloatBetween(-1.5, 1.5);
    popcorn.vy = Phaser.Math.FloatBetween(-11.5, -8.5); // Salto hacia arriba
    popcorn.popped = false;

    // Hacer interactiva para tocar
    const hitArea = this.add.circle(0, 0, 36, 0x000000, 0).setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.popKernel(popcorn));
    popcorn.add(hitArea);

    this.popcorns.push(popcorn);
    this.gameLayer.add(popcorn);
  }

  popKernel(popcorn) {
    if (popcorn.popped || this.isGameOver) return;
    popcorn.popped = true;
    soundManager.playPop();

    this.addEnergy(8);

    // Efecto de explosión de estrellas
    this.createStarBurst(popcorn.x, popcorn.y);

    // Volar hacia el frasco de Valentic
    const { width, height } = this.scale;
    this.tweens.add({
      targets: popcorn,
      x: width / 2,
      y: height - 40,
      scale: 0.2,
      alpha: 0.3,
      duration: 320,
      onComplete: () => {
        soundManager.playPickup();
        popcorn.destroy();
      },
    });
  }

  updatePopcorn() {
    const { height } = this.scale;
    for (let i = this.popcorns.length - 1; i >= 0; i -= 1) {
      const p = this.popcorns[i];
      if (!p.popped) {
        p.vy += 0.22; // Gravedad
        p.x += p.vx;
        p.y += p.vy;

        // Si cae al fondo sin atrapar
        if (p.y > height + 40 && p.vy > 0) {
          p.destroy();
          this.popcorns.splice(i, 1);
        }
      }
    }
  }

  // ==========================================
  // MINIJUEGO 3: RÍO DE LA SERENIDAD (RIVER ZEN)
  // ==========================================
  setupRiver() {
    const { width, height } = this.scale;

    // Río azul sereno
    const river = this.add.graphics();
    river.fillGradientStyle(0x0284c7, 0x0284c7, 0x0e7490, 0x155e75, 1);
    river.fillRect(0, 0, width, height);
    this.bgLayer.add(river);

    // Ondas de agua en movimiento
    this.ripples = [];
    for (let i = 0; i < 12; i += 1) {
      const r = this.add.rectangle(Phaser.Math.Between(0, width), Phaser.Math.Between(80, height - 30), Phaser.Math.Between(40, 120), 4, 0xbae6fd, 0.4);
      this.ripples.push(r);
      this.bgLayer.add(r);
    }

    // Valentic nadador / flotante
    this.valentic = this.add.image(140, height / 2, 'valentic').setScale(0.18);
    this.gameLayer.add(this.valentic);

    this.orbs = [];

    // Controles por arrastre táctil o flechas
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && pointer.y > 70) {
        this.valentic.y = Phaser.Math.Clamp(pointer.y, 90, height - 40);
      }
    });

    this.time.addEvent({
      delay: 1100,
      callback: () => this.spawnRiverOrb(),
      loop: true,
    });
  }

  spawnRiverOrb() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(90, height - 50);

    const types = [
      { color: 0xef4444, sym: '🔴', label: 'Pausa' },
      { color: 0xf59e0b, sym: '🟡', label: 'Pensar' },
      { color: 0x22c55e, sym: '🟢', label: 'Hablar' },
    ];
    const pick = Phaser.Utils.Array.GetRandom(types);

    const orb = this.add.container(width + 30, y);
    const circle = this.add.circle(0, 0, 20, pick.color, 0.85).setStrokeStyle(2, 0xffffff);
    const txt = this.add.text(0, 0, pick.sym, { fontSize: '18px' }).setOrigin(0.5);
    orb.add([circle, txt]);

    this.orbs.push(orb);
    this.gameLayer.add(orb);
  }

  updateRiver() {
    const { width, height } = this.scale;

    // Teclado arriba/abajo
    const cursors = this.input.keyboard.createCursorKeys();
    if (cursors.up.isDown) this.valentic.y = Math.max(90, this.valentic.y - 4.5);
    if (cursors.down.isDown) this.valentic.y = Math.min(height - 40, this.valentic.y + 4.5);

    // Movimiento de ondas
    this.ripples.forEach((r) => {
      r.x -= 2.5;
      if (r.x < -100) r.x = width + 100;
    });

    // Mover Orbes
    for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
      const orb = this.orbs[i];
      orb.x -= 3.5;
      const dist = Phaser.Math.Distance.Between(this.valentic.x, this.valentic.y, orb.x, orb.y);
      if (dist < 45) {
        soundManager.playGlow();
        this.addEnergy(15);
        this.createStarBurst(orb.x, orb.y);
        orb.destroy();
        this.orbs.splice(i, 1);
      } else if (orb.x < -40) {
        orb.destroy();
        this.orbs.splice(i, 1);
      }
    }
  }

  update(time, delta) {
    if (this.isGameOver) return;
    if (this.minigameType === 'flappy') {
      this.updateFlappy(delta);
    } else if (this.minigameType === 'popcorn') {
      this.updatePopcorn();
    } else if (this.minigameType === 'river') {
      this.updateRiver();
    }
  }
}
