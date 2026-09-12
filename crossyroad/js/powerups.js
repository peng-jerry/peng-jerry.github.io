import * as THREE from 'three';
import { POWERUP_TIMED_DURATION } from './constants.js';

// Powerup catalogue. `duration` is null for single-use powerups (consumed by
// an event) and a number of seconds for timed ones (consumed by a clock).
export const POWERUP_DEFS = {
  shield: { emoji: '\u{1F6E1}\u{FE0F}', color: 0x4aa3d9, label: 'Shield', duration: null },
  floatie: { emoji: '\u{1F6DF}', color: 0xff8a3d, label: 'Floatie', duration: null },
  x2score: { emoji: '⭐', color: 0xffd23d, label: 'x2 Score', duration: POWERUP_TIMED_DURATION },
  frog: { emoji: '\u{1F438}', color: 0x4caf50, label: 'Frog', duration: POWERUP_TIMED_DURATION },
};

export const POWERUP_TYPES = Object.keys(POWERUP_DEFS);

function makeEmojiSprite(emoji, size = 96) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.font = `${size * 0.72}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.55, 0.55, 0.55);
  return sprite;
}

// A small floating, spinning gem topped with a billboard emoji icon - what
// sits on the ground waiting to be picked up.
export function buildPickupMesh(type) {
  const def = POWERUP_DEFS[type];
  const group = new THREE.Group();

  const gemMat = new THREE.MeshLambertMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.25 });
  const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), gemMat);
  gem.position.y = 0.42;
  group.add(gem);

  const sprite = makeEmojiSprite(def.emoji);
  sprite.position.y = 0.42;
  group.add(sprite);

  const ringMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.35 });
  const ring = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  group.add(ring);

  group.userData.gem = gem;
  group.userData.bobPhase = Math.random() * Math.PI * 2;
  return group;
}

export function animatePickup(pickupGroup, t) {
  const phase = pickupGroup.userData.bobPhase + t * 2.2;
  pickupGroup.position.y = Math.sin(phase) * 0.08 + 0.08;
  pickupGroup.rotation.y = t * 1.4;
}

// --- On-player equipped visuals -------------------------------------------

function buildShieldVisual() {
  const mat = new THREE.MeshBasicMaterial({
    color: POWERUP_DEFS.shield.color, transparent: true, opacity: 0.28, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), mat);
  mesh.position.y = 0.5;
  const group = new THREE.Group();
  group.add(mesh);
  group.userData.core = mesh;
  return group;
}

function buildFloatieVisual() {
  const mat = new THREE.MeshLambertMaterial({ color: POWERUP_DEFS.floatie.color });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 8, 16), mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = 0.16;
  const group = new THREE.Group();
  group.add(mesh);
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.05), stripeMat);
    const angle = (i / 4) * Math.PI * 2;
    stripe.position.set(Math.cos(angle) * 0.42, 0.16, Math.sin(angle) * 0.42);
    stripe.rotation.y = angle;
    group.add(stripe);
  }
  return group;
}

function buildX2Visual() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: POWERUP_DEFS.x2score.color });
  for (let i = 0; i < 3; i++) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), mat);
    group.add(star);
  }
  group.userData.stars = group.children.slice();
  return group;
}

function buildFrogVisual() {
  const mat = new THREE.MeshLambertMaterial({ color: POWERUP_DEFS.frog.color });
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 4), mat);
    leg.position.set(side * 0.42, 0.14, 0.1);
    leg.rotation.z = side * 1.05;
    leg.rotation.y = Math.PI / 4;
    group.add(leg);
  }
  return group;
}

const VISUAL_BUILDERS = {
  shield: buildShieldVisual,
  floatie: buildFloatieVisual,
  x2score: buildX2Visual,
  frog: buildFrogVisual,
};

export function buildEquipVisual(type) {
  return VISUAL_BUILDERS[type]();
}

// Note: `group.position.y` is set by the caller each frame to track the
// player's current hop height - these only add rotation/scale/local-child
// motion on top of that baseline, never touching position.y themselves.
export function animateEquipVisual(type, group, t) {
  if (type === 'shield') {
    const s = 1 + Math.sin(t * 3) * 0.04;
    group.userData.core.scale.set(s, s, s);
    group.rotation.y = t * 0.6;
  } else if (type === 'floatie') {
    group.rotation.y = t * 0.8;
  } else if (type === 'x2score') {
    group.userData.stars.forEach((star, i) => {
      const angle = t * 3 + (i / group.userData.stars.length) * Math.PI * 2;
      star.position.set(Math.cos(angle) * 0.5, 0.55 + Math.sin(t * 4 + i) * 0.05, Math.sin(angle) * 0.5);
      star.rotation.y = t * 4;
    });
  } else if (type === 'frog') {
    const s = 1 + Math.sin(t * 6) * 0.06;
    group.scale.set(s, 1, s);
  }
}
