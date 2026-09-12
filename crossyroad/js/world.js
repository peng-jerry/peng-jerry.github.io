import * as THREE from 'three';
import {
  TILE_SIZE, COL_BOUND, TERRAIN_MARGIN, SAFE_START_ROWS,
  ROWS_AHEAD_TO_GENERATE, ROWS_BEHIND_TO_KEEP, COLORS,
  POWERUP_SPAWN_CHANCE, POWERUP_MAX_ACTIVE,
  randInt, randFloat, weightedChoice, choice,
} from './constants.js';
import { buildCar, buildLog, buildTree, buildRock, buildTrain, buildWarningLight } from './obstacles.js';
import { POWERUP_TYPES, buildPickupMesh, animatePickup } from './powerups.js';

const HALF_TERRAIN = COL_BOUND + TERRAIN_MARGIN;
const TRACK_LEN = HALF_TERRAIN * 2;

const WARNING_DURATION = 1.15;
const TRAIN_ACTIVE_DURATION = 0.75;
const TRAIN_LENGTH = 7; // the train's own length, distinct from the track it crosses

function makeGroundTile(row, color) {
  const geo = new THREE.BoxGeometry(HALF_TERRAIN * 2, 0.4, TILE_SIZE);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, -0.2, -row * TILE_SIZE);
  return mesh;
}

function addRoadMarkings(group, row) {
  const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.roadLine });
  for (let x = -HALF_TERRAIN + 1; x < HALF_TERRAIN; x += 2) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.08), lineMat);
    dash.position.set(x, 0.001, -row * TILE_SIZE);
    group.add(dash);
  }
}

function addRailTracks(group, row) {
  const railMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  for (const zOff of [-0.28, 0.28]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(HALF_TERRAIN * 2, 0.05, 0.08), railMat);
    rail.position.set(0, 0.02, -row * TILE_SIZE + zOff);
    group.add(rail);
  }
  const sleeperMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2c });
  for (let x = -HALF_TERRAIN + 0.5; x < HALF_TERRAIN; x += 1) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.75), sleeperMat);
    sleeper.position.set(x, 0.0, -row * TILE_SIZE);
    group.add(sleeper);
  }
}

// Striped guardrail marking the playable corridor's left/right edge, so the
// boundary reads as a real barrier instead of an invisible wall.
function addBoundaryFence(group, row) {
  const stripeColor = row % 2 === 0 ? 0xe8e8e0 : 0xd23c3c;
  const mat = new THREE.MeshLambertMaterial({ color: stripeColor });
  const postGeo = new THREE.BoxGeometry(0.16, 0.5, 0.9);
  const railGeo = new THREE.BoxGeometry(0.16, 0.14, TILE_SIZE);
  for (const side of [-1, 1]) {
    const edgeX = side * (COL_BOUND + 0.55);
    const post = new THREE.Mesh(postGeo, mat);
    post.position.set(edgeX, 0.25, -row * TILE_SIZE);
    group.add(post);
    const rail = new THREE.Mesh(railGeo, mat);
    rail.position.set(edgeX, 0.46, -row * TILE_SIZE);
    group.add(rail);
  }
}

// Places `count` items of varying half-length along the *entire* track with
// random gaps sized to spread them evenly around it - not clustered near one
// edge - so a lane's traffic arrives at a steady, predictable rate instead of
// a platoon followed by a long empty stretch. Any item that would land inside
// the playable corridor is nudged just past whichever corridor edge it was
// heading toward, so nothing pops into view already in front of the player.
// Guarantees no overlap regardless of how the individual lengths vary.
function layoutConveyorItems(count, buildLength, buildMesh) {
  const lengths = Array.from({ length: count }, buildLength);
  const totalLength = lengths.reduce((sum, l) => sum + l, 0);
  const avgGap = Math.max(1.5, (TRACK_LEN - totalLength) / count);

  const items = [];
  let cursor = -HALF_TERRAIN + randFloat(0, avgGap);
  for (let i = 0; i < count; i++) {
    const halfLength = lengths[i] / 2;
    let x = cursor + halfLength;
    if (x + halfLength > -COL_BOUND && x - halfLength < COL_BOUND) {
      x = x <= 0
        ? -COL_BOUND - halfLength - randFloat(0.3, 1.0)
        : COL_BOUND + halfLength + randFloat(0.3, 1.0);
    }
    cursor = x + halfLength + randFloat(avgGap * 0.7, avgGap * 1.3);
    items.push({ mesh: buildMesh(lengths[i]), x, halfLength });
  }
  return items;
}

// Advances a lane's conveyor of same-speed, same-direction items (cars or
// logs). Each item wraps independently by shifting exactly one track-length
// the moment it exits - not by repositioning relative to a neighbour - so
// every item's spacing to every other item is preserved forever: nothing
// drifts, clusters, or opens into a long gap over time. Since the wrap
// threshold sits at the track's outer edge, a recycled item reappears right
// at the far margin, outside the corridor, exactly like a freshly spawned one.
function updateConveyor(items, direction, speed, dt) {
  for (const item of items) {
    item.x += direction * speed * dt;
    if (direction > 0 && item.x - item.halfLength > HALF_TERRAIN) {
      item.x -= TRACK_LEN;
    } else if (direction < 0 && item.x + item.halfLength < -HALF_TERRAIN) {
      item.x += TRACK_LEN;
    }
    item.mesh.position.x = item.x;
  }
}

export class World {
  constructor(scene, onScoreAdvance) {
    this.scene = scene;
    this.onScoreAdvance = onScoreAdvance;
    this.lanes = new Map(); // row -> laneData
    this.prevTypes = [];
    this.clock = 0;
    this.activePowerupCount = 0;
    // A few purely-decorative grass rows behind the start line (row 0), so
    // the camera never sees empty space behind the world's true edge.
    for (let row = -24; row < 0; row++) {
      this.lanes.set(row, this._generateLane(row));
    }
    this.generateUpTo(ROWS_AHEAD_TO_GENERATE);
  }

  getLane(row) {
    return this.lanes.get(row);
  }

  isBlocked(lane, col) {
    return lane.blockedCols && lane.blockedCols.has(col);
  }

  ensureGeneratedAhead(playerRow) {
    const targetMax = playerRow + ROWS_AHEAD_TO_GENERATE;
    this.generateUpTo(targetMax);
    this.pruneBehind(playerRow - ROWS_BEHIND_TO_KEEP);
  }

  generateUpTo(maxRow) {
    let row = this.lanes.size === 0 ? 0 : Math.max(...this.lanes.keys()) + 1;
    for (; row <= maxRow; row++) {
      this.lanes.set(row, this._generateLane(row));
    }
  }

  pruneBehind(minRow) {
    for (const [row, lane] of this.lanes) {
      if (row < minRow) {
        if (lane.powerup) this.activePowerupCount -= 1;
        this.scene.remove(lane.group);
        this.lanes.delete(row);
      }
    }
  }

  _chooseType(row) {
    if (row < SAFE_START_ROWS) return 'grass';
    const lastTwo = this.prevTypes.slice(-2);
    const bothHazard = lastTwo.length === 2 && lastTwo.every((t) => t !== 'grass');
    if (bothHazard) return 'grass';
    return weightedChoice([
      { value: 'grass', weight: 32 },
      { value: 'road', weight: 32 },
      { value: 'water', weight: 26 },
      { value: 'rail', weight: 10 },
    ]);
  }

  _generateLane(row) {
    const type = this._chooseType(row);
    this.prevTypes.push(type);

    const group = new THREE.Group();
    this.scene.add(group);

    const lane = { row, type, group, blockedCols: new Set() };

    if (type === 'grass') {
      group.add(makeGroundTile(row, Math.random() < 0.5 ? COLORS.grassA : COLORS.grassB));
      if (row >= SAFE_START_ROWS) {
        const decorCount = randInt(0, 3);
        const usedCols = new Set();
        for (let i = 0; i < decorCount; i++) {
          const col = randInt(-COL_BOUND, COL_BOUND);
          if (usedCols.has(col) || col === 0) continue;
          usedCols.add(col);
          lane.blockedCols.add(col);
          const deco = Math.random() < 0.7 ? buildTree() : buildRock();
          deco.position.set(col * TILE_SIZE, 0, -row * TILE_SIZE);
          group.add(deco);
        }
      }
      this._maybeSpawnPowerup(lane, row, group);
    } else if (type === 'road') {
      group.add(makeGroundTile(row, COLORS.road));
      addRoadMarkings(group, row);
      lane.direction = Math.random() < 0.5 ? 1 : -1;
      lane.speed = randFloat(2.2, 4.6);
      lane.cars = layoutConveyorItems(
        randInt(2, 3),
        () => randFloat(1.4, 2.1),
        (length) => buildCar(length),
      ).map((item) => ({ ...item, halfLength: item.halfLength + 0.05 }));
      for (const car of lane.cars) {
        car.mesh.position.set(car.x, 0, -row * TILE_SIZE);
        group.add(car.mesh);
      }
    } else if (type === 'water') {
      group.add(makeGroundTile(row, COLORS.waterDeep));
      lane.direction = Math.random() < 0.5 ? 1 : -1;
      lane.speed = randFloat(1.4, 3.2);
      // Logs need to stay reliably available (unlike cars, gaps here are a
      // hazard, not a feature) so this lane keeps a bit more coverage than road.
      lane.logs = layoutConveyorItems(
        randInt(3, 4),
        () => randFloat(1.8, 3.2),
        (length) => buildLog(length),
      );
      for (const log of lane.logs) {
        log.mesh.position.set(log.x, 0, -row * TILE_SIZE);
        group.add(log.mesh);
      }
    } else if (type === 'rail') {
      group.add(makeGroundTile(row, COLORS.dirtRail));
      addRailTracks(group, row);
      lane.direction = Math.random() < 0.5 ? 1 : -1;
      lane.state = 'idle';
      lane.timer = randFloat(2.5, 5.5);

      lane.lightL = buildWarningLight();
      lane.lightL.position.set(-(COL_BOUND + 0.8), 0, -row * TILE_SIZE);
      group.add(lane.lightL);
      lane.lightR = buildWarningLight();
      lane.lightR.position.set(COL_BOUND + 0.8, 0, -row * TILE_SIZE);
      group.add(lane.lightR);

      lane.train = buildTrain(TRAIN_LENGTH);
      lane.train.position.set(0, 0, -row * TILE_SIZE);
      lane.train.visible = false;
      group.add(lane.train);
      lane.blinkPhase = 0;
      this._maybeSpawnPowerup(lane, row, group);
    }

    addBoundaryFence(group, row);
    return lane;
  }

  // Powerups only ever spawn on lanes you can freely stand on (grass/rail),
  // at an open column, so a visible one is always reachable without luck.
  _maybeSpawnPowerup(lane, row, group) {
    if (row < SAFE_START_ROWS) return;
    if (this.activePowerupCount >= POWERUP_MAX_ACTIVE) return;
    if (Math.random() >= POWERUP_SPAWN_CHANCE) return;

    let col = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = randInt(-COL_BOUND, COL_BOUND);
      if (!this.isBlocked(lane, candidate)) {
        col = candidate;
        break;
      }
    }
    if (col === null) return;

    const type = choice(POWERUP_TYPES);
    const mesh = buildPickupMesh(type);
    mesh.position.set(col * TILE_SIZE, 0, -row * TILE_SIZE);
    group.add(mesh);

    lane.powerup = { type, mesh, col };
    this.activePowerupCount += 1;
  }

  // Returns the collected powerup type, or null if there was none at that cell.
  tryCollectPowerup(row, col) {
    const lane = this.lanes.get(row);
    if (!lane || !lane.powerup || lane.powerup.col !== col) return null;
    lane.group.remove(lane.powerup.mesh);
    const { type } = lane.powerup;
    lane.powerup = null;
    this.activePowerupCount -= 1;
    return type;
  }

  update(dt) {
    this.clock += dt;
    for (const lane of this.lanes.values()) {
      if (lane.type === 'road') {
        updateConveyor(lane.cars, lane.direction, lane.speed, dt);
      } else if (lane.type === 'water') {
        updateConveyor(lane.logs, lane.direction, lane.speed, dt);
      } else if (lane.type === 'rail') {
        this._updateRail(lane, dt);
      }
      if (lane.powerup) animatePickup(lane.powerup.mesh, this.clock);
    }
  }

  _updateRail(lane, dt) {
    lane.timer -= dt;
    if (lane.state === 'idle') {
      if (lane.timer <= 0) {
        lane.state = 'warning';
        lane.timer = WARNING_DURATION;
        lane.blinkPhase = 0;
      }
    } else if (lane.state === 'warning') {
      lane.blinkPhase += dt;
      const on = Math.floor(lane.blinkPhase / 0.15) % 2 === 0;
      const emissiveColor = on ? 0xff2222 : 0x550000;
      lane.lightL.userData.lightMat.color.setHex(emissiveColor);
      lane.lightR.userData.lightMat.color.setHex(emissiveColor);
      if (lane.timer <= 0) {
        lane.state = 'active';
        lane.timer = TRAIN_ACTIVE_DURATION;
        lane.lightL.userData.lightMat.color.setHex(0xff2222);
        lane.lightR.userData.lightMat.color.setHex(0xff2222);
        lane.train.visible = true;
        const startX = lane.direction > 0
          ? -(TRACK_LEN / 2 + TRAIN_LENGTH)
          : (TRACK_LEN / 2 + TRAIN_LENGTH);
        lane.train.position.x = startX;
      }
    } else if (lane.state === 'active') {
      const totalTravel = TRACK_LEN + TRAIN_LENGTH * 2;
      lane.train.position.x += lane.direction * (totalTravel / TRAIN_ACTIVE_DURATION) * dt;
      if (lane.timer <= 0) {
        lane.state = 'idle';
        lane.timer = randFloat(3.5, 6.5);
        lane.train.visible = false;
      }
    }
  }

  // Returns null if safe, or a death-cause string if the player should die
  // while standing at (row, continuous x).
  checkHazard(row, x) {
    const lane = this.lanes.get(row);
    if (!lane) return null;
    if (lane.type === 'road') {
      for (const car of lane.cars) {
        if (Math.abs(car.x - x) < car.halfLength + 0.28) return 'car';
      }
    } else if (lane.type === 'rail') {
      if (lane.state === 'active' && Math.abs(lane.train.position.x - x) < TRAIN_LENGTH / 2 + 0.3) {
        return 'train';
      }
    }
    return null;
  }

  // For water lanes: returns the log the player is standing on (or null).
  getSupportingLog(row, x) {
    const lane = this.lanes.get(row);
    if (!lane || lane.type !== 'water') return null;
    for (const log of lane.logs) {
      if (Math.abs(log.x - x) < log.halfLength + 0.22) return { lane, log };
    }
    return null;
  }

  isWater(row) {
    const lane = this.lanes.get(row);
    return !!lane && lane.type === 'water';
  }
}
