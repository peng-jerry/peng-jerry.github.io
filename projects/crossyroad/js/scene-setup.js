import * as THREE from 'three';
import { COLORS } from './constants.js';

// Builds the renderer, scene, lights and the fixed-angle orthographic
// camera that gives Crossy Road its signature 2.5D look.
export function createSceneSetup(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.fog, 22, 40);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Orthographic camera locked to a fixed isometric-style angle. Crossy
  // Road's camera never rotates - only its target position translates as
  // the player advances, which is what gives it that toy-diorama feel.
  const VIEW_SIZE = 6.2;
  const camera = new THREE.OrthographicCamera();
  // Shallower elevation (~32 deg) and a closer frustum than a top-down
  // isometric shot - closer to the original's tight, chunky framing where
  // the play-field edges stay off-screen.
  const cameraOffset = new THREE.Vector3(-10, 9, 10);
  camera.up.set(0, 1, 0);

  function updateCameraFrustum() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -VIEW_SIZE * aspect;
    camera.right = VIEW_SIZE * aspect;
    camera.top = VIEW_SIZE;
    camera.bottom = -VIEW_SIZE;
    camera.near = 0.1;
    camera.far = 100;
    camera.updateProjectionMatrix();
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    updateCameraFrustum();
  }
  resize();
  window.addEventListener('resize', resize);

  // Lighting: soft ambient fill + a directional "sun" for the blocky shading.
  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(-6, 10, 4);
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x6a8f4f, 0.35);
  scene.add(hemi);

  return { scene, renderer, camera, cameraOffset, sun };
}
