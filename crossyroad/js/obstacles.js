import * as THREE from 'three';
import { COLORS } from './constants.js';

const CAR_BODY_COLORS = [0xe0483e, 0xe8b830, 0x4e8ee8, 0x7bc95f, 0xd881c9, 0xef8c3a, 0xf5f5f0];

export function buildCar(length = 1.8) {
  // Cars drive along the lane's X axis, so "length" (front-to-back) is the
  // X extent, while the Z extent must stay narrow enough to fit the 1-unit
  // deep lane.
  const group = new THREE.Group();
  const color = CAR_BODY_COLORS[Math.floor(Math.random() * CAR_BODY_COLORS.length)];
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0xdff3ff });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });

  const body = new THREE.Mesh(new THREE.BoxGeometry(length, 0.38, 0.78), bodyMat);
  body.position.y = 0.32;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(length * 0.55, 0.32, 0.66), cabinMat);
  cabin.position.set(-length * 0.05, 0.62, 0);
  group.add(cabin);

  const wheelGeo = new THREE.BoxGeometry(0.32, 0.24, 0.16);
  const offsets = [
    [length * 0.3, 0.32], [length * 0.3, -0.32],
    [-length * 0.3, 0.32], [-length * 0.3, -0.32],
  ];
  for (const [x, z] of offsets) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(x, 0.14, z);
    group.add(wheel);
  }

  group.userData.halfLength = length / 2 + 0.05;
  return group;
}

export function buildLog(length = 2.4) {
  // Logs drift along X on the water's surface, so their long axis is X.
  const mat = new THREE.MeshLambertMaterial({ color: COLORS.log });
  const geo = new THREE.BoxGeometry(length, 0.3, 0.9);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.05;

  const ringMat = new THREE.MeshLambertMaterial({ color: 0x6e431f });
  const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 10), ringMat);
  capL.rotation.z = Math.PI / 2;
  capL.position.set(length / 2, 0.05, 0);
  const capR = capL.clone();
  capR.position.x = -length / 2;

  const group = new THREE.Group();
  group.add(mesh, capL, capR);
  group.userData.halfLength = length / 2;
  return group;
}

export function buildTree() {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f3f });

  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.22), trunkMat);
  trunk.position.y = 0.2;
  group.add(trunk);

  const leaves = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), leafMat);
  leaves.position.y = 0.72;
  group.add(leaves);

  const leaves2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), leafMat);
  leaves2.position.y = 1.15;
  group.add(leaves2);

  group.userData.blocking = true;
  return group;
}

export function buildRock() {
  const mat = new THREE.MeshLambertMaterial({ color: 0x8a8a86 });
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), mat);
  mesh.position.y = 0.24;
  mesh.rotation.set(Math.random(), Math.random(), Math.random());
  const group = new THREE.Group();
  group.add(mesh);
  group.userData.blocking = true;
  return group;
}

export function buildTrain(fullWidth) {
  // fullWidth is the train's own total length (several cars), NOT the track
  // length - it slides across the whole lane during the active window.
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3d5a80 });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e0 });
  const windowMat = new THREE.MeshLambertMaterial({ color: 0x1a2733 });

  const carCount = 4;
  const carLength = fullWidth / carCount;
  for (let i = 0; i < carCount; i++) {
    const x = -fullWidth / 2 + carLength * (i + 0.5);
    const car = new THREE.Mesh(new THREE.BoxGeometry(carLength * 0.92, 0.95, 1.1), bodyMat);
    car.position.set(x, 0.55, 0);
    group.add(car);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(carLength * 0.92, 0.14, 1.12), stripeMat);
    stripe.position.set(x, 0.3, 0);
    group.add(stripe);

    const win = new THREE.Mesh(new THREE.BoxGeometry(carLength * 0.5, 0.28, 1.12), windowMat);
    win.position.set(x, 0.7, 0);
    group.add(win);
  }

  return group;
}

export function buildWarningLight() {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), poleMat);
  pole.position.y = 0.45;
  group.add(pole);

  const lightMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), lightMat);
  light.position.y = 0.95;
  group.add(light);
  group.userData.light = light;
  group.userData.lightMat = lightMat;

  return group;
}
