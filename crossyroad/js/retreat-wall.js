import * as THREE from 'three';
import { COL_BOUND, TILE_SIZE } from './constants.js';

// A translucent, pulsing hazard-stripe curtain that fades out toward the
// top - deliberately soft/glowing rather than the solid guardrail fence, so
// it reads as "the camera won't let you go here" rather than a physical wall.
function buildWarningTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-size, -size);
  const stripeWidth = 20;
  for (let x = -size; x < size * 3; x += stripeWidth * 2) {
    ctx.fillStyle = '#e8493d';
    ctx.fillRect(x, -size, stripeWidth, size * 4);
    ctx.fillStyle = '#20120f';
    ctx.fillRect(x + stripeWidth, -size, stripeWidth, size * 4);
  }
  ctx.restore();

  // Fade the stripes to transparent toward the top of the tile.
  const grad = ctx.createLinearGradient(0, size, 0, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(5, 1);
  return texture;
}

export function createRetreatWarning(scene) {
  const width = (COL_BOUND * 2 + 2) * TILE_SIZE;
  const height = 1.3;
  const texture = buildWarningTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.y = height / 2;
  mesh.renderOrder = 1;
  scene.add(mesh);

  let clock = 0;
  return {
    mesh,
    update(dt, minRow) {
      clock += dt;
      mesh.position.z = -(minRow - 0.5) * TILE_SIZE;
      material.opacity = 0.42 + Math.sin(clock * 2.4) * 0.13;
      texture.offset.x = (texture.offset.x + dt * 0.12) % 1;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
