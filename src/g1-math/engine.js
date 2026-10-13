// 一年级闯关游戏引擎（自包含副本，课件互不引用）。
// 负责：关卡星图、吉祥物、奖励墙、多题型渲染、Web Audio 接线、i18n/主题订阅、进度持久化。
import { GameAudio } from './audio.js';
import { checkAnswer, award, isUnlocked, allDone } from './level-model.js';

const MASCOT = `
<svg viewBox="0 0 140 140" class="mascot-svg" aria-hidden="true">
  <ellipse cx="70" cy="126" rx="40" ry="9" fill="rgba(0,0,0,.12)"/>
  <path d="M34 46 L22 16 L58 38 Z" fill="#ff8a3d"/>
  <path d="M106 46 L118 16 L82 38 Z" fill="#ff8a3d"/>
  <path d="M34 46 L26 24 L58 38 Z" fill="#ffd0a8"/>
  <path d="M106 46 L114 24 L82 38 Z" fill="#ffd0a8"/>
  <circle cx="70" cy="68" r="42" fill="#ff8a3d"/>
  <path d="M34 66 a36 30 0 0 0 72 0 a36 30 0 0 0 -72 0" fill="#fff3e6"/>
  <circle cx="54" cy="62" r="6" fill="#3a2e1e"/>
  <circle cx="86" cy="62" r="6" fill="#3a2e1e"/>
  <circle cx="56" cy="60" r="2" fill="#fff"/>
  <circle cx="88" cy="60" r="2" fill="#fff"/>
  <path d="M70 74 l-7 8 h14 z" fill="#3a2e1e"/>
  <path d="M70 82 q-10 9 -20 4 M70 82 q10 9 20 4" stroke="#c9663a" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;

/* ---------------- SVG 小图 ---------------- */
function clockSVG(h, m) {
  const cx = 100, cy = 100, r = 86;
  let ticks = '';
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const x1 = cx + Math.sin(a) * (r - 10), y1 = cy - Math.cos(a) * (r - 10);
    const x2 = cx + Math.sin(a) * r, y2 = cy - Math.cos(a) * r;
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`;
  }
  const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
  const hx = cx + Math.sin((ha * Math.PI) / 180) * 46, hy = cy - Math.cos((ha * Math.PI) / 180) * 46;
  const mx = cx + Math.sin((ma * Math.PI) / 180) * 66, my = cy - Math.cos((ma * Math.PI) / 180) * 66;
  return `<svg viewBox="0 0 200 200" class="clock" aria-hidden="true">
    <circle cx="100" cy="100" r="92" fill="var(--panel)" stroke="currentColor" stroke-width="6"/>
    ${ticks}
    <line x1="100" y1="100" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/>
    <line x1="100" y1="100" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#ff5c8a" stroke-width="5" stroke-linecap="round"/>
    <circle cx="100" cy="100" r="7" fill="var(--ink)"/>
  </svg>`;
}

function scaleSVG(heavy) {
  const tilt = heavy === 'left' ? -14 : heavy === 'right' ? 14 : 0;
  return `<svg viewBox="0 0 200 160" class="scale" aria-hidden="true">
    <line x1="100" y1="22" x2="100" y2="72" stroke="currentColor" stroke-width="6"/>
    <path d="M78 150 L100 72 L122 150 Z" fill="currentColor"/>
    <g transform="rotate(${tilt} 100 72)">
      <line x1="28" y1="72" x2="172" y2="72" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <line x1="28" y1="72" x2="28" y2="102" stroke="currentColor" stroke-width="3"/>
      <line x1="172" y1="72" x2="172" y2="102" stroke="currentColor" stroke-width="3"/>
      <path d="M10 102 h36 l-7 28 h-22 z" fill="var(--accent)"/>
      <path d="M154 102 h36 l-7 28 h-22 z" fill="var(--accent)"/>
    </g>
  </svg>`;
}

const SHAPES = {
  circle: '<circle cx="60" cy="60" r="46" fill="var(--accent)"/>',
  square: '<rect x="18" y="18" width="84" height="84" rx="10" fill="var(--accent)"/>',
  triangle: '<path d="M60 14 L106 100 L14 100 Z" fill="var(--accent)"/>',
  rectangle: '<rect x="14" y="30" width="92" height="60" rx="10" fill="var(--accent)"/>',
  star: '<path d="M60 8 L73 46 L113 46 L81 70 L93 108 L60 84 L27 108 L39 70 L7 46 L47 46 Z" fill="var(--accent)"/>',
  cube: '<path d="M30 40 L60 22 L90 40 L90 86 L60 104 L30 86 Z" fill="var(--accent)"/><path d="M30 40 L60 58 L90 40 M60 58 L60 104" stroke="#fff" stroke-width="3" fill="none" opacity=".5"/>',
  sphere: '<circle cx="60" cy="60" r="46" fill="var(--accent)"/><ellipse cx="46" cy="44" rx="14" ry="9" fill="#fff" opacity=".5"/>',
  cylinder: '<rect x="26" y="30" width="68" height="64" rx="6" fill="var(--accent)"/><ellipse cx="60" cy="30" rx="34" ry="12" fill="#fff" opacity=".4"/>',
  cone: '<path d="M60 16 L96 100 L24 100 Z" fill="var(--accent)"/><ellipse cx="60" cy="100" rx="36" ry="11" fill="#fff" opacity=".4"/>',
};
function shapeSVG(kind) {
  return `<svg viewBox="0 0 120 120" class="shape" aria-hidden="true">${SHAPES[kind] || SHAPES.circle}</svg>`;
}

const PIECES = {
  't-big': '<path d="M10 10 L90 10 L10 90 Z" fill="var(--accent)"/>',
  't-med': '<path d="M10 10 L50 10 L10 50 Z" fill="var(--accent)"/>',
  't-small': '<path d="M10 10 L35 10 L10 35 Z" fill="var(--accent)"/>',
  't-square': '<rect x="10" y="10" width="40" height="40" rx="4" fill="var(--accent)"/>',
  't-paral': '<path d="M30 10 L55 10 L40 50 L15 50 Z" fill="var(--accent)"/>',
};
function pieceSVG(id) {
  return `<svg viewBox="0 0 100 100" class="piece" aria-hidden="true">${PIECES[id] || PIECES['t-big']}</svg>`;
}

/* ---------------- 引擎 ---------------- */
export function initGame({ levels, messages }) {
  const cool = window.cool;
  const audio = new GameAudio();
  const storage = cool.storage;
  const L = () => cool.preferences.lang;
  const M = () => messages[L()] || messages.zh;
  const tr = (field) => (field && typeof field === 'object' ? (field[L()] ?? field.zh ?? field.en) : field);

  const $ = (id) => document.getElementById(id);
  const elCoach = $('coach'), elStage = $('stage'), elOptions = $('options'),
    elTip = $('tip'), elNav = $('nav'), elReward = $('rewards'),
    elOverlay = $('overlay'), elMascot = $('mascot');

  const stateKey = `kidslab.g1.rewards.${cool.courseId}`;
  const doneKey = `kidslab.g1.done.${cool.courseId}`;

  let completed = loadArr(doneKey);
  let rewards = loadRewards();
  let current = firstPlayable();
  let muted = storage.get('kidslab.muted', '0') === '1';
  if (muted) audio.setMuted(true);

  // 双语 + 主题
  cool.bindI18n(messages, { root: document, onChange: () => { renderChrome(); renderStage(); } });
  cool.preferences.subscribe(({ kind }) => { if (kind === 'theme') applyTheme(); });
  applyTheme();

  // 顶栏按钮
  $('backBtn')?.addEventListener('click', () => { audio.tap(); location.href = '../../index.html'; });
  $('muteBtn')?.addEventListener('click', () => {
    muted = !muted; audio.setMuted(muted); storage.set('kidslab.muted', muted ? '1' : '0');
    audio.startBgm(); renderChrome();
  });
  $('themeBtn')?.addEventListener('click', () => { audio.tap(); cool.preferences.toggleTheme(); });
  $('langBtn')?.addEventListener('click', () => { audio.tap(); cool.preferences.toggleLang(); });
  $('navToggle')?.addEventListener('click', () => { audio.tap(); elNav.classList.toggle('nav--open'); });

  // 首次手势启动 BGM
  const kick = () => { audio.resume(); audio.startBgm(); window.removeEventListener('pointerdown', kick); };
  window.addEventListener('pointerdown', kick);

  elMascot.innerHTML = MASCOT;
  renderRewards(); renderNav(); renderChrome(); renderStage();
  cool.stage && cool.stage('play');

  /* ---- 状态读写 ---- */
  function loadArr(key) {
    try { const v = JSON.parse(storage.get(key, 'null')); return Array.isArray(v) ? v : []; }
    catch { return []; }
  }
  function saveDone() { storage.set(doneKey, JSON.stringify(completed)); }
  function loadRewards() {
    try { return { stars: 0, coins: 0, stickers: 0, ...JSON.parse(storage.get(stateKey, '{}')) }; }
    catch { return { stars: 0, coins: 0, stickers: 0 }; }
  }
  function saveRewards() { storage.set(stateKey, JSON.stringify(rewards)); }
  function firstPlayable() {
    for (let i = 0; i < levels.length; i++) if (isUnlocked(i, completed) && !completed[i]) return i;
    return levels.length - 1;
  }
  function applyTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    elStage.style.setProperty('--panel', dark ? '#2a2440' : '#ffffff');
    elStage.style.setProperty('--ink', dark ? '#f5f0e6' : '#3a2e1e');
    elStage.style.setProperty('--accent', dark ? '#ffb15c' : '#ff8a3d');
  }

  /* ---- 渲染：顶栏文案 ---- */
  function renderChrome() {
    const m = M();
    document.querySelectorAll('[data-t]').forEach((n) => {
      const v = m[n.dataset.t];
      if (typeof v === 'string') n.textContent = v;
    });
    if ($('muteBtn')) {
      $('muteBtn').setAttribute('aria-pressed', String(muted));
      $('muteBtn').setAttribute('aria-label', L() === 'zh' ? (muted ? '打开声音' : '关闭声音') : (muted ? 'Turn sound on' : 'Mute sound'));
      $('muteBtn').textContent = muted ? '🔇' : '🔊';
    }
    if ($('langBtn')) $('langBtn').textContent = L() === 'zh' ? 'EN' : '中';
  }

  /* ---- 渲染：奖励墙 ---- */
  function renderRewards() {
    if ($('starCount')) $('starCount').textContent = rewards.stars;
    if ($('coinCount')) $('coinCount').textContent = rewards.coins;
    if ($('stickerCount')) $('stickerCount').textContent = rewards.stickers;
  }

  /* ---- 渲染：章节星图 ---- */
  function chapters() {
    const map = new Map();
    levels.forEach((lv, i) => {
      if (!map.has(lv.chapter)) map.set(lv.chapter, []);
      map.get(lv.chapter).push(i);
    });
    return map;
  }
  function renderNav() {
    const map = chapters();
    elNav.innerHTML = '';
    for (const [ch, idxs] of map) {
      const done = idxs.filter((i) => completed[i]).length;
      const title = (M().chapters && M().chapters[ch]) || ch;
      const chip = document.createElement('button');
      chip.className = 'nav-chip' + (idxs.includes(current) ? ' nav-chip--active' : '');
      chip.innerHTML = `<span class="nav-chip__t">${title}</span><span class="nav-chip__p">${done}/${idxs.length}</span>`;
      chip.addEventListener('click', () => {
        audio.tap();
        const target = idxs.find((i) => isUnlocked(i, completed) && !completed[i]) ?? idxs[0];
        if (isUnlocked(target, completed)) go(target);
        else flashTip('🔒 ' + (M().locked || '先通关前面的关卡吧'));
      });
      elNav.appendChild(chip);
    }
  }

  /* ---- 渲染：关卡 ---- */
  function renderStage() {
    const lv = levels[current];
    if (!isUnlocked(current, completed)) {
      elStage.innerHTML = `<div class="lock">🔒<p>${M().locked || '先通关前面的关卡吧'}</p></div>`;
      elOptions.innerHTML = ''; elCoach.textContent = ''; return;
    }
    const view = renderLevel(lv);
    elCoach.textContent = tr(lv.prompt) || (M().go || '开始吧！');
    elStage.innerHTML = view.body;
    elOptions.innerHTML = '';
    view.options.forEach((opt) => {
      const b = document.createElement('button');
      b.className = 'opt' + (opt.cls ? ' ' + opt.cls : '');
      b.innerHTML = opt.html;
      b.setAttribute('data-opt', opt.id);
      b.addEventListener('click', () => onOption(opt.id, lv, b));
      elOptions.appendChild(b);
    });
    elStage.classList.remove('shake'); void elStage.offsetWidth;
    elTip.textContent = '';
  }

  function renderLevel(lv) {
    const o = (id, html, cls) => ({ id, html, cls });
    switch (lv.type) {
      case 'count': {
        const items = Array.from({ length: lv.count }, () => `<span class="item">${lv.emoji || '⭐'}</span>`).join('');
        const opts = Array.from({ length: lv.max || 10 }, (_, i) => o(String(i + 1), String(i + 1)));
        return { body: `<div class="items">${items}</div>`, options: opts };
      }
      case 'compare': {
        if (lv.kind === 'group') {
          const gA = Array.from({ length: lv.groupA }, () => `<span class="item">${lv.emojiA || '🍎'}</span>`).join('');
          const gB = Array.from({ length: lv.groupB }, () => `<span class="item">${lv.emojiB || '🍊'}</span>`).join('');
          return {
            body: `<div class="groups"><div class="grp">${gA}</div><div class="grp">${gB}</div></div>`,
            options: [o('more', M().opt.more), o('less', M().opt.less), o('equal', M().opt.equal)],
          };
        }
        return {
          body: `<div class="nums"><b>${lv.a}</b><span class="vs">?</span><b>${lv.b}</b></div>`,
          options: [o('gt', M().opt.gt), o('lt', M().opt.lt), o('eq', M().opt.eq)],
        };
      }
      case 'calc':
        return { body: `<div class="expr">${lv.expr}</div>`, options: lv.options.map((n) => o(String(n), String(n))) };
      case 'clock':
        return {
          body: clockSVG(lv.h, lv.m),
          options: (lv.options || []).map((t) => o(t, t)),
        };
      case 'pattern':
        return {
          body: `<div class="seq">${lv.seq.map((e) => `<span class="item">${e}</span>`).join('')}<span class="item item--q">?</span></div>`,
          options: lv.options.map((p) => o(p.id, p.html)),
        };
      case 'weight':
        return {
          body: scaleSVG(lv.heavy),
          options: [o('left', M().opt.left), o('right', M().opt.right)],
        };
      case 'direction': {
        const row = lv.items.map((it, i) => `<span class="dq"><span class="dq__e">${it.emoji}</span><span class="dq__n">${i + 1}</span></span>`).join('');
        return {
          body: `<p class="q">${tr(lv.question)}</p><div class="queue">${row}</div>`,
          options: lv.options.map((p) => o(p.id, p.html)),
        };
      }
      case 'money': {
        const coins = lv.coins.map((c) => `<span class="coin">${c.emoji}<i>${c.label}</i></span>`).join('');
        return {
          body: `<p class="q">${M().moneyQ || '这些钱一共是多少？'}</p><div class="coins">${coins}</div>`,
          options: lv.options.map((p) => o(String(p.fen), p.html)),
        };
      }
      case 'shape':
        return {
          body: shapeSVG(lv.shape),
          options: lv.options.map((p) => o(p.id, p.html)),
        };
      case 'tangram':
        return {
          body: `<p class="q">${M().tangramQ || '缺了哪一块？'}</p>${pieceSVG(lv.target)}`,
          options: lv.options.map((p) => o(p.id, pieceSVG(p.id))),
        };
      case 'match': {
        if (lv.char) {
          return {
            body: `<div class="bigchar">${lv.char}</div>`,
            options: lv.options.map((p) => o(p.id, `<span class="pic">${p.html}</span>`)),
          };
        }
        return {
          body: `<div class="bigchar">${lv.pic}</div>`,
          options: lv.options.map((p) => o(p.id, `<span class="pic pic--char">${p.html}</span>`)),
        };
      }
      default:
        return { body: '<p>未知题型</p>', options: [] };
    }
  }

  /* ---- 答题 ---- */
  function onOption(id, lv, btn) {
    if (completed[current]) return;
    audio.tap();
    let ok = false;
    try { ok = checkAnswer(lv.type, id, lv); } catch (e) { flashTip(e.message); return; }
    if (ok) {
      audio.correct(); audio.star();
      const nextIndex = current + 1;
      completed[current] = true; saveDone();
      elOptions.querySelectorAll('button').forEach((option) => { option.disabled = true; });
      rewards = award(rewards, true); saveRewards();
      elMascot.classList.add('cheer'); setTimeout(() => elMascot.classList.remove('cheer'), 700);
      btn.classList.add('opt--ok');
      renderRewards(); renderNav();
      burst();
      if (allDone(completed, levels.length)) { setTimeout(showWin, 700); }
      else { elCoach.textContent = M().correct || '答对啦！'; setTimeout(() => go(nextIndex), 850); }
    } else {
      audio.wrong();
      elMascot.classList.add('shake'); setTimeout(() => elMascot.classList.remove('shake'), 600);
      btn.classList.add('opt--no');
      flashTip(tr(lv.tip) || (M().wrong || '再试试看～'));
    }
  }

  function go(i) {
    if (i < 0 || i >= levels.length) { renderNav(); return; }
    current = i; renderNav(); renderStage();
    elStage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function flashTip(msg) {
    elTip.textContent = msg;
    elTip.classList.add('tip--show');
  }

  function burst() {
    const b = document.createElement('div');
    b.className = 'burst';
    b.innerHTML = '🌟'.repeat(6);
    elStage.appendChild(b);
    setTimeout(() => b.remove(), 900);
  }

  function showWin() {
    cool.complete?.();
    elOverlay.hidden = false;
    elOverlay.querySelector('.overlay__title').textContent = M().doneTitle || '太棒了！';
    elOverlay.querySelector('.overlay__text').textContent = M().doneText || '你闯过了所有关卡！';
    audio.win();
    elOverlay.querySelector('[data-act="close"]').onclick = () => { audio.tap(); elOverlay.hidden = true; };
  }
}
