import * as THREE from 'three';
import {
  TILE_SIZE, COL_BOUND, MIN_ROWS_BEHIND_BEST,
  HOP_DURATION, HOP_HEIGHT, COLORS, clamp,
  POWERUP_TIMED_DURATION, SHIELD_INVULN_AFTER_SAVE,
} from './constants.js';
import { buildEquipVisual, animateEquipVisual } from './powerups.js';

const FACING = {
  forward: 0,
  back: Math.PI,
  left: Math.PI / 2,
  right: -Math.PI / 2,
};

function buildChickenMesh(bodyColor) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const combMat = new THREE.MeshLambertMaterial({ color: COLORS.playerComb });
  const beakMat = new THREE.MeshLambertMaterial({ color: COLORS.playerBeak });
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.62), bodyMat);
  body.position.y = 0.42;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.4), bodyMat);
  head.position.set(0, 0.78, -0.18);
  group.add(head);

  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.12), combMat);
  comb.position.set(0, 1.0, -0.22);
  group.add(comb);

  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), beakMat);
  beak.position.set(0, 0.76, -0.4);
  group.add(beak);

  const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.13, 0.84, -0.39);
  group.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(-0.13, 0.84, -0.39);
  group.add(eyeR);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.16), bodyMat);
  tail.position.set(0, 0.62, 0.32);
  tail.rotation.x = -0.5;
  group.add(tail);

  const legMat = new THREE.MeshLambertMaterial({ color: COLORS.playerBeak });
  const legGeo = new THREE.BoxGeometry(0.1, 0.2, 0.1);
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(0.16, 0.1, 0);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(-0.16, 0.1, 0);
  group.add(legR);

  group.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = false;
  });

  return group;
}

function buildShadowBlob() {
  const geo = new THREE.CircleGeometry(0.32, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.011;
  return mesh;
}

export class Player {
  constructor(scene, bodyColor = COLORS.player) {
    this.row = 0;
    this.col = 0;
    this.x = 0; // continuous world x (drifts while riding logs)
    this.bestRow = 0;
    this.score = 0;

    this.mesh = buildChickenMesh(bodyColor);
    this.shadow = buildShadowBlob();
    this.root = new THREE.Group();
    this.root.add(this.shadow);
    this.root.add(this.mesh);
    this.root.position.set(0, 0, 0);
    scene.add(this.root);

    this.hopping = false;
    this.hopT = 0;
    this.hopFrom = new THREE.Vector3();
    this.hopTo = new THREE.Vector3();
    this.queuedMove = null;

    this.alive = true;
    this.deathCause = null;
    this.deathT = 0;

    this.onLog = false;
    this.facing = FACING.forward;

    this.clock = 0;
    this.invulnT = 0; // brief grace period right after a shield absorbs a hit
    this.powerups = {
      shield: false,
      floatieHeld: false,
      floatieActive: false,
      x2Time: 0,
      frogTime: 0,
    };
    this.equipVisuals = {}; // type -> THREE.Group attached to root
    this.lastCollected = null;
  }

  get worldZ() {
    return -this.row * TILE_SIZE;
  }

  tryMove(dRow, dCol, world) {
    if (!this.alive) return false;
    if (this.hopping) {
      this.queuedMove = [dRow, dCol];
      return false;
    }
    return this._executeMove(dRow, dCol, world);
  }

  _executeMove(dRow, dCol, world) {
    if (this.powerups.frogTime > 0) {
      dRow *= 2;
      dCol *= 2;
    }

    const snappedCol = Math.round(this.x / TILE_SIZE);
    const newRow = this.row + dRow;
    const newCol = clamp(snappedCol + dCol, -COL_BOUND, COL_BOUND);

    if (dCol !== 0 && snappedCol + dCol !== newCol) return false; // blocked by side wall
    if (dRow === 0 && dCol === 0) return false;

    const minRow = Math.max(0, this.bestRow - MIN_ROWS_BEHIND_BEST);
    if (newRow < minRow) return false; // blocked: can't retreat off the back of the screen

    const lane = world.getLane(newRow);
    if (lane && world.isBlocked(lane, newCol)) return false; // tree/rock in the way

    // Facing
    if (dRow > 0) this.facing = FACING.forward;
    else if (dRow < 0) this.facing = FACING.back;
    else if (dCol > 0) this.facing = FACING.right;
    else if (dCol < 0) this.facing = FACING.left;

    this.hopFrom.set(this.x, 0, this.worldZ);
    this.row = newRow;
    this.col = newCol;
    this.hopTo.set(newCol * TILE_SIZE, 0, this.worldZ);
    this.hopping = true;
    this.hopT = 0;

    if (newRow > this.bestRow) {
      const rowsCrossed = newRow - this.bestRow;
      this.bestRow = newRow;
      const pointsPerRow = this.powerups.x2Time > 0 ? 2 : 1;
      this.score += rowsCrossed * pointsPerRow;
      world.onScoreAdvance(this.score, this.bestRow);
    }
    return true;
  }

  die(cause) {
    if (!this.alive) return;
    this.alive = false;
    this.deathCause = cause;
    this.deathT = 0;
  }

  // Returns true if a powerup of this type was newly granted (false if a
  // duplicate was ignored because one is already held/active).
  collectPowerup(type) {
    const p = this.powerups;
    if (type === 'shield') {
      if (p.shield) return false;
      p.shield = true;
    } else if (type === 'floatie') {
      if (p.floatieHeld || p.floatieActive) return false;
      p.floatieHeld = true;
    } else if (type === 'x2score') {
      if (p.x2Time > 0) return false;
      p.x2Time = POWERUP_TIMED_DURATION;
    } else if (type === 'frog') {
      if (p.frogTime > 0) return false;
      p.frogTime = POWERUP_TIMED_DURATION;
    } else {
      return false;
    }
    this._addEquipVisual(type);
    return true;
  }

  consumeShield() {
    this.powerups.shield = false;
    this.invulnT = SHIELD_INVULN_AFTER_SAVE;
    this._removeEquipVisual('shield');
  }

  activateFloatie() {
    if (this.powerups.floatieHeld && !this.powerups.floatieActive) {
      this.powerups.floatieActive = true;
    }
  }

  consumeFloatie() {
    this.powerups.floatieHeld = false;
    this.powerups.floatieActive = false;
    this._removeEquipVisual('floatie');
  }

  _addEquipVisual(type) {
    if (this.equipVisuals[type]) return;
    const group = buildEquipVisual(type);
    this.root.add(group);
    this.equipVisuals[type] = group;
  }

  _removeEquipVisual(type) {
    const group = this.equipVisuals[type];
    if (!group) return;
    this.root.remove(group);
    delete this.equipVisuals[type];
  }

  update(dt, world) {
    this.clock += dt;
    this.lastCollected = null;

    if (this.hopping) {
      this.hopT += dt / HOP_DURATION;
      const t = Math.min(this.hopT, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.x = THREE.MathUtils.lerp(this.hopFrom.x, this.hopTo.x, ease);
      const arcHeight = this.powerups.frogTime > 0 ? HOP_HEIGHT * 1.5 : HOP_HEIGHT;
      const arc = Math.sin(Math.PI * t) * arcHeight;
      this.mesh.position.y = arc;
      const squash = t > 0.85 ? THREE.MathUtils.lerp(1, 0.8, (t - 0.85) / 0.15) : 1;
      this.mesh.scale.set(1 + (1 - squash) * 0.6, squash, 1 + (1 - squash) * 0.6);

      if (this.hopT >= 1) {
        this.hopping = false;
        this.mesh.position.y = 0;
        this.mesh.scale.set(1, 1, 1);
        if (this.alive) {
          const collected = world.tryCollectPowerup(this.row, this.col);
          if (collected && this.collectPowerup(collected)) this.lastCollected = collected;
        }
        if (this.queuedMove && this.alive) {
          const [qr, qc] = this.queuedMove;
          this.queuedMove = null;
          this._executeMove(qr, qc, world);
        }
      }
    }

    if (this.invulnT > 0) this.invulnT = Math.max(0, this.invulnT - dt);

    if (this.powerups.x2Time > 0) {
      this.powerups.x2Time = Math.max(0, this.powerups.x2Time - dt);
      if (this.powerups.x2Time === 0) this._removeEquipVisual('x2score');
    }
    if (this.powerups.frogTime > 0) {
      this.powerups.frogTime = Math.max(0, this.powerups.frogTime - dt);
      if (this.powerups.frogTime === 0) this._removeEquipVisual('frog');
    }

    for (const [type, group] of Object.entries(this.equipVisuals)) {
      group.position.y = this.mesh.position.y;
      animateEquipVisual(type, group, this.clock);
    }

    if (!this.alive) {
      this.deathT += dt;
      this._animateDeath();
    }

    this.root.position.set(this.x, 0, this.worldZ);
    this.mesh.rotation.y = this.facing;
  }

  _animateDeath() {
    if (this.deathCause === 'water') {
      // Sink straight down and shrink slightly, as if submerging - no tipping over.
      this.mesh.position.y = -this.deathT * 0.9;
      const shrink = Math.max(0.15, 1 - this.deathT * 0.7);
      this.mesh.scale.set(shrink, shrink, shrink);
    } else if (this.deathCause === 'car' || this.deathCause === 'train') {
      const t = Math.min(this.deathT * 4, 1);
      this.mesh.scale.set(1 + t * 0.6, Math.max(0.12, 1 - t * 0.9), 1 + t * 0.6);
    } else if (this.deathCause === 'edge') {
      this.mesh.position.y = -this.deathT * this.deathT * 3;
      this.mesh.rotation.z = this.deathT * 3;
    }
  }

  setContinuousX(x) {
    this.x = clamp(x, -(COL_BOUND + 2) * TILE_SIZE, (COL_BOUND + 2) * TILE_SIZE);
  }
}
