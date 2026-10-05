// Shared tuning constants for the whole game.

export const TILE_SIZE = 1;          // world units per grid cell
export const COL_BOUND = 7;          // playable columns span [-COL_BOUND, COL_BOUND]
export const TERRAIN_MARGIN = 14;    // extra tiles of terrain rendered past the bounds (visual only, keeps the side edge off-screen)

export const MIN_ROWS_BEHIND_BEST = 3;   // how far a player may retreat behind their best row
export const ROWS_AHEAD_TO_GENERATE = 30; // how many rows ahead of the player must exist
export const ROWS_BEHIND_TO_KEEP = 12;    // rows behind the player (or best) before they are pruned

export const HOP_DURATION = 0.14;    // seconds per hop
export const HOP_HEIGHT = 0.55;      // peak height of a hop arc

export const SAFE_START_ROWS = 3;    // first N rows are always safe grass

export const CAMERA_FOLLOW_LERP = 0.06; // how fast the camera eases toward the target

export const POWERUP_SPAWN_CHANCE = 0.18; // odds a given safe lane gets a powerup
export const POWERUP_MAX_ACTIVE = 6;      // cap on uncollected powerups sitting in the world at once
export const POWERUP_TIMED_DURATION = 10; // seconds x2 Score / Frog last once collected
export const SHIELD_INVULN_AFTER_SAVE = 0.5; // brief grace period after a shield absorbs a hit

// Respawn cosmetics: the chicken's body color is picked randomly from this
// palette every time a new run starts.
export const CHICKEN_COLORS = [
  0xffffff, // white
  0xf2c14e, // yellow
  0x8a5a34, // brown
  0x2b2b2b, // black
  0x9a9a9a, // grey
  0xe8d3a0, // buff
  0xd97b46, // rust/orange
];

export const COLORS = {
  sky: 0x8fd7ff,
  fog: 0x8fd7ff,
  grassA: 0x7ec850,
  grassB: 0x74bd49,
  dirtRail: 0xc9a25c,
  road: 0x4a4a52,
  roadLine: 0xe8e8e0,
  water: 0x4aa3d9,
  waterDeep: 0x3f8dbf,
  log: 0x8a5a34,
  player: 0xffffff,
  playerComb: 0xe23b3b,
  playerBeak: 0xf2a53c,
};

export function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function randFloat(min, max) {
  return min + Math.random() * (max - min);
}

export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedChoice(entries) {
  // entries: [{ value, weight }]
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    if (r < e.weight) return e.value;
    r -= e.weight;
  }
  return entries[entries.length - 1].value;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
