import {createRounds} from './random-rounds.js';
import {createNarration,narrationControls} from './narration.js';
import {manifest} from './speech-manifest.js';
import {shadowTask,shadowFamily,validShadow,shadowScore,shadowSpeech} from './random-model.js';
import * as THREE from './vendor/three.module.min.js';

/* ============================================================
   立体影子剧场 · KidsLab 双语/主题模板
   —— 「语言 & 主题」段落是平台约定，整段复制、按需加 key，勿改机制
   ============================================================ */
(() => {
  'use strict';

  /* ================= 语言 & 主题 · Language & Theme ================= */
  const I18N = {
    zh: {
      doc: '立体影子剧场 · KidsLab',
      back: '返回平台',
      title: '立体影子剧场',
      tip0: '拖动积木，让影子变成目标形状。',
      target: '目标', blocks: '积木架', check: '演出！', reset: '重置本幕', next: '下一幕',
      nogl: '你的浏览器暂不支持 WebGL，影子剧场改用图卡练习 ✨',
      level: (a, b) => `第 ${a}/${b} 幕`, stars: (n) => '⭐'.repeat(n),
      cardTip: '图卡模式：选出能投出目标影子的积木，再点“演出！”',
      comboCardTip: '图卡模式：选出小房子影子里用到的一块积木。',
      pick: '先点一个积木吧', close: '很接近，继续转一转！', wrong: '影子还没对上，再试试～',
      good: '太棒啦！掌声响起来！', reverseTip: '看两张影子，猜藏着哪块积木。', comboTip: '两块积木叠成小房子影子！',
      magicTitle: '一个体，好多面！', magicText: '圆锥转一转，正着看像圆，侧着看像三角形。',
      sphere: '球', cube: '正方体', box: '长方体', cylinder: '圆柱', cone: '圆锥', prism: '三棱柱',
      circle: '圆', square: '正方形', rect: '长方形', tri: '三角形', house: '小房子',
    },
    en: {
      doc: 'Shadow Shape Theater · KidsLab',
      back: 'Back to platform',
      title: 'Shadow Shape Theater',
      tip0: 'Turn a block to match the target shadow.',
      target: 'Target', blocks: 'Blocks', check: 'Show!', reset: 'Reset scene', next: 'Next scene',
      nogl: 'Your browser does not support WebGL, so the theater switches to card practice ✨',
      level: (a, b) => `Scene ${a}/${b}`, stars: (n) => '⭐'.repeat(n),
      cardTip: 'Card mode: pick the block that can cast the target shadow, then press Show!',
      comboCardTip: 'Card mode: pick one block used in the little house shadow.',
      pick: 'Pick a block first', close: 'So close — keep turning!', wrong: 'The shadow is not there yet. Try again!',
      good: 'Bravo! The audience is clapping!', reverseTip: 'Look at two shadows and guess the hidden block.', comboTip: 'Use two blocks to make the little house shadow!',
      magicTitle: 'One solid, many faces!', magicText: 'Turn a cone: head-on it looks like a circle, sideways like a triangle.',
      sphere: 'Sphere', cube: 'Cube', box: 'Cuboid', cylinder: 'Cylinder', cone: 'Cone', prism: 'Triangular prism',
      circle: 'Circle', square: 'Square', rect: 'Rectangle', tri: 'Triangle', house: 'House',
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
  const SHAPES = [
    { id: 'sphere', icon: '⚪', color: 0x73d2de },
    { id: 'cube', icon: '🟪', color: 0xb388ff },
    { id: 'box', icon: '🧱', color: 0xff9f1c },
    { id: 'cylinder', icon: '🥫', color: 0x06d6a0 },
    { id: 'cone', icon: '🍦', color: 0xff5d8f },
    { id: 'prism', icon: '🔺', color: 0xffd166 },
  ];

  const CLASSIC_LEVELS = [
    { kind: 'make', block: 'sphere', target: 'circle', pose: 'any' },
    { kind: 'make', block: 'cube', target: 'square', pose: 'front' },
    { kind: 'make', block: 'box', target: 'rect', pose: 'front' },
    { kind: 'make', block: 'cylinder', target: 'circle', pose: 'axis' },
    { kind: 'make', block: 'cylinder', target: 'rect', pose: 'side' },
    { kind: 'make', block: 'cone', target: 'circle', pose: 'axis', magic: true },
    { kind: 'make', block: 'cone', target: 'tri', pose: 'side', magic: true },
    { kind: 'make', block: 'prism', target: 'tri', pose: 'front' },
    { kind: 'reverse', answer: 'cylinder', cards: ['circle', 'rect'], choices: ['sphere', 'cylinder', 'cone'] },
    { kind: 'combo', target: 'house', blocks: ['cube', 'cone'] },
  ];

  const rounds=createRounds('shadow-theater');
  const LEVELS=CLASSIC_LEVELS.map((base,i)=>rounds.define(i,{...base,scale:1,initial:[.08,.05,0]},shadowTask,validShadow,a=>a,base.kind==='reverse'?shadowFamily:undefined));
  const canvas = document.getElementById('scene');
  const targetCard = document.getElementById('targetCard');
  const reverseCards = document.getElementById('reverseCards');
  const comboSlots = document.getElementById('comboSlots');
  const shelf = document.getElementById('shapeShelf');
  const tipEl = document.getElementById('tip');
  const levelBadge = document.getElementById('levelBadge');
  const starsEl = document.getElementById('stars');
  const toast = document.getElementById('toast');
  const puppet = document.getElementById('puppet');
  const finger = document.getElementById('finger');
  const magic = document.getElementById('magic');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    renderer = null;
    document.body.classList.add('no-webgl');
    document.getElementById('nogl').hidden = false;
  }

  let scene;
  let camera;
  let root;
  let objectGroup;
  let screen;
  let spot;
  let fill;
  let selected = 'sphere';
  if (!renderer) selected = '';
  let current = 0;
  let won = new Set();
  const PROGRESS_KEY = 'kidslab.shadow-theater.round';
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    if (Array.isArray(saved.won)) won = new Set(saved.won.filter((n) => Number.isInteger(n) && n >= 0 && n < LEVELS.length));
    if (Number.isInteger(saved.current) && saved.current >= 0 && saved.current < LEVELS.length) current = saved.current;
  } catch { /* Storage is optional. */ }
  if(rounds.active!==null)current=Number(rounds.active);
  selected = defaultSelection();
  let activeMeshes = [];
  let dragging = false;
  let last = { x: 0, y: 0 };
  let velocity = { x: 0, y: 0 };
  /** 幕布正前方的固定光源：与幕布中心同高、正对幕布，产生真实投影 */
  const LAMP_POS = { x: 0, y: 1.15, z: 6.0 };
  const SCREEN_CENTER = { x: 0, y: 1.15, z: -2.05 };
  let showUntil = 0;
  let coneSeen = new Set();
  let magicShown = false,currentDone=false,puppetTimer=0;
  let actx = null;
  let soundOn = true;
  const narration=createNarration({manifest,lang:()=>lang,show:(message,success)=>showToast(message,success?'good':'')});
  /** 答对后自动进下一幕；手动点「下一幕」会取消它，避免连跳两幕 */
  let autoNextTimer = 0;
  function cancelAutoNext() { if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = 0; } }
  function scheduleAutoNext(fn, ms = 1400) {
    cancelAutoNext();
    autoNextTimer = setTimeout(() => { autoNextTimer = 0; fn();rounds.checkpoint(); }, ms);
  }

  function tone(freq, dur = 0.12, type = 'sine', gain = 0.08, delay = 0) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime + delay;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g).connect(actx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    } catch { soundOn = false; }
  }
  const sfx = {
    tap: () => tone(520, 0.06, 'triangle'),
    close: () => [620, 780].forEach((f, i) => tone(f, 0.08, 'sine', 0.07, i * 0.05)),
    bad: () => tone(150, 0.2, 'sawtooth', 0.05),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, 'triangle', 0.1, i * 0.08)),
  };

  function colorFromVar(name) {
    return new THREE.Color(cssVar(name));
  }

  function initThree() {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
    camera.position.set(2.6, 2.6, 7.6);
    camera.lookAt(0, 1.05, -0.6);
    root = new THREE.Group();
    scene.add(root);

    fill = new THREE.HemisphereLight(0xffffff, 0x7a1837, 0.55);
    scene.add(fill);
    /* 固定聚光灯 = 皮影戏灯：castShadow 让幕布上的影子完全由几何体真实投射 */
    spot = new THREE.SpotLight(0xfff0b7, 2.8, 40, Math.PI / 6, 0.35, 0);
    spot.position.set(LAMP_POS.x, LAMP_POS.y, LAMP_POS.z);
    spot.target.position.set(SCREEN_CENTER.x, SCREEN_CENTER.y, SCREEN_CENTER.z);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.camera.near = 2;
    spot.shadow.camera.far = 14;
    spot.shadow.bias = -0.0006;
    spot.shadow.normalBias = 0.02;
    scene.add(spot, spot.target);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.45, 0.28, 56),
      new THREE.MeshToonMaterial({ color: 0x6f2d54 })
    );
    floor.position.set(0, -1.05, 0);
    floor.receiveShadow = true;
    root.add(floor);

    screen = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 4.4),
      new THREE.MeshStandardMaterial({ color: 0xfff8e6, roughness: 0.95 })
    );
    screen.position.set(SCREEN_CENTER.x, SCREEN_CENTER.y, SCREEN_CENTER.z);
    screen.receiveShadow = true;
    root.add(screen);

    objectGroup = new THREE.Group();
    objectGroup.position.set(0, 1.15, 0.4);
    root.add(objectGroup);
    syncTheme();
    resize();
    makeObject(selected);
    animate();
  }

  function makeTriPrismGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.9); shape.lineTo(-0.9, -0.75); shape.lineTo(0.9, -0.75); shape.lineTo(0, 0.9);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.65, bevelEnabled: false });
    geo.center();
    return geo;
  }

  function meshFor(id, scale = 1) {
    const spec = SHAPES.find((s) => s.id === id);
    let geo;
    if (id === 'sphere') geo = new THREE.SphereGeometry(0.9 * scale, 36, 24);
    if (id === 'cube') geo = new THREE.BoxGeometry(1.55 * scale, 1.55 * scale, 1.55 * scale);
    if (id === 'box') geo = new THREE.BoxGeometry(2.2 * scale, 1.12 * scale, 1.12 * scale);
    if (id === 'cylinder') geo = new THREE.CylinderGeometry(0.76 * scale, 0.76 * scale, 1.95 * scale, 48);
    if (id === 'cone') geo = new THREE.ConeGeometry(0.92 * scale, 1.95 * scale, 52);
    if (id === 'prism') geo = makeTriPrismGeometry();
    const mat = new THREE.MeshToonMaterial({ color: spec.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.userData.block = id;
    return mesh;
  }

  function makeObject(id) {
    if (!objectGroup) return;
    objectGroup.clear();
    activeMeshes = [];
    const lvl = LEVELS[current];
    objectGroup.rotation.set(...lvl.initial);objectGroup.scale.setScalar(lvl.scale);
    if (lvl.kind === 'combo') {
      const base = meshFor('cube', 0.85);
      base.position.set(0, -0.55, 0);
      const roof = meshFor('cone', 0.9);
      roof.position.set(0,-.55+1.55*.85/2+1.95*.9/2,0);
      objectGroup.add(base, roof);
      activeMeshes.push(base, roof);
    } else {
      const mesh = meshFor(id);
      objectGroup.add(mesh);
      activeMeshes.push(mesh);
    }
  }

  let lastWidth=0,lastHeight=0;
  function resize() {
    if (!renderer) return;
    const box = canvas.getBoundingClientRect();
    if(lastWidth===box.width&&lastHeight===box.height)return;lastWidth=box.width;lastHeight=box.height;
    renderer.setSize(Math.max(1, box.width), Math.max(1, box.height), false);
    camera.aspect = Math.max(1, box.width) / Math.max(1, box.height);
    camera.updateProjectionMatrix();
  }

  function syncTheme() {
    if (!scene) return;
    scene.background = colorFromVar('--paper-2');
    if (screen) screen.material.color = colorFromVar('--screen');
    if (fill) {
      fill.color = colorFromVar('--card');
      fill.groundColor = colorFromVar('--velvet');
    }
    if (spot) spot.color = colorFromVar('--spot');
  }

  function near(v, target, tol = 0.34) {
    const d = Math.atan2(Math.sin(v - target), Math.cos(v - target));
    return Math.abs(d) < tol;
  }

  function poseScore(lvl){
    if(!renderer||!objectGroup)return Math.max(...[[0,0,0],[Math.PI/2,0,0],[0,Math.PI/2,0]].map(r=>shadowScore(lvl,r,selected)));
    return shadowScore(lvl,[objectGroup.rotation.x,objectGroup.rotation.y,objectGroup.rotation.z],selected);
  }

  function currentShadowName() {
    const lvl = LEVELS[current];
    if (lvl.kind === 'combo') return 'house';
    const rx = objectGroup?.rotation.x || 0;
    const ry = objectGroup?.rotation.y || 0;
    if (selected === 'sphere') return 'circle';
    if (selected === 'cube') return near(rx, 0, 0.55) && near(ry, 0, 0.55) ? 'square' : 'rect';
    if (selected === 'box') return near(ry, Math.PI / 2, 0.55) ? 'square' : 'rect';
    if (selected === 'cylinder') return Math.abs(Math.sin(rx)) > 0.72 ? 'circle' : 'rect';
    if (selected === 'cone') return Math.abs(Math.sin(rx)) > 0.72 ? 'circle' : 'tri';
    if (selected === 'prism') return near(rx, 0, 0.55) && near(ry, 0, 0.7) ? 'tri' : 'rect';
    return 'rect';
  }

  function maybeMagic() {
    if (selected !== 'cone' || magicShown) return;
    coneSeen.add(currentShadowName());
    if (coneSeen.has('circle') && coneSeen.has('tri')) {
      magicShown = true;
      drawShape(document.getElementById('magicA'), 'circle');
      drawShape(document.getElementById('magicB'), 'tri');
      magicButton.hidden=false;
    }
  }

  function drawShape(c, shape, ok = false) {
    if (!c) return;
    const g = c.getContext('2d');
    const w = c.width;
    const h = c.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = cssVar('--screen');
    roundRect(g, 8, 8, w - 16, h - 16, 18); g.fill();
    g.save();
    g.translate(w / 2, h / 2 + 3);
    g.fillStyle = cssVar('--shadow-ink');
    g.strokeStyle = cssVar(ok ? '--success' : '--line-strong');
    g.lineWidth = ok ? 7 : 4;
    g.beginPath();
    if (shape === 'circle') g.ellipse(0, 0, w * 0.27, h * 0.31, 0, 0, Math.PI * 2);
    else if (shape === 'square') g.rect(-h * 0.26, -h * 0.26, h * 0.52, h * 0.52);
    else if (shape === 'rect') g.roundRect(-w * 0.31, -h * 0.2, w * 0.62, h * 0.4, 10);
    else if (shape === 'tri') { g.moveTo(0, -h * 0.32); g.lineTo(w * 0.31, h * 0.28); g.lineTo(-w * 0.31, h * 0.28); g.closePath(); }
    else if (shape === 'house') { g.moveTo(0, -h * 0.34); g.lineTo(w * 0.32, -h * 0.02); g.lineTo(w * 0.24, -h * 0.02); g.lineTo(w * 0.24, h * 0.28); g.lineTo(-w * 0.24, h * 0.28); g.lineTo(-w * 0.24, -h * 0.02); g.lineTo(-w * 0.32, -h * 0.02); g.closePath(); }
    g.fill(); g.stroke();
    g.restore();
    if (ok) {
      g.font = `900 ${Math.min(w, h) * 0.25}px ${cssVar('--font')}`;
      g.fillStyle = cssVar('--success');
      g.textAlign = 'right';
      g.fillText('✓', w - 18, h - 14);
    }
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  function renderCards() {
    const lvl = LEVELS[current];
    reverseCards.hidden = lvl.kind !== 'reverse';
    comboSlots.hidden = lvl.kind !== 'combo';
    targetCard.hidden = lvl.kind === 'reverse';
    if (lvl.kind === 'reverse') {
      reverseCards.innerHTML = '';
      lvl.cards.forEach((shape) => {
        const c = document.createElement('canvas');
        c.width = 104; c.height = 94;
        reverseCards.append(c);
        drawShape(c, shape);
      });
      tipEl.textContent = t('reverseTip');
    } else if (lvl.kind === 'combo') {
      drawShape(targetCard, 'house');
      comboSlots.innerHTML = '';
      ['square', 'tri'].forEach((shape) => {
        const c = document.createElement('canvas');
        c.width = 180; c.height = 90;
        comboSlots.append(c);
        drawShape(c, shape);
      });
      tipEl.textContent = renderer ? t('comboTip') : t('comboCardTip');
    } else {
      drawShape(targetCard, lvl.target, currentDone);
      tipEl.textContent = renderer ? t('tip0') : t('cardTip');
    }
  }

  function renderShelf() {
    const lvl = LEVELS[current];
    const options = lvl.kind === 'reverse' ? lvl.choices : SHAPES.map((s) => s.id);
    shelf.innerHTML = '';
    options.forEach((id) => {
      const spec = SHAPES.find((s) => s.id === id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `shape-btn${selected === id ? ' is-active' : ''}`;
      b.dataset.shape=id;
      b.innerHTML = `${spec.icon}<small>${t(id)}</small>`;
      b.addEventListener('click', () => {
        selected = id;
        sfx.tap();
        renderShelf();
        if (lvl.kind !== 'reverse') makeObject(id);
        if (lvl.kind === 'reverse') checkAnswer();
      });
      shelf.append(b);
    });
  }

  function showToast(msg, type = '') {
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.hidden = false;
    showUntil = performance.now() + 1700;
  }

  function clearFeedback() {
    toast.textContent = '';
    toast.className = 'toast';
    toast.hidden = true;
    showUntil = 0;
    puppet.hidden = true;
  }

  function defaultSelection(lvl = LEVELS[current]) {
    if (lvl.kind === 'reverse') return lvl.choices[0];
    if (lvl.kind === 'combo') return renderer ? 'cube' : '';
    return renderer ? (lvl.block || 'cube') : '';
  }

  function resetLevel() {
    narration.reset();
    cancelAutoNext();clearTimeout(puppetTimer);currentDone=false;
    clearFeedback();
    magic.hidden = true;
    dragging = false;
    velocity.x = 0;
    velocity.y = 0;
    selected = defaultSelection();
    if (renderer) finger.hidden = false;
    makeObject(selected);
    render();
  }

  function checkAnswer() {
    const lvl = LEVELS[current];
    if (lvl.kind === 'reverse') {
      if (selected === lvl.answer) winLevel();
      else { showToast(t('wrong'), 'bad'); sfx.bad(); narration.encourage(current,t('wrong')); }
      return;
    }
    const score = poseScore(lvl);
    if (score > Math.cos(.42)) {
      velocity.x=0;velocity.y=0;
      winLevel();
    } else if (score > 0.55) { showToast(t('close'), ''); sfx.close(); narration.encourage(current,t('close')); }
    else { showToast(selected ? t('wrong') : t('pick'), 'bad'); sfx.bad(); narration.encourage(current,selected?t('wrong'):t('pick')); }
  }

  function winLevel() {
    if(currentDone)return;currentDone=true;const first=!won.has(current);
    won.add(current);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ current, won: [...won] })); } catch { /* Storage is optional. */ }
    if(first)window.cool?.stage?.(`scene-${won.size}-of-${LEVELS.length}`);
    if (first&&won.size === LEVELS.length) window.cool?.complete?.();
    puppet.hidden = false;
    showToast(t('good'), 'good');
    sfx.win();
    narration.success(won.size===LEVELS.length);
    puppetTimer=setTimeout(() => { puppet.hidden = true; }, 2200);
    render();
    // Keep the completed scene until the child explicitly moves on.
  }

  function nextLevel(){
    rounds.checkpoint();const next=(current+1)%LEVELS.length;if(rounds.record(next).play)LEVELS[next]=rounds.next(next);current=next;
    store.set(PROGRESS_KEY,JSON.stringify({current,won:[...won]}));resetLevel();rounds.checkpoint();
  }

  function animate() {
    if (!renderer) return;
    requestAnimationFrame(animate);
    if(!dragging){
      objectGroup.rotation.y += velocity.x;
      objectGroup.rotation.x += velocity.y;
      velocity.x *= 0.93;
      velocity.y *= 0.93;
    }
    objectGroup.rotation.x = THREE.MathUtils.clamp(objectGroup.rotation.x, -Math.PI * 0.65, Math.PI * 0.65);
    const score = poseScore(LEVELS[current]);
    activeMeshes.forEach((m) => {
      m.material.emissive = m.material.emissive || new THREE.Color(0x000000);
      m.material.emissive.setHex(score > 0.58 ? 0x332000 : 0x000000);
    });
    if(!dragging&&Math.abs(velocity.x)+Math.abs(velocity.y)<.0001&&(velocity.x||velocity.y)){velocity.x=0;velocity.y=0;rounds.checkpoint();}
    maybeMagic();
    if (showUntil && performance.now() > showUntil) { toast.hidden = true; showUntil = 0; }
    renderer.render(scene, camera);
  }

  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!renderer || !objectGroup) return;
    actx?.resume?.().catch(()=>{});
    finger.hidden = true;
    dragging = true;
    last.x = e.clientX; last.y = e.clientY;
    velocity.x = 0; velocity.y = 0;
    canvas.setPointerCapture(e.pointerId);
    setPointer(e);
    if (camera && activeMeshes.length) {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(activeMeshes, false)[0];
      if (hit?.object.userData.block) selected = hit.object.userData.block;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !objectGroup) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    objectGroup.rotation.y += dx * 0.012;
    objectGroup.rotation.x += dy * 0.012;
    velocity.x = dx * 0.0009;
    velocity.y = dy * 0.0009;
    last.x = e.clientX; last.y = e.clientY;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => canvas.addEventListener(name, () => { dragging = false; }));

  document.getElementById('checkBtn').addEventListener('click', checkAnswer);
  document.getElementById('resetBtn').addEventListener('click', resetLevel);
  document.getElementById('nextBtn').addEventListener('click', nextLevel);
  document.getElementById('closeMagic').addEventListener('click', () => { magic.hidden = true; });
  addEventListener('resize', resize);
  addEventListener('themechange', () => { syncTheme(); render(); });

  /** 每帧/每次状态变化的统一渲染入口（语言、主题切换都会调用） */
  function render() {
    const lvl = LEVELS[current];
    if (levelBadge) levelBadge.textContent = t('level')(current + 1, LEVELS.length);
    if (starsEl) starsEl.textContent = `⭐ ${won.size}`;
    magicButton.setAttribute('aria-label',lang==='zh'?'看看圆锥的影子':'Explore cone shadows');
    readButton.setAttribute('aria-label',lang==='zh'?'朗读引导':'Read instructions');
    document.getElementById('closeMagic').setAttribute('aria-label',lang==='zh'?'关闭':'Close');
    renderCards();
    renderShelf();
    if (lvl.kind !== 'reverse' && activeMeshes.length && activeMeshes[0].userData.block !== selected) makeObject(selected);
  }

  /* ============================ 启动 ============================ */
  const magicButton=document.createElement('button');magicButton.type='button';magicButton.className='btn btn--ghost';magicButton.textContent='✨';magicButton.addEventListener('click',()=>{cancelAutoNext();drawShape(document.getElementById('magicA'),'circle');drawShape(document.getElementById('magicB'),'tri');magic.hidden=false;});document.querySelector('.bar__actions').append(magicButton);
  const readButton=document.createElement('button');readButton.type='button';readButton.className='btn btn--ghost';readButton.textContent='🔈';readButton.addEventListener('click',()=>narration.say(shadowSpeech(LEVELS[current],lang)));document.querySelector('.top-card').append(readButton);
  const updateVoice=narrationControls(document.querySelector('.bar__actions'),()=>lang);
  langBtn.addEventListener('click',()=>{narration.reset();updateVoice();});
  initThree();
  function restorePlay(s){
    if(!SHAPES.some(a=>a.id===s.selected)&&s.selected!==''||!Array.isArray(s.rotation)||s.rotation.length!==3||!s.rotation.every(Number.isFinite))throw new Error('Invalid shadow pose');
    selected=s.selected;currentDone=Boolean(s.done);coneSeen=new Set(s.coneSeen??[]);magicShown=Boolean(s.magicShown);makeObject(selected);if(objectGroup)objectGroup.rotation.set(...s.rotation);render();
  }
  rounds.attach({parent:'.bar__actions',compact:true,dialog:'#magic',active:()=>current,capture:()=>({selected,done:currentDone,rotation:objectGroup?[objectGroup.rotation.x,objectGroup.rotation.y,objectGroup.rotation.z]:LEVELS[current].initial,coneSeen:[...coneSeen],magicShown}),restore:restorePlay,retry:resetLevel,beforeReload:()=>{cancelAutoNext();clearTimeout(puppetTimer);velocity.x=velocity.y=0;}});
  new ResizeObserver(resize).observe(canvas.parentElement);
  applyTheme();applyLang();
})();
