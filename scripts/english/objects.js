import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

/* Shared model kit for the English play courses.
   Every group has its origin on the ground (y = 0) so a surface position is just a position. */

const TAU = Math.PI * 2;

export function canvasTexture(width, height, draw) {
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export const material = (color, options = {}) => new THREE.MeshStandardMaterial({
  color, roughness: 0.56, metalness: 0.04, ...options,
});

function paintable(mat) {
  mat.userData.paintable = true;
  return mat;
}

export function paintGroup(root, color) {
  root.traverse((node) => {
    if (node.isMesh && node.material?.userData?.paintable) node.material.color.set(color);
  });
}

export function rounded(w, h, d, radius, mat, segments = 3) {
  const r = Math.max(0.004, Math.min(radius, Math.min(w, h, d) / 2 - 0.001));
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, segments, r), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function ball(radius, mat, scale = [1, 1, 1], segments = 26) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.round(segments * 0.7)), mat);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function tube(rTop, rBottom, height, mat, segments = 22) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, segments), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cone(radius, height, mat, segments = 20) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function ring(radius, thickness, mat, arc = TAU) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 12, 40, arc), mat);
  mesh.castShadow = true;
  return mesh;
}

function put(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}

function eyes(group, radius, gap, y, z, dark, x = 0) {
  const white = material(0xfffdf8, { roughness: 0.3 });
  for (const sign of [-1, 1]) {
    const eye = ball(radius, white, [1, 1, 0.7], 16);
    eye.position.set(x + sign * gap, y, z);
    group.add(eye);
    const pupil = ball(radius * 0.55, dark, [1, 1, 0.6], 14);
    pupil.position.set(x + sign * gap, y, z + radius * 0.6);
    group.add(pupil);
  }
}

/* ---------------------------------------------------------------- toys */

export function createCar() {
  const group = new THREE.Group();
  const bodyMat = paintable(material(0xff6b6b, { roughness: 0.38, metalness: 0.22 }));
  const roofMat = paintable(material(0xffb703, { roughness: 0.36, metalness: 0.2 }));
  const rubber = material(0x26232e, { roughness: 0.85 });
  const glass = material(0xbfe6ff, { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.72 });

  const body = rounded(0.56, 0.17, 0.28, 0.07, bodyMat);
  body.position.y = 0.17;
  group.add(body);
  const cabin = rounded(0.29, 0.15, 0.25, 0.06, roofMat);
  cabin.position.set(-0.02, 0.32, 0);
  group.add(cabin);
  const windshield = rounded(0.02, 0.11, 0.22, 0.008, glass);
  windshield.position.set(0.13, 0.32, 0);
  group.add(windshield);

  for (const x of [-0.17, 0.17]) {
    for (const z of [-0.14, 0.14]) {
      const wheel = tube(0.072, 0.072, 0.05, rubber, 22);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.072, z);
      group.add(wheel);
      const hub = tube(0.03, 0.03, 0.054, material(0xe7e3da, { metalness: 0.6, roughness: 0.3 }), 18);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.072, z);
      group.add(hub);
    }
  }
  const bumper = rounded(0.06, 0.06, 0.26, 0.03, material(0xf2efe6, { roughness: 0.3, metalness: 0.45 }));
  bumper.position.set(0.29, 0.13, 0);
  group.add(bumper);
  group.userData.paint = ['#ff6b6b'];
  return group;
}

export function createHouse() {
  const group = new THREE.Group();
  const wallMat = paintable(material(0xfff1d6, { roughness: 0.7 }));
  const roofMat = paintable(material(0xef476f, { roughness: 0.55 }));
  const wood = material(0xc98b5a, { roughness: 0.7 });

  const base = rounded(0.42, 0.34, 0.38, 0.05, wallMat);
  base.position.y = 0.17;
  group.add(base);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.24, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.46;
  roof.castShadow = true;
  group.add(roof);

  const door = rounded(0.13, 0.19, 0.02, 0.02, wood);
  door.position.set(0, 0.11, 0.195);
  group.add(door);
  const knob = ball(0.014, material(0xffd166, { metalness: 0.8, roughness: 0.3 }), [1, 1, 1], 12);
  knob.position.set(0.04, 0.11, 0.21);
  group.add(knob);

  const windowMat = material(0x9ad9ff, { roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.85 });
  for (const x of [-0.13, 0.13]) {
    const pane = rounded(0.09, 0.09, 0.015, 0.014, windowMat);
    pane.position.set(x, 0.25, 0.192);
    group.add(pane);
    const frame = rounded(0.105, 0.105, 0.008, 0.014, material(0xfffdf7));
    frame.position.set(x, 0.25, 0.188);
    group.add(frame);
  }
  group.userData.paint = ['#ef476f'];
  return group;
}

export function createWindmill() {
  const group = new THREE.Group();
  const towerMat = paintable(material(0xf7f3e8, { roughness: 0.72 }));
  const bladeMat = paintable(material(0x2a9d8f, { roughness: 0.5 }));

  const tower = tube(0.09, 0.17, 0.46, towerMat, 24);
  tower.position.y = 0.23;
  group.add(tower);
  const roof = cone(0.11, 0.14, bladeMat, 20);
  roof.position.y = 0.53;
  group.add(roof);
  const door = rounded(0.1, 0.14, 0.02, 0.02, material(0xb07d4f, { roughness: 0.75 }));
  door.position.set(0, 0.07, 0.15);
  group.add(door);

  const hub = new THREE.Group();
  hub.position.set(0, 0.38, 0.16);
  group.add(hub);
  const axle = tube(0.022, 0.022, 0.09, material(0xe4dccb, { metalness: 0.4 }), 16);
  axle.rotation.x = Math.PI / 2;
  hub.add(axle);
  const blade = rounded(0.045, 0.26, 0.018, 0.02, bladeMat);
  for (let i = 0; i < 4; i += 1) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * TAU) / 4;
    const mesh = blade.clone();
    mesh.position.y = 0.15;
    arm.add(mesh);
    hub.add(arm);
  }
  const cap = ball(0.028, material(0xffd166, { metalness: 0.6, roughness: 0.3 }), [1, 1, 1], 16);
  cap.position.z = 0.05;
  hub.add(cap);
  group.userData.spin = hub;
  group.userData.paint = ['#2a9d8f'];
  return group;
}

/* ---------------------------------------------------------------- fruit */

export function createFruit(id) {
  const group = new THREE.Group();
  const stemMat = material(0x7a5230, { roughness: 0.8 });
  const leafMat = material(0x3f9b52, { roughness: 0.62 });

  if (id === 'apple') {
    group.add(put(ball(0.115, material(0xd62b32, { roughness: 0.32 }), [1, 0.94, 1]), 0, 0.115, 0));
    const stem = tube(0.008, 0.008, 0.06, stemMat, 10);
    stem.position.y = 0.245;
    stem.rotation.z = 0.25;
    group.add(stem);
    const leaf = ball(0.045, leafMat, [1, 0.35, 0.6], 16);
    leaf.position.set(0.05, 0.24, 0);
    leaf.rotation.z = -0.45;
    group.add(leaf);
  } else if (id === 'banana') {
    const peel = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.032, 12, 30, Math.PI * 0.92), material(0xf5c518, { roughness: 0.45 }));
    peel.rotation.z = Math.PI * 0.54;
    peel.position.y = 0.11;
    peel.castShadow = true;
    group.add(peel);
    const tip = ball(0.016, stemMat, [1, 1, 1], 10);
    tip.position.set(-0.1, 0.2, 0);
    group.add(tip);
  } else if (id === 'orange') {
    group.add(put(ball(0.12, material(0xf08c1b, { roughness: 0.62 }), [1, 0.97, 1]), 0, 0.12, 0));
    const stem = tube(0.008, 0.008, 0.03, stemMat, 10);
    stem.position.y = 0.24;
    group.add(stem);
    group.add(put(ball(0.03, leafMat, [1, 0.4, 0.7], 14), 0.035, 0.245, 0));
  } else if (id === 'pear') {
    const profile = [[0, 0], [0.05, 0.015], [0.09, 0.07], [0.083, 0.14], [0.05, 0.2], [0.036, 0.24], [0.012, 0.26], [0, 0.262]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const pear = new THREE.Mesh(new THREE.LatheGeometry(profile, 26), material(0xbfd94a, { roughness: 0.5 }));
    pear.castShadow = true;
    group.add(pear);
    const stem = tube(0.007, 0.007, 0.05, stemMat, 10);
    stem.position.y = 0.28;
    stem.rotation.z = 0.3;
    group.add(stem);
  } else if (id === 'grape') {
    const grapeMat = material(0x7b3fa0, { roughness: 0.35, metalness: 0.05 });
    const spots = [[0, 0.1, 0]]; // singular grape, never a bunch paired with "a grape"
    for (const [x, y, z] of spots) group.add(put(ball(0.047, grapeMat, [1, 1, 1], 18), x, y, z));
    const stem = tube(0.008, 0.008, 0.05, stemMat, 10);
    stem.position.y = 0.165;
    group.add(stem);
  } else if (id === 'strawberry') {
    group.add(put(ball(0.1, material(0xd7263d, { roughness: 0.42 }), [1, 1.18, 1]), 0, 0.12, 0));
    const calyx = cone(0.085, 0.05, leafMat, 16);
    calyx.position.y = 0.24;
    calyx.rotation.x = Math.PI;
    group.add(calyx);
    const stem = tube(0.008, 0.008, 0.045, stemMat, 10);
    stem.position.y = 0.28;
    group.add(stem);
  } else if (id === 'watermelon') {
    const stripes = canvasTexture(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#2f7d32';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1d5c25';
      for (let i = 0; i < 10; i += 1) ctx.fillRect(i * 26 + 4, 0, 12, h);
    });
    stripes.wrapS = THREE.RepeatWrapping;
    const melon = ball(0.145, material(0x3f8f3a, { roughness: 0.55, map: stripes }), [1, 0.86, 1]);
    melon.position.y = 0.12;
    group.add(melon);
    const stem = tube(0.009, 0.009, 0.03, stemMat, 10);
    stem.position.y = 0.245;
    group.add(stem);
  } else {
    const skin = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#e8a11f';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120, 70, 12, 0.55)';
      ctx.lineWidth = 3;
      for (let i = -h; i < w + h; i += 22) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke();
      }
    });
    const body = tube(0.088, 0.108, 0.23, material(0xe8a11f, { roughness: 0.55, map: skin }), 22);
    body.position.y = 0.115;
    group.add(body);
    const crownMat = material(0x2f7d32, { roughness: 0.6 });
    for (let i = 0; i < 5; i += 1) {
      const leaf = rounded(0.022, 0.14, 0.012, 0.008, crownMat);
      leaf.position.set(0, 0.28, 0);
      leaf.rotation.z = (i - 2) * 0.34;
      leaf.rotation.x = (i % 2) * 0.2;
      group.add(leaf);
    }
    group.add(put(ball(0.05, crownMat, [1, 0.55, 1], 14), 0, 0.252, 0));
  }
  return group;
}

/* ---------------------------------------------------------------- animals */

export function createAnimal(id) {
  const group = new THREE.Group();
  const dark = material(0x2b2430, { roughness: 0.4 });
  const eye = material(0x2b2430, { roughness: 0.35 });

  const build = {
    cat() {
      const fur = material(0xb0a7b8, { roughness: 0.72 });
      const body = ball(0.105, fur, [0.85, 1.05, 0.8]);
      body.position.y = 0.115;
      group.add(body);
      const head = ball(0.082, fur, [1, 0.95, 0.95]);
      head.position.y = 0.275;
      group.add(head);
      for (const sign of [-1, 1]) {
        const ear = cone(0.04, 0.075, fur, 14);
        ear.position.set(sign * 0.05, 0.35, 0);
        ear.rotation.z = -sign * 0.18;
        group.add(ear);
      }
      eyes(group, 0.014, 0.033, 0.29, 0.072, eye);
      const nose = ball(0.012, material(0xf08ba0), [1, 0.8, 1], 12);
      nose.position.set(0, 0.258, 0.082);
      group.add(nose);
      const tail = ring(0.075, 0.014, fur, Math.PI * 1.1);
      tail.position.set(-0.08, 0.16, 0.02);
      tail.rotation.set(0, Math.PI / 2, 0.4);
      group.add(tail);
      group.userData.anim = (t) => { tail.rotation.z = 0.4 + Math.sin(t * 3) * 0.16; };
      group.userData.sound = 0.9;
    },
    dog() {
      const fur = material(0xc98b45, { roughness: 0.75 });
      const earMat = material(0x9c6528, { roughness: 0.78 });
      const body = ball(0.11, fur, [1.1, 1, 0.9]);
      body.position.y = 0.12;
      group.add(body);
      const head = ball(0.085, fur, [1, 1, 0.95]);
      head.position.set(0.07, 0.28, 0);
      group.add(head);
      const snout = ball(0.048, earMat, [1, 0.8, 1.1], 18);
      snout.position.set(0.14, 0.25, 0);
      group.add(snout);
      const nose = ball(0.016, dark, [1, 1, 1], 12);
      nose.position.set(0.185, 0.25, 0);
      group.add(nose);
      for (const sign of [-1, 1]) {
        const ear = rounded(0.035, 0.09, 0.026, 0.018, earMat);
        ear.position.set(0.055, 0.3, sign * 0.068);
        ear.rotation.z = -0.2;
        group.add(ear);
      }
      eyes(group, 0.013, 0.03, 0.31, 0.062, eye, 0.07);
      const tail = rounded(0.028, 0.11, 0.028, 0.014, fur);
      tail.position.set(-0.1, 0.19, 0);
      tail.rotation.z = 0.5;
      group.add(tail);
      group.userData.anim = (t) => { tail.rotation.z = 0.5 + Math.sin(t * 6) * 0.3; };
      group.userData.sound = 0.85;
    },
    rabbit() {
      const fur = material(0xf6f1ee, { roughness: 0.82 });
      const pink = material(0xf1a7b6, { roughness: 0.7 });
      const body = ball(0.1, fur, [1, 1.1, 0.95]);
      body.position.y = 0.12;
      group.add(body);
      const head = ball(0.075, fur, [1, 1, 0.95]);
      head.position.y = 0.28;
      group.add(head);
      for (const sign of [-1, 1]) {
        const ear = rounded(0.032, 0.15, 0.022, 0.016, fur);
        ear.position.set(sign * 0.032, 0.39, 0);
        ear.rotation.z = sign * 0.14;
        group.add(ear);
        const inner = rounded(0.016, 0.1, 0.01, 0.008, pink);
        inner.position.set(sign * 0.032, 0.39, 0.013);
        inner.rotation.z = sign * 0.14;
        group.add(inner);
      }
      eyes(group, 0.012, 0.03, 0.29, 0.066, eye);
      const nose = ball(0.011, pink, [1, 0.8, 1], 12);
      nose.position.set(0, 0.265, 0.073);
      group.add(nose);
      const tail = ball(0.036, fur, [1, 1, 1], 14);
      tail.position.set(-0.09, 0.13, 0);
      group.add(tail);
      group.userData.anim = (t) => { earBounce(t, group); };
      group.userData.sound = 1.05;
    },
    duck() {
      const beakMat = material(0xf6a01f, { roughness: 0.5 });
      const body = ball(0.115, material(0xf7d34a, { roughness: 0.6 }), [1.15, 0.9, 1]);
      body.position.y = 0.115;
      group.add(body);
      const head = ball(0.075, material(0xffdf62, { roughness: 0.58 }));
      head.position.set(0.09, 0.27, 0);
      group.add(head);
      const beak = cone(0.035, 0.075, beakMat, 14);
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.17, 0.26, 0);
      group.add(beak);
      eyes(group, 0.011, 0.026, 0.29, 0.07, eye, 0.09);
      const wing = ball(0.06, material(0xf2c53d, { roughness: 0.6 }), [1, 0.5, 0.35], 16);
      wing.position.set(-0.02, 0.14, 0.09);
      group.add(wing);
      const tail = cone(0.045, 0.09, material(0xf2c53d, { roughness: 0.6 }), 12);
      tail.rotation.z = Math.PI / 2.2;
      tail.position.set(-0.12, 0.16, 0);
      group.add(tail);
      group.userData.anim = (t) => { group.rotation.z = Math.sin(t * 5) * 0.05; };
      group.userData.sound = 1.1;
    },
    bird() {
      const feather = material(0x4aa3df, { roughness: 0.55 });
      const body = ball(0.09, feather, [1.05, 0.95, 1]);
      body.position.y = 0.13;
      group.add(body);
      const head = ball(0.062, material(0x6bb9ee, { roughness: 0.55 }));
      head.position.set(0.05, 0.24, 0);
      group.add(head);
      const beak = cone(0.026, 0.055, material(0xf6a01f), 12);
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.115, 0.235, 0);
      group.add(beak);
      eyes(group, 0.01, 0.024, 0.255, 0.06, eye, 0.05);
      const wing = ball(0.07, material(0x2f81b8, { roughness: 0.55 }), [0.7, 0.35, 1], 16);
      wing.position.set(-0.02, 0.16, 0.075);
      group.add(wing);
      const tail = rounded(0.11, 0.03, 0.02, 0.01, material(0x2f81b8));
      tail.position.set(-0.12, 0.15, 0);
      tail.rotation.z = 0.3;
      group.add(tail);
      group.userData.anim = (t) => { wing.rotation.z = Math.sin(t * 7) * 0.35; };
      group.userData.sound = 1.2;
    },
    fish() {
      const scaleMat = material(0xf4842c, { roughness: 0.42, metalness: 0.1 });
      const body = ball(0.1, scaleMat, [1.35, 0.8, 0.5]);
      body.position.y = 0.14;
      group.add(body);
      const tail = cone(0.075, 0.1, material(0xf9a95c), 4);
      tail.rotation.z = -Math.PI / 2;
      tail.position.set(-0.15, 0.14, 0);
      group.add(tail);
      const fin = rounded(0.07, 0.05, 0.012, 0.01, material(0xf9a95c));
      fin.position.set(0, 0.22, 0);
      group.add(fin);
      for (const sign of [-1, 1]) {
        const eyeBall = ball(0.018, material(0xfffdf8), [1, 1, 0.7], 14);
        eyeBall.position.set(0.085, 0.17, sign * 0.038);
        group.add(eyeBall);
        const pupil = ball(0.009, eye, [1, 1, 0.7], 12);
        pupil.position.set(0.095, 0.17, sign * 0.045);
        group.add(pupil);
      }
      group.userData.anim = (t) => { tail.rotation.x = Math.sin(t * 6) * 0.3; };
      group.userData.sound = 0.8;
    },
    cow() {
      const hide = material(0xfbf7f0, { roughness: 0.72 });
      const patch = material(0x2f2a33, { roughness: 0.7 });
      const body = rounded(0.24, 0.16, 0.15, 0.06, hide);
      body.position.y = 0.2;
      group.add(body);
      for (const [x, y, z, r] of [[-0.05, 0.23, 0.07, 0.045], [0.06, 0.18, 0.072, 0.032], [-0.02, 0.16, -0.072, 0.038]]) {
        const spot = ball(r, patch, [1, 0.5, 0.35], 14);
        spot.position.set(x, y, z);
        group.add(spot);
      }
      const head = rounded(0.12, 0.12, 0.1, 0.04, hide);
      head.position.set(0.16, 0.26, 0);
      group.add(head);
      const snout = rounded(0.05, 0.07, 0.09, 0.025, material(0xf3c7c0));
      snout.position.set(0.23, 0.23, 0);
      group.add(snout);
      eyes(group, 0.012, 0.03, 0.28, 0.05, eye, 0.16);
      for (const sign of [-1, 1]) {
        const horn = cone(0.018, 0.05, material(0xe8dcc0), 10);
        horn.position.set(0.16, 0.335, sign * 0.045);
        horn.rotation.x = -sign * 0.4;
        group.add(horn);
        const ear = rounded(0.05, 0.025, 0.03, 0.012, hide);
        ear.position.set(0.14, 0.31, sign * 0.085);
        ear.rotation.z = 0.2;
        group.add(ear);
        const leg = tube(0.022, 0.022, 0.14, hide, 12);
        leg.position.set(sign * 0.08, 0.07, sign * 0.04);
        group.add(leg);
      }
      group.userData.anim = (t) => { head.rotation.z = Math.sin(t * 1.6) * 0.08; };
      group.userData.sound = 0.7;
    },
    elephant() {
      const skin = material(0xa8a5b4, { roughness: 0.78 });
      const body = ball(0.13, skin, [1.15, 0.95, 0.9]);
      body.position.y = 0.19;
      group.add(body);
      const head = ball(0.095, skin, [1, 1, 0.95]);
      head.position.set(0.11, 0.32, 0);
      group.add(head);
      for (const sign of [-1, 1]) {
        const ear = ball(0.085, material(0xbdb9c9, { roughness: 0.8 }), [0.35, 1, 0.75], 18);
        ear.position.set(0.08, 0.32, sign * 0.085);
        group.add(ear);
        const tusk = cone(0.012, 0.045, material(0xf7f1e2), 10);
        tusk.position.set(0.185, 0.27, sign * 0.05);
        tusk.rotation.z = -0.9;
        group.add(tusk);
        const leg = tube(0.032, 0.034, 0.16, skin, 14);
        leg.position.set(sign * 0.09, 0.08, sign * 0.06);
        group.add(leg);
      }
      const trunk = new THREE.Group();
      trunk.position.set(0.19, 0.3, 0);
      group.add(trunk);
      let parent = trunk;
      for (let i = 0; i < 3; i += 1) {
        const seg = new THREE.Group();
        seg.position.set(0, i === 0 ? -0.03 : -0.055, 0);
        seg.rotation.x = i === 0 ? 0.1 : 0.16;
        const mesh = tube(0.026 - i * 0.005, 0.031 - i * 0.005, 0.06, skin, 12);
        seg.add(mesh);
        parent.add(seg);
        parent = seg;
      }
      eyes(group, 0.012, 0.035, 0.345, 0.082, eye, 0.11);
      group.userData.anim = (t) => { trunk.rotation.z = Math.sin(t * 1.8) * 0.22; };
      group.userData.sound = 0.6;
    },
  };

  if (!build[id]) throw new RangeError(`Unknown animal: ${id}`);
  build[id]();
  return group;
}

function earBounce(t, group) {
  const ears = group.children.filter((child) => child.geometry?.type === 'RoundedBoxGeometry' && child.position.y > 0.36);
  ears.forEach((ear) => { ear.rotation.x = Math.sin(t * 3) * 0.08; });
}

/* ---------------------------------------------------------------- train */

export function createBlock(id) {
  const hue = [0xff6b6b, 0xffb703, 0x4aa3df, 0x74c69d, 0xb388eb, 0xff8fab][Number(id) % 6] ?? 0x4aa3df;
  const group = new THREE.Group();
  const mesh = rounded(0.095, 0.095, 0.095, 0.02, material(hue, { roughness: 0.42 }));
  mesh.position.y = 0.0475;
  group.add(mesh);
  return group;
}

export function createNumberPlate() {
  const texture = canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#fffdf4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2b2440';
    ctx.textAlign = 'center';
    ctx.font = 'bold 92px ui-rounded, sans-serif';
    ctx.fillText('0', w / 2, 96);
    ctx.font = 'bold 30px ui-rounded, sans-serif';
    ctx.fillText('zero', w / 2, 140);
  });
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.21),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  plate.userData.draw = (value, word) => {
    const ctx = texture.image.getContext('2d');
    ctx.clearRect(0, 0, 256, 160);
    ctx.fillStyle = '#fffdf4';
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = '#2b2440';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 150);
    ctx.fillStyle = '#2b2440';
    ctx.textAlign = 'center';
    ctx.font = 'bold 84px ui-rounded, sans-serif';
    ctx.fillText(String(value), 128, 92);
    ctx.font = 'bold 30px ui-rounded, sans-serif';
    ctx.fillText(word, 128, 136);
    texture.needsUpdate = true;
  };
  return plate;
}

export function createTrain() {
  const group = new THREE.Group();
  const paint = material(0x3567c4, { roughness: 0.35, metalness: 0.28 });
  const trim = material(0xffd166, { roughness: 0.3, metalness: 0.5 });
  const dark = material(0x2a2637, { roughness: 0.6, metalness: 0.2 });
  const wheelMat = material(0x35303f, { roughness: 0.7 });

  const engine = new THREE.Group();
  engine.position.x = -0.72;
  group.add(engine);

  const boiler = tube(0.115, 0.115, 0.5, paint, 24);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(0.02, 0.19, 0);
  engine.add(boiler);
  const nose = ring(0.115, 0.022, trim, TAU);
  nose.position.set(0.27, 0.19, 0);
  nose.rotation.y = Math.PI / 2;
  engine.add(nose);
  const cab = rounded(0.2, 0.22, 0.24, 0.04, paint);
  cab.position.set(-0.2, 0.28, 0);
  engine.add(cab);
  const roof = rounded(0.24, 0.03, 0.28, 0.014, trim);
  roof.position.set(-0.2, 0.4, 0);
  engine.add(roof);
  const chimney = tube(0.035, 0.042, 0.11, dark, 16);
  chimney.position.set(0.17, 0.34, 0);
  engine.add(chimney);
  const dome = ball(0.045, trim, [1, 0.8, 1], 16);
  dome.position.set(0.03, 0.3, 0);
  engine.add(dome);
  for (const x of [-0.24, -0.04, 0.16]) {
    for (const z of [-0.12, 0.12]) {
      const wheel = tube(0.062, 0.062, 0.03, wheelMat, 20);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.062, z);
      engine.add(wheel);
    }
  }

  const wagon = new THREE.Group();
  wagon.position.x = 0.34;
  group.add(wagon);
  const bed = rounded(0.62, 0.06, 0.3, 0.02, material(0x9c6b45, { roughness: 0.6 }));
  bed.position.y = 0.15;
  wagon.add(bed);
  for (const z of [-0.15, 0.15]) {
    const side = rounded(0.62, 0.07, 0.025, 0.012, material(0xb37d52, { roughness: 0.6 }));
    side.position.set(0, 0.19, z);
    wagon.add(side);
  }
  const plate = createNumberPlate();
  plate.position.set(0, 0.115, 0.158);
  wagon.add(plate);
  const plateBack = plate.clone();
  plateBack.position.z = -0.158;
  plateBack.rotation.y = Math.PI;
  plateBack.userData.draw = plate.userData.draw;
  wagon.add(plateBack);
  for (const x of [-0.2, 0.2]) {
    for (const z of [-0.14, 0.14]) {
      const wheel = tube(0.052, 0.052, 0.028, wheelMat, 18);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.052, z);
      wagon.add(wheel);
    }
  }
  group.userData.engine = engine;
  group.userData.wagon = wagon;
  group.userData.plate = plate;
  group.userData.plateBack = plateBack;
  group.userData.blockSlots = [];
  group.userData.paint = ['#3567c4'];
  return group;
}

export function createTrack(length = 4.6) {
  const group = new THREE.Group();
  const railMat = material(0xb9b2c9, { roughness: 0.3, metalness: 0.75 });
  const sleeperMat = material(0x8a6440, { roughness: 0.8 });
  for (const z of [-0.18, 0.18]) {
    const rail = rounded(length, 0.022, 0.032, 0.008, railMat);
    rail.position.set(0, 0.024, z);
    group.add(rail);
  }
  const count = Math.floor(length / 0.24);
  for (let i = 0; i < count; i += 1) {
    const sleeper = rounded(0.09, 0.02, 0.48, 0.006, sleeperMat);
    sleeper.position.set(-length / 2 + 0.12 + i * 0.24, 0.012, 0);
    group.add(sleeper);
  }
  return group;
}

export function createCrate() {
  const group = new THREE.Group();
  const wood = material(0xb98a5c, { roughness: 0.75 });
  const dark = material(0x8f6740, { roughness: 0.7 });
  const floor = rounded(0.34, 0.03, 0.3, 0.01, dark, 2);
  floor.position.y = 0.015;
  group.add(floor);
  for (const x of [-0.165, 0.165]) {
    const wall = rounded(0.03, 0.24, 0.3, 0.01, wood, 2);
    wall.position.set(x, 0.13, 0);
    group.add(wall);
  }
  for (const z of [-0.135, 0.135]) {
    const wall = rounded(0.31, 0.24, 0.03, 0.01, wood, 2);
    wall.position.set(0, 0.13, z);
    group.add(wall);
  }
  const colours = [0xff6b6b, 0xffb703, 0x4aa3df, 0x74c69d];
  colours.forEach((color, index) => {
    const block = rounded(0.085, 0.085, 0.085, 0.016, material(color, { roughness: 0.42 }), 2);
    block.position.set((index % 2) * 0.1 - 0.05, 0.07 + Math.floor(index / 2) * 0.05, 0);
    block.rotation.y = index * 0.4;
    group.add(block);
  });
  return group;
}

/* ---------------------------------------------------------------- kid */

export function createKid() {
  const group = new THREE.Group();
  const skin = material(0xf6c9a8, { roughness: 0.72 });
  const shirt = material(0x4aa3df, { roughness: 0.68 });
  const pants = material(0x3d4468, { roughness: 0.72 });
  const shoe = material(0xe0556d, { roughness: 0.62 });
  const hair = material(0x3a2b28, { roughness: 0.8 });
  const dark = material(0x2b2430, { roughness: 0.4 });

  const body = rounded(0.3, 0.36, 0.22, 0.09, shirt);
  body.position.y = 0.54;
  group.add(body);
  const neck = tube(0.055, 0.065, 0.07, skin, 16);
  neck.position.y = 0.735;
  group.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.88, 0);
  group.add(head);
  const skull = ball(0.17, skin, [1, 1.02, 0.98]);
  head.add(skull);
  const hairCap = ball(0.176, hair, [1, 0.72, 1], 22);
  hairCap.position.y = 0.045;
  head.add(hairCap);

  const face = new THREE.Group();
  head.add(face);
  const eyeWhite = material(0xfffdf8, { roughness: 0.3 });
  const eyeParts = [];
  for (const sign of [-1, 1]) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(sign * 0.065, 0.015, 0.145);
    face.add(eyeGroup);
    const white = ball(0.038, eyeWhite, [1, 1, 0.55], 16);
    eyeGroup.add(white);
    const pupil = ball(0.018, dark, [1, 1, 0.6], 14);
    pupil.position.z = 0.022;
    eyeGroup.add(pupil);
    eyeParts.push({ group: eyeGroup, sign });
  }
  const nose = ball(0.024, skin, [1, 0.9, 1], 14);
  nose.position.set(0, -0.02, 0.172);
  face.add(nose);
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.062, 0.15);
  face.add(mouth);
  const lips = ring(0.036, 0.009, material(0xc9556b, { roughness: 0.5 }), Math.PI);
  lips.rotation.z = Math.PI;
  mouth.add(lips);
  const mouthInside = ball(0.026, material(0x8b3040, { roughness: 0.5 }), [1, 0.8, 0.5], 14);
  mouthInside.position.y = -0.008;
  mouth.add(mouthInside);

  const ears = [];
  for (const sign of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.position.set(sign * 0.168, 0.002, 0);
    head.add(earGroup);
    const ear = ball(0.038, skin, [0.55, 1, 0.8], 16);
    earGroup.add(ear);
    ears.push({ group: earGroup, sign });
  }

  const arms = [];
  const hands = [];
  for (const sign of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.185, 0.66, 0.02);
    group.add(shoulder);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.19, 6, 14), shirt);
    limb.position.y = -0.14;
    limb.castShadow = true;
    shoulder.add(limb);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.1, 6, 14), skin);
    forearm.position.y = -0.28;
    forearm.castShadow = true;
    shoulder.add(forearm);
    const hand = ball(0.055, skin, [1, 1.05, 0.9], 18);
    hand.position.y = -0.36;
    shoulder.add(hand);
    shoulder.rotation.z = -sign * 0.14;
    arms.push({ group: shoulder, sign });
    hands.push(hand);
  }

  const legs = [];
  for (const sign of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sign * 0.075, 0.36, 0);
    group.add(hip);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.2, 6, 14), pants);
    leg.position.y = -0.14;
    leg.castShadow = true;
    hip.add(leg);
    const foot = new THREE.Group();
    foot.position.y = -0.28;
    hip.add(foot);
    const shoeMesh = rounded(0.115, 0.07, 0.2, 0.03, shoe);
    shoeMesh.position.set(0, -0.035, 0.035);
    foot.add(shoeMesh);
    legs.push({ group: hip, sign, foot });
  }

  group.userData.parts = {
    head: { nodes: [head, skull, hairCap], rest: head.rotation.clone(), origin: head.position.clone() },
    eye: { nodes: eyeParts.map((item) => item.group), rest: null },
    ear: { nodes: ears.map((item) => item.group), rest: null },
    nose: { nodes: [nose], rest: nose.position.clone() },
    mouth: { nodes: [mouth], rest: mouth.position.clone() },
    hand: { nodes: hands, rest: null },
    arm: { nodes: arms.map((item) => item.group), rest: null },
    foot: { nodes: legs.map((item) => item.foot), rest: null },
  };
  group.userData.limbs = { arms, legs, ears, eyeParts, head, mouth };
  return group;
}

/* ---------------------------------------------------------------- props */

export function createBasket() {
  const group = new THREE.Group();
  const weave = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c98b45';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120, 74, 26, 0.55)';
    ctx.lineWidth = 4;
    for (let x = 0; x < w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255, 226, 180, 0.4)';
    for (let y = 0; y < h; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  });
  weave.wrapS = THREE.RepeatWrapping;
  weave.repeat.set(3, 1);
  const side = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.23, 0.24, 32, 1, true),
    new THREE.MeshStandardMaterial({ map: weave, roughness: 0.82, side: THREE.DoubleSide }),
  );
  side.position.y = 0.14;
  side.castShadow = true;
  side.receiveShadow = true;
  group.add(side);
  const base = tube(0.23, 0.23, 0.02, material(0xa9712f, { roughness: 0.85 }), 32);
  base.position.y = 0.02;
  group.add(base);
  const rim = ring(0.3, 0.022, material(0xd9a45f, { roughness: 0.7 }), TAU);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.26;
  group.add(rim);
  const handle = ring(0.22, 0.016, material(0xb07d3c, { roughness: 0.7 }), Math.PI);
  handle.position.y = 0.26;
  handle.rotation.y = 0;
  group.add(handle);
  const cloth = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 28),
    new THREE.MeshStandardMaterial({ color: 0xfff2d8, roughness: 0.9 }),
  );
  cloth.rotation.x = -Math.PI / 2;
  cloth.position.y = 0.245;
  group.add(cloth);
  return group;
}

export function createBlanket() {
  const checker = canvasTexture(256, 256, (ctx, w, h) => {
    const cell = 32;
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        ctx.fillStyle = ((x / cell) + (y / cell)) % 2 === 0 ? '#f6f1e4' : '#e2606f';
        ctx.fillRect(x, y, cell, cell);
      }
    }
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.15), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.94 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.004;
  mesh.receiveShadow = true;
  return mesh;
}

export function createTray(width = 2.1) {
  const group = new THREE.Group();
  const board = rounded(width, 0.05, 0.42, 0.02, material(0xd8b98c, { roughness: 0.76 }), 2);
  board.position.y = 0.07;
  group.add(board);
  const lip = rounded(width, 0.035, 0.03, 0.012, material(0xb98f5f, { roughness: 0.8 }), 2);
  for (const z of [-0.2, 0.2]) {
    const edge = lip.clone();
    edge.position.set(0, 0.095, z);
    group.add(edge);
  }
  for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) {
    for (const z of [-0.14, 0.14]) {
      const leg = tube(0.02, 0.024, 0.07, material(0x8f6740, { roughness: 0.8 }), 12);
      leg.position.set(x, 0.035, z);
      group.add(leg);
    }
  }
  group.userData.top = 0.095;
  return group;
}

export function createPedestal() {
  const group = new THREE.Group();
  const post = tube(0.05, 0.07, 0.2, material(0xe6dccb, { roughness: 0.6 }), 24);
  post.position.y = 0.1;
  group.add(post);
  const top = tube(0.19, 0.19, 0.035, material(0xfff6e2, { roughness: 0.5 }), 32);
  top.position.y = 0.21;
  group.add(top);
  const foot = tube(0.16, 0.18, 0.03, material(0xd8ccb5, { roughness: 0.6 }), 28);
  foot.position.y = 0.015;
  group.add(foot);
  group.userData.top = 0.228;
  return group;
}

export function createColorPot(color) {
  const group = new THREE.Group();
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.05, 0.07, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xfff8ec, roughness: 0.42, side: THREE.DoubleSide }),
  );
  bowl.position.y = 0.035;
  bowl.castShadow = true;
  group.add(bowl);
  const paint = ball(0.048, material(color, { roughness: 0.32 }), [1, 0.55, 1], 20);
  paint.position.y = 0.062;
  group.add(paint);
  const rim = ring(0.062, 0.009, material(0xfff3dd, { roughness: 0.4 }), TAU);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.07;
  group.add(rim);
  const base = tube(0.05, 0.05, 0.012, material(0xf0e5d0), 20);
  base.position.y = 0.006;
  group.add(base);
  group.userData.paint = paint;
  return group;
}

export function createTree() {
  const group = new THREE.Group();
  const trunk = tube(0.045, 0.06, 0.42, material(0x8d5f3b, { roughness: 0.85 }), 14);
  trunk.position.y = 0.21;
  group.add(trunk);
  const leafMat = material(0x4f9e5a, { roughness: 0.75 });
  const leafMat2 = material(0x63b36c, { roughness: 0.75 });
  for (const [x, y, z, r, m] of [[0, 0.52, 0, 0.2, leafMat], [-0.14, 0.44, 0.05, 0.14, leafMat2], [0.15, 0.46, -0.04, 0.13, leafMat2], [0.02, 0.66, 0.02, 0.14, leafMat]]) {
    const blob = ball(r, m, [1, 0.92, 1], 20);
    blob.position.set(x, y, z);
    group.add(blob);
  }
  return group;
}

export function createPond() {
  const group = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.52, 40),
    new THREE.MeshStandardMaterial({ color: 0x55b6e8, roughness: 0.16, metalness: 0.22, transparent: true, opacity: 0.86 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.012;
  water.receiveShadow = true;
  group.add(water);
  const stoneMat = material(0xb9b3a6, { roughness: 0.85 });
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * TAU;
    const stone = ball(0.05 + (i % 3) * 0.012, stoneMat, [1, 0.6, 1], 12);
    stone.position.set(Math.cos(angle) * 0.55, 0.02, Math.sin(angle) * 0.55);
    group.add(stone);
  }
  return group;
}

export function createFence(length = 2.6) {
  const group = new THREE.Group();
  const wood = material(0xf2d7b0, { roughness: 0.8 });
  const posts = 6;
  for (let i = 0; i < posts; i += 1) {
    const post = rounded(0.06, 0.28, 0.06, 0.018, wood, 2);
    post.position.set(-length / 2 + (i * length) / (posts - 1), 0.14, 0);
    group.add(post);
  }
  for (const y of [0.1, 0.21]) {
    const rail = rounded(length, 0.045, 0.03, 0.012, wood, 2);
    rail.position.set(0, y, 0);
    group.add(rail);
  }
  return group;
}

export function createMat(radius = 0.85) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshStandardMaterial({ color: 0xffe8c9, roughness: 0.95 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.003;
  mesh.receiveShadow = true;
  return mesh;
}

/* ---------------------------------------------------------------- school */

export function createSchoolItem(id) {
  const group = new THREE.Group();
  if (id === 'bag') {
    const body = rounded(0.44, 0.46, 0.24, 0.07, material(0x3f7fc4, { roughness: 0.62 }));
    body.position.y = 0.26;
    group.add(body);
    const pocket = rounded(0.28, 0.2, 0.06, 0.03, material(0x356fa8, { roughness: 0.62 }));
    pocket.position.set(0, 0.15, 0.14);
    group.add(pocket);
    const flap = rounded(0.3, 0.16, 0.04, 0.02, material(0x2c619a, { roughness: 0.6 }));
    flap.position.set(0, 0.31, 0.13);
    group.add(flap);
    for (const x of [-0.12, 0.12]) {
      const strap = rounded(0.06, 0.34, 0.05, 0.02, material(0x2c619a, { roughness: 0.7 }));
      strap.position.set(x, 0.34, -0.14);
      group.add(strap);
    }
    const zipper = rounded(0.4, 0.02, 0.02, 0.008, material(0xffd166, { roughness: 0.35, metalness: 0.6 }));
    zipper.position.set(0, 0.49, 0.02);
    group.add(zipper);
    const pull = ball(0.02, material(0xffd166, { metalness: 0.7, roughness: 0.3 }), [1, 1, 1], 12);
    pull.position.set(0.2, 0.49, 0.02);
    group.add(pull);
    const handle = ring(0.09, 0.014, material(0x2c619a, { roughness: 0.7 }), Math.PI);
    handle.position.set(0, 0.5, -0.02);
    group.add(handle);
    group.userData.open = (angle) => { flap.rotation.x = angle; };
  } else if (id === 'book') {
    const cover = rounded(0.24, 0.05, 0.3, 0.012, material(0xd6535f, { roughness: 0.6 }));
    cover.position.y = 0.025;
    group.add(cover);
    const pages = rounded(0.21, 0.035, 0.27, 0.006, material(0xfffdf4, { roughness: 0.9 }));
    pages.position.y = 0.055;
    group.add(pages);
    const coverTop = rounded(0.24, 0.02, 0.3, 0.008, material(0xd6535f, { roughness: 0.6 }));
    coverTop.position.y = 0.078;
    group.add(coverTop);
    const spine = rounded(0.02, 0.07, 0.3, 0.008, material(0xb64450, { roughness: 0.6 }));
    spine.position.set(-0.11, 0.04, 0);
    group.add(spine);
  } else if (id === 'pen') {
    const barrel = tube(0.013, 0.011, 0.16, material(0x2c3e70, { roughness: 0.32, metalness: 0.3 }), 18);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0, 0.02, 0);
    group.add(barrel);
    const tip = cone(0.012, 0.04, material(0xd8b45a, { metalness: 0.8, roughness: 0.3 }), 14);
    tip.rotation.z = -Math.PI / 2;
    tip.position.set(0.1, 0.02, 0);
    group.add(tip);
    const clip = rounded(0.05, 0.008, 0.012, 0.004, material(0xd8b45a, { metalness: 0.8, roughness: 0.3 }));
    clip.position.set(-0.05, 0.034, 0);
    group.add(clip);
    const cap = tube(0.014, 0.014, 0.03, material(0x1d2c52, { roughness: 0.4 }), 16);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(-0.075, 0.02, 0);
    group.add(cap);
  } else if (id === 'pencil') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 6), material(0xf7c948, { roughness: 0.6 }));
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.02, 0);
    body.castShadow = true;
    group.add(body);
    const woodTip = cone(0.016, 0.045, material(0xe8c39e, { roughness: 0.8 }), 12);
    woodTip.rotation.z = -Math.PI / 2;
    woodTip.position.set(0.102, 0.02, 0);
    group.add(woodTip);
    const graphite = cone(0.007, 0.016, material(0x33303a, { roughness: 0.5 }), 10);
    graphite.rotation.z = -Math.PI / 2;
    graphite.position.set(0.128, 0.02, 0);
    group.add(graphite);
    const ferrule = tube(0.017, 0.017, 0.02, material(0xc0c4cc, { metalness: 0.85, roughness: 0.3 }), 14);
    ferrule.rotation.z = Math.PI / 2;
    ferrule.position.set(-0.085, 0.02, 0);
    group.add(ferrule);
    const eraser = tube(0.016, 0.016, 0.022, material(0xf4a6b8, { roughness: 0.85 }), 14);
    eraser.rotation.z = Math.PI / 2;
    eraser.position.set(-0.106, 0.02, 0);
    group.add(eraser);
  } else if (id === 'ruler') {
    const ticks = canvasTexture(512, 96, (ctx, w, h) => {
      ctx.fillStyle = '#f4d47c';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#40392c';
      ctx.fillStyle = '#40392c';
      ctx.font = 'bold 26px ui-rounded, sans-serif';
      for (let i = 0; i <= 10; i += 1) {
        const x = 12 + (i * (w - 24)) / 10;
        ctx.lineWidth = i % 5 === 0 ? 5 : 3;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, i % 5 === 0 ? 46 : 28); ctx.stroke();
        if (i % 5 === 0) ctx.fillText(String(i / 5), x - 8, 82);
      }
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.065), [
      material(0xf4d47c), material(0xf4d47c), new THREE.MeshStandardMaterial({ map: ticks, roughness: 0.6 }),
      material(0xe6c469), material(0xf4d47c), material(0xf4d47c),
    ]);
    body.position.y = 0.006;
    body.castShadow = true;
    group.add(body);
  } else if (id === 'eraser') {
    const base = rounded(0.12, 0.035, 0.06, 0.012, material(0xf5f1e8, { roughness: 0.9 }));
    base.position.y = 0.0175;
    group.add(base);
    const sleeve = rounded(0.07, 0.038, 0.062, 0.012, material(0x4aa3df, { roughness: 0.75 }));
    sleeve.position.set(0.02, 0.0175, 0);
    group.add(sleeve);
  } else if (id === 'crayon') {
    const wrapper = tube(0.019, 0.019, 0.1, material(0xe45c5c, { roughness: 0.7 }), 18);
    wrapper.rotation.z = Math.PI / 2;
    wrapper.position.set(-0.02, 0.02, 0);
    group.add(wrapper);
    const tip = cone(0.019, 0.045, material(0xe45c5c, { roughness: 0.55 }), 18);
    tip.rotation.z = -Math.PI / 2;
    tip.position.set(0.052, 0.02, 0);
    group.add(tip);
    const band = tube(0.0205, 0.0205, 0.035, material(0xfff3dc, { roughness: 0.8 }), 16);
    band.rotation.z = Math.PI / 2;
    band.position.set(-0.04, 0.02, 0);
    group.add(band);
  } else {
    const body = rounded(0.26, 0.09, 0.12, 0.03, material(0x7fc8a9, { roughness: 0.62 }));
    body.position.y = 0.05;
    group.add(body);
    const zipper = rounded(0.24, 0.014, 0.014, 0.006, material(0x2b2440, { roughness: 0.5 }));
    zipper.position.set(0, 0.095, 0.045);
    group.add(zipper);
    const pull = ball(0.016, material(0xd8b45a, { metalness: 0.8, roughness: 0.3 }), [1, 1, 1], 12);
    pull.position.set(0.1, 0.095, 0.05);
    group.add(pull);
  }
  return group;
}
