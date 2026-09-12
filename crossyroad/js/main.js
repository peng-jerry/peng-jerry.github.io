import * as THREE from 'three';
import { createSceneSetup } from './scene-setup.js';
import { Player } from './player.js';
import { World } from './world.js';
import { setupInput } from './input.js';
import { UI } from './ui.js';
import { sfx, unlockAudio } from './audio.js';
import { createRetreatWarning } from './retreat-wall.js';
import {
  TILE_SIZE, COL_BOUND, CAMERA_FOLLOW_LERP, CHICKEN_COLORS, MIN_ROWS_BEHIND_BEST, choice,
} from './constants.js';

const canvas = document.getElementById('game-canvas');
const { scene, renderer, camera, cameraOffset } = createSceneSetup(canvas);
const ui = new UI();

let player = null;
let world = null;
let retreatWarning = null;
let state = 'start'; // 'start' | 'playing' | 'dead'
let deathTimer = 0;
let camAnchorRow = 0;
let camAnchorX = 0;
const camTarget = new THREE.Vector3();

function resetGame() {
  if (player) scene.remove(player.root);
  if (world) {
    for (const lane of world.lanes.values()) scene.remove(lane.group);
  }
  if (retreatWarning) retreatWarning.dispose();

  world = new World(scene, (score) => {
    ui.setScore(score);
    sfx.score();
  });
  player = new Player(scene, choice(CHICKEN_COLORS));
  retreatWarning = createRetreatWarning(scene);
  camAnchorRow = 0;
  camAnchorX = 0;
  state = 'playing';
  ui.showPlaying();
  ui.setScore(0);
  ui.updatePowerups(player.powerups);
}

function handleMove(dRow, dCol) {
  unlockAudio();
  if (state === 'start') {
    resetGame();
    return;
  }
  if (state === 'gameover') {
    resetGame();
    return;
  }
  if (state === 'dead') return;
  const moved = player.tryMove(dRow, dCol, world);
  if (moved) sfx.hop();
}

function handleStart() {
  unlockAudio();
  if (state === 'start' || state === 'gameover') resetGame();
}

setupInput(handleMove, handleStart);

document.getElementById('restart-button').addEventListener('click', () => {
  unlockAudio();
  resetGame();
});
document.getElementById('start-screen').addEventListener('click', () => {
  unlockAudio();
  if (state === 'start') resetGame();
});

function updateHazards(dt) {
  if (!player.alive) return;

  if (player.invulnT <= 0) {
    const hazard = world.checkHazard(player.row, player.x);
    if (hazard) {
      if ((hazard === 'car' || hazard === 'train') && player.powerups.shield) {
        player.consumeShield();
        sfx.shieldBreak();
      } else {
        player.die(hazard);
        sfx.death();
        return;
      }
    }
  }

  if (world.isWater(player.row)) {
    if (player.powerups.floatieActive) {
      player.onLog = false; // already saved us earlier - floating freely, no log needed
    } else {
      const support = world.getSupportingLog(player.row, player.x);
      if (support) {
        // A log is right there - just ride it normally. The floatie stays
        // held/unused; it's only spent when it's actually needed.
        player.onLog = true;
        const drift = support.lane.direction * support.lane.speed * dt;
        player.setContinuousX(player.x + drift);
        const boundMax = (COL_BOUND + 1.4) * TILE_SIZE;
        if (Math.abs(player.x) > boundMax) {
          player.die('edge');
          sfx.death();
        }
      } else {
        player.onLog = false;
        if (!player.hopping) {
          if (player.powerups.floatieHeld) {
            player.activateFloatie(); // no log and about to drown - this is what it's for
          } else {
            player.die('water');
            sfx.death();
          }
        }
      }
    }
  } else {
    if (player.powerups.floatieActive) player.consumeFloatie();
    player.onLog = false;
  }
}

function updateCamera(dt) {
  const targetRow = player ? player.bestRow : 0;
  const targetX = player ? player.x : 0;
  camAnchorRow += (targetRow - camAnchorRow) * CAMERA_FOLLOW_LERP;
  camAnchorX += (targetX - camAnchorX) * (CAMERA_FOLLOW_LERP * 2);

  camTarget.set(camAnchorX, 0, -camAnchorRow * TILE_SIZE);
  camera.position.copy(camTarget).add(cameraOffset);
  camera.lookAt(camTarget);
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state === 'playing' && world && player) {
    world.update(dt);
    player.update(dt, world);
    if (player.lastCollected) sfx.powerup();
    updateHazards(dt);
    world.ensureGeneratedAhead(player.bestRow);
    ui.updatePowerups(player.powerups);
    retreatWarning.update(dt, Math.max(0, player.bestRow - MIN_ROWS_BEHIND_BEST));

    if (!player.alive) {
      state = 'dead';
      deathTimer = 0;
    }
  } else if (state === 'dead' && player) {
    player.update(dt, world);
    deathTimer += dt;
    if (deathTimer > 0.9) {
      ui.showGameOver(player.score);
      state = 'gameover';
    }
  }

  if (player) updateCamera(dt);
  renderer.render(scene, camera);
}

ui.showStart();
animate();
