import { gameState } from '../systems/GameState.js';
import { soundManager } from '../systems/SoundManager.js';
import { createButton, drawPanel, shuffle } from './UIHelpers.js';

export class EncounterModal {
  constructor(scene, encounterId, onFinish) {
    this.scene = scene;
    this.encId = encounterId;
    this.enc = gameState.story.encounters[encounterId];
    this.onFinish = onFinish;

    this.container = scene.add.container(0, 0).setDepth(60);
    this.stage = 'PROVOCATION';
    this.breathProgress = 0;
    this.holdActive = false;
    this.sparksRemaining = 3;
    this.shadowTimerActive = false;
    this.shadowTime = 30;
    this.lastTickSec = -1;

    this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.showProvocation();
  }

  clear() {
    this.holdActive = false;
    this.shadowTimerActive = false;
    this.container.removeAll(true);
  }

  addBackdrop(borderColor = 0x60a5fa, fillColor = 0x0f172a) {
    const { width, height } = this.scene.scale;
    const dim = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.72).setInteractive();
    const box = drawPanel(this.scene, 76, 68, width - 152, height - 110, fillColor, 0.98, borderColor);
    this.container.add([dim, box]);
  }

  showProvocation() {
    this.clear();
    this.stage = 'PROVOCATION';
    this.addBackdrop(0xef4444);
    soundManager.playAlert();
    soundManager.playVoice(`${this.encId}_prov`);

    const s = this.scene;
    const { width } = s.scale;

    this.container.add(drawPanel(s, 108, 96, 112, 112, 0x1e293b, 1, 0xef4444));
    this.container.add(s.add.image(164, 152, this.enc.portrait).setScale(1));

    this.container.add(s.add.text(244, 104, this.enc.characterName, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fca5a5',
    }));

    this.container.add(s.add.text(244, 144, this.enc.provocation, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      wordWrap: { width: 580 },
      lineSpacing: 6,
    }));

    // Valentic exacto de campaña invita a frenar en Rojo
    this.container.add(s.add.image(186, 368, 'valentic').setScale(1));
    this.container.add(drawPanel(s, 276, 286, 550, 96, 0x172554, 1, 0x38bdf8));
    this.container.add(s.add.text(298, 306, 'Valentic: "¡Cuidado! No respondas con rabia.\nVamos a usar el Semáforo Emocional juntos."', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#e0f2fe',
      lineSpacing: 6,
    }));

    this.container.add(createButton(s, 360, 444, 160, 42, '▶ Repetir voz', {
      fill: 0x0f766e,
      hover: 0x0d9488,
      border: 0x99f6e4,
      fontSize: '14px',
      onClick: () => soundManager.replayVoice(),
    }));

    this.container.add(createButton(s, width - 250, 444, 250, 46, 'Luz Roja: ¡Respirar! ▸', {
      fill: 0xdc2626,
      hover: 0xef4444,
      border: 0xfca5a5,
      fontSize: '17px',
      onClick: () => this.showRedPause(),
    }));
  }

  showRedPause() {
    this.clear();
    this.stage = 'RED';
    this.breathProgress = 0;
    this.sparksRemaining = 3;
    this.addBackdrop(0xef4444);
    soundManager.playVoice(`${this.encId}_red_tip`);

    const s = this.scene;
    const { width } = s.scale;

    this.container.add(s.add.image(176, 310, 'valentic').setScale(1));
    this.container.add(s.add.text(276, 98, '1. LUZ ROJA · ¡ALTO Y ENFRÍA LAS CHISPAS!', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#fca5a5',
    }));

    this.container.add(s.add.text(276, 134, this.enc.redTip, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '17px',
      color: '#f8fafc',
      wordWrap: { width: 570 },
    }));

    // 3 chispas visuales que se apagan al respirar
    this.sparks = [0, 1, 2].map((idx) => {
      const sp = s.add.circle(430 + idx * 90, 212, 18, 0xef4444, 0.95).setStrokeStyle(3, 0xfef08a);
      this.container.add(sp);
      return sp;
    });

    this.breathRing = s.add.circle(520, 304, 30, 0x38bdf8, 0.25).setStrokeStyle(3, 0x38bdf8);
    this.breathLabel = s.add.text(520, 360, 'Mantén presionada la tecla ESPACIO (o el botón azul) 3s', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#bae6fd',
    }).setOrigin(0.5);

    const track = s.add.rectangle(340, 392, 360, 18, 0x1e293b).setOrigin(0, 0.5).setStrokeStyle(1.5, 0x64748b);
    this.breathBar = s.add.rectangle(342, 392, 2, 14, 0x38bdf8).setOrigin(0, 0.5);
    this.container.add([this.breathRing, this.breathLabel, track, this.breathBar]);

    const holdBg = s.add.rectangle(520, 450, 400, 48, 0x0284c7).setStrokeStyle(2.5, 0xbae6fd);
    holdBg.setInteractive({ useHandCursor: true });
    const holdTxt = s.add.text(520, 450, '🌬 MANTÉN ESPACIO (O ESTE BOTÓN)', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    holdBg.on('pointerdown', () => {
      this.holdActive = true;
      holdBg.setFillStyle(0x16a34a);
    });
    const release = () => {
      this.holdActive = false;
      holdBg.setFillStyle(0x0284c7);
    };
    holdBg.on('pointerup', release);
    holdBg.on('pointerout', release);
    this.container.add([holdBg, holdTxt]);
  }

  showYellowDecoder() {
    this.clear();
    this.stage = 'DECODER';
    this.addBackdrop(0xf59e0b);
    soundManager.playVoice(`${this.encId}_dec_prompt`);

    const s = this.scene;
    const { width } = s.scale;

    this.container.add(s.add.image(176, 300, 'valentic').setScale(1));
    this.container.add(s.add.text(276, 98, '2. LUZ AMARILLA · USA TU LUPA DE EMPATÍA', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fcd34d',
    }));

    this.container.add(s.add.text(276, 134, this.enc.decoder.prompt, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#ffffff',
      wordWrap: { width: 570 },
    }));

    const feedbackTxt = s.add.text(276, 392, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fde68a',
      wordWrap: { width: 570 },
    });
    this.container.add(feedbackTxt);

    let done = false;
    const opts = shuffle(this.enc.decoder.options);
    opts.forEach((opt, idx) => {
      const y = 206 + idx * 58;
      this.container.add(createButton(s, 560, y, 566, 48, `${opt.icon}  ${opt.text}`, {
        fill: 0x1e293b,
        hover: 0x334155,
        border: 0xf59e0b,
        fontSize: '15.5px',
        onClick: () => {
          if (done) return;
          done = true;
          if (opt.isCorrect) {
            soundManager.playSuccess();
            gameState.addCalma(10);
            gameState.run.autocuidado += 1;
            feedbackTxt.setColor('#86efac').setText(`✓ ${opt.feedback}`);
          } else {
            soundManager.playError();
            gameState.addTension(10);
            feedbackTxt.setColor('#fca5a5').setText(`✗ ${opt.feedback}`);
          }
          this.scene.refreshHud();

          this.container.add(createButton(s, width - 250, 456, 250, 44, 'Enfrentar a La Sombra ▸', {
            fill: 0xd97706,
            hover: 0xf59e0b,
            border: 0xfde68a,
            onClick: () => this.showShadowPhase(),
          }));
        },
      }));
    });
  }

  showShadowPhase() {
    this.clear();
    this.stage = 'SHADOW';
    this.addBackdrop(0xa855f7, 0x090d16);
    soundManager.playBGM('bgm_tenso');

    const s = this.scene;
    const { width } = s.scale;
    const noTimer = gameState.save.settings.noTimerMode;

    this.shadowPortrait = s.add.image(164, 160, 'portrait_sombra_hostil').setScale(1.2);
    this.container.add(this.shadowPortrait);
    this.container.add(s.add.image(164, 354, 'valentic').setScale(0.88));

    this.container.add(s.add.text(266, 98, '2B. CALMA A LA SOMBRA', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#d8b4fe',
    }));

    this.container.add(s.add.text(266, 130, `La Sombra susurra: ${this.enc.shadow.whisper}`, {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '17px',
      fontStyle: 'italic',
      color: '#fecaca',
      wordWrap: { width: 590 },
    }));

    this.shadowTime = 30;
    this.shadowTimerActive = false;
    this.lastTickSec = -1;
    this.shadowDone = false;

    this.timerLabel = s.add.text(266, 184, noTimer
      ? '∞ Modo sin reloj activado — lee tranquilo'
      : '🔊 Escuchando a La Sombra... el reloj de 30s iniciará al terminar.', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fde047',
    });
    const tTrack = s.add.rectangle(266, 206, 580, 10, 0x1e293b).setOrigin(0, 0.5);
    this.timerBar = s.add.rectangle(266, 206, 580, 10, 0xa855f7).setOrigin(0, 0.5);
    this.container.add([this.timerLabel, tTrack, this.timerBar]);

    const feedbackTxt = s.add.text(266, 404, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '15.5px',
      fontStyle: 'bold',
      color: '#e2e8f0',
      wordWrap: { width: 580 },
    });
    this.container.add(feedbackTxt);

    const resolve = (isGood, msg) => {
      if (this.shadowDone) return;
      this.shadowDone = true;
      this.shadowTimerActive = false;

      if (isGood) {
        if (gameState.run.autocuidado > 0) gameState.run.autocuidado -= 1;
        gameState.addCalma(10);
        gameState.addTension(-15);
        this.shadowPortrait.setTexture('portrait_sombra_calma');
        soundManager.playSuccess();
        feedbackTxt.setColor('#86efac').setText(`✨ ${msg}`);
      } else {
        gameState.addCalma(-20);
        gameState.addTension(20);
        soundManager.playError();
        feedbackTxt.setColor('#fca5a5').setText(`⚠ ${msg}`);
      }
      this.scene.refreshHud();

      this.container.add(createButton(s, width - 250, 458, 250, 44, 'Luz Verde: ¡Hablar! ▸', {
        fill: 0x16a34a,
        hover: 0x22c55e,
        border: 0x86efac,
        onClick: () => this.showGreenCNV(),
      }));
    };

    const renderOptions = () => {
      const opts = shuffle(this.enc.shadow.options);
      opts.forEach((opt, idx) => {
        const y = 246 + idx * 54;
        this.container.add(createButton(s, 556, y, 580, 46, opt.text, {
          fill: 0x1e1b4b,
          hover: 0x312e81,
          border: 0xa855f7,
          fontSize: '14.5px',
          onClick: () => resolve(opt.isCorrect, opt.feedback),
        }));
      });

      if (!noTimer) {
        this.freezeBtn = createButton(s, 390, 458, 230, 38, '❄ Valentic: +10s extra', {
          fill: 0x0284c7,
          hover: 0x0ea5e9,
          border: 0xbae6fd,
          fontSize: '13.5px',
          onClick: () => {
            this.shadowTime = Math.min(35, this.shadowTime + 10);
            this.timerLabel.setText(`⏱ Tiempo restante: ${this.shadowTime.toFixed(0)}s (+10s de Valentic)`);
          },
        });
        this.container.add(this.freezeBtn);
      }
    };

    if (gameState.run.autocuidado >= 1) {
      renderOptions();
      this.onShadowTimeout = () => resolve(false, this.enc.shadow.failText);
      soundManager.playVoice(`${this.encId}_shadow`, () => {
        if (this.stage === 'SHADOW' && !this.shadowDone && !noTimer) {
          this.shadowTimerActive = true;
          this.timerLabel.setText('⏱ Tienes 30s para elegir un pensamiento de calma:');
        }
      });
    } else {
      // Si no tiene energía, Valentic permite recargar con 1 clic sin prisa
      this.timerLabel.setText('⚡ Necesitas 1 Energía de Calma para frenar a La Sombra');
      soundManager.playVoice(`${this.encId}_shadow`);
      this.container.add(createButton(s, 556, 290, 420, 56, '🌬 Respirar con Valentic (+1 ⚡ Energía)', {
        fill: 0xb45309,
        hover: 0xd97706,
        border: 0xfde68a,
        fontSize: '16px',
        onClick: () => {
          soundManager.playSuccess();
          gameState.run.autocuidado += 1;
          this.scene.refreshHud();
          this.showShadowPhase();
        },
      }));
    }
  }

  showGreenCNV() {
    this.clear();
    this.stage = 'CNV';
    this.addBackdrop(0x22c55e);
    soundManager.playBGM(this.scene.mapData.bgm);
    soundManager.playVoice('valentic_green_guide');

    const s = this.scene;
    const { width } = s.scale;

    this.container.add(s.add.text(104, 96, '3. LUZ VERDE · ARMA TU RESPUESTA EN 3 COLORES', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#86efac',
    }));

    const steps = [
      { key: 'hecho', title: '1. QUÉ PASÓ', color: 0x0284c7 },
      { key: 'sentimiento', title: '2. CÓMO ME SIENTO', color: 0xd97706 },
      { key: 'peticion', title: '3. QUÉ PIDO', color: 0x16a34a },
    ];

    const picked = { hecho: null, sentimiento: null, peticion: null };
    const slotTexts = {};
    let currentStep = 0;

    steps.forEach((st, idx) => {
      const sx = 104 + idx * 256;
      this.container.add(drawPanel(s, sx, 138, 240, 92, 0x1e293b, 1, st.color));
      this.container.add(s.add.text(sx + 12, 148, st.title, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f8fafc',
      }));
      slotTexts[st.key] = s.add.text(sx + 12, 170, '(Elige abajo)', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#94a3b8',
        wordWrap: { width: 216 },
      });
      this.container.add(slotTexts[st.key]);
    });

    const optArea = s.add.container(0, 0);
    this.container.add(optArea);

    const drawStep = () => {
      optArea.removeAll(true);
      if (currentStep < steps.length) {
        const st = steps[currentStep];
        optArea.add(s.add.text(104, 252, `Paso ${currentStep + 1}/3 · Toca la ficha para [${st.title}]:`, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#fde047',
        }));

        const choices = shuffle(this.enc.cnv[st.key]);
        choices.forEach((ch, idx) => {
          optArea.add(createButton(s, width / 2, 316 + idx * 72, 740, 56, ch.text, {
            fill: 0x1e293b,
            hover: 0x334155,
            border: st.color,
            fontSize: '16px',
            onClick: () => {
              picked[st.key] = ch;
              slotTexts[st.key].setText(ch.text).setColor('#ffffff');
              currentStep += 1;
              drawStep();
            },
          }));
        });
      } else {
        const fullLine = `${picked.hecho.text} ${picked.sentimiento.text} ${picked.peticion.text}`;
        optArea.add(drawPanel(s, 104, 256, 752, 108, 0x090d16, 1, 0x22c55e));
        optArea.add(s.add.text(124, 278, `"${fullLine}"`, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '17px',
          fontStyle: 'italic',
          color: '#f8fafc',
          wordWrap: { width: 712 },
        }));

        const resetBtn = createButton(s, 260, 428, 220, 44, '↺ Cambiar Fichas', {
          fill: 0x475569,
          hover: 0x64748b,
          onClick: () => {
            currentStep = 0;
            steps.forEach((st) => {
              picked[st.key] = null;
              slotTexts[st.key].setText('(Elige abajo)').setColor('#94a3b8');
            });
            drawStep();
          },
        });

        const speakBtn = createButton(s, 640, 428, 290, 46, '🗣 ¡Decir Respuesta! ▸', {
          fill: 0x16a34a,
          hover: 0x22c55e,
          border: 0x86efac,
          fontSize: '17px',
          onClick: () => {
            const isClean = Boolean(picked.hecho.valid && picked.sentimiento.valid && picked.peticion.valid);
            if (isClean) {
              gameState.addCalma(15);
              gameState.addTension(-15);
              soundManager.playSuccess();
              resetBtn.destroy();
              speakBtn.destroy();

              let done = false;
              const finish = () => {
                if (done) return;
                done = true;
                this.close(true);
              };
              optArea.add(s.add.text(290, 428, '🗣 Alex hablando con respeto...', {
                fontFamily: 'Trebuchet MS, sans-serif',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#86efac',
              }).setOrigin(0.5));
              optArea.add(createButton(s, 690, 428, 220, 42, 'Continuar ▸', {
                fill: 0x2563eb,
                hover: 0x3b82f6,
                onClick: finish,
              }));
              soundManager.playVoice(`${this.encId}_cnv_clean`, finish);
            } else {
              gameState.addCalma(-20);
              gameState.addTension(20);
              soundManager.playError();
              this.close(false);
            }
          },
        });

        optArea.add([resetBtn, speakBtn]);
      }
    };

    drawStep();
  }

  close(isGoodOutcome) {
    this.clear();
    this.container.destroy();
    this.onFinish(isGoodOutcome);
  }

  update(delta) {
    if (this.stage === 'RED') {
      const holding = this.holdActive || this.spaceKey.isDown;
      if (holding) {
        this.breathProgress = Math.min(1, this.breathProgress + delta / 3000);
        this.breathRing.setRadius(30 + Math.sin(this.breathProgress * Math.PI) * 22);
        this.breathBar.width = Math.max(2, 356 * this.breathProgress);
        const extinguished = Math.floor(this.breathProgress * 3);
        this.sparks.forEach((sp, idx) => {
          if (idx < extinguished && sp.visible) {
            sp.setVisible(false);
            soundManager.playSparkOut();
          }
        });
        if (this.breathProgress >= 1) {
          soundManager.playSuccess();
          this.showYellowDecoder();
        }
      } else if (this.breathProgress > 0) {
        this.breathProgress = Math.max(0, this.breathProgress - delta / 5000);
        this.breathBar.width = Math.max(2, 356 * this.breathProgress);
      }
    }

    if (this.stage === 'SHADOW' && this.shadowTimerActive && !this.shadowDone) {
      this.shadowTime = Math.max(0, this.shadowTime - delta / 1000);
      this.timerBar.width = Math.max(2, (this.shadowTime / 30) * 580);
      this.timerLabel.setText(`⏱ Tienes ${this.shadowTime.toFixed(0)}s para elegir un pensamiento de calma:`);

      const sec = Math.ceil(this.shadowTime);
      if (sec <= 5 && sec > 0 && sec !== this.lastTickSec) {
        this.lastTickSec = sec;
        soundManager.playTick();
      }
      if (this.shadowTime <= 0 && this.onShadowTimeout) {
        this.onShadowTimeout();
      }
    }
  }
}
