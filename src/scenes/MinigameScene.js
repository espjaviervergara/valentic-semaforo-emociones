import { gameState } from '../systems/GameState.js';
import { soundManager } from '../systems/SoundManager.js';
import { createButton, drawPanel } from '../ui/UIHelpers.js';

export class MinigameScene extends Phaser.Scene {
  constructor() {
    super('MinigameScene');
  }

  init(data) {
    this.mode = data.mode || 'story'; // 'story' o 'free'
    this.minigameType = data.type || 'flappy'; // 'flappy', 'popcorn', 'river', 'mario', 'subway'
    this.difficulty = data.difficulty || 'challenge'; // 'challenge' o 'zen'
    this.onComplete = data.onComplete || null;
    this.energy = this.mode === 'story' ? 20 : 0;
    this.targetEnergy = 100;
    this.score = 0;
    this.lives = this.difficulty === 'zen' ? 999 : 3;
    this.maxLives = 3;
    this.isGameOver = false;
    this.invulnerableTimer = 0;
  }

  create() {
    const { width, height } = this.scale;
    soundManager.attach(this);
    soundManager.playBGM('bgm_hogar');

    // Inicializar entradas del teclado globales para todos los minijuegos
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Capas
    this.bgLayer = this.add.container(0, 0);
    this.gameLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0).setDepth(40);

    if (this.minigameType === 'flappy') {
      this.setupFlappy();
    } else if (this.minigameType === 'popcorn') {
      this.setupPopcorn();
    } else if (this.minigameType === 'river') {
      this.setupRiver();
    } else if (this.minigameType === 'mario') {
      this.setupMario();
    } else if (this.minigameType === 'subway') {
      this.setupSubway();
    }

    this.setupFloatingUI();
  }

  // ==========================================
  // HUD FLOTANTE TRANSLÚCIDO (NUNCA TAPA EL JUEGO)
  // ==========================================
  setupFloatingUI() {
    const { width, height } = this.scale;

    // Barra de estado translúcida ultra-delgada (30px)
    const barBg = this.add.graphics();
    barBg.fillStyle(0x0f172a, 0.72);
    barBg.fillRoundedRect(8, 4, width - 16, 32, 6);
    barBg.lineStyle(1.5, 0x38bdf8, 0.8);
    barBg.strokeRoundedRect(8, 4, width - 16, 32, 6);
    this.uiLayer.add(barBg);

    // Botón Salir / Volver
    const exitBtn = createButton(this, 52, 20, 72, 24, '↩ Salir', {
      fill: 0x334155,
      hover: 0x475569,
      fontSize: '12px',
      onClick: () => {
        if (this.mode === 'story') {
          this.scene.start('WorldScene');
        } else {
          this.scene.start('MenuScene');
        }
      },
    });
    this.uiLayer.add(exitBtn);

    // Indicador de Vidas (❤️❤️❤️)
    this.heartsText = this.add.text(100, 20, this.getHeartsString(), {
      fontSize: '16px',
    }).setOrigin(0, 0.5);
    this.uiLayer.add(this.heartsText);

    // Título / Instrucción central
    let title = 'ValenTIC: Vuelo de la Calma';
    if (this.minigameType === 'popcorn') title = 'Palomitas de la Calma';
    if (this.minigameType === 'river') title = 'Río de la Serenidad';
    if (this.minigameType === 'mario') title = 'ValenTIC Saltador (Mario)';
    if (this.minigameType === 'subway') title = 'Subway Runner (3 Carriles)';

    this.titleText = this.add.text(width / 2, 20, title, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.uiLayer.add(this.titleText);

    // Batería de Calma (Modo Historia) o Contador de Puntos (Modo Libre)
    if (this.mode === 'story') {
      this.energyLabel = this.add.text(width - 200, 20, '⚡ Batería:', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fbbf24',
      }).setOrigin(0, 0.5);

      this.energyTrack = this.add.rectangle(width - 90, 20, 110, 10, 0x1e293b).setStrokeStyle(1, 0x64748b);
      this.energyBar = this.add.rectangle(width - 144, 20, 2, 8, 0x22c55e).setOrigin(0, 0.5);
      this.uiLayer.add([this.energyLabel, this.energyTrack, this.energyBar]);
      this.updateEnergyBar();
    } else {
      this.scoreText = this.add.text(width - 90, 20, `⭐ ${this.score}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fbbf24',
      }).setOrigin(0.5);
      this.uiLayer.add(this.scoreText);
    }
  }

  getHeartsString() {
    if (this.difficulty === 'zen') return '❤️ Zen';
    let s = '';
    for (let i = 0; i < this.maxLives; i += 1) {
      s += i < this.lives ? '❤️' : '🖤';
    }
    return s;
  }

  updateHearts() {
    if (this.heartsText) {
      this.heartsText.setText(this.getHeartsString());
    }
  }

  updateEnergyBar() {
    if (!this.energyBar) return;
    const pct = Phaser.Math.Clamp(this.energy / this.targetEnergy, 0, 1);
    this.energyBar.width = Math.max(2, 108 * pct);
    this.energyBar.fillColor = pct < 0.4 ? 0xef4444 : pct < 0.75 ? 0xf59e0b : 0x22c55e;
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
      this.score += amt;
      if (this.scoreText) {
        this.scoreText.setText(`⭐ ${this.score}`);
      }
    }
  }

  takeDamage(amount = 1) {
    if (this.isGameOver || this.invulnerableTimer > 0) return;
    if (this.difficulty === 'zen') return;

    this.lives -= amount;
    this.invulnerableTimer = 1500;
    soundManager.playError();
    this.cameras.main.shake(250, 0.008);
    this.updateHearts();

    if (this.lives <= 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    soundManager.playError();
    const { width, height } = this.scale;

    const modal = this.add.container(0, 0).setDepth(50);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.85).setInteractive());
    modal.add(drawPanel(this, width / 2 - 230, height / 2 - 130, 460, 260, 0x0f172a, 0.98, 0xef4444));

    modal.add(this.add.image(width / 2, height / 2 - 45, 'valentic').setScale(0.25));

    modal.add(this.add.text(width / 2, height / 2 + 20, '¡Ánimo! Respira hondo con ValenTIC', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fca5a5',
    }).setOrigin(0.5));

    modal.add(this.add.text(width / 2, height / 2 + 50, 'Equivocarse es parte del aprendizaje.\n¡Inténtalo de nuevo con calma!', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      color: '#e2e8f0',
      align: 'center',
    }).setOrigin(0.5));

    modal.add(createButton(this, width / 2 - 95, height / 2 + 95, 170, 42, '🔄 Reintentar', {
      fill: 0x2563eb,
      hover: 0x3b82f6,
      onClick: () => {
        this.scene.restart({
          mode: this.mode,
          type: this.minigameType,
          difficulty: this.difficulty,
          onComplete: this.onComplete,
        });
      },
    }));

    modal.add(createButton(this, width / 2 + 95, height / 2 + 95, 170, 42, '↩ Salir', {
      fill: 0x334155,
      hover: 0x475569,
      onClick: () => {
        if (this.mode === 'story') {
          this.scene.start('WorldScene');
        } else {
          this.scene.start('MenuScene');
        }
      },
    }));
  }

  winStoryMinigame() {
    this.isGameOver = true;
    soundManager.playVictory();
    const { width, height } = this.scale;

    const modal = this.add.container(0, 0).setDepth(50);
    modal.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.82).setInteractive());
    modal.add(drawPanel(this, width / 2 - 230, height / 2 - 130, 460, 260, 0x0f172a, 0.98, 0x22c55e));

    modal.add(this.add.image(width / 2, height / 2 - 45, 'valentic').setScale(0.25));

    modal.add(this.add.text(width / 2, height / 2 + 20, '¡ENERGÍA DE CALMA AL 100%! 🌟', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#4ade80',
    }).setOrigin(0.5));

    modal.add(this.add.text(width / 2, height / 2 + 50, 'ValenTIC y Alex están listos para seguir adelante.', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14.5px',
      color: '#e2e8f0',
    }).setOrigin(0.5));

    const winBtnLabel = this.mode === 'story' ? '¡Continuar Aventura! ▸' : 'Volver al Menú 🏆';
    modal.add(createButton(this, width / 2, height / 2 + 95, 230, 44, winBtnLabel, {
      fill: 0x16a34a,
      hover: 0x22c55e,
      onClick: () => {
        if (this.mode === 'story') {
          if (this.onComplete) {
            this.onComplete();
          } else {
            this.scene.start('WorldScene');
          }
        } else {
          this.scene.start('MenuScene');
        }
      },
    }));
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
  // 1. FLAPPY NUBE (Vuelo de Calma)
  // ==========================================
  setupFlappy() {
    const { width, height } = this.scale;
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x38bdf8, 0x38bdf8, 0x0284c7, 0x0369a1, 1);
    sky.fillRect(0, 0, width, height);
    this.bgLayer.add(sky);

    this.bgClouds = [];
    for (let i = 0; i < 5; i += 1) {
      const c = this.add.ellipse(Phaser.Math.Between(40, width), Phaser.Math.Between(60, height - 90), Phaser.Math.Between(100, 180), Phaser.Math.Between(35, 55), 0xffffff, 0.4);
      this.bgClouds.push({ obj: c, speed: Phaser.Math.FloatBetween(0.4, 0.9) });
      this.bgLayer.add(c);
    }

    const grass = this.add.rectangle(width / 2, height - 16, width, 32, 0x15803d);
    this.bgLayer.add(grass);

    this.valentic = this.add.image(140, height / 2, 'valentic').setScale(0.16);
    this.valentic.vy = 0;
    this.gameLayer.add(this.valentic);

    this.halo = this.add.circle(140, height / 2, 38, 0xfef08a, 0.35);
    this.gameLayer.add(this.halo);

    this.stormClouds = [];
    this.stars = [];

    const flap = () => {
      if (this.isGameOver) return;
      this.valentic.vy = -5.4;
      soundManager.playJump();
    };

    this.input.on('pointerdown', (pointer) => {
      if (pointer.y > 45) flap();
    });
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

    this.time.addEvent({ delay: 1400, callback: () => this.spawnFlappyStar(), loop: true });
    this.time.addEvent({ delay: 2200, callback: () => this.spawnFlappyStorm(), loop: true });
  }

  spawnFlappyStar() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(60, height - 70);
    const star = this.add.text(width + 20, y, '⭐', { fontSize: '24px' }).setOrigin(0.5);
    this.stars.push(star);
    this.gameLayer.add(star);
  }

  spawnFlappyStorm() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(70, height - 80);
    const container = this.add.container(width + 50, y);
    const cloud = this.add.ellipse(0, 0, 85, 44, 0x334155, 0.95).setStrokeStyle(2, 0xef4444);
    const lightning = this.add.text(0, 0, '⚡', { fontSize: '20px', color: '#fbbf24' }).setOrigin(0.5);
    container.add([cloud, lightning]);
    this.stormClouds.push(container);
    this.gameLayer.add(container);
  }

  updateFlappy(delta) {
    const { width, height } = this.scale;
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.valentic.vy = -5.4;
      soundManager.playJump();
    }

    this.valentic.vy += 0.22;
    this.valentic.y += this.valentic.vy;
    this.valentic.y = Phaser.Math.Clamp(this.valentic.y, 50, height - 40);
    if (this.valentic.y >= height - 40) this.valentic.vy = 0;
    this.valentic.rotation = Phaser.Math.Clamp(this.valentic.vy * 0.05, -0.3, 0.4);
    this.halo.x = this.valentic.x;
    this.halo.y = this.valentic.y;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      this.valentic.alpha = (Math.floor(this.time.now / 100) % 2 === 0) ? 0.3 : 1;
    } else {
      this.valentic.alpha = 1;
    }

    // Scroll nubes fondo
    this.bgClouds.forEach((c) => {
      c.obj.x -= c.speed;
      if (c.obj.x < -100) c.obj.x = width + 100;
    });

    // Mover Estrellas
    for (let i = this.stars.length - 1; i >= 0; i -= 1) {
      const s = this.stars[i];
      s.x -= 3.4;
      if (Phaser.Math.Distance.Between(this.valentic.x, this.valentic.y, s.x, s.y) < 45) {
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
    for (let i = this.stormClouds.length - 1; i >= 0; i -= 1) {
      const c = this.stormClouds[i];
      c.x -= 2.8;
      if (Phaser.Math.Distance.Between(this.valentic.x, this.valentic.y, c.x, c.y) < 50) {
        this.takeDamage(1);
      }
      if (c.x < -80) {
        c.destroy();
        this.stormClouds.splice(i, 1);
      }
    }
  }

  // ==========================================
  // 2. PALOMITAS DE LA CALMA (Popcorn Doodle)
  // ==========================================
  setupPopcorn() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x312e81, 0x4338ca, 1);
    bg.fillRect(0, 0, width, height);
    this.bgLayer.add(bg);

    this.valentic = this.add.image(width / 2, height - 60, 'valentic').setScale(0.22);
    this.gameLayer.add(this.valentic);

    this.popcorns = [];
    this.time.addEvent({ delay: 800, callback: () => this.spawnPopcornKernel(), loop: true });
  }

  spawnPopcornKernel() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const isBomb = Math.random() < 0.28 && this.difficulty !== 'zen';
    const x = Phaser.Math.Between(90, width - 90);
    const p = this.add.container(x, height + 20);

    if (isBomb) {
      // Bomba de frustración / palomita quemada
      const b1 = this.add.circle(0, 0, 16, 0x1e293b).setStrokeStyle(2, 0xef4444);
      const icon = this.add.text(0, -2, '💣', { fontSize: '18px' }).setOrigin(0.5);
      p.add([b1, icon]);
      p.isBomb = true;
    } else {
      const p1 = this.add.circle(0, 0, 16, 0xfef08a);
      const p2 = this.add.circle(-7, -5, 11, 0xffedd5);
      const p3 = this.add.circle(7, -5, 11, 0xffedd5);
      const icon = this.add.text(0, -2, '🍿', { fontSize: '18px' }).setOrigin(0.5);
      p.add([p1, p2, p3, icon]);
      p.isBomb = false;
    }

    p.vx = Phaser.Math.FloatBetween(-1.6, 1.6);
    p.vy = Phaser.Math.FloatBetween(-12, -8.5);
    p.popped = false;

    const hit = this.add.circle(0, 0, 36, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.clickKernel(p));
    p.add(hit);

    this.popcorns.push(p);
    this.gameLayer.add(p);
  }

  clickKernel(p) {
    if (p.popped || this.isGameOver) return;
    p.popped = true;

    if (p.isBomb) {
      this.takeDamage(1);
      this.cameras.main.shake(200, 0.01);
      p.destroy();
    } else {
      soundManager.playPop();
      this.addEnergy(8);
      this.createStarBurst(p.x, p.y);
      p.destroy();
    }
  }

  updatePopcorn() {
    const { height } = this.scale;
    for (let i = this.popcorns.length - 1; i >= 0; i -= 1) {
      const p = this.popcorns[i];
      if (!p.popped) {
        p.vy += 0.22;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > height + 40 && p.vy > 0) {
          p.destroy();
          this.popcorns.splice(i, 1);
        }
      }
    }
  }

  // ==========================================
  // 3. RÍO DE LA SERENIDAD (River Zen)
  // ==========================================
  setupRiver() {
    const { width, height } = this.scale;
    const river = this.add.graphics();
    river.fillGradientStyle(0x0284c7, 0x0284c7, 0x0e7490, 0x155e75, 1);
    river.fillRect(0, 0, width, height);
    this.bgLayer.add(river);

    this.valentic = this.add.image(140, height / 2, 'valentic').setScale(0.18);
    this.gameLayer.add(this.valentic);

    this.riverItems = [];

    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && pointer.y > 45) {
        this.valentic.y = Phaser.Math.Clamp(pointer.y, 60, height - 40);
      }
    });
    this.cursors = this.input.keyboard.createCursorKeys();

    this.time.addEvent({ delay: 1100, callback: () => this.spawnRiverItem(), loop: true });
  }

  spawnRiverItem() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(70, height - 50);
    const isObstacle = Math.random() < 0.32 && this.difficulty !== 'zen';
    const item = this.add.container(width + 30, y);

    if (isObstacle) {
      // Remolino / Tronco
      const log = this.add.ellipse(0, 0, 50, 22, 0x78350f).setStrokeStyle(2, 0xef4444);
      const icon = this.add.text(0, 0, '🌀', { fontSize: '18px' }).setOrigin(0.5);
      item.add([log, icon]);
      item.isHazard = true;
    } else {
      const orbs = [
        { c: 0xef4444, s: '🔴' },
        { c: 0xf59e0b, s: '🟡' },
        { c: 0x22c55e, s: '🟢' },
      ];
      const pick = Phaser.Utils.Array.GetRandom(orbs);
      const circle = this.add.circle(0, 0, 18, pick.c, 0.9).setStrokeStyle(2, 0xffffff);
      const icon = this.add.text(0, 0, pick.s, { fontSize: '16px' }).setOrigin(0.5);
      item.add([circle, icon]);
      item.isHazard = false;
    }

    this.riverItems.push(item);
    this.gameLayer.add(item);
  }

  updateRiver(delta) {
    const { height } = this.scale;
    if (this.cursors.up.isDown) this.valentic.y = Math.max(60, this.valentic.y - 4.5);
    if (this.cursors.down.isDown) this.valentic.y = Math.min(height - 40, this.valentic.y + 4.5);

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      this.valentic.alpha = (Math.floor(this.time.now / 100) % 2 === 0) ? 0.3 : 1;
    } else {
      this.valentic.alpha = 1;
    }

    for (let i = this.riverItems.length - 1; i >= 0; i -= 1) {
      const it = this.riverItems[i];
      it.x -= 3.8;
      if (Phaser.Math.Distance.Between(this.valentic.x, this.valentic.y, it.x, it.y) < 42) {
        if (it.isHazard) {
          this.takeDamage(1);
        } else {
          soundManager.playGlow();
          this.addEnergy(15);
          this.createStarBurst(it.x, it.y);
          it.destroy();
          this.riverItems.splice(i, 1);
        }
      } else if (it.x < -40) {
        it.destroy();
        this.riverItems.splice(i, 1);
      }
    }
  }

  // ==========================================
  // 4. VALENTIC SALTADOR (Estilo Super Mario Platformer)
  // ==========================================
  setupMario() {
    const { width, height } = this.scale;

    // Cielo azul brillante de Mario
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x60a5fa, 0x60a5fa, 0x93c5fd, 0xbfdbfe, 1);
    sky.fillRect(0, 0, width, height);
    this.bgLayer.add(sky);

    // Contenedor con scroll para simular mundo de plataformas
    this.marioWorld = this.add.container(0, 0);
    this.gameLayer.add(this.marioWorld);

    // Plataformas y Suelo
    this.platforms = [];
    const floorY = height - 40;

    // Suelo con fosas
    const addGround = (x, w) => {
      const g = this.add.rectangle(x + w / 2, floorY + 20, w, 40, 0x15803d).setStrokeStyle(2, 0x166534);
      this.platforms.push({ x, w, y: floorY });
      this.marioWorld.add(g);
    };

    addGround(0, 500);
    addGround(580, 480);
    addGround(1140, 500);
    addGround(1700, 500);

    // Bloques misteriosos [?] y plataformas flotantes
    this.blocks = [];
    const addBlock = (x, y) => {
      const c = this.add.container(x, y);
      const b = this.add.rectangle(0, 0, 36, 36, 0xf59e0b).setStrokeStyle(2, 0xfde047);
      const txt = this.add.text(0, 0, '?', { fontSize: '20px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      c.add([b, txt]);
      c.hit = false;
      this.blocks.push({ obj: c, x, y, w: 36, h: 36 });
      this.marioWorld.add(c);
    };

    addBlock(240, floorY - 90);
    addBlock(310, floorY - 90);
    addBlock(720, floorY - 100);
    addBlock(840, floorY - 140);
    addBlock(1320, floorY - 110);

    // Enemigos ("Monstruitos de Rabia" rojos)
    this.marioEnemies = [];
    const addEnemy = (x, y) => {
      const c = this.add.container(x, y);
      const body = this.add.circle(0, 0, 16, 0xdc2626).setStrokeStyle(2, 0xef4444);
      const eye1 = this.add.circle(-5, -4, 3, 0xffffff);
      const eye2 = this.add.circle(5, -4, 3, 0xffffff);
      const brow = this.add.text(0, -9, '😠', { fontSize: '13px' }).setOrigin(0.5);
      c.add([body, eye1, eye2, brow]);
      c.vx = -1.2;
      c.alive = true;
      this.marioEnemies.push(c);
      this.marioWorld.add(c);
    };

    addEnemy(380, floorY - 16);
    addEnemy(790, floorY - 16);
    addEnemy(1420, floorY - 16);

    // Meta final: Poste de la Calma
    this.flag = this.add.container(1920, floorY - 90);
    const pole = this.add.rectangle(0, 0, 8, 180, 0x64748b);
    const flagCloth = this.add.triangle(18, -60, 0, 0, 36, 16, 0, 32, 0x22c55e);
    const starTop = this.add.text(0, -90, '⭐', { fontSize: '22px' }).setOrigin(0.5);
    this.flag.add([pole, flagCloth, starTop]);
    this.marioWorld.add(this.flag);

    // Valentic Mario
    this.valentic = this.add.image(100, floorY - 25, 'valentic').setScale(0.16);
    this.valentic.vx = 0;
    this.valentic.vy = 0;
    this.valentic.onGround = true;
    this.marioWorld.add(this.valentic);

    // Controles táctiles en pantalla para Mario
    this.setupMarioTouchControls();
  }

  setupMarioTouchControls() {
    const { width, height } = this.scale;
    const btnLeft = this.add.rectangle(60, height - 45, 55, 45, 0x0f172a, 0.75).setStrokeStyle(2, 0x60a5fa).setInteractive();
    this.add.text(60, height - 45, '◀', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);

    const btnRight = this.add.rectangle(135, height - 45, 55, 45, 0x0f172a, 0.75).setStrokeStyle(2, 0x60a5fa).setInteractive();
    this.add.text(135, height - 45, '▶', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);

    const btnJump = this.add.rectangle(width - 80, height - 45, 95, 48, 0x16a34a, 0.85).setStrokeStyle(2, 0x86efac).setInteractive();
    this.add.text(width - 80, height - 45, 'SALTAR ⬆', { fontSize: '15px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);

    this.marioTouch = { left: false, right: false, jump: false };

    btnLeft.on('pointerdown', () => { this.marioTouch.left = true; });
    btnLeft.on('pointerup', () => { this.marioTouch.left = false; });
    btnLeft.on('pointerout', () => { this.marioTouch.left = false; });

    btnRight.on('pointerdown', () => { this.marioTouch.right = true; });
    btnRight.on('pointerup', () => { this.marioTouch.right = false; });
    btnRight.on('pointerout', () => { this.marioTouch.right = false; });

    btnJump.on('pointerdown', () => { this.marioJump(); });

    this.uiLayer.add([btnLeft, btnRight, btnJump]);
  }

  marioJump() {
    if (this.valentic.onGround && !this.isGameOver) {
      this.valentic.vy = -10.5;
      this.valentic.onGround = false;
      soundManager.playJump();
    }
  }

  updateMario(delta) {
    const { width, height } = this.scale;
    const cursors = this.cursors;
    const floorY = height - 40;

    // Movimiento horizontal
    let move = 0;
    if (cursors.left.isDown || this.wasd?.left?.isDown || this.marioTouch.left) move = -4.2;
    if (cursors.right.isDown || this.wasd?.right?.isDown || this.marioTouch.right) move = 4.2;
    this.valentic.x += move;

    if (
      Phaser.Input.Keyboard.JustDown(cursors.up)
      || (this.wasd?.up && Phaser.Input.Keyboard.JustDown(this.wasd.up))
      || Phaser.Input.Keyboard.JustDown(this.spaceKey)
    ) {
      this.marioJump();
    }

    // Gravedad
    this.valentic.vy += 0.45;
    this.valentic.y += this.valentic.vy;

    // Colisión con suelo y plataformas
    this.valentic.onGround = false;
    this.platforms.forEach((p) => {
      if (this.valentic.x >= p.x && this.valentic.x <= p.x + p.w) {
        if (this.valentic.y >= p.y - 25 && this.valentic.y <= p.y + 10 && this.valentic.vy >= 0) {
          this.valentic.y = p.y - 25;
          this.valentic.vy = 0;
          this.valentic.onGround = true;
        }
      }
    });

    // Colisión con bloques [?] desde abajo
    this.blocks.forEach((b) => {
      if (Math.abs(this.valentic.x - b.x) < 26) {
        if (this.valentic.y - 25 <= b.y + 18 && this.valentic.y >= b.y && this.valentic.vy < 0) {
          this.valentic.vy = 2; // Rebote hacia abajo
          if (!b.hit) {
            b.hit = true;
            soundManager.playPickup();
            this.addEnergy(15);
            this.createStarBurst(b.x, b.y - 25);
            this.tweens.add({ targets: b.obj, y: b.y - 8, yoyo: true, duration: 120 });
          }
        }
      }
    });

    // Colisión con Enemigos (Monstruitos de Rabia)
    this.marioEnemies.forEach((e) => {
      if (!e.alive) return;
      e.x += e.vx;
      if (e.x < 100 || e.x > 1800) e.vx *= -1;

      const dist = Phaser.Math.Distance.Between(this.valentic.x, this.valentic.y, e.x, e.y);
      if (dist < 34) {
        // ¿Salto sobre su cabeza (stomp)?
        if (this.valentic.vy > 1 && this.valentic.y < e.y) {
          e.alive = false;
          soundManager.playPop();
          this.addEnergy(20);
          this.createStarBurst(e.x, e.y);
          this.valentic.vy = -7; // Rebote
          e.destroy();
        } else {
          this.takeDamage(1);
        }
      }
    });

    // Foso / Caída
    if (this.valentic.y > height + 50) {
      this.takeDamage(1);
      this.valentic.x = Math.max(100, this.valentic.x - 200);
      this.valentic.y = floorY - 50;
      this.valentic.vy = 0;
    }

    // Cámara con scroll siguiendo a Valentic
    this.marioWorld.x = Phaser.Math.Clamp(width / 3 - this.valentic.x, -1450, 0);

    // Meta alcanzada
    if (this.valentic.x >= 1910 && !this.isGameOver) {
      this.winStoryMinigame();
    }
  }

  // ==========================================
  // 5. SUBWAY RUNNER (Estilo Subway Surfers 3-Carriles)
  // ==========================================
  setupSubway() {
    const { width, height } = this.scale;

    // Fondo pista urbana futurista
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x334155, 1);
    bg.fillRect(0, 0, width, height);
    this.bgLayer.add(bg);

    // 3 Carriles (0 = Izquierda, 1 = Centro, 2 = Derecha)
    this.laneX = [width / 2 - 160, width / 2, width / 2 + 160];
    this.currentLane = 1;

    // Dibujar pistas
    const tracks = this.add.graphics();
    tracks.lineStyle(3, 0x38bdf8, 0.4);
    this.laneX.forEach((lx) => {
      tracks.strokeRoundedRect(lx - 65, 40, 130, height, 12);
    });
    this.bgLayer.add(tracks);

    // Valentic Runner
    this.valentic = this.add.image(this.laneX[1], height - 100, 'valentic').setScale(0.2);
    this.valentic.isJumping = false;
    this.gameLayer.add(this.valentic);

    this.subwayItems = [];

    // Controles: Izquierda / Derecha para cambiar carril; Arriba para saltar
    const cursors = this.cursors;
    this.input.keyboard.on('keydown-LEFT', () => this.switchLane(-1));
    this.input.keyboard.on('keydown-A', () => this.switchLane(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.switchLane(1));
    this.input.keyboard.on('keydown-D', () => this.switchLane(1));
    this.input.keyboard.on('keydown-UP', () => this.subwayJump());
    this.input.keyboard.on('keydown-W', () => this.subwayJump());
    this.input.keyboard.on('keydown-SPACE', () => this.subwayJump());

    // Botones táctiles visibles para celulares y tablets
    const btnLeft = this.add.rectangle(70, height - 45, 60, 44, 0x0f172a, 0.8).setStrokeStyle(2, 0x38bdf8).setInteractive();
    this.add.text(70, height - 45, '◀ IZQ', { fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    btnLeft.on('pointerdown', () => this.switchLane(-1));

    const btnRight = this.add.rectangle(145, height - 45, 60, 44, 0x0f172a, 0.8).setStrokeStyle(2, 0x38bdf8).setInteractive();
    this.add.text(145, height - 45, 'DER ▶', { fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    btnRight.on('pointerdown', () => this.switchLane(1));

    const btnJump = this.add.rectangle(width - 85, height - 45, 100, 46, 0x16a34a, 0.85).setStrokeStyle(2, 0x86efac).setInteractive();
    this.add.text(width - 85, height - 45, 'SALTAR ⬆', { fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    btnJump.on('pointerdown', () => this.subwayJump());

    this.uiLayer.add([btnLeft, btnRight, btnJump]);

    // Soporte táctil por deslizamiento o toques
    this.input.on('pointerdown', (pointer) => {
      this.touchStartX = pointer.x;
      this.touchStartY = pointer.y;
    });

    this.input.on('pointerup', (pointer) => {
      const dx = pointer.x - this.touchStartX;
      const dy = pointer.y - this.touchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        this.switchLane(dx > 0 ? 1 : -1);
      } else if (dy < -40) {
        this.subwayJump();
      }
    });

    // Spawners
    this.time.addEvent({ delay: 1100, callback: () => this.spawnSubwayObstacle(), loop: true });
    this.time.addEvent({ delay: 700, callback: () => this.spawnSubwayCoin(), loop: true });
  }

  switchLane(dir) {
    if (this.isGameOver) return;
    const target = Phaser.Math.Clamp(this.currentLane + dir, 0, 2);
    if (target !== this.currentLane) {
      this.currentLane = target;
      soundManager.playStep();
      this.tweens.add({
        targets: this.valentic,
        x: this.laneX[this.currentLane],
        duration: 140,
        ease: 'Cubic.easeOut',
      });
    }
  }

  subwayJump() {
    if (this.valentic.isJumping || this.isGameOver) return;
    this.valentic.isJumping = true;
    soundManager.playJump();
    const { height } = this.scale;
    const baseY = height - 100;

    this.tweens.add({
      targets: this.valentic,
      y: baseY - 90,
      scaleX: 0.23,
      scaleY: 0.23,
      duration: 280,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.valentic.y = baseY;
        this.valentic.scale = 0.2;
        this.valentic.isJumping = false;
      },
    });
  }

  spawnSubwayObstacle() {
    if (this.isGameOver) return;
    const lane = Phaser.Math.Between(0, 2);
    const isHigh = Math.random() < 0.45; // Tren alto vs valla baja saltar
    const item = this.add.container(this.laneX[lane], 40);

    if (isHigh) {
      // Tren de Enojo (bloquea todo el carril)
      const train = this.add.rectangle(0, 0, 110, 65, 0xdc2626).setStrokeStyle(2, 0xfca5a5);
      const txt = this.add.text(0, 0, '🚆 ENOJO', { fontSize: '13px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      item.add([train, txt]);
      item.canJumpOver = false;
    } else {
      // Valla baja de Frustración (se puede saltar por encima)
      const barrier = this.add.rectangle(0, 0, 110, 24, 0xf59e0b).setStrokeStyle(2, 0xfde047);
      const txt = this.add.text(0, 0, '🚧 SALTA', { fontSize: '12px', fontStyle: 'bold', color: '#000000' }).setOrigin(0.5);
      item.add([barrier, txt]);
      item.canJumpOver = true;
    }

    item.lane = lane;
    item.isObstacle = true;
    this.subwayItems.push(item);
    this.gameLayer.add(item);
  }

  spawnSubwayCoin() {
    if (this.isGameOver) return;
    const lane = Phaser.Math.Between(0, 2);
    const item = this.add.container(this.laneX[lane], 40);
    const coin = this.add.circle(0, 0, 14, 0xfde047).setStrokeStyle(2, 0xd97706);
    const txt = this.add.text(0, 0, '⭐', { fontSize: '13px' }).setOrigin(0.5);
    item.add([coin, txt]);
    item.lane = lane;
    item.isObstacle = false;
    this.subwayItems.push(item);
    this.gameLayer.add(item);
  }

  updateSubway(delta) {
    const { height } = this.scale;
    const baseY = height - 100;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      this.valentic.alpha = (Math.floor(this.time.now / 100) % 2 === 0) ? 0.3 : 1;
    } else {
      this.valentic.alpha = 1;
    }

    for (let i = this.subwayItems.length - 1; i >= 0; i -= 1) {
      const it = this.subwayItems[i];
      it.y += 5.2; // Velocidad de carrera Subway

      if (Math.abs(it.y - baseY) < 32 && it.lane === this.currentLane) {
        if (it.isObstacle) {
          if (it.canJumpOver && this.valentic.isJumping) {
            // Saltó exitosamente la valla
          } else {
            this.takeDamage(1);
          }
        } else {
          soundManager.playPickup();
          this.addEnergy(8);
          this.createStarBurst(it.x, it.y);
          it.destroy();
          this.subwayItems.splice(i, 1);
        }
      } else if (it.y > height + 60) {
        it.destroy();
        this.subwayItems.splice(i, 1);
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
      this.updateRiver(delta);
    } else if (this.minigameType === 'mario') {
      this.updateMario(delta);
    } else if (this.minigameType === 'subway') {
      this.updateSubway(delta);
    }
  }
}
