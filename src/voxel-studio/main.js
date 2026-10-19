import {createRounds} from './random-rounds.js';
import {voxelTask,voxelIdentity,validVoxel,validVoxels} from './random-model.js';
import * as THREE from './vendor/three.module.min.js';

/* ============================================================
   方块摄影棚 · KidsLab 双语/主题模板
   —— 「语言 & 主题」段落是平台约定，整段复制、按需加 key，勿改机制
   ============================================================ */
(() => {
  'use strict';

  /* ================= 语言 & 主题 · Language & Theme ================= */
  const I18N = {
    zh: {
      doc: '方块摄影棚 · KidsLab', back: '返回平台', title: '方块摄影棚',
      tip0: '拖动观察雕塑，点机器人相机预测照片。', modeBuild: '搭出雕塑', modePredict: '预测照片', free: '自由搭建',
      nogl: '你的浏览器暂不支持 WebGL，先用三视图卡片练习 ✨', front: '正面', top: '上面', side: '侧面', photos: '照片',
      hammer: (on) => `锤子：${on ? '开' : '关'}`, clear: '清空', next: '下一关', load: '载入', makeCode: '生成谜题码',
      level: (m, a, b) => `${m} ${a}/${b}`, predictName: '预测', buildName: '建造', freeName: '自由',
      chooseCam: '点一台相机，再选它拍到的照片。', choosePhoto: '哪张是这台相机拍到的？', right: '咔嚓！答对啦 ✓', wrong: '这张角度不对，再观察～', allRight: '三台相机都拍对了！',
      buildTip: '只看三张照片，在地板上点点搭方块；开锤子可删除。', buildWin: '三视图全部吻合，摄影棚开拍！',
      freeTip: '自由搭建：点地板搭方块（开锤子可拆），三张照片实时更新；搭好点「生成谜题码」考考同学。', freeSolveTip: '解谜：只看三张照片，把同学的雕塑一块块搭出来！', freeSolveName: '解谜',
      codeMade: '谜题码已生成，复制发给同学吧。', codeEmpty: '先搭几个方块，再生成谜题码。', codeBad: '这个谜题码读不出来。', loaded: '谜题已载入：照三张照片把它搭出来！', codeHint: '在此粘贴同学的谜题码',
      magicTitle: '照片会骗人，要三张才够！', magicText: '两座不同雕塑，正面照片一模一样；加上上面和侧面，秘密才完整。',
    },
    en: {
      doc: 'Voxel Photo Studio · KidsLab', back: 'Back to platform', title: 'Voxel Photo Studio',
      tip0: 'Drag to inspect the sculpture, then tap a robot camera to predict its photo.', modeBuild: 'Build the sculpture', modePredict: 'Predict photos', free: 'Free build',
      nogl: 'Your browser does not support WebGL, so use the view cards first ✨', front: 'Front', top: 'Top', side: 'Side', photos: 'Photos',
      hammer: (on) => `Hammer: ${on ? 'on' : 'off'}`, clear: 'Clear', next: 'Next level', load: 'Load', makeCode: 'Make puzzle code',
      level: (m, a, b) => `${m} ${a}/${b}`, predictName: 'Predict', buildName: 'Build', freeName: 'Free',
      chooseCam: 'Tap a camera, then pick the photo it takes.', choosePhoto: 'Which photo comes from this camera?', right: 'Click! Correct ✓', wrong: 'Wrong angle. Look again!', allRight: 'All three cameras are correct!',
      buildTip: 'Use the three photos only. Tap the floor to add blocks; turn on hammer to remove.', buildWin: 'All three views match — studio celebration!',
      freeTip: 'Free build: tap the floor to add blocks (hammer removes) and watch the three photos update. Then make a puzzle code for a classmate!', freeSolveTip: 'Solve it: rebuild the hidden sculpture using only the three photos!', freeSolveName: 'Solve',
      codeMade: 'Puzzle code ready — copy it for a classmate.', codeEmpty: 'Add some blocks first, then make a code.', codeBad: 'That puzzle code cannot be read.', loaded: 'Puzzle loaded — build it from the three photos!', codeHint: 'Paste a puzzle code here',
      magicTitle: 'Photos can trick you. Three views are better!', magicText: 'Two different sculptures share the same front photo. Top and side reveal the secret.',
    },
  };

  const LS = { lang: 'kidslab.lang', theme: 'kidslab.theme' };
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* 忽略 */ } },
  };

  let lang = store.get(LS.lang) || (navigator.language?.startsWith('zh') ? 'zh' : 'en');
  if (!I18N[lang]) lang = 'zh';
  let theme = store.get(LS.theme)
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (theme !== 'light' && theme !== 'dark') theme = 'light';

  const t = (key) => I18N[lang][key] ?? I18N.zh[key] ?? key;
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const langBtn = document.getElementById('langBtn');
  const themeBtn = document.getElementById('themeBtn');

  function applyLang() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t('doc');
    document.querySelectorAll('[data-t]').forEach((n) => {
      const v = I18N[lang][n.dataset.t];
      if (typeof v === 'string') n.textContent = v;
    });
    if (langBtn) langBtn.textContent = lang === 'zh' ? 'EN' : '中';
    render();
  }

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    if (themeBtn) themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    render();
  }

  langBtn?.addEventListener('click', () => {
    lang = lang === 'zh' ? 'en' : 'zh';
    store.set(LS.lang, lang);
    applyLang();
  });
  themeBtn?.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    store.set(LS.theme, theme);
    applyTheme();
  });

  /* ======================= 游戏区 · Game ======================= */
  const SIZE = 4;
  const CAMS = ['front', 'top', 'side'];
  const COLORS = [0xff5d8f, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xb388ff, 0xff9f1c];
  const CLASSIC_PREDICT = [
    [[1,0,0],[1,0,1],[1,1,1],[2,0,1]],
    [[0,0,0],[1,0,0],[2,0,0],[1,1,0],[1,2,0]],
    [[0,0,1],[1,0,1],[2,0,1],[2,1,1],[2,0,2],[3,0,2]],
    [[0,0,0],[0,1,0],[1,0,0],[1,0,1],[2,0,1],[2,1,1]],
    [[1,0,0],[1,1,0],[1,2,0],[1,0,1],[2,0,1],[2,0,2],[3,0,2]],
    [[0,0,2],[1,0,2],[2,0,2],[2,1,2],[2,2,2],[1,0,1],[1,1,1]],
  ];
  const CLASSIC_BUILD = [
    [[0,0,0],[1,0,0],[1,1,0],[2,0,0]],
    [[0,0,1],[1,0,1],[2,0,1],[0,1,1],[2,1,1]],
    [[0,0,0],[0,0,1],[1,0,1],[1,1,1],[2,0,2]],
    [[1,0,0],[1,1,0],[1,0,1],[2,0,1],[2,1,1],[3,0,1]],
    [[0,0,0],[1,0,0],[2,0,0],[2,1,0],[2,0,1],[3,0,1],[3,1,1]],
    [[0,0,2],[1,0,2],[1,1,2],[2,0,2],[2,0,1],[2,1,1],[3,0,1],[3,1,1]],
  ];
  const MAGIC_A = [[0,0,0],[0,1,0],[1,0,0],[2,0,0],[2,1,0]];
  const MAGIC_B = [[0,0,1],[0,1,2],[1,0,2],[2,0,1],[2,1,3]];

  const rounds=createRounds('voxel-studio');
  const PREDICT=CLASSIC_PREDICT.map((cells,i)=>rounds.define(`p${i}`,{kind:'predict',cells},voxelTask,validVoxel,voxelIdentity).cells);
  const BUILD=CLASSIC_BUILD.map((cells,i)=>rounds.define(`b${i}`,{kind:'build',cells},voxelTask,validVoxel,voxelIdentity).cells);
  const FREE_BASE={kind:'free',cells:[]};
  let freeInstance=rounds.define('free',FREE_BASE,voxelTask,validVoxel,voxelIdentity);

  const canvas = document.getElementById('scene');
  const photoStrip = document.getElementById('photoStrip');
  const optionsEl = document.getElementById('options');
  const tipEl = document.getElementById('tip');
  const levelBadge = document.getElementById('levelBadge');
  const modeBtn = document.getElementById('modeBtn');
  const freeBtn = document.getElementById('freeBtn');
  const hammerBtn = document.getElementById('hammerBtn');
  const codeBox = document.getElementById('codeBox');
  const codeInput = document.getElementById('codeInput');
  const toast = document.getElementById('toast');
  const flash = document.getElementById('flash');
  const magic = document.getElementById('magic');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    document.getElementById('nogl').hidden = false;
  }

  let scene;
  let camera;
  let orbit;
  let studio;
  let voxelGroup;
  let gridGroup;
  let floor;
  let ghost;
  let hemi;
  let keyLight;
  let mode = 'predict';
  let pLevel = 0;
  let bLevel = 0;
  let voxels = new Set();
  let freeTarget = null;
  let selectedCam = null;
  let answered = {};
  let hammer = false;
  let dragging = false;
  let moved = false;
  /** 答对后自动进入下一关；手动点按钮会取消它，避免连跳 */
  let autoNextTimer = 0;
  function cancelAutoNext() { if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = 0; } }
  function scheduleAutoNext(fn, ms = 1400) {
    cancelAutoNext();
    autoNextTimer = setTimeout(() => { autoNextTimer = 0; fn(); rounds.checkpoint(); }, ms);
  }
  let last = { x: 0, y: 0 };
  let yaw = -0.65;
  let pitch = 0.58;
  let showUntil = 0;
  let celebrate = 0;
  let magicSeen = false;
  let demoVoxels=null,demoTimer=0,motionEpoch=0;
  const mastered=new Set();try{JSON.parse(store.get('kidslab.voxel.mastered')||'[]').forEach(id=>mastered.add(id));}catch{}
  const active=()=>mode==='free'?'free':`${mode==='predict'?'p':'b'}${mode==='predict'?pLevel:bLevel}`;
  function markRound(){const id=active();if(mastered.has(id))return;const first=mastered.size===0;mastered.add(id);store.set('kidslab.voxel.mastered',JSON.stringify([...mastered]));window.cool?.stage?.(id);if(first)window.cool?.complete?.();}
  function stopMotion(){cancelAutoNext();motionEpoch++;clearInterval(demoTimer);demoTimer=0;demoVoxels=null;magic.hidden=true;flash.hidden=true;toast.hidden=true;showUntil=0;dragging=false;celebrate=0;if(studio)studio.rotation.y=0;}

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let actx = null;
  let soundOn = true;

  function tone(freq, dur = 0.12, type = 'sine', gain = 0.08, delay = 0) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime + delay;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.03);
    } catch { soundOn = false; }
  }
  const sfx = {
    tap: () => tone(480, 0.06, 'triangle'),
    bad: () => tone(150, 0.2, 'sawtooth', 0.05),
    ok: () => [660, 880].forEach((f, i) => tone(f, 0.1, 'triangle', 0.08, i * 0.06)),
    win: () => [523, 659, 784, 1047, 1318].forEach((f, i) => tone(f, 0.13, 'triangle', 0.1, i * 0.08)),
  };

  function key(x, y, z) { return `${x},${y},${z}`; }
  function parse(k) { return k.split(',').map(Number); }
  function toSet(arr) { return new Set(arr.map((v) => key(v[0], v[1], v[2]))); }
  function fromSet(set) { return [...set].map(parse); }
  function has(set, x, y, z) { return set.has(key(x, y, z)); }

  function projection(set, cam) {
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    for (const k of set) {
      const [x, y, z] = parse(k);
      if (cam === 'front') grid[SIZE - 1 - y][x] = true;
      if (cam === 'top') grid[z][x] = true;
      if (cam === 'side') grid[SIZE - 1 - y][z] = true;
    }
    return grid;
  }
  function sameGrid(a, b) { return a.every((row, r) => row.every((v, c) => v === b[r][c])); }
  function allViewsMatch(a, b) { return CAMS.every((cam) => sameGrid(projection(a, cam), projection(b, cam))); }

  function drawGrid(c, grid, opts = {}) {
    const g = c.getContext('2d');
    const w = c.width; const h = c.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = cssVar('--screen');
    roundRect(g, 6, 6, w - 12, h - 12, 15); g.fill();
    const pad = Math.min(w, h) * 0.17;
    const s = (Math.min(w, h) - pad * 2) / SIZE;
    const x0 = (w - s * SIZE) / 2;
    const y0 = (h - s * SIZE) / 2;
    for (let r = 0; r < SIZE; r++) {
      for (let col = 0; col < SIZE; col++) {
        let fill = grid[r][col] ? cssVar('--accent') : cssVar('--card');
        if (opts.target) {
          const target = opts.target[r][col];
          if (grid[r][col] && !target) fill = cssVar('--extra');
          if (!grid[r][col] && target) fill = cssVar('--miss');
          if (grid[r][col] && target) fill = cssVar('--good');
        }
        g.fillStyle = fill;
        g.strokeStyle = cssVar('--line-strong');
        g.lineWidth = 2;
        roundRect(g, x0 + col * s + 3, y0 + r * s + 3, s - 6, s - 6, 8); g.fill(); g.stroke();
      }
    }
    if (opts.label) {
      g.font = `900 ${Math.max(12, w * 0.11)}px ${cssVar('--font')}`;
      g.fillStyle = cssVar('--ink-on-accent'); g.textAlign = 'center';
      g.fillText(opts.label, w / 2, h - 10);
    }
    if (opts.ok) {
      g.font = `900 ${w * 0.22}px ${cssVar('--font')}`;
      g.fillStyle = cssVar('--good'); g.textAlign = 'right'; g.fillText('✓', w - 14, 30);
    }
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  function mutateGrid(grid, seed) {
    const out = grid.map((r) => [...r]);
    let n = 1 + (seed % 3);
    for (let i = 0; i < 16 && n > 0; i++) {
      const r = (seed * 7 + i * 3) % SIZE;
      const c = (seed * 5 + i * 2 + 1) % SIZE;
      out[r][c] = !out[r][c];
      n--;
    }
    return out;
  }

  function initThree() {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    studio = new THREE.Group(); scene.add(studio);
    voxelGroup = new THREE.Group(); studio.add(voxelGroup);
    gridGroup = new THREE.Group(); studio.add(gridGroup);

    hemi = new THREE.HemisphereLight(0xffffff, 0x445577, 1.5); scene.add(hemi);
    keyLight = new THREE.DirectionalLight(0xfff0bd, 2.4); keyLight.position.set(4, 8, 5); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1536, 1536); scene.add(keyLight);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.55, 0.34, 72), new THREE.MeshToonMaterial({ color: 0x4cc9f0 }));
    base.position.y = -0.24; base.receiveShadow = true; studio.add(base);
    floor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 4.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.02 }));
    floor.position.y = 0.05; floor.userData.floor = true; studio.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.055, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; studio.add(ring);
    ghost = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.92), new THREE.MeshBasicMaterial({ color: 0x06d6a0, transparent: true, opacity: 0.28 }));
    ghost.visible = false; scene.add(ghost);
    makeGridLines();
    syncTheme(); resize(); animate();
  }

  function makeGridLines() {
    gridGroup.clear();
    const mat = new THREE.LineBasicMaterial({ color: 0x2b2440, transparent: true, opacity: 0.36 });
    for (let i = 0; i <= SIZE; i++) {
      const a = -2 + i;
      const pts1 = [new THREE.Vector3(a, 0.08, -2), new THREE.Vector3(a, 0.08, 2)];
      const pts2 = [new THREE.Vector3(-2, 0.08, a), new THREE.Vector3(2, 0.08, a)];
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), mat));
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), mat));
    }
  }

  function colorFromVar(name) { return new THREE.Color(cssVar(name)); }
  function syncTheme() {
    if (!scene) return;
    scene.background = colorFromVar('--paper-2');
    if (hemi) { hemi.color = colorFromVar('--card'); hemi.groundColor = colorFromVar('--paper'); }
    if (keyLight) keyLight.color = colorFromVar('--lamp');
  }
  let lastWidth=0,lastHeight=0;
  function resize() {
    if (!renderer) return;
    const r = canvas.getBoundingClientRect();
    if(r.width===lastWidth&&r.height===lastHeight)return;
    lastWidth=r.width;lastHeight=r.height;
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = Math.max(1, r.width) / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  function updateCamera() {
    const radius = 8.5;
    pitch = THREE.MathUtils.clamp(pitch, 0.18, 1.25);
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * radius, Math.sin(pitch) * radius + 1.7, Math.cos(yaw) * Math.cos(pitch) * radius);
    camera.lookAt(0, 1.35, 0);
  }

  function rebuildVoxels() {
    if (!voxelGroup) return;
    voxelGroup.clear();
    const rounded = new THREE.BoxGeometry(0.86, 0.86, 0.86, 2, 2, 2);
    for (const k of (demoVoxels??voxels)) {
      const [x, y, z] = parse(k);
      const m = new THREE.Mesh(rounded, new THREE.MeshToonMaterial({ color: COLORS[(x + y * 2 + z * 3) % COLORS.length] }));
      m.position.set(x - 1.5, y + 0.53, z - 1.5);
      m.castShadow = true; m.receiveShadow = true;
      m.userData.voxel = k;
      voxelGroup.add(m);
    }
  }

  function currentTarget() { return toSet(mode === 'predict' ? PREDICT[pLevel] : BUILD[bLevel]); }
  function startPredict() {
    stopMotion();
    mode = 'predict'; selectedCam = null; answered = {};
    voxels = currentTarget(); rebuildVoxels(); render();

  }
  function startBuild() {
    stopMotion();
    mode = 'build'; selectedCam = null; answered = {}; hammer = false;
    voxels = new Set(); rebuildVoxels(); render();
  }
  function nextPredictLevel() { rounds.checkpoint();cancelAutoNext();pLevel=(pLevel+1)%PREDICT.length;if(rounds.record(`p${pLevel}`).play)PREDICT[pLevel]=rounds.next(`p${pLevel}`).cells;startPredict(); }
  function nextBuildLevel() { rounds.checkpoint();cancelAutoNext();bLevel=(bLevel+1)%BUILD.length;if(rounds.record(`b${bLevel}`).play)BUILD[bLevel]=rounds.next(`b${bLevel}`).cells;startBuild(); }
  function startFree() {
    stopMotion();mode='free';selectedCam=null;answered={};hammer=false;
    freeTarget=freeInstance.shared?toSet(freeInstance.cells):null;
    voxels=freeTarget?new Set():toSet(freeInstance.cells);rebuildVoxels();render();
  }

  function canvasFor(cam, set = voxels, opts = {}) {
    const c = document.createElement('canvas'); c.width = 120; c.height = 132;
    drawGrid(c, projection(set, cam), { label: t(cam), ...opts });
    return c;
  }
  function renderPhotoStrip() {
    photoStrip.innerHTML = '';
    const target = mode === 'build' ? currentTarget() : (mode === 'free' ? freeTarget : null);
    CAMS.forEach((cam) => {
      const c = document.createElement('canvas'); c.width = 120; c.height = 132; c.className = 'polaroid';
      const actual = projection(voxels, cam);
      const goal = target ? projection(target, cam) : null;
      drawGrid(c, mode === 'predict' && !answered[cam] ? Array.from({ length: SIZE }, () => Array(SIZE).fill(false)) : actual, {
        label: t(cam), ok: !!answered[cam], target: goal,
      });
      c.classList.toggle('good', !!answered[cam]);
      photoStrip.append(c);
    });
  }

  function renderOptions() {
    optionsEl.innerHTML = '';
    codeBox.hidden = mode !== 'free';
    hammerBtn.hidden = mode === 'predict';
    document.getElementById('clearBtn').hidden = mode === 'predict';
    document.getElementById('nextBtn').hidden = mode === 'free';
    if (mode !== 'predict') return;
    if (!selectedCam) {
      tipEl.textContent = t('chooseCam');
      return;
    }
    tipEl.textContent = t('choosePhoto');
    const right = projection(voxels, selectedCam);
    const opts=[right];
    for(let i=0;i<3;i++){const grid=right.map(row=>[...row]),n=(pLevel*3+selectedCam.length+i*5)%16;grid[Math.floor(n/4)][n%4]=!grid[Math.floor(n/4)][n%4];opts.push(grid);}
    opts.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)) * (pLevel % 2 ? -1 : 1));
    opts.forEach((grid) => {
      const wrap = document.createElement('button');
      wrap.className = 'option'; wrap.type = 'button';
      wrap.dataset.grid=JSON.stringify(grid);wrap.setAttribute('aria-label',`${t('photos')} ${grid.map(row=>row.map(v=>v?'1':'0').join('')).join(' / ')}`);
      const c = document.createElement('canvas'); c.width = 126; c.height = 126;
      drawGrid(c, grid);
      wrap.append(c);
      wrap.addEventListener('click', () => pickOption(grid, wrap));
      optionsEl.append(wrap);
    });
  }

  function pickOption(grid, el) {
    if(!selectedCam||answered[selectedCam])return;
    const right = projection(voxels, selectedCam);
    if (sameGrid(grid, right)) {
      answered[selectedCam] = true;
      el.classList.add('good'); sfx.ok(); flashCamera(); showToast(t('right'), 'good');
      selectedCam = null;
      if (CAMS.every((c) => answered[c])) {
        markRound();
        showToast(t('allRight'), 'good'); sfx.win(); celebrate = performance.now() + 2200;
        if (pLevel < PREDICT.length - 1) scheduleAutoNext(nextPredictLevel);
      }
    } else { el.classList.add('bad'); sfx.bad(); showToast(t('wrong'), 'bad'); }
    render();
  }

  function checkBuildWin() {
    const target = mode === 'build' ? currentTarget() : (mode === 'free' ? freeTarget : null);
    if (!target || !allViewsMatch(voxels, target)||CAMS.every(c=>answered[c])) return;
    markRound();
    showToast(t('buildWin'), 'good'); sfx.win(); celebrate = performance.now() + 2600;
    answered = { front: true, top: true, side: true };
    render();
    if (mode==='build'&&bLevel < BUILD.length - 1) scheduleAutoNext(nextBuildLevel);
  }

  function flashCamera() {
    const epoch=motionEpoch;
    flash.hidden = false;
    setTimeout(() => { if(epoch===motionEpoch)flash.hidden = true; }, 450);
  }
  function showToast(msg, type = '') {
    toast.textContent = msg; toast.className = `toast ${type}`; toast.hidden = false; showUntil = performance.now() + 1800;
  }

  function showMagicMoment() {
    magicSeen = true;
    const a = toSet(MAGIC_A); const b = toSet(MAGIC_B);
    drawGrid(document.getElementById('magicA'), projection(a, 'front'), { label: t('front') });
    drawGrid(document.getElementById('magicB'), projection(b, 'front'), { label: t('front') });
    magic.hidden = false; sfx.win();
    let flip = false;
    clearInterval(demoTimer);
    demoTimer = setInterval(() => {
      if (magic.hidden) { clearInterval(demoTimer);demoVoxels=null;rebuildVoxels();return; }
      demoVoxels = toSet(flip ? MAGIC_A : MAGIC_B); flip = !flip; rebuildVoxels();
    }, 1100);
  }

  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }
  function gridFromPoint(pt) {
    const x = THREE.MathUtils.clamp(Math.floor(pt.x + 2), 0, SIZE - 1);
    const z = THREE.MathUtils.clamp(Math.floor(pt.z + 2), 0, SIZE - 1);
    return [x, z];
  }
  function heightAt(x, z) {
    let y = 0;
    while (y < SIZE && has(voxels, x, y, z)) y++;
    return y;
  }
  function topAt(x, z) {
    for (let y = SIZE - 1; y >= 0; y--) if (has(voxels, x, y, z)) return y;
    return -1;
  }
  function addOrRemoveAt(e, preview = false) {
    if (!renderer || mode === 'predict') return;
    setPointer(e); raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([floor, ...voxelGroup.children], false);
    if (!hits.length) { ghost.visible = false; return; }
    let x; let z;
    const first = hits[0];
    if (first.object.userData.voxel) {
      [x,, z] = parse(first.object.userData.voxel);
    } else {
      [x, z] = gridFromPoint(first.point);
    }
    const y = hammer ? topAt(x, z) : heightAt(x, z);
    if (preview) {
      ghost.visible = !hammer && y < SIZE;
      ghost.position.set(x - 1.5, y + 0.53, z - 1.5);
      return;
    }
    cancelAutoNext();answered={};
    if (hammer && y >= 0) voxels.delete(key(x, y, z));
    if (!hammer && y < SIZE) voxels.add(key(x, y, z));
    rebuildVoxels(); render(); checkBuildWin();
  }

  function encode(set = voxels) {
    let bits = 0n;
    for (const k of set) {
      const [x, y, z] = parse(k);
      const i = BigInt(y * 16 + z * 4 + x);
      bits |= 1n << i;
    }
    return bits.toString(36).toUpperCase();
  }
  function decode(code) {
    if(!/^[0-9a-z]{1,13}$/i.test(code.trim()))throw new Error('Invalid code length');
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let n = 0n;
    for (const ch of code.trim().toLowerCase()) {
      const v = chars.indexOf(ch);
      if (v < 0) throw new Error('bad code');
      n = n * 36n + BigInt(v);
    }
    if(n>=1n<<64n)throw new Error('Code exceeds the studio');
    const set = new Set();
    for (let i = 0; i < 64; i++) if ((n >> BigInt(i)) & 1n) {
      const y = Math.floor(i / 16); const rest = i % 16; const z = Math.floor(rest / 4); const x = rest % 4;
      set.add(key(x, y, z));
    }
    return set;
  }

  function animate() {
    if (!renderer) return;
    requestAnimationFrame(animate);
    updateCamera();
    if (celebrate && performance.now() < celebrate) studio.rotation.y += 0.055;
    else studio.rotation.y *= 0.85;
    if (showUntil && performance.now() > showUntil) { toast.hidden = true; showUntil = 0; }
    renderer.render(scene, camera);
  }

  canvas.addEventListener('pointerdown', (e) => {
    actx?.resume?.().catch(()=>{}); dragging = true; moved = false; last.x = e.clientX; last.y = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* 指针已释放时忽略 */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (mode !== 'predict') addOrRemoveAt(e, true);
    if (!dragging) return;
    const dx = e.clientX - last.x; const dy = e.clientY - last.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    yaw -= dx * 0.008; pitch += dy * 0.006;
    last.x = e.clientX; last.y = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    if (!moved) addOrRemoveAt(e, false);
  });
  canvas.addEventListener('pointerleave', () => { dragging = false; if(ghost)ghost.visible = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; if(ghost)ghost.visible = false; });

  document.querySelectorAll('.camera-tag').forEach((b) => b.addEventListener('click', () => {
    if (mode !== 'predict'||answered[b.dataset.cam]) return;
    selectedCam = b.dataset.cam; sfx.tap(); flashCamera(); render();
  }));
  modeBtn.addEventListener('click', () => { switchMode(mode==='predict'?'build':'predict'); });
  freeBtn.addEventListener('click', ()=>switchMode('free'));
  hammerBtn.addEventListener('click', () => { hammer = !hammer; render(); });
  document.getElementById('clearBtn').addEventListener('click', () => { cancelAutoNext();voxels = new Set(); answered = {}; rebuildVoxels(); render(); });
  document.getElementById('nextBtn').addEventListener('click', () => {
    if (mode === 'predict') nextPredictLevel();
    else if (mode === 'build') nextBuildLevel();
    else startFree();
  });
  document.getElementById('makeCode').addEventListener('click', () => {
    if (!voxels.size) { showToast(t('codeEmpty'), 'bad'); sfx.bad(); return; }
    const code = encode(); codeInput.value = code; codeInput.select();
    navigator.clipboard?.writeText(code).catch(() => {});
    store.set('kidslab.voxel.code', code); showToast(t('codeMade'), 'good');
  });
  document.getElementById('loadCode').addEventListener('click', () => {
    try {
      const set = decode(codeInput.value);
      if (!set.size) throw new Error('empty');
      freeInstance={...FREE_BASE,cells:fromSet(set),shared:true};rounds.adopt('free',freeInstance,null);stopMotion();
      freeTarget = set; voxels = new Set(); answered = {}; hammer = false;
      rebuildVoxels(); render(); showToast(t('loaded'), 'good'); sfx.ok();
    } catch { showToast(t('codeBad'), 'bad'); sfx.bad(); }
  });
  document.getElementById('closeMagic').addEventListener('click', () => { stopMotion();rebuildVoxels(); });
  const demoButton=document.createElement('button');demoButton.type='button';demoButton.className='btn btn--ghost';demoButton.addEventListener('click',showMagicMoment);document.querySelector('.tools').append(demoButton);
  addEventListener('resize', resize);
  addEventListener('themechange', () => { syncTheme(); render(); });

  /** 每帧/每次状态变化的统一渲染入口（语言、主题切换都会调用） */
  function render() {
    demoButton.textContent=lang==='zh'?'同影演示':'View example';
    document.querySelectorAll('.camera-tag').forEach(button=>{button.hidden=mode!=='predict';button.disabled=Boolean(answered[button.dataset.cam]);});
    if (mode === 'predict') {
      tipEl.textContent = selectedCam ? t('choosePhoto') : t('chooseCam');
      levelBadge.textContent = t('level')(t('predictName'), pLevel + 1, PREDICT.length);
      modeBtn.textContent = t('modeBuild');
    } else if (mode === 'build') {
      tipEl.textContent = t('buildTip');
      levelBadge.textContent = t('level')(t('buildName'), bLevel + 1, BUILD.length);
      modeBtn.textContent = t('modePredict');
    } else {
      tipEl.textContent = freeTarget ? t('freeSolveTip') : t('freeTip');
      levelBadge.textContent = freeTarget ? t('freeSolveName') : t('freeName');
      modeBtn.textContent = t('modePredict');
      codeInput.placeholder = t('codeHint');
      const saved = store.get('kidslab.voxel.code');
      if (saved && !codeInput.value) codeInput.value = saved;
    }
    hammerBtn.textContent = t('hammer')(hammer);
    hammerBtn.classList.toggle('is-on', hammer);
    renderPhotoStrip();
    renderOptions();
  }

  /* ============================ 启动 ============================ */
  function restorePlay(s){
    if(!validVoxels(s.cells,false)||!Number.isFinite(s.yaw)||!Number.isFinite(s.pitch)||![null,...CAMS].includes(s.selectedCam)||!s.answered||typeof s.answered!=='object')throw new Error('Invalid sculpture');
    if(mode==='predict'&&JSON.stringify([...s.cells].sort())!==JSON.stringify(fromSet(currentTarget()).sort()))throw new Error('Changed prediction target');
    const goal=mode==='build'?currentTarget():freeInstance.shared?toSet(freeInstance.cells):null;
    if(mode!=='predict'&&CAMS.some(c=>s.answered[c])&&(!goal||!allViewsMatch(toSet(s.cells),goal)))throw new Error('Unfinished sculpture');
    voxels=toSet(s.cells);({answered,selectedCam,hammer,yaw,pitch}=s);rebuildVoxels();render();
  }
  function switchMode(next){rounds.checkpoint();if(next==='predict')startPredict();else if(next==='build')startBuild();else startFree();const play=rounds.record(active()).play;if(play){try{restorePlay(play);}catch{}}rounds.checkpoint();}
  initThree();
  new ResizeObserver(resize).observe(canvas.parentElement);
  const initial=rounds.active??'p0';
  if(/^p[0-5]$/.test(initial)){pLevel=Number(initial.slice(1));startPredict();}
  else if(/^b[0-5]$/.test(initial)){bLevel=Number(initial.slice(1));startBuild();}
  else startFree();
  applyTheme();
  applyLang();
  rounds.attach({parent:'.bar__actions',compact:true,dialog:'#magic',active,
    capture:()=>({cells:fromSet(voxels),answered,selectedCam,hammer,yaw,pitch}),restore:restorePlay,
    retry:()=>{if(mode==='predict')startPredict();else if(mode==='build')startBuild();else startFree();},beforeReload:stopMotion});
  if(new URLSearchParams(location.search).has('e2e'))window.__voxelPoint=(x,y,z)=>{
    const v=new THREE.Vector3(x-1.5,y===0?.1:y+.03,z-1.5);v.applyMatrix4(studio.matrixWorld).project(camera);const r=canvas.getBoundingClientRect();return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};
  };
})();
