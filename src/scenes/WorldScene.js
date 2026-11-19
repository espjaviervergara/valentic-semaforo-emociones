import { MAPS, TILE_SIZE, WALKABLE_TILES } from '../data/maps.js';
import { gameState } from '../systems/GameState.js';
import { soundManager } from '../systems/SoundManager.js';
import { EncounterModal } from '../ui/EncounterModal.js';
import { createButton, drawPanel } from '../ui/UIHelpers.js';

const MAP_OFFSET_Y = 36;

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene');
  }

  create() {
    const { width, height } = this.scale;
    soundManager.attach(this);
    this.events.once('shutdown', () => soundManager.stopVoice());

    if (!gameState.run) {
      gameState.startNewAdventure(false);
    }

    const mapId = gameState.run.mapId || 'cuarto';
    this.mapData = MAPS[mapId];
    soundManager.playBGM(this.mapData.bgm);

    // Tilemap nítido 48x48 con capa base de piso debajo de los muebles
    this.tilemap = this.make.tilemap({
      data: this.mapData.grid,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = this.tilemap.addTilesetImage('rpg_tileset', 'rpg_tileset', TILE_SIZE, TILE_SIZE);
    const floorLayer = this.tilemap.createBlankLayer('base_floor', tileset, 0, MAP_OFFSET_Y);
    if (mapId === 'cuarto') {
      floorLayer.fill(0, 0, 0, 20, 11);
    } else if (mapId === 'hogar') {
      floorLayer.fill(1, 0, 0, 20, 11);
    } else if (mapId === 'colegio') {
      floorLayer.fill(2, 0, 0, 11, 11);
      floorLayer.fill(3, 11, 0, 9, 11);
    } else {
      floorLayer.fill(20, 0, 0, 20, 11);
    }
    this.layer = this.tilemap.createLayer(0, tileset, 0, MAP_OFFSET_Y);

    // Marcador de destino al hacer clic en el piso
    this.destMarker = this.add.circle(0, 0, 14, 0x38bdf8, 0.35)
      .setStrokeStyle(2, 0xbae6fd)
      .setVisible(false)
      .setDepth(5);

    // Objetos interactivos + etiquetas flotantes
    this.markers = {};
    this.mapData.interactables.forEach((obj) => {
      const pos = this.tileToWorld(obj.col, obj.row);
      const badge = this.createFloatingBadge(pos.x, pos.y - 34, obj.badge, obj.label);
      this.markers[obj.id] = { ...obj, x: pos.x, y: pos.y, badgeObj: badge };
    });

    // NPCs en el mapa
    this.npcSprites = {};
    this.mapData.npcs.forEach((npc) => {
      const pos = this.tileToWorld(npc.col, npc.row);
      const spr = this.add.sprite(pos.x, pos.y + 10, npc.sprite)
        .setOrigin(0.5, 0.85)
        .setDepth(10);
      spr.play(`${npc.sprite}_idle_down`);
      const badge = this.createFloatingBadge(pos.x, pos.y - 52, npc.badge, npc.label);
      this.npcSprites[npc.id] = { ...npc, x: pos.x, y: pos.y, spriteObj: spr, badgeObj: badge };
    });

    // La Sombra siguiendo a Alex si viene del hogar con tensión
    const spawn = this.tileToWorld(this.mapData.spawn.col, this.mapData.spawn.row);
    this.shadowFollower = this.add.sprite(spawn.x - 36, spawn.y + 8, 'rpg_sombra_hostil')
      .setOrigin(0.5, 0.85)
      .setDepth(11)
      .setVisible(gameState.run.shadowFollowing);
    this.shadowFollower.play('rpg_sombra_hostil_idle_down');

    // Jugador (Alex)
    this.alex = this.add.sprite(spawn.x, spawn.y + 10, 'rpg_alex')
      .setOrigin(0.5, 0.85)
      .setDepth(12);
    this.alexDir = 'down';
    this.alex.play('rpg_alex_idle_down');

    // Anillo guía inteligente cuando el niño tarda en encontrar el objetivo
    this.guideRing = this.add.circle(0, 0, 26, 0xfbbf24, 0)
      .setStrokeStyle(3, 0xfbbf24, 0.9)
      .setDepth(8)
      .setVisible(false);
    this.tweens.add({
      targets: this.guideRing,
      scale: 1.25,
      alpha: 0.3,
      duration: 750,
      yoyo: true,
      repeat: -1,
    });

    // HUD superior minimalista (encaja sobre el borde superior oscuro fila 0)
    this.buildTopHud();

    // Controles de teclado, clic en piso y cruceta táctil
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      act1: Phaser.Input.Keyboard.KeyCodes.E,
      act2: Phaser.Input.Keyboard.KeyCodes.SPACE,
      act3: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });

    this.dpadState = { up: false, down: false, left: false, right: false };
    this.buildTouchControls();

    // Click/toque en el piso para caminar
    this.walkTarget = null;
    this.blockedTimer = 0;
    this.lastPos = { x: this.alex.x, y: this.alex.y };
    this.idleTimer = 0;

    this.input.on('pointerdown', (pointer) => {
      if (this.activeModal || this.dialogueOpen) return;
      // Ignorar zona del HUD superior y cruceta
      if (pointer.y < 54) return;
      if (gameState.save.settings.showDpad && pointer.y > 385 && (pointer.x < 175 || pointer.x > 805)) return;

      const targetInteract = this.findInteractableAtPoint(pointer.x, pointer.y);
      if (targetInteract) {
        this.walkTarget = { x: targetInteract.x, y: targetInteract.y, target: targetInteract };
      } else {
        this.walkTarget = { x: pointer.x, y: pointer.y, target: null };
      }
      this.destMarker.setPosition(this.walkTarget.x, this.walkTarget.y).setVisible(true);
      this.idleTimer = 0;
    });

    // Burbuja de diálogo inferior limpia
    this.dialogueLayer = this.add.container(0, 0).setDepth(45);
    this.dialogueOpen = false;
    this.activeModal = null;

    this.refreshBadges();
    this.refreshHud();
    this.showInitialRoomMessage();
  }

  tileToWorld(col, row) {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2 + MAP_OFFSET_Y,
    };
  }

  worldToTile(x, y) {
    return {
      col: Math.floor(x / TILE_SIZE),
      row: Math.floor((y - MAP_OFFSET_Y) / TILE_SIZE),
    };
  }

  createFloatingBadge(x, y, symbol, title) {
    const c = this.add.container(x, y).setDepth(20);
    const pill = this.add.rectangle(0, 0, 26, 24, 0x0f172a, 0.92).setStrokeStyle(2, 0xfbbf24);
    const txt = this.add.text(0, 0, symbol, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fde047',
    }).setOrigin(0.5);
    const lbl = this.add.text(0, -19, title, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#0f172acc',
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5);
    c.add([pill, txt, lbl]);
    c.setSymbol = (sym, col = 0xfbbf24, tCol = '#fde047') => {
      pill.setStrokeStyle(2, col);
      txt.setText(sym).setColor(tCol);
    };
    this.tweens.add({
      targets: c,
      y: y - 5,
      duration: 650,
      yoyo: true,
      repeat: -1,
    });
    return c;
  }

  buildTopHud() {
    const { width } = this.scale;
    const bar = this.add.container(0, 0).setDepth(35);

    // Barra translúcida delgada de 30px que nunca tapa el juego ni a los personajes
    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.75);
    bg.fillRoundedRect(8, 2, width - 16, 30, 6);
    bg.lineStyle(1.5, 0x38bdf8, 0.8);
    bg.strokeRoundedRect(8, 2, width - 16, 30, 6);
    bar.add(bg);

    this.dayBadge = this.add.text(18, 9, 'Día 1', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '12.5px',
      fontStyle: 'bold',
      color: '#38bdf8',
    });

    this.calmaText = this.add.text(68, 9, 'Calma: 100%', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#86efac',
    });
    const calmaTrack = this.add.rectangle(154, 17, 64, 8, 0x1e293b).setOrigin(0, 0.5).setStrokeStyle(1, 0x64748b);
    this.calmaBar = this.add.rectangle(155, 17, 62, 6, 0x22c55e).setOrigin(0, 0.5);

    this.energyText = this.add.text(228, 9, '⚡ 0', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '12.5px',
      fontStyle: 'bold',
      color: '#fde047',
    });

    this.objectiveText = this.add.text(width / 2 + 30, 9, 'Objetivo: ...', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5, 0);

    const pauseBtn = createButton(this, width - 48, 17, 68, 22, '⚙ Pausa', {
      fill: 0x334155,
      hover: 0x475569,
      border: 0x94a3b8,
      fontSize: '11px',
      onClick: () => this.openPauseMenu(),
    });

    bar.add([this.dayBadge, this.calmaText, calmaTrack, this.calmaBar, this.energyText, this.objectiveText, pauseBtn]);
  }

  buildTouchControls() {
    const { width, height } = this.scale;
    this.touchContainer = this.add.container(0, 0).setDepth(34);

    const makeDirBtn = (x, y, label, key) => {
      const bg = this.add.rectangle(x, y, 42, 42, 0x0f172a, 0.72).setStrokeStyle(2, 0x60a5fa);
      bg.setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, y, label, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      bg.on('pointerdown', () => {
        this.walkTarget = null;
        this.destMarker.setVisible(false);
        this.dpadState[key] = true;
      });
      const off = () => { this.dpadState[key] = false; };
      bg.on('pointerup', off);
      bg.on('pointerout', off);
      this.touchContainer.add([bg, txt]);
    };

    makeDirBtn(78, height - 102, '▲', 'up');
    makeDirBtn(78, height - 34, '▼', 'down');
    makeDirBtn(34, height - 68, '◀', 'left');
    makeDirBtn(122, height - 68, '▶', 'right');

    this.actionBtn = createButton(this, width - 92, height - 62, 134, 52, 'Hablar / Usar', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      border: 0x86efac,
      fontSize: '15px',
      onClick: () => this.tryInteractNearest(),
    });
    this.touchContainer.add(this.actionBtn);
    this.touchContainer.setVisible(gameState.save.settings.showDpad);
  }

  refreshHud() {
    const run = gameState.run;
    this.calmaText.setText(`Calma: ${run.calma}%`);
    this.calmaBar.width = Math.max(2, (run.calma / 100) * 108);
    this.calmaBar.fillColor = run.calma >= 60 ? 0x22c55e : run.calma >= 35 ? 0xf59e0b : 0xef4444;
    this.energyText.setText(`⚡ ${run.autocuidado}`);

    let obj = '';
    if (this.mapData.id === 'cuarto') {
      if (!run.backpackTaken) obj = 'Recoge tu mochila azul';
      else if (!run.mirrorDone) obj = 'Acércate al espejo brillante';
      else obj = 'Camina a la puerta para ir al comedor';
    } else if (this.mapData.id === 'hogar') {
      if (!run.elenaResolved) obj = 'Habla con mamá (Elena)';
      else obj = 'Camina a la puerta para ir al colegio';
    } else if (this.mapData.id === 'colegio') {
      if (!run.mateoResolved) obj = 'Caso 1: Habla con Mateo en el pasillo (!)';
      else if (!run.aulaResolved) obj = 'Caso 2: Habla con Profe Ricardo en el aula (!)';
      else obj = 'Sal por la puerta arriba hacia el Patio';
    } else if (this.mapData.id === 'patio') {
      if (!run.patioResolved) obj = 'Caso 3: Habla con Mateo en la cancha (!)';
      else obj = 'Ve a la salida (★) para terminar el día';
    }
    this.objectiveText.setText(`Objetivo: ${obj}`);
  }

  refreshBadges() {
    const run = gameState.run;
    if (this.mapData.id === 'cuarto') {
      this.markers.backpack.badgeObj.setVisible(!run.backpackTaken);
      this.markers.mirror.badgeObj.setSymbol(run.mirrorDone ? '✓' : '!', run.mirrorDone ? 0x22c55e : 0xfbbf24);
      this.markers.door_hogar.badgeObj.setSymbol(run.mirrorDone ? '▸' : '🔒', run.mirrorDone ? 0x22c55e : 0x64748b);
    } else if (this.mapData.id === 'hogar') {
      this.npcSprites.elena.badgeObj.setSymbol(
        run.elenaResolved ? (run.elenaGood ? '♥' : '!') : '!',
        run.elenaResolved ? (run.elenaGood ? 0x22c55e : 0xef4444) : 0xfbbf24
      );
      this.markers.door_colegio.badgeObj.setSymbol(run.elenaResolved ? '▸' : '🔒', run.elenaResolved ? 0x22c55e : 0x64748b);
    } else if (this.mapData.id === 'colegio') {
      this.npcSprites.sofia.badgeObj.setSymbol(run.sofiaTalked ? '✓' : '?', run.sofiaTalked ? 0x22c55e : 0x38bdf8);
      this.npcSprites.mateo.badgeObj.setSymbol(run.mateoResolved ? '✓' : '!', run.mateoResolved ? 0x22c55e : 0xfbbf24);
      const ricardoSym = run.aulaResolved ? '✓' : (run.mateoResolved ? '!' : '?');
      const ricardoCol = run.aulaResolved ? 0x22c55e : (run.mateoResolved ? 0xfbbf24 : 0x38bdf8);
      this.npcSprites.ricardo.badgeObj.setSymbol(ricardoSym, ricardoCol);
      const patioOpen = run.mateoResolved && run.aulaResolved;
      this.markers.door_patio.badgeObj.setSymbol(patioOpen ? '▸' : '🔒', patioOpen ? 0x22c55e : 0x64748b);
    } else if (this.mapData.id === 'patio') {
      this.npcSprites.sofia_patio.badgeObj.setSymbol(run.sofiaPatioTalked ? '✓' : '?', run.sofiaPatioTalked ? 0x22c55e : 0x38bdf8);
      this.npcSprites.mateo_patio.badgeObj.setSymbol(run.patioResolved ? '✓' : '!', run.patioResolved ? 0x22c55e : 0xfbbf24);
      this.markers.door_finish.badgeObj.setSymbol(run.patioResolved ? '★' : '🔒', run.patioResolved ? 0x22c55e : 0x64748b);
    }
  }

  showInitialRoomMessage() {
    const run = gameState.run;
    if (this.mapData.id === 'cuarto' && !run.backpackTaken) {
      this.showDialogue('Valentic', 'valentic', gameState.story.tutorial.welcome, 'tut_welcome');
    } else if (this.mapData.id === 'hogar' && !run.elenaResolved) {
      this.showDialogue('Valentic', 'valentic', 'Estás en la cocina. Camina hacia mamá (!) para hablar con ella.', null);
    } else if (this.mapData.id === 'colegio' && !run.mateoResolved) {
      const msg = run.shadowFollowing
        ? '¡Cuidado! La Sombra te siguió desde casa. Saluda a Sofía (?) y habla con Mateo (!).'
        : 'Llegaste al colegio. Tienes dos retos aquí: primero con Mateo (!) en el pasillo y luego en el aula.';
      this.showDialogue('Valentic', 'valentic', msg, null);
    } else if (this.mapData.id === 'patio' && !run.patioResolved) {
      this.showDialogue('Valentic', 'valentic', 'Saliste al patio de recreo. Acércate a Mateo en la cancha (!) para el último reto.', null);
    }
  }

  showDialogue(speaker, portraitKey, text, voiceKey, onClose = null) {
    this.dialogueLayer.removeAll(true);
    this.dialogueOpen = true;
    this.walkTarget = null;
    this.destMarker.setVisible(false);

    const { width } = this.scale;
    this.dialogueLayer.add(drawPanel(this, 36, 396, width - 72, 130, 0x0f172a, 0.96, 0x38bdf8));

    if (portraitKey === 'valentic') {
      this.dialogueLayer.add(this.add.image(96, 462, 'valentic').setScale(0.18));
    } else if (portraitKey) {
      this.dialogueLayer.add(this.add.image(96, 462, portraitKey).setScale(0.95));
    }

    this.dialogueLayer.add(this.add.text(162, 412, speaker, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fde047',
    }));

    this.dialogueLayer.add(this.add.text(162, 438, text, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '17px',
      color: '#f8fafc',
      wordWrap: { width: 520 },
      lineSpacing: 4,
    }));

    if (voiceKey) {
      this.dialogueLayer.add(createButton(this, width - 270, 488, 118, 34, '▶ Repetir', {
        fill: 0x0f766e,
        hover: 0x0d9488,
        border: 0x99f6e4,
        fontSize: '13px',
        onClick: () => soundManager.replayVoice(),
      }));
      soundManager.playVoice(voiceKey);
    }

    this.dialogueCloseCb = () => {
      soundManager.stopVoice();
      this.dialogueLayer.removeAll(true);
      this.dialogueOpen = false;
      if (onClose) onClose();
    };

    this.dialogueLayer.add(createButton(this, width - 130, 488, 134, 36, 'Entendido ▸', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      border: 0x86efac,
      fontSize: '14px',
      onClick: () => this.dialogueCloseCb(),
    }));
  }

  getAllInteractables() {
    return [
      ...Object.values(this.markers),
      ...Object.values(this.npcSprites),
    ];
  }

  findInteractableAtPoint(x, y) {
    return this.getAllInteractables().find((item) => Phaser.Math.Distance.Between(x, y, item.x, item.y) <= 52) || null;
  }

  tryInteractNearest() {
    if (this.activeModal || this.dialogueOpen) return;
    let best = null;
    let bestDist = 86;
    this.getAllInteractables().forEach((item) => {
      const d = Phaser.Math.Distance.Between(this.alex.x, this.alex.y - 14, item.x, item.y);
      if (d < bestDist) {
        bestDist = d;
        best = item;
      }
    });
    if (best) {
      this.triggerInteract(best);
    }
  }

  isDoorUnlocked(doorId) {
    const run = gameState.run;
    if (doorId === 'door_hogar') return run.mirrorDone;
    if (doorId === 'door_colegio') return run.elenaResolved;
    if (doorId === 'door_patio') return run.mateoResolved && run.aulaResolved;
    if (doorId === 'door_finish') return run.patioResolved;
    return false;
  }

  checkAutoDoor() {
    for (const obj of Object.values(this.markers)) {
      if (obj.type !== 'door') continue;
      if (!this.isDoorUnlocked(obj.id)) continue;
      const d = Phaser.Math.Distance.Between(this.alex.x, this.alex.y - 12, obj.x, obj.y);
      if (d <= 44) {
        this.triggerInteract(obj);
        return true;
      }
    }
    return false;
  }

  triggerInteract(item) {
    const run = gameState.run;
    this.walkTarget = null;
    this.destMarker.setVisible(false);

    // Rutas específicas para los Días 2 a 5
    if (run.day === 2) {
      if (item.id === 'elena') {
        this.showDialogue('Elena (Mamá)', 'portrait_elena', '¡Buenos días, Alex! Que te vaya excelente hoy en el colegio presentando tu proyecto de ciencias con Mateo y Sofía.', null);
        return;
      }
      if (item.id === 'mateo') {
        if (run.mateoResolved) {
          this.showDialogue('Mateo', 'portrait_mateo', '¡Menos mal logramos arreglar la maqueta con pegamento! Ve al patio y luego a la salida.', null);
          return;
        }
        this.startEncounter('dia2_ciencia', (isGood) => {
          run.mateoResolved = true;
          run.mateoGood = isGood;
          this.refreshBadges();
          this.refreshHud();
          const out = gameState.story.encounters.dia2_ciencia.outcome;
          this.showDialogue(
            isGood ? 'Mateo' : 'Valentic',
            isGood ? 'portrait_mateo' : 'valentic',
            isGood ? out.goodMapLine : out.badMapLine,
            null
          );
        });
        return;
      }
    }

    if (run.day === 3) {
      if (item.id === 'mateo') {
        if (run.mateoResolved) {
          this.showDialogue('Mateo', 'portrait_mateo', 'Me alegra que hayamos hablado con la verdad sobre ese chisme. ¡Ve a la salida del patio!', null);
          return;
        }
        this.startEncounter('dia3_cafeteria', (isGood) => {
          run.mateoResolved = true;
          run.mateoGood = isGood;
          this.refreshBadges();
          this.refreshHud();
          const out = gameState.story.encounters.dia3_cafeteria.outcome;
          this.showDialogue(
            isGood ? 'Mateo' : 'Valentic',
            isGood ? 'portrait_mateo' : 'valentic',
            isGood ? out.goodMapLine : out.badMapLine,
            null
          );
        });
        return;
      }
    }

    if (run.day === 4) {
      if (item.id === 'ricardo') {
        if (run.aulaResolved) {
          this.showDialogue('Profe Ricardo', 'portrait_ricardo', '¡Felicitaciones por superar ese bloqueo con calma, Alex! Ya puedes salir al patio para terminar.', null);
          return;
        }
        this.startEncounter('dia4_examen', (isGood) => {
          run.aulaResolved = true;
          run.aulaGood = isGood;
          this.refreshBadges();
          this.refreshHud();
          const out = gameState.story.encounters.dia4_examen.outcome;
          this.showDialogue(
            isGood ? 'Profe Ricardo' : 'Valentic',
            isGood ? 'portrait_ricardo' : 'valentic',
            isGood ? out.goodMapLine : out.badMapLine,
            null
          );
        });
        return;
      }
    }

    if (run.day === 5) {
      if (item.id === 'mateo_patio') {
        if (run.patioResolved) {
          this.showDialogue('Mateo', 'portrait_mateo', '¡Eres un verdadero mediador, Alex! Ve a la salida para la ceremonia de graduación (★).', null);
          return;
        }
        this.startEncounter('dia5_festival', (isGood) => {
          run.patioResolved = true;
          run.patioGood = isGood;
          this.refreshBadges();
          this.refreshHud();
          const out = gameState.story.encounters.dia5_festival.outcome;
          this.showDialogue(
            isGood ? 'Mateo' : 'Valentic',
            isGood ? 'portrait_mateo' : 'valentic',
            isGood ? out.goodMapLine : out.badMapLine,
            null
          );
        });
        return;
      }
    }

    if (item.id === 'backpack') {
      if (run.backpackTaken) {
        this.showDialogue('Valentic', 'valentic', 'Ya llevas tu mochila lista. ¡Ahora ve al espejo!', null);
        return;
      }
      run.backpackTaken = true;
      soundManager.playPickup();
      this.refreshBadges();
      this.refreshHud();
      this.showDialogue('Valentic', 'valentic', gameState.story.tutorial.backpack, 'tut_backpack');
      return;
    }

    if (item.id === 'mirror') {
      if (!run.backpackTaken) {
        this.showDialogue('Valentic', 'valentic', 'Primero recoge tu mochila azul.', null);
        return;
      }
      if (run.mirrorDone) {
        this.showDialogue('Valentic', 'valentic', 'Ya practicaste tu Pausa Roja. ¡Sal por la puerta al comedor!', null);
        return;
      }
      this.openMirrorPractice();
      return;
    }

    if (item.id === 'door_hogar') {
      if (!run.mirrorDone) {
        soundManager.playError();
        this.showDialogue('Valentic', 'valentic', gameState.story.tutorial.doorHint, 'tut_door_hint');
        return;
      }
      soundManager.playClick();
      run.mapId = 'hogar';
      this.scene.restart();
      return;
    }

    if (item.id === 'elena') {
      if (run.elenaResolved) {
        const msg = run.elenaGood
          ? gameState.story.encounters.hogar_elena.outcome.goodMapLine
          : 'Ya pasaste este momento. Ve por la puerta abajo a la derecha hacia el colegio.';
        this.showDialogue('Elena (Mamá)', 'portrait_elena', msg, null);
        return;
      }
      this.startEncounter('hogar_elena', (isGood) => {
        run.elenaResolved = true;
        run.elenaGood = isGood;
        run.shadowFollowing = !isGood;
        this.shadowFollower.setVisible(run.shadowFollowing);
        this.refreshBadges();
        this.refreshHud();
        const out = gameState.story.encounters.hogar_elena.outcome;
        this.showDialogue(
          isGood ? 'Elena (Mamá)' : 'Valentic',
          isGood ? 'portrait_elena' : 'valentic',
          isGood ? out.goodMapLine : out.badMapLine,
          isGood ? 'hogar_elena_good' : 'hogar_elena_bad'
        );
      });
      return;
    }

    if (item.id === 'door_colegio') {
      if (!run.elenaResolved) {
        soundManager.playError();
        this.showDialogue('Valentic', 'valentic', 'Antes de ir al colegio, habla con mamá (!).', null);
        return;
      }
      soundManager.playClick();
      run.mapId = 'colegio';
      this.scene.restart();
      return;
    }

    if (item.id === 'sofia') {
      const sData = gameState.story.npcs.sofia;
      if (!run.sofiaTalked) {
        run.sofiaTalked = true;
        run.autocuidado += 1;
        soundManager.playPickup();
        this.refreshBadges();
        this.refreshHud();
        this.showDialogue('Sofía', 'portrait_sofia', `${sData.greeting}\n${sData.rewardMsg}`, 'npc_sofia');
      } else {
        this.showDialogue('Sofía', 'portrait_sofia', sData.greeting, 'npc_sofia');
      }
      return;
    }

    if (item.id === 'ricardo') {
      if (!run.mateoResolved) {
        const rData = gameState.story.npcs.ricardo;
        run.ricardoTalked = true;
        this.refreshBadges();
        this.showDialogue('Profe Ricardo', 'portrait_ricardo', rData.greeting, 'npc_ricardo');
        return;
      }
      if (!run.aulaResolved) {
        this.startEncounter('colegio_aula', (isGood) => {
          run.aulaResolved = true;
          run.aulaGood = isGood;
          this.refreshBadges();
          this.refreshHud();
          const out = gameState.story.encounters.colegio_aula.outcome;
          this.showDialogue(
            isGood ? 'Profe Ricardo' : 'Valentic',
            isGood ? 'portrait_ricardo' : 'valentic',
            isGood ? out.goodMapLine : out.badMapLine,
            isGood ? 'colegio_aula_good' : 'colegio_aula_bad'
          );
        });
        return;
      }
      this.showDialogue('Profe Ricardo', 'portrait_ricardo', '¡Buen trabajo! Ya puedes salir por la puerta hacia el Patio.', null);
      return;
    }

    if (item.id === 'mateo') {
      if (run.mateoResolved) {
        this.showDialogue('Mateo', 'portrait_mateo', 'Ya resolviste este choque. Ahora entra al aula para hablar con el Profe Ricardo (!).', null);
        return;
      }
      this.startEncounter('colegio_mateo', (isGood) => {
        run.mateoResolved = true;
        run.mateoGood = isGood;
        if (isGood) run.shadowFollowing = false;
        this.shadowFollower.setVisible(run.shadowFollowing);
        this.refreshBadges();
        this.refreshHud();
        const out = gameState.story.encounters.colegio_mateo.outcome;
        this.showDialogue(
          isGood ? 'Mateo' : 'Valentic',
          isGood ? 'portrait_mateo' : 'valentic',
          isGood ? out.goodMapLine : out.badMapLine,
          isGood ? 'colegio_mateo_good' : 'colegio_mateo_bad'
        );
      });
      return;
    }

    if (item.id === 'door_patio') {
      if (!run.mateoResolved || !run.aulaResolved) {
        soundManager.playError();
        this.showDialogue('Valentic', 'valentic', 'Primero resuelve los casos del pasillo y del aula (!).', null);
        return;
      }
      soundManager.playClick();
      run.mapId = 'patio';
      this.scene.restart();
      return;
    }

    if (item.id === 'sofia_patio') {
      run.sofiaPatioTalked = true;
      this.refreshBadges();
      this.showDialogue('Sofía', 'portrait_sofia', gameState.story.npcs.sofia_patio.greeting, 'npc_sofia_patio');
      return;
    }

    if (item.id === 'mateo_patio') {
      if (run.patioResolved) {
        this.showDialogue('Mateo', 'portrait_mateo', 'Ya terminaron el partido. ¡Ve a la salida (★)!', null);
        return;
      }
      this.startEncounter('colegio_patio', (isGood) => {
        run.patioResolved = true;
        run.patioGood = isGood;
        if (isGood) run.shadowFollowing = false;
        this.shadowFollower.setVisible(run.shadowFollowing);
        this.refreshBadges();
        this.refreshHud();
        const out = gameState.story.encounters.colegio_patio.outcome;
        this.showDialogue(
          isGood ? 'Mateo' : 'Valentic',
          isGood ? 'portrait_mateo' : 'valentic',
          isGood ? out.goodMapLine : out.badMapLine,
          isGood ? 'colegio_patio_good' : 'colegio_patio_bad'
        );
      });
      return;
    }

    if (item.id === 'door_finish') {
      const day = run.day || 1;
      let canFinish = false;
      if (day === 1) canFinish = run.patioResolved;
      else if (day === 2) canFinish = run.mateoResolved;
      else if (day === 3) canFinish = run.mateoResolved;
      else if (day === 4) canFinish = run.aulaResolved;
      else if (day === 5) canFinish = run.patioResolved;

      if (!canFinish) {
        soundManager.playError();
        this.showDialogue('Valentic', 'valentic', 'Primero resuelve el reto emocional de este día (!).', null);
        return;
      }
      soundManager.stopVoice();
      this.scene.start('VictoryScene');
      return;
    }
  }

  openMirrorPractice() {
    const { width, height } = this.scale;
    const c = this.add.container(0, 0).setDepth(60);
    c.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.74).setInteractive());
    c.add(drawPanel(this, 130, 100, width - 260, height - 200, 0x0f172a, 0.98, 0x38bdf8));

    c.add(this.add.image(230, 270, 'valentic').setScale(0.35));
    c.add(this.add.image(730, 184, 'portrait_sombra_hostil').setScale(1));

    c.add(this.add.text(320, 128, 'ESPEJO · PRÁCTICA DE LUZ ROJA', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#bae6fd',
    }));

    c.add(this.add.text(320, 168, gameState.story.tutorial.mirrorPrompt, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '16.5px',
      color: '#f8fafc',
      wordWrap: { width: 340 },
    }));

    soundManager.playVoice('tut_mirror_prompt');

    const track = this.add.rectangle(320, 290, 360, 20, 0x1e293b).setOrigin(0, 0.5).setStrokeStyle(2, 0x64748b);
    const bar = this.add.rectangle(322, 290, 2, 16, 0x22c55e).setOrigin(0, 0.5);
    c.add([track, bar]);

    let progress = 0;
    let holding = false;

    const btnBg = this.add.rectangle(500, 366, 380, 48, 0xdc2626).setStrokeStyle(2, 0xfca5a5);
    btnBg.setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(500, 366, '🌬 MANTÉN TECLA ESPACIO (O ESTE BOTÓN)', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    btnBg.on('pointerdown', () => {
      holding = true;
      btnBg.setFillStyle(0x0284c7);
    });
    const up = () => {
      holding = false;
      btnBg.setFillStyle(0xdc2626);
    };
    btnBg.on('pointerup', up);
    btnBg.on('pointerout', up);
    c.add([btnBg, btnTxt]);

    this.activeModal = {
      update: (delta) => {
        if (holding || this.wasd.act2.isDown) {
          progress = Math.min(1, progress + delta / 2400);
          bar.width = Math.max(2, 356 * progress);
          if (progress >= 1) {
            soundManager.playSuccess();
            gameState.run.mirrorDone = true;
            gameState.run.autocuidado += 1;
            c.destroy();
            this.activeModal = null;
            this.refreshBadges();
            this.refreshHud();
            this.showDialogue('Valentic', 'valentic', gameState.story.tutorial.mirrorDone, 'tut_mirror_done');
          }
        }
      },
    };
  }

  startEncounter(encId, onDone) {
    this.activeModal = new EncounterModal(this, encId, (isGood) => {
      this.activeModal = null;
      soundManager.playBGM(this.mapData.bgm);

      // ¡Recarga de energía con Minijuego de ValenTIC al azar!
      const minigames = ['flappy', 'popcorn', 'river', 'mario', 'subway'];
      const chosen = Phaser.Utils.Array.GetRandom(minigames);

      this.scene.pause();
      this.scene.launch('MinigameScene', {
        mode: 'story',
        type: chosen,
        onComplete: () => {
          this.scene.stop('MinigameScene');
          this.scene.resume();
          soundManager.playBGM(this.mapData.bgm);
          onDone(isGood);
        },
      });
    });
  }

  openPauseMenu() {
    if (this.activeModal) return;
    const { width, height } = this.scale;
    const c = this.add.container(0, 0).setDepth(65);
    c.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.75).setInteractive());
    c.add(drawPanel(this, 240, 100, 480, 340, 0x0f172a, 0.98, 0x60a5fa));

    c.add(this.add.text(width / 2, 138, 'Pausa y Opciones', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5));

    const vLbl = () => `Voces habladas: ${gameState.save.settings.voiceEnabled ? 'Sí' : 'No'}`;
    const mLbl = () => `Audio general: ${gameState.save.settings.muted ? 'Silencio' : 'Activo'}`;
    const tLbl = () => `Reloj Sombra: ${gameState.save.settings.noTimerMode ? 'Sin límite' : '30 segundos'}`;
    const dLbl = () => `Controles táctiles: ${gameState.save.settings.showDpad ? 'Visibles' : 'Ocultos'}`;

    const b1 = createButton(this, width / 2, 190, 360, 38, vLbl(), {
      fill: 0x0f766e,
      hover: 0x0d9488,
      onClick: () => { gameState.toggleVoice(); soundManager.syncVolumes(); b1.setLabel(vLbl()); },
    });
    const b2 = createButton(this, width / 2, 236, 360, 38, mLbl(), {
      fill: 0x1d4ed8,
      hover: 0x2563eb,
      onClick: () => { gameState.toggleMuted(); soundManager.syncVolumes(); b2.setLabel(mLbl()); },
    });
    const b3 = createButton(this, width / 2, 282, 360, 38, tLbl(), {
      fill: 0x7c3aed,
      hover: 0x8b5cf6,
      onClick: () => { gameState.toggleNoTimer(); b3.setLabel(tLbl()); },
    });
    const b4 = createButton(this, width / 2, 328, 360, 38, dLbl(), {
      fill: 0x334155,
      hover: 0x475569,
      onClick: () => {
        const vis = gameState.toggleDpad();
        this.touchContainer.setVisible(vis);
        b4.setLabel(dLbl());
      },
    });
    const bResume = createButton(this, width / 2 - 90, 388, 165, 40, 'Seguir jugando', {
      fill: 0x16a34a,
      hover: 0x22c55e,
      onClick: () => { c.destroy(); this.activeModal = null; },
    });
    const bMenu = createButton(this, width / 2 + 95, 388, 155, 40, 'Salir al Menú', {
      fill: 0x991b1b,
      hover: 0xdc2626,
      onClick: () => { soundManager.stopVoice(); this.scene.start('MenuScene'); },
    });
    c.add([b1, b2, b3, b4, bResume, bMenu]);

    this.activeModal = { update: () => {} };
  }

  canWalkTo(x, y) {
    // Caja de colisión compacta en los pies de Alex
    const pts = [
      { x: x - 12, y: y - 10 },
      { x: x + 12, y: y - 10 },
      { x: x - 12, y: y + 4 },
      { x: x + 12, y: y + 4 },
    ];
    for (const pt of pts) {
      const { col, row } = this.worldToTile(pt.x, pt.y);
      if (row < 0 || row >= this.mapData.grid.length || col < 0 || col >= this.mapData.grid[0].length) {
        return false;
      }
      const tileId = this.mapData.grid[row][col];
      if (!WALKABLE_TILES.has(tileId)) return false;
    }
    // Colisión suave contra NPCs
    for (const npc of Object.values(this.npcSprites)) {
      if (Phaser.Math.Distance.Between(x, y, npc.x, npc.y + 6) < 30) {
        return false;
      }
    }
    return true;
  }

  updateGuideHint(delta) {
    this.idleTimer += delta;
    if (this.idleTimer < 4500 || this.activeModal || this.dialogueOpen) {
      this.guideRing.setVisible(false);
      return;
    }
    const run = gameState.run;
    let target = null;
    if (this.mapData.id === 'cuarto') {
      target = !run.backpackTaken ? this.markers.backpack : (!run.mirrorDone ? this.markers.mirror : this.markers.door_hogar);
    } else if (this.mapData.id === 'hogar') {
      target = !run.elenaResolved ? this.npcSprites.elena : this.markers.door_colegio;
    } else if (this.mapData.id === 'colegio') {
      if (!run.mateoResolved) target = this.npcSprites.mateo;
      else if (!run.aulaResolved) target = this.npcSprites.ricardo;
      else target = this.markers.door_patio;
    } else if (this.mapData.id === 'patio') {
      target = !run.patioResolved ? this.npcSprites.mateo_patio : this.markers.door_finish;
    }
    if (target) {
      this.guideRing.setPosition(target.x, target.y).setVisible(true);
    }
  }

  update(_time, delta) {
    if (this.activeModal) {
      this.activeModal.update(delta);
      return;
    }

    if (this.dialogueOpen) {
      if (
        Phaser.Input.Keyboard.JustDown(this.wasd.act1)
        || Phaser.Input.Keyboard.JustDown(this.wasd.act2)
        || Phaser.Input.Keyboard.JustDown(this.wasd.act3)
      ) {
        if (this.dialogueCloseCb) this.dialogueCloseCb();
      }
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.wasd.act1)
      || Phaser.Input.Keyboard.JustDown(this.wasd.act2)
      || Phaser.Input.Keyboard.JustDown(this.wasd.act3)
    ) {
      this.tryInteractNearest();
      return;
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown || this.dpadState.left) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown || this.dpadState.right) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown || this.dpadState.up) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown || this.dpadState.down) vy += 1;

    if (vx !== 0 || vy !== 0) {
      this.walkTarget = null;
      this.destMarker.setVisible(false);
      this.idleTimer = 0;
    } else if (this.walkTarget) {
      const dx = this.walkTarget.x - this.alex.x;
      const dy = this.walkTarget.y - (this.alex.y - 8);
      const dist = Math.hypot(dx, dy);
      if (this.walkTarget.target && dist <= 52) {
        const tgt = this.walkTarget.target;
        this.walkTarget = null;
        this.destMarker.setVisible(false);
        this.triggerInteract(tgt);
        return;
      }
      if (dist <= 10) {
        this.walkTarget = null;
        this.destMarker.setVisible(false);
      } else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }

    const speed = 185;
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy) || 1;
      const nx = (vx / len) * speed * (delta / 1000);
      const ny = (vy / len) * speed * (delta / 1000);

      if (this.canWalkTo(this.alex.x + nx, this.alex.y)) {
        this.alex.x += nx;
      }
      if (this.canWalkTo(this.alex.x, this.alex.y + ny)) {
        this.alex.y += ny;
      }

      if (Math.abs(vx) > Math.abs(vy)) {
        this.alexDir = vx < 0 ? 'left' : 'right';
      } else {
        this.alexDir = vy < 0 ? 'up' : 'down';
      }
      this.alex.play(`rpg_alex_walk_${this.alexDir}`, true);

      // Si el click-to-walk quedó atascado en un mueble, detenerlo amablemente
      if (this.walkTarget) {
        const moved = Math.hypot(this.alex.x - this.lastPos.x, this.alex.y - this.lastPos.y);
        if (moved < 0.35) {
          this.blockedTimer += delta;
          if (this.blockedTimer > 320) {
            this.walkTarget = null;
            this.destMarker.setVisible(false);
            this.blockedTimer = 0;
          }
        } else {
          this.blockedTimer = 0;
        }
      }
    } else {
      this.alex.play(`rpg_alex_idle_${this.alexDir}`, true);
    }

    this.lastPos.x = this.alex.x;
    this.lastPos.y = this.alex.y;

    if (this.checkAutoDoor()) {
      return;
    }

    // La Sombra persigue suavemente a Alex si el conflicto del hogar escaló
    if (this.shadowFollower.visible) {
      const dx = this.alex.x - this.shadowFollower.x;
      const dy = this.alex.y - this.shadowFollower.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 44) {
        this.shadowFollower.x += (dx / dist) * 145 * (delta / 1000);
        this.shadowFollower.y += (dy / dist) * 145 * (delta / 1000);
        const sDir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        this.shadowFollower.play(`rpg_sombra_hostil_walk_${sDir}`, true);
      } else {
        this.shadowFollower.play(`rpg_sombra_hostil_idle_${this.alexDir}`, true);
      }
    }

    this.updateGuideHint(delta);
  }
}
