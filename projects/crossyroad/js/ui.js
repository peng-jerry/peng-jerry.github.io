import { POWERUP_DEFS } from './powerups.js';

const HIGH_SCORE_KEY = 'crossyRoadHighScore';

export class UI {
  constructor() {
    this.scoreEl = document.getElementById('score');
    this.startScreen = document.getElementById('start-screen');
    this.gameOverScreen = document.getElementById('gameover-screen');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalBestEl = document.getElementById('final-best');
    this.startBestEl = document.getElementById('start-best');
    this.hud = document.getElementById('hud');
    this.powerupRow = document.getElementById('powerup-row');
    this.powerupIcons = {}; // type -> element

    this.highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
    this.startBestEl.textContent = this.highScore;
  }

  showStart() {
    this.startScreen.classList.remove('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.hud.classList.add('hidden');
  }

  showPlaying() {
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  showGameOver(score) {
    const isNewBest = score > this.highScore;
    if (isNewBest) {
      this.highScore = score;
      localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
    }
    this.finalScoreEl.textContent = score;
    this.finalBestEl.textContent = this.highScore;
    this.gameOverScreen.classList.remove('hidden');
    this.gameOverScreen.classList.toggle('new-best', isNewBest);
    this.hud.classList.add('hidden');
  }

  setScore(score) {
    this.scoreEl.textContent = score;
  }

  updatePowerups(powerups) {
    const active = {
      shield: powerups.shield,
      floatie: powerups.floatieHeld || powerups.floatieActive,
      x2score: powerups.x2Time > 0,
      frog: powerups.frogTime > 0,
    };

    for (const type of Object.keys(POWERUP_DEFS)) {
      if (active[type] && !this.powerupIcons[type]) {
        this.powerupIcons[type] = this._createIcon(type);
        this.powerupRow.appendChild(this.powerupIcons[type]);
      } else if (!active[type] && this.powerupIcons[type]) {
        this.powerupIcons[type].remove();
        delete this.powerupIcons[type];
      }
    }

    if (active.x2score) this._setCooldown('x2score', powerups.x2Time / POWERUP_DEFS.x2score.duration);
    if (active.frog) this._setCooldown('frog', powerups.frogTime / POWERUP_DEFS.frog.duration);
    if (active.floatie) {
      this.powerupIcons.floatie.classList.toggle('powerup-icon--in-use', powerups.floatieActive);
    }
  }

  _createIcon(type) {
    const def = POWERUP_DEFS[type];
    const el = document.createElement('div');
    el.className = 'powerup-icon';
    el.style.setProperty('--pu-color', `#${def.color.toString(16).padStart(6, '0')}`);
    el.innerHTML = `
      <div class="powerup-icon-emoji">${def.emoji}</div>
      ${def.duration ? '<div class="powerup-cooldown"></div>' : ''}
    `;
    return el;
  }

  _setCooldown(type, fraction) {
    const el = this.powerupIcons[type];
    if (!el) return;
    const ring = el.querySelector('.powerup-cooldown');
    if (ring) ring.style.setProperty('--remaining', Math.max(0, Math.min(1, fraction)));
  }
}
