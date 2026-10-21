import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import * as kit from './objects.js';

const POINTER_SLOP = 12;

export function createEnglishStage({ canvas, cssVar, onFirstInteract, onSelect, onTarget, onDrop, onZone, onAdd, onNotice }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth / Math.max(1, innerHeight), 0.05, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.2, 0.12, 64),
    new THREE.MeshStandardMaterial({ color: 0xf6ecd8, roughness: 0.92 }),
  );
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  scene.add(floor);

  const background = { texture: null };
  function applyTheme() {
    const a = cssVar('--scene-a') || '#fef9ef';
    const b = cssVar('--scene-b') || '#f6ecd8';
    const c = cssVar('--scene-c') || '#e8d9bd';
    const cv = Object.assign(document.createElement('canvas'), { width: 16, height: 512 });
    const ctx = cv.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, a);
    grad.addColorStop(0.58, b);
    grad.addColorStop(1, c);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 512);
    const texture = new THREE.CanvasTexture(cv);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (background.texture) background.texture.dispose();
    background.texture = texture;
    scene.background = texture;
    floor.material.color.set(b);
  }

  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x3f3755, 0.62));
  const key = new THREE.DirectionalLight(0xfff4e2, 2.55);
  key.position.set(3.8, 6.4, 4.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0004;
  const span = 4.2;
  key.shadow.camera.left = -span;
  key.shadow.camera.right = span;
  key.shadow.camera.top = span;
  key.shadow.camera.bottom = -span;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8c6ff, 0.5);
  fill.position.set(-5.2, 3.1, -3.4);
  scene.add(fill);
  const rim = new THREE.PointLight(0xffd7a1, 1.35, 9, 1.7);
  rim.position.set(0, 2.6, 2.2);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  const target = new THREE.Vector3(0, 0.6, 0);
  const view = { yaw: 0, pitch: 0.42, radius: 4.3, fit: 0, fitH: 0, zoom: 1 };
  const orbit = { dragging: false, px: 0, py: 0, pointerId: null };
  let stage = null;
  let drag = null;
  let pending = null;
  let lastState = null;

  const frame = { fullW: innerWidth, fullH: innerHeight };

  /* Visible half-size, in world units, of the panel-free area at one unit of distance. */
  function halfUnitsPerUnit() {
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const fullH = Math.max(1, frame.fullH);
    return { w: (tan * innerWidth) / fullH, h: (tan * innerHeight) / fullH };
  }

  function placeCamera() {
    const cp = Math.cos(view.pitch);
    const unit = halfUnitsPerUnit();
    // Constrain both axes: a long shelf must not be cropped on a phone, and a tall figure
    // must not have its head cut off, so the wider of the two demands decides the pull-back.
    const byWidth = view.fit ? view.fit / Math.max(0.0001, unit.w) : 0;
    const byHeight = view.fitH ? view.fitH / Math.max(0.0001, unit.h) : 0;
    const distance = Math.max(view.radius, byWidth, byHeight) * Math.max(0.2, view.zoom ?? 1);
    camera.position.set(
      target.x + Math.sin(view.yaw) * cp * distance,
      target.y + Math.sin(view.pitch) * distance,
      target.z + Math.cos(view.yaw) * cp * distance,
    );
    camera.lookAt(target);
  }

  function setView({ yaw = 0, pitch = 0.42, radius = 4.3, fit = 0, fitH = 0, look = [0, 0.6, 0] } = {}) {
    Object.assign(view, { yaw, pitch, radius, fit, fitH, zoom: 1 });
    target.set(look[0], look[1], look[2]);
    placeCamera();
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.62);

  function pointerToRay(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  function pickInfo(event) {
    if (!stage) return null;
    pointerToRay(event);
    const hits = raycaster.intersectObjects(stage.pickMeshes(), true);
    for (const hit of hits) {
      let node = hit.object;
      while (node && node !== world) {
        if (node.userData.pick) return { ...node.userData.pick, drag: node.userData.drag, object: hit.object };
        node = node.parent;
      }
    }
    return null;
  }

  function zoneHit(event) {
    if (!stage) return false;
    pointerToRay(event);
    return raycaster.intersectObjects(stage.zoneMeshes(), true).length > 0;
  }

  /* ------------------------------------------------------------- helpers */

  function addRug(width, depth, color) {
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      new THREE.MeshStandardMaterial({ color, roughness: 0.95 }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.scale.set(width / 2, depth / 2, 1);
    rug.position.y = 0.002;
    rug.receiveShadow = true;
    rug.userData.ignoreFrame = true;
    world.add(rug);
    return rug;
  }

  function floorRing(radius, color = 0xffc94d) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.72, radius, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.006;
    return mesh;
  }

  const narrow = () => innerWidth < 700;

  function trayLayout(count, width, z) {
    return Array.from({ length: count }, (_, index) => {
      const spread = width - 0.34;
      const step = count > 1 ? spread / (count - 1) : 0;
      return new THREE.Vector3(-spread / 2 + index * step, 0, z);
    });
  }

  /* A phone is narrow: shelves become two short rows so nothing runs off screen. */
  function traySlots(count, width, z) {
    if (!narrow() || count <= 4) return trayLayout(count, width, z);
    const half = Math.ceil(count / 2);
    return [...trayLayout(half, width * 0.62, z - 0.1), ...trayLayout(count - half, width * 0.62, z + 0.1)];
  }

  /* ------------------------------------------------------------- color */

  function mountColor(course) {
    const api = { items: course.items, pick: [], zones: [], toys: [], pots: [], rings: [], showAt: 0 };
    addRug(3.8, 2.9, 0xffe3ec);
    const pedestals = narrow() ? [-0.66, 0, 0.66] : [-1.02, 0, 1.02];
    course.targets.forEach((slot, index) => {
      const pedestal = kit.createPedestal();
      pedestal.position.set(pedestals[index], 0, -0.26);
      world.add(pedestal);
      const toy = slot.id === 'car' ? kit.createCar() : slot.id === 'house' ? kit.createHouse() : kit.createWindmill();
      toy.position.set(pedestals[index], pedestal.userData.top, -0.26);
      toy.userData.pick = { type: 'target', index };
      toy.userData.home = toy.position.clone();
      world.add(toy);
      const ring = floorRing(0.27);
      ring.position.set(pedestals[index], pedestal.userData.top + 0.002, -0.26);
      ring.visible = false;
      world.add(ring);
      api.toys.push(toy);
      api.rings.push(ring);
      api.pick.push(toy);
    });

    const tray = kit.createTray(narrow() ? 2.2 : 2.7);
    tray.position.set(0, 0, 0.98);
    world.add(tray);
    const slots = traySlots(course.items.length, narrow() ? 1.9 : 2.46, 0.98);
    course.items.forEach((item, index) => {
      const pot = kit.createColorPot(item.color ?? '#ffffff');
      pot.position.copy(slots[index]);
      pot.position.y = tray.userData.top;
      pot.userData.pick = { type: 'word', id: item.id };
      pot.userData.home = pot.position.clone();
      world.add(pot);
      api.pots.push(pot);
      api.pick.push(pot);
    });

    let clock = 0;
    api.pickMeshes = () => api.pick;
    api.zoneMeshes = () => [];
    api.update = (state) => {
      course.targets.forEach((_, index) => {
        const paintId = state.paints[index];
        const item = paintId ? course.items.find((word) => word.id === paintId) : null;
        if (item) kit.paintGroup(api.toys[index], item.color ?? '#ffffff');
        api.rings[index].visible = state.target === index;
      });
      course.items.forEach((item, index) => {
        const selected = state.selected === item.id;
        api.pots[index].scale.setScalar(selected ? 1.4 : 1.2);
        api.pots[index].position.y = api.pots[index].userData.home.y + (selected ? 0.035 : 0);
      });
    };
    api.present = () => { api.showAt = performance.now(); };
    api.frame = (dt, now) => {
      clock += dt;
      const prop = api.toys[2]?.userData.spin;
      if (prop) prop.rotation.z += dt * 0.9;
      const since = api.showAt ? (now - api.showAt) / 1000 : 99;
      api.toys.forEach((toy, index) => {
        if (since < 2.6) {
          const hop = Math.max(0, Math.sin((since - index * 0.18) * 3.4));
          toy.position.y = toy.userData.home.y + hop * 0.2;
          toy.rotation.y = Math.sin(since * 2 + index) * 0.35;
        } else {
          toy.position.y += (toy.userData.home.y - toy.position.y) * Math.min(1, dt * 7);
          toy.rotation.y *= 1 - Math.min(1, dt * 7);
        }
      });
      api.pots.forEach((pot, index) => { pot.rotation.y = Math.sin(clock * 0.8 + index) * 0.05; });
    };
    // Narrow screens get their own framing; wide screens keep the hand-tuned radius view.
    api.view = narrow()
      ? { yaw: 0, pitch: 0.46, radius: 4.15, fit: 1.36, look: [0, 0.55, 0.05] }
      : { yaw: 0, pitch: 0.46, radius: 4.15, look: [0, 0.5, 0.05] };
    return api;
  }

  /* ------------------------------------------------------------- fruit */

  function mountFruit(course) {
    const api = { pick: [], zones: [], items: [], showAt: 0 };
    addRug(4.0, 2.9, 0xd9f2d0);
    const basketX = narrow() ? 0 : 0.62;
    const blanket = kit.createBlanket();
    blanket.position.set(basketX, 0.005, 0.3);
    world.add(blanket);
    const basket = kit.createBasket();
    basket.position.set(basketX, 0, 0.3);
    basket.scale.setScalar(0.94);
    basket.userData.pick = { type: 'zone' };
    world.add(basket);
    api.basket = basket;
    api.zones.push(basket);

    const tray = kit.createTray(narrow() ? 2.2 : 2.9);
    tray.position.set(0, 0, -1.16);
    world.add(tray);
    const slots = traySlots(course.items.length, narrow() ? 2.0 : 2.66, -1.16);
    course.items.forEach((item, index) => {
      const object = kit.createFruit(item.id);
      object.position.copy(slots[index]);
      object.position.y = tray.userData.top;
      object.userData.pick = { type: 'word', id: item.id };
      object.userData.drag = { id: item.id };
      object.userData.home = object.position.clone();
      world.add(object);
      api.items.push({ item, object });
      api.pick.push(object);
    });

    let placedMeshes = [];
    let clock = 0;
    api.pickMeshes = () => api.pick;
    api.zoneMeshes = () => api.zones;
    api.update = (state) => {
      const inside = new Set(state.placed);
      api.items.forEach(({ item, object }) => {
        object.visible = !inside.has(item.id);
        object.position.copy(object.userData.home);
        object.rotation.set(0, 0, 0);
        object.scale.setScalar(1);
      });
      for (const mesh of placedMeshes) world.remove(mesh);
      placedMeshes = state.placed.map((id, index) => {
        const mesh = kit.createFruit(id);
        mesh.scale.setScalar(0.74);
        mesh.position.set(basketX + (index - 1) * 0.16, 0.2 + (index === 1 ? 0.01 : 0), 0.3 + (index - 1) * 0.06);
        mesh.rotation.y = index * 0.5;
        world.add(mesh);
        return mesh;
      });
    };
    api.present = () => { api.showAt = performance.now(); };
    api.frame = (dt, now) => {
      clock += dt;
      const since = api.showAt ? (now - api.showAt) / 1000 : 99;
      if (since < 2.8) {
        api.basket.position.y = Math.sin(Math.min(1, since / 1.4) * Math.PI) * 0.14;
        api.basket.rotation.y = Math.sin(since * 2.4) * 0.18;
        blanket.scale.setScalar(1 + Math.min(0.06, since * 0.04));
      } else {
        api.basket.position.y += (0 - api.basket.position.y) * Math.min(1, dt * 7);
        api.basket.rotation.y *= 1 - Math.min(1, dt * 6);
        blanket.scale.setScalar(1);
      }
      placedMeshes.forEach((mesh, index) => {
        mesh.rotation.y = index * 0.5 + Math.sin(clock * 2 + index) * 0.1;
      });
      api.items.forEach(({ object }, index) => {
        if (!object.visible) return;
        object.position.y = object.userData.home.y + Math.sin(clock * 1.4 + index) * 0.004;
      });
    };
    api.view = narrow()
      ? { yaw: 0, pitch: 0.54, radius: 4.25, fit: 1.16, look: [0, 0.34, -0.42] }
      : { yaw: 0, pitch: 0.54, radius: 4.25, look: [0.2, 0.35, -0.25] };
    return api;
  }

  /* ------------------------------------------------------------- animal */

  function mountAnimal(course) {
    const api = { pick: [], zones: [], items: [], showAt: 0 };
    addRug(4.2, 3.1, 0xcdeccb);
    const grass = new THREE.Mesh(
      new THREE.CircleGeometry(narrow() ? 1.15 : 1.36, 56),
      new THREE.MeshStandardMaterial({ color: 0x8fd07a, roughness: 0.95 }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, 0.004, -0.24);
    grass.receiveShadow = true;
    grass.userData.pick = { type: 'zone' };
    world.add(grass);
    api.zones.push(grass);

    const pond = kit.createPond();
    pond.position.set(narrow() ? -0.86 : -1.24, 0, -0.56);
    pond.scale.setScalar(0.78);
    pond.userData.pick = { type: 'zone' };
    world.add(pond);
    api.zones.push(pond);

    const tree = kit.createTree();
    tree.position.set(narrow() ? 0.95 : 1.32, 0, -0.66);
    world.add(tree);
    const fence = kit.createFence(narrow() ? 2.05 : 2.3);
    fence.position.set(0.1, 0, -1.3);
    world.add(fence);

    const tray = kit.createTray(narrow() ? 2.2 : 2.7);
    tray.position.set(0, 0, 1.18);
    world.add(tray);
    const slots = traySlots(course.items.length, narrow() ? 1.86 : 2.44, 1.18);
    course.items.forEach((item, index) => {
      const object = kit.createAnimal(item.id);
      object.scale.setScalar(0.8);
      object.position.copy(slots[index]);
      object.position.y = tray.userData.top;
      object.userData.pick = { type: 'word', id: item.id };
      object.userData.drag = { id: item.id };
      object.userData.home = object.position.clone();
      world.add(object);
      api.items.push({ item, object });
      api.pick.push(object);
    });

    const spots = [
      new THREE.Vector3(-0.6, 0.004, -0.12),
      new THREE.Vector3(0.5, 0.004, 0.1),
      new THREE.Vector3(-0.1, 0.004, -0.72),
    ];
    const residents = spots.map((spot) => {
      const holder = new THREE.Group();
      holder.position.copy(spot);
      holder.visible = false;
      world.add(holder);
      return holder;
    });
    api.residents = residents;

    let clock = 0;
    api.pickMeshes = () => api.pick;
    api.zoneMeshes = () => api.zones;
    api.update = (state) => {
      const inside = new Set(state.placed);
      api.items.forEach(({ item, object }) => {
        object.visible = !inside.has(item.id);
        object.position.copy(object.userData.home);
        object.rotation.set(0, 0, 0);
      });
      residents.forEach((holder, index) => {
        const id = state.placed[index];
        holder.visible = Boolean(id);
        if (!id) return;
        if (holder.userData.built !== id) {
          holder.clear();
          const model = kit.createAnimal(id);
          model.scale.setScalar(1.15);
          model.rotation.y = 0.3;
          holder.add(model);
          holder.userData.built = id;
          holder.userData.model = model;
        }
      });
    };
    api.present = () => { api.showAt = performance.now(); };
    api.frame = (dt, now) => {
      clock += dt;
      const since = api.showAt ? (now - api.showAt) / 1000 : 99;
      residents.forEach((holder, index) => {
        const model = holder.userData.model;
        if (!holder.visible || !model) return;
        if (since < 2.8) {
          model.position.y = Math.abs(Math.sin((since + index * 0.2) * 5)) * 0.12;
          model.rotation.y = 0.3 + Math.sin(since * 3 + index) * 0.9;
        } else {
          model.position.y += (0 - model.position.y) * Math.min(1, dt * 7);
        }
        model.userData.anim?.(clock + index);
      });
      api.items.forEach(({ object }, index) => {
        if (!object.visible) return;
        object.position.y = object.userData.home.y + Math.abs(Math.sin(clock * 1.6 + index)) * 0.003;
        object.userData.anim?.(clock + index);
      });
    };
    api.view = narrow()
      ? { yaw: 0, pitch: 0.5, radius: 4.45, fit: 1.43, look: [0, 0.34, -0.05] }
      : { yaw: 0, pitch: 0.5, radius: 4.45, look: [0, 0.38, -0.2] };
    return api;
  }

  /* ------------------------------------------------------------- number */

  function mountNumber(course) {
    const api = { pick: [], zones: [], showAt: 0, blocks: [] };
    addRug(4.4, 2.7, 0xd8e6f7);
    const track = kit.createTrack(narrow() ? 3.0 : 4.6);
    track.position.set(0, 0, 0.42);
    world.add(track);
    const train = kit.createTrain();
    train.position.set(-0.2, 0.035, 0.42);
    train.userData.pick = { type: 'word', id: 'one' };
    world.add(train);
    api.train = train;
    api.pick.push(train);

    const crate = kit.createCrate();
    crate.position.set(narrow() ? -1.15 : -1.7, 0, -0.8);
    crate.userData.pick = { type: 'add' };
    world.add(crate);
    api.pick.push(crate);
    api.zones.push(crate);

    const wagon = train.userData.wagon;
    for (let i = 0; i < 10; i += 1) {
      // A block per slot, so each one owns its material and can glow on its own.
      const block = kit.createBlock(String(i));
      const layer = Math.floor(i / 5);
      const lane = i % 5;
      block.position.set(-0.22 + lane * 0.11, 0.228 + layer * 0.1, 0);
      block.visible = false;
      wagon.add(block);
      api.blocks.push({ mesh: block, material: block.children[0].material, base: block.position.clone() });
    }

    let clock = 0;
    const launch = narrow() ? 0.35 : 0.5;
    api.pickMeshes = () => api.pick;
    api.zoneMeshes = () => [];
    api.update = (state) => {
      const word = course.items[state.count - 1];
      train.userData.plate.userData.draw(state.count, word ? word.en : 'zero');
      api.blocks.forEach(({ mesh }, index) => { mesh.visible = index < state.count; });
    };
    api.present = () => { api.showAt = performance.now(); };
    api.frame = (dt, now) => {
      clock += dt;
      const since = api.showAt ? (now - api.showAt) / 1000 : 99;
      if (since < 3.4) {
        const t = Math.min(1, since / 2.1);
        train.position.x = -0.2 + Math.sin(t * Math.PI) * launch;
        api.blocks.forEach((block, index) => {
          if (!block.mesh.visible) return;
          const local = (since - index * 0.16) / 0.34;
          const pulse = local > 0 && local < 1 ? Math.sin(local * Math.PI) : 0;
          block.mesh.position.y = block.base.y + pulse * 0.07;
          block.material.emissive?.setHex(pulse > 0.25 ? 0x6b5a1f : 0x000000);
        });
      } else {
        train.position.x += (-0.2 - train.position.x) * Math.min(1, dt * 5);
        api.blocks.forEach((block) => {
          block.mesh.position.y += (block.base.y - block.mesh.position.y) * Math.min(1, dt * 7);
          block.material.emissive?.setHex(0x000000);
        });
      }
      train.userData.engine.position.y = Math.abs(Math.sin(clock * 2.2)) * 0.004;
    };
    api.view = narrow()
      ? { yaw: -0.16, pitch: 0.44, radius: 4.3, fit: 1.69, look: [0, 0.3, 0.5] }
      : { yaw: -0.16, pitch: 0.44, radius: 4.3, look: [0, 0.32, 0.1] };
    return api;
  }

  /* ------------------------------------------------------------- body */

  function mountBody(course) {
    const api = { pick: [], zones: [], showAt: 0, action: null, visited: [] };
    addRug(1.8, 1.5, 0xffe0e6);
    const kid = kit.createKid();
    world.add(kid);
    api.kid = kid;
    const parts = kid.userData.parts;
    // Small parts win over the limb that contains them.
    for (const id of ['eye', 'ear', 'nose', 'mouth', 'hand', 'foot', 'head', 'arm']) {
      for (const node of parts[id]?.nodes ?? []) {
        node.traverse((child) => {
          if (child.isMesh && !child.userData.pick) child.userData.pick = { type: 'word', id };
        });
        if (node.isMesh && !node.userData.pick) node.userData.pick = { type: 'word', id };
      }
    }
    api.pickMeshes = () => [kid];

    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.062, 32),
      new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.95, side: THREE.DoubleSide, toneMapped: false }),
    );
    ringMesh.visible = false;
    world.add(ringMesh);
    api.ring = ringMesh;

    const markers = [];
    const box = new THREE.Box3();
    function partCenter(id) {
      box.makeEmpty();
      for (const node of parts[id]?.nodes ?? []) box.expandByObject(node);
      if (box.isEmpty()) return new THREE.Vector3(0, 0.6, 0.1);
      return box.getCenter(new THREE.Vector3());
    }

    api.update = (state) => {
      const anchor = parts[state.selected] ? partCenter(state.selected) : null;
      if (anchor) {
        ringMesh.position.set(anchor.x, anchor.y, Math.max(anchor.z + 0.06, 0.1));
        ringMesh.visible = true;
      } else {
        ringMesh.visible = false;
      }
      markers.forEach((marker) => { marker.visible = false; });
      state.visited.forEach((id, index) => {
        if (!markers[index]) {
          const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.026, 12, 10),
            new THREE.MeshBasicMaterial({ color: 0xffc94d, toneMapped: false }),
          );
          world.add(marker);
          markers.push(marker);
        }
        const point = partCenter(id);
        markers[index].position.set(point.x, point.y + 0.1, point.z);
        markers[index].visible = true;
      });
    };
    api.present = () => {
      api.showAt = performance.now();
      api.queue = [...api.visited];
      api.queueAt = -1;
    };
    api.play = (id) => { api.action = { id, at: performance.now() }; };

    const limbs = kid.userData.limbs;
    function resetKid() {
      limbs.head.rotation.set(0, 0, 0);
      limbs.head.position.y = 0.88;
      limbs.eyeParts.forEach(({ group }) => { group.scale.y = 1; });
      limbs.ears.forEach(({ group }) => { group.rotation.z = 0; });
      limbs.mouth.scale.set(1, 1, 1);
      limbs.arms.forEach(({ group, sign }) => { group.rotation.set(0, 0, -sign * 0.14); });
      limbs.legs.forEach(({ group, sign }) => { group.rotation.set(0, 0, sign * 0.02); });
    }
    resetKid();

    api.frame = (dt, now) => {
      kid.position.y = Math.sin(now * 0.0016) * 0.006;
      ringMesh.scale.setScalar(1 + Math.sin(now * 0.004) * 0.12);
      if (api.showAt && api.queue?.length) {
        const elapsed = (now - api.showAt) / 1000;
        const index = Math.floor(elapsed / 1.05);
        if (index !== api.queueAt && index < api.queue.length) {
          api.queueAt = index;
          api.action = { id: api.queue[index], at: now };
          api.onCue?.(api.queue[index], index);
        }
        if (index >= api.queue.length) api.showAt = 0;
      }
      if (!api.action) return;
      const t = (now - api.action.at) / 1000;
      resetKid();
      if (t > 0.95) { api.action = null; return; }
      const p = Math.sin(Math.min(1, t / 0.85) * Math.PI);
      const id = api.action.id;
      if (id === 'head') limbs.head.rotation.x = -p * 0.3;
      else if (id === 'eye') limbs.eyeParts.forEach(({ group }) => { group.scale.y = 1 - p * 0.85; });
      else if (id === 'ear') limbs.ears.forEach(({ group, sign }) => { group.rotation.z = sign * p * 0.5; });
      else if (id === 'nose') limbs.head.rotation.x = p * 0.16;
      else if (id === 'mouth') limbs.mouth.scale.set(1 + p * 0.3, 1 + p * 1.4, 1);
      else if (id === 'hand') limbs.arms.forEach(({ group, sign }) => { group.rotation.z = -sign * (0.14 + p * 1.2); });
      else if (id === 'arm') limbs.arms.forEach(({ group }) => { group.rotation.x = -p * 1.25; });
      else if (id === 'foot') limbs.legs.forEach(({ group }, index) => {
        if (index === 0) group.rotation.x = -p * 1.0;
        else group.rotation.z = 0.02;
      });
    };
    api.visited = [];
    // A standing kid is taller than it is wide, so the phone framing is driven by height.
    api.view = narrow()
      ? { yaw: 0.12, pitch: 0.3, radius: 2.85, fitH: 1.33, look: [0, 0.76, 0] }
      : { yaw: 0.12, pitch: 0.3, radius: 2.85, look: [0, 0.62, 0] };
    return api;
  }

  /* ------------------------------------------------------------- school */

  function mountSchool(course) {
    const api = { pick: [], zones: [], items: [], showAt: 0 };
    addRug(3.8, 2.7, 0xdde8ff);
    const deskWidth = narrow() ? 1.75 : 2.2;
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(deskWidth, 0.08, 0.95),
      new THREE.MeshStandardMaterial({ color: 0xd9a86d, roughness: 0.65 }),
    );
    deskTop.position.set(0.15, 0.46, -0.1);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    world.add(deskTop);
    const legX = 0.15 + deskWidth / 2 - 0.12;
    for (const x of [0.15 - (legX - 0.15), legX]) {
      for (const z of [-0.42, 0.22]) {
        const leg = kit.tube(0.035, 0.04, 0.44, kit.material(0xb98a5c, { roughness: 0.7 }), 14);
        leg.position.set(x, 0.22, z - 0.1);
        world.add(leg);
      }
    }

    const bagX = narrow() ? -0.5 : -0.68;
    const bag = kit.createSchoolItem('bag');
    bag.position.set(bagX, 0.5, -0.1);
    bag.scale.setScalar(1.12);
    bag.rotation.y = 0.2;
    bag.userData.pick = { type: 'zone' };
    world.add(bag);
    api.bag = bag;
    api.zones.push(bag);

    const rests = narrow()
      ? [
        [-0.18, 0.5, 0.16], [0.12, 0.5, 0.16], [0.42, 0.5, 0.16], [0.72, 0.5, 0.16],
        [-0.02, 0.5, -0.3], [0.28, 0.5, -0.3], [0.58, 0.5, -0.3],
      ]
      : [
        [-0.12, 0.5, 0.16], [0.16, 0.5, 0.14], [0.46, 0.5, 0.18], [0.74, 0.5, 0.14],
        [1.0, 0.5, 0.18], [0.08, 0.5, -0.3], [0.58, 0.5, -0.32],
      ];
    const itemWords = course.items.filter((item) => item.id !== 'bag');
    itemWords.forEach((item, index) => {
      const object = kit.createSchoolItem(item.id);
      object.position.set(...(rests[index] ?? [0.6, 0.5, 0]));
      object.scale.setScalar(1.2);
      object.userData.pick = { type: 'word', id: item.id };
      object.userData.drag = { id: item.id };
      object.userData.home = object.position.clone();
      world.add(object);
      api.items.push({ item, object });
      api.pick.push(object);
    });

    let peek = [];
    let clock = 0;
    api.pickMeshes = () => api.pick;
    api.zoneMeshes = () => api.zones;
    api.update = (state) => {
      const inside = new Set(state.placed);
      api.items.forEach(({ item, object }) => {
        object.visible = !inside.has(item.id);
        object.position.copy(object.userData.home);
        object.rotation.set(0, 0, 0);
      });
      for (const entry of peek) { world.remove(entry.mesh); entry.mesh.visible = false; }
      peek = state.placed.map((id, index) => {
        const mesh = kit.createSchoolItem(id);
        mesh.scale.setScalar(0.9);
        mesh.position.set(bagX + (index - 1) * 0.17, 0.62, 0.16);
        mesh.rotation.y = 0.2;
        mesh.visible = false;
        world.add(mesh);
        return { mesh, id, index };
      });
      bag.userData.open(0);
    };
    api.present = () => {
      api.showAt = performance.now();
      bag.userData.open(-0.6);
    };
    api.frame = (dt, now) => {
      clock += dt;
      const since = api.showAt ? (now - api.showAt) / 1000 : 99;
      const showing = since < 2.6;
      for (const entry of peek) {
        const { mesh, index } = entry;
        mesh.visible = showing;
        if (!showing) continue;
        const targetY = 0.94 + Math.abs(Math.sin((since + index * 0.2) * 3)) * 0.08;
        mesh.position.y += (targetY - mesh.position.y) * Math.min(1, dt * 8);
        mesh.rotation.y = 0.2 + Math.sin(clock * 2 + index) * 0.2;
      }
      if (!showing && api.showAt) {
        bag.userData.open(0);
        api.showAt = 0;
      }
    };
    api.view = narrow()
      ? { yaw: 0.05, pitch: 0.46, radius: 4.05, fit: 1.13, look: [0.06, 0.62, -0.1] }
      : { yaw: 0.05, pitch: 0.46, radius: 4.05, look: [0.16, 0.58, -0.05] };
    return api;
  }

  /* ------------------------------------------------------------- mounting */

  function clearWorld() {
    for (const child of [...world.children]) {
      world.remove(child);
      child.traverse((node) => { if (node.isMesh) node.geometry?.dispose?.(); });
    }
  }

  function mount(course) {
    clearWorld();
    if (course.kind === 'color') stage = mountColor(course);
    else if (course.kind === 'fruit') stage = mountFruit(course);
    else if (course.kind === 'animal') stage = mountAnimal(course);
    else if (course.kind === 'number') stage = mountNumber(course);
    else if (course.kind === 'body') stage = mountBody(course);
    else stage = mountSchool(course);
    stage.course = course;
    setView(stage.view);
    return stage;
  }

  /* ------------------------------------------------------------- pointer */

  let hoverAt = 0;
  function hover(event) {
    const now = performance.now();
    if (now - hoverAt < 60) return;
    hoverAt = now;
    canvas.style.cursor = pickInfo(event) ? 'pointer' : 'grab';
  }

  function findItem(id) {
    return stage?.items?.find((row) => row.item.id === id)?.object ?? null;
  }

  canvas.addEventListener('pointerdown', (event) => {
    onFirstInteract?.();
    const hit = pickInfo(event);
    if (hit?.type === 'word' && hit.drag !== undefined) {
      const object = findItem(hit.id);
      if (object) {
        drag = { id: hit.id, object, moved: 0, x: event.clientX, y: event.clientY };
        object.position.y += 0.2;
        object.scale.setScalar(1.1);
        canvas.setPointerCapture(event.pointerId);
        return;
      }
    }
    pending = hit ? { type: hit.type, id: hit.id, index: hit.index, x: event.clientX, y: event.clientY } : null;
    if (!hit) {
      orbit.dragging = true;
      orbit.px = event.clientX;
      orbit.py = event.clientY;
      orbit.pointerId = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (drag) {
      drag.moved = Math.max(drag.moved, Math.hypot(event.clientX - drag.x, event.clientY - drag.y));
      pointerToRay(event);
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane, point)) {
        drag.object.position.x = point.x;
        drag.object.position.z = point.z;
      }
      return;
    }
    if (orbit.dragging) {
      const dx = event.clientX - orbit.px;
      const dy = event.clientY - orbit.py;
      orbit.px = event.clientX;
      orbit.py = event.clientY;
      view.yaw -= dx * 0.006;
      view.pitch = Math.min(1.05, Math.max(0.12, view.pitch + dy * 0.004));
      placeCamera();
      return;
    }
    hover(event);
  });

  function finishPointer(event) {
    if (drag) {
      const { id, object, moved } = drag;
      drag = null;
      object.scale.setScalar(1);
      object.position.copy(object.userData.home ?? object.position);
      if (moved > POINTER_SLOP) {
        if (zoneHit(event)) onDrop?.(id);
        else {
          onNotice?.('invalid');
          if (lastState) stage?.update?.(lastState);
        }
      } else if (moved <= POINTER_SLOP) {
        onSelect?.(id);
      }
      return;
    }
    if (pending) {
      const moved = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
      const info = pending;
      pending = null;
      if (moved > POINTER_SLOP) return;
      if (info.type === 'word') onSelect?.(info.id);
      else if (info.type === 'target') onTarget?.(info.index);
      else if (info.type === 'zone') onZone?.();
      else if (info.type === 'add') onAdd?.();
      return;
    }
    if (orbit.pointerId === event.pointerId) orbit.dragging = false;
  }

  canvas.addEventListener('pointerup', finishPointer);
  canvas.addEventListener('pointercancel', (event) => {
    if (drag) {
      drag.object.position.copy(drag.object.userData.home ?? drag.object.position);
      drag.object.scale.setScalar(1);
      drag = null;
    }
    pending = null;
    if (orbit.pointerId === event.pointerId) orbit.dragging = false;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    // Zoom is a multiplier on the auto-fitted distance, so the wide-screen view keeps working.
    view.zoom = Math.min(1.6, Math.max(0.7, (view.zoom ?? 1) * (1 + event.deltaY * 0.0012)));
    placeCamera();
  }, { passive: false });

  /* Keep the playable stage centred in the space the panel leaves free. */
  function applyFraming() {
    const wide = innerWidth >= 861;
    const panel = document.getElementById('panel');
    const rect = panel?.getBoundingClientRect();
    let spaceX = 0;
    let spaceY = 0;
    if (rect) {
      if (wide) spaceX = Math.min(380, rect.width + 28);
      else spaceY = Math.min(250, Math.max(0, rect.height * 0.85));
    }
    frame.fullW = innerWidth + spaceX;
    frame.fullH = innerHeight + spaceY;
    renderer.setSize(innerWidth, innerHeight);
    if (spaceX || spaceY) {
      camera.setViewOffset(frame.fullW, frame.fullH, spaceX, spaceY, innerWidth, innerHeight);
    } else {
      camera.clearViewOffset();
      camera.aspect = innerWidth / Math.max(1, innerHeight);
      camera.updateProjectionMatrix();
    }
    placeCamera();
  }

  let lastWidth = innerWidth;
  let lastHeight = innerHeight;
  function resize() {
    if (innerWidth === lastWidth && innerHeight === lastHeight) return;
    lastWidth = innerWidth;
    lastHeight = innerHeight;
    applyFraming();
  }
  addEventListener('resize', resize);

  let raf = 0;
  let previous = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
    previous = now;
    stage?.frame?.(dt, now);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);
  applyTheme();
  applyFraming();

  /* Read-only probe for the framing screenshots. Only exists with ?e2e, so it costs nothing
     on the production path. It never mutates state. */
  function measureFrame() {
    if (!stage) return null;
    world.updateWorldMatrix(true, true);
    const part = new THREE.Box3();
    const corner = new THREE.Vector3();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const chips = [...document.querySelectorAll('.hud__chip')].map((node) => node.getBoundingClientRect());
    let hudHits = 0;
    const project = (node) => {
      if (!node.visible || node.userData?.ignoreFrame) return;
      if (node.isMesh && node.geometry) {
        node.geometry.computeBoundingBox();
        part.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld);
        let meshMinX = Infinity;
        let meshMinY = Infinity;
        let meshMaxX = -Infinity;
        let meshMaxY = -Infinity;
        for (const x of [part.min.x, part.max.x]) {
          for (const y of [part.min.y, part.max.y]) {
            for (const z of [part.min.z, part.max.z]) {
              corner.set(x, y, z).project(camera);
              if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y)) continue;
              const px = ((corner.x + 1) / 2) * innerWidth;
              const py = ((1 - corner.y) / 2) * innerHeight;
              if (px < meshMinX) meshMinX = px;
              if (px > meshMaxX) meshMaxX = px;
              if (py < meshMinY) meshMinY = py;
              if (py > meshMaxY) meshMaxY = py;
            }
          }
        }
        if (meshMinX < minX) minX = meshMinX;
        if (meshMaxX > maxX) maxX = meshMaxX;
        if (meshMinY < minY) minY = meshMinY;
        if (meshMaxY > maxY) maxY = meshMaxY;
        const underChip = chips.some((chip) => meshMaxX > chip.left && meshMinX < chip.right
          && meshMaxY > chip.top && meshMinY < chip.bottom);
        if (underChip) hudHits += 1;
      }
      for (const child of node.children) project(child);
    };
    project(world);
    if (!Number.isFinite(minX)) return null;
    const panel = document.getElementById('panel')?.getBoundingClientRect();
    const wide = innerWidth >= 861;
    const distance = camera.position.distanceTo(target);
    const unit = halfUnitsPerUnit();
    return {
      content: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      free: {
        x: 0,
        y: 0,
        w: panel && wide ? Math.max(0, panel.left) : innerWidth,
        h: panel && !wide ? Math.max(0, panel.top) : innerHeight,
      },
      distance,
      visible: { w: unit.w * distance, h: unit.h * distance },
      hudHits,
      view: { ...view },
    };
  }
  if (new URLSearchParams(location.search).has('e2e')) {
    window.__englishFrame = measureFrame;
    /* Screen position of every pickable object and drop zone, so a drag can be replayed by
       coordinates instead of guessing pixels. */
    window.__englishScreens = () => {
      const spot = (object) => {
        const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).project(camera);
        return { x: ((center.x + 1) / 2) * innerWidth, y: ((1 - center.y) / 2) * innerHeight };
      };
      return {
        picks: (stage?.pickMeshes?.() ?? []).map(spot),
        zones: (stage?.zoneMeshes?.() ?? []).map(spot),
      };
    };
  }

  return {
    mount,
    update(state) {
      lastState = state;
      stage?.update?.(state);
    },
    present() { stage?.present?.(); },
    playPart(id) { stage?.play?.(id); },
    onCue(handler) { if (stage) stage.onCue = handler; },
    applyTheme,
    resize,
    refreshView: applyFraming,
    dispose() {
      cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
}
