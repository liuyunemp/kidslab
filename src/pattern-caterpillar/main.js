import {createRounds} from './random-rounds.js';
import {CATERPILLAR_LEVELS,patternTask,validPattern,patternIdentity,patternFamily,inferPattern,patternSpeech} from './random-model.js';
/* ============================================================
   规律毛毛虫 · KidsLab 双语/主题模板
   —— 「语言 & 主题」段落是平台约定，整段复制、按需加 key，勿改机制
   ============================================================ */
(() => {
  'use strict';

  /* ================= 语言 & 主题 · Language & Theme ================= */
  const I18N = {
    zh: {
      doc: '规律毛毛虫 · KidsLab', back: '返回平台', title: '规律毛毛虫', tip0: '看、听、动：选下一个，让毛毛虫长大。',
      eyebrow: '零阅读找规律', demo: '👀 演示', garden: '🦋 蝴蝶园', tray: '果盘', modeTitle: '今日规律', think: '让毛毛虫接龙', reset: '重排', next: '下一关',
      visual: '看颜色/形状排队，问号后面吃哪一个？', sound: '点喇叭听：声音也会排队。候选也能点听。', action: '看毛毛虫表演动作队列，再选下一个动作。', dual: '颜色和形状两条规律同时走。', reverse: '彩蛋：你先摆 4-6 个，毛毛虫试着接龙。',
      yes: '咕噜！规律接上啦。', no: '噗——这口不对，再试试。', fullTitle: '吃饱啦，开始结茧！', fullText: '破茧的翅膀，画满了它刚刚吃过的规律。', gardenTitle: '蝴蝶园', gardenText: (n) => `已经收藏 ${n} 只独一无二的规律蝴蝶。`, reverseGood: '它接上了！这真是一个规律。', reverseBad: '它晕圈了：还看不出 1-3 个一组的重复。',
      l1: '双色', l2: '形状 AB', l3: '三色', l4: 'ABB', l5: '大小', l6: '节奏', l7: '铃鼓', l8: '两跳一转', l9: '三个动作', l10: '双规律', l11: '数量组', l12: '你出题',
      red: '红', yellow: '黄', blue: '蓝', green: '绿', circle: '圆', star: '星', square: '方', jump: '跳', spin: '转', sleep: '趴', drum: '咚', clap: '嚓', bell: '叮', speaker: '喇叭',
    },
    en: {
      doc: 'Pattern Caterpillar · KidsLab', back: 'Back to platform', title: 'Pattern Caterpillar', tip0: 'See, hear, move: choose the next one and grow the caterpillar.',
      eyebrow: 'No-reading pattern play', demo: '👀 Demo', garden: '🦋 Garden', tray: 'Fruit tray', modeTitle: 'Today’s pattern', think: 'Let it continue', reset: 'Reset', next: 'Next level',
      visual: 'Watch color / shape queues. What comes after the question mark?', sound: 'Tap speaker: sounds make a queue too. Candidates can be heard.', action: 'Watch the caterpillar act a sequence, then choose the next move.', dual: 'Color and shape patterns run together.', reverse: 'Easter egg: you arrange 4-6 items; the caterpillar tries to continue.',
      yes: 'Gulp! The pattern continues.', no: 'Pff — not that one. Try again.', fullTitle: 'Full belly: cocoon time!', fullText: 'The butterfly wings are painted with every pattern it ate.', gardenTitle: 'Butterfly Garden', gardenText: (n) => `${n} unique pattern butterflies collected.`, reverseGood: 'It continued it! That is a pattern.', reverseBad: 'Dizzy: no 1-3 item repeating unit yet.',
      l1: 'two colors', l2: 'shape AB', l3: 'three colors', l4: 'ABB', l5: 'sizes', l6: 'rhythm', l7: 'bells', l8: 'two jumps', l9: 'three moves', l10: 'double', l11: 'counts', l12: 'you make it',
      red: 'red', yellow: 'yellow', blue: 'blue', green: 'green', circle: 'circle', star: 'star', square: 'square', jump: 'jump', spin: 'spin', sleep: 'sleep', drum: 'boom', clap: 'clap', bell: 'ding', speaker: 'speaker',
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

  /** 取当前语言文案；函数型 key 直接返回函数供调用方传参 */
  const t = (key) => I18N[lang][key] ?? I18N.zh[key] ?? key;
  /** 读取 CSS 主题变量（Canvas/three.js 取色必须走这里，勿硬编码） */
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
    render(); // 语言切换后重绘动态文案
  }

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    if (themeBtn) themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    /* Canvas / three.js 课件监听该事件重取 cssVar 配色 */
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

  /* ======================= ✏️ 游戏区 · Game ======================= */
  const $ = (s) => document.querySelector(s);
  const COLORS = {
    red: { icon: '🔴', css: 'var(--tomato)' }, yellow: { icon: '🟡', css: 'var(--accent-2)' },
    blue: { icon: '🔵', css: 'var(--blue)' }, green: { icon: '🟢', css: 'var(--leaf)' },
  };
  const SHAPES = { circle: '●', star: '★', square: '■', triangle: '▲' };
  const SOUNDS = { drum: '🥁', clap: '👏', bell: '🔔' };
  const ACTIONS = { jump: '⬆️', spin: '🌀', sleep: '😴' };
  const rounds=createRounds('pattern-caterpillar');
  const LEVELS=CATERPILLAR_LEVELS.map(base=>rounds.define(base.key,base,patternTask,validPattern,patternIdentity,patternFamily));
  const SAVE_KEY = 'kidslab.caterpillar.butterflies';

  const CURRENT_KEY = 'kidslab.pattern-caterpillar.current';
  let levelIndex = 0;
  try {
    const saved = Number(localStorage.getItem(CURRENT_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < LEVELS.length) levelIndex = saved;
  } catch { /* Storage is optional. */ }
  const PROGRESS_KEY = 'kidslab.pattern-caterpillar.basic-eight';
  let basicDone = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]');
    if (Array.isArray(saved)) basicDone = new Set(saved.filter((n) => Number.isInteger(n) && n >= 0 && n < 8));
  } catch { /* Storage is optional. */ }
  let bites = 0;
  let finishing = false;
  let finishTimer = null;
  let eaten = [];
  let reverseSeq = [];
  let soundOn = store.get('kidslab.caterpillar.sound') !== 'off';
  let actx = null;
  let noise = null;
  let scheduler = null;
  let queue = [];
  let qIndex = 0;
  let qStart = 0;
  let currentChoices = [];

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const level = () => LEVELS[levelIndex];

  function getButterflies() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || []; } catch { return []; }
  }
  function saveButterfly() {
    const arr = getButterflies();
    if(arr.some(b=>b.level===level().key))return;
    arr.unshift({ at: Date.now(), items: eaten.slice(-14), level: level().key });
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(arr.slice(0, 24))); } catch { /* ignore */ }
  }

  function startAudio() {
    try { if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      noise = actx.createBuffer(1, actx.sampleRate * 0.2, actx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (actx.state === 'suspended') actx.resume().catch(()=>{});
    }catch{actx=null;}
  }
  function g(t0, dur, gain = 0.14) {
    const n = actx.createGain(); n.gain.setValueAtTime(0.0001, t0); n.gain.linearRampToValueAtTime(gain, t0 + 0.01); n.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); return n;
  }
  function playTone(name, when = actx?.currentTime || 0) {
    if (!soundOn || !actx) return;
    if (name === 'drum') {
      const src = actx.createBufferSource(); const f = actx.createBiquadFilter(); const gg = g(when, 0.16, 0.25); f.type = 'lowpass'; f.frequency.value = 230; src.buffer = noise; src.connect(f).connect(gg).connect(actx.destination); src.start(when); src.stop(when + 0.18);
    } else if (name === 'clap') {
      const src = actx.createBufferSource(); const f = actx.createBiquadFilter(); const gg = g(when, 0.08, 0.19); f.type = 'highpass'; f.frequency.value = 1800; src.buffer = noise; src.connect(f).connect(gg).connect(actx.destination); src.start(when); src.stop(when + 0.1);
    } else if (name === 'bell') {
      [880, 1320].forEach((freq, i) => { const o = actx.createOscillator(); const gg = g(when + i * 0.02, 0.32, 0.11); o.type = 'sine'; o.frequency.value = freq; o.connect(gg).connect(actx.destination); o.start(when + i * 0.02); o.stop(when + 0.34); });
    } else if (name === 'good') {
      [523, 659, 784].forEach((freq, i) => { const o = actx.createOscillator(); const gg = g(when + i * 0.07, 0.18, 0.13); o.type = 'triangle'; o.frequency.value = freq; o.connect(gg).connect(actx.destination); o.start(when + i * 0.07); o.stop(when + i * 0.07 + 0.2); });
    } else if (name === 'bad') {
      const o = actx.createOscillator(); const gg = g(when, 0.25, 0.12); o.type = 'sawtooth'; o.frequency.setValueAtTime(190, when); o.frequency.exponentialRampToValueAtTime(90, when + 0.22); o.connect(gg).connect(actx.destination); o.start(when); o.stop(when + 0.27);
    }
  }

  function expectedAt(pos = bites + 4) {
    return level().pattern[pos % level().pattern.length];
  }
  function visibleSeq() {
    if (level().kind === 'reverse') return reverseSeq;
    return Array.from({ length: 4 }, (_, i) => expectedAt(bites + i));
  }

  function tokenHTML(item, question = false) {
    if (question) return '<div class="token question">?</div>';
    const style = item.color ? ` style="background:${COLORS[item.color].css}"` : '';
    const cls = item.size || '';
    let body = '';
    if (item.sound) body = SOUNDS[item.sound];
    else if (item.action) body = ACTIONS[item.action];
    else if (item.count) body = `<span class="apple-count">${'<span>🍎</span>'.repeat(item.count)}</span>`;
    else body = `${item.color ? COLORS[item.color].icon : ''}${item.shape ? SHAPES[item.shape] : ''}`;
    return `<div class="token ${cls}"${style}>${body}</div>`;
  }

  function renderLevels() {
    $('#levelStrip').innerHTML = LEVELS.map((l, i) => `<button class="levelchip ${i === levelIndex ? 'on' : ''}" data-level="${i}" type="button">${i + 1}<br><small>${t(l.key)}</small></button>`).join('');
  }
  function renderCaterpillar() {
    const n = Math.min(10, 3 + bites);
    $('#caterpillar').innerHTML = Array.from({ length: n }, (_, i) => `<div class="seg ${i === 0 ? 'head' : ''}">${i === 0 ? '<b></b>' : (eaten[i - 1] ? tokenMini(eaten[i - 1]) : '●')}</div>`).join('');
  }
  function tokenMini(item) {
    if (item.sound) return SOUNDS[item.sound];
    if (item.action) return ACTIONS[item.action];
    if (item.count) return item.count;
    if (item.shape) return SHAPES[item.shape];
    if (item.color) return COLORS[item.color].icon;
    return '●';
  }
  function renderChoices() {
    const ch = level().choices.map((x) => ({ ...x }));
    if (level().kind !== 'reverse') {
      const exp = expectedAt();
      if (!ch.some((c) => same(c, exp))) ch[0] = exp;
    }
    currentChoices = ch;
    $('#choices').innerHTML = ch.map((c, i) => `<button class="choice" type="button" data-choice="${i}" data-item='${JSON.stringify(c)}' aria-label="choice">${tokenHTML(c)}</button>`).join('');
  }
  function renderTrack() {
    const seq = visibleSeq();
    $('#patternTrack').innerHTML = seq.map((x) => tokenHTML(x)).join('') + (level().kind === 'reverse' ? '' : tokenHTML({}, true));
  }
  function renderProgress() {
    $('#basicProgress').textContent = `${lang === 'zh' ? '基础' : 'Basics'} ${basicDone.size}/8`;
    const max = level().bites;
    $('#biteCount').textContent = `${Math.min(bites, max)}/${max}`;
    $('#fullBar').style.width = `${Math.min(100, (bites / max) * 100)}%`;
  }

  /** 每帧/每次状态变化的统一渲染入口（语言、主题切换都会调用） */
  function render() {
    cssVar('--ink');
    renderLevels(); renderTrack(); renderCaterpillar(); renderChoices(); renderProgress(); drawWingPreview();
    $('#hint').textContent = t(level().hint);
    $('#muteBtn').textContent = soundOn ? '🔊' : '🔇';
    $('#muteBtn').setAttribute('aria-label',lang==='zh'?'音效开关':'Sound effects');
    $('#muteBtn').setAttribute('aria-pressed',String(!soundOn));
    $('#readPattern')?.setAttribute('aria-label',lang==='zh'?'朗读当前队列':'Read the visible sequence');
    $('#reverseTools').hidden = level().kind !== 'reverse';
  }

  function speak(text, mood = '💭') {
    const s = $('#speak'); s.textContent = `${mood} ${text}`; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
  }
  function animateCat(cls) {
    const c = $('#caterpillar'); c.classList.remove('happy', 'sad', 'act-jump', 'act-spin', 'act-sleep'); void c.offsetWidth; c.classList.add(cls); later(() => c.classList.remove(cls), 700);
  }

  function chooseItem(item, btn) {
    if (finishing || bites >= level().bites) return;
    startAudio();
    if (item.sound && level().kind !== 'reverse') { playTone(item.sound); }
    if (level().kind === 'reverse') {
      if (reverseSeq.length < 6) { reverseSeq.push(item); eaten.push(item); bites = reverseSeq.length; render(); }
      return;
    }
    if (same(item, expectedAt())) {
      btn?.classList.add('right'); bites++; eaten.push(item); speak(t('yes'), '😋'); playTone('good'); animateCat('happy');
      if (item.action) runAction(item.action);
      render();
      if (bites >= level().bites) { finishing = true; finishTimer = later(() => { finishTimer = null; finishLevel(); }, 500); }
    } else {
      btn?.classList.add('wrong'); speak(t('no'), '🤪'); playTone('bad'); animateCat('sad');
    }
  }

  function runAction(action) {
    animateCat(action === 'jump' ? 'act-jump' : action === 'spin' ? 'act-spin' : 'act-sleep');
  }

  function playDemo() {
    startAudio();
    const seq=visibleSeq();
    seq.forEach((item,i)=>later(()=>{
      flashToken(i);if(item.action)runAction(item.action);
      playTone(item.sound||'bell');
    },i*620));
  }
  function flashToken(i) {
    const el = document.querySelectorAll('.pattern-track .token')[i]; if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  function finishLevel() {
    if (levelIndex < 8 && !basicDone.has(levelIndex)) {
      basicDone.add(levelIndex);
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...basicDone])); } catch { /* Storage is optional. */ }
      window.cool?.stage?.(`basic-${basicDone.size}-of-8`);
      if (basicDone.size === 8) window.cool?.complete?.();
    }
    finishing=true;
    renderProgress();
    saveButterfly();
    rounds.checkpoint();
    drawButterfly(eaten);
    $('#modalEmoji').textContent = '🦋'; $('#modalTitle').textContent = t('fullTitle'); $('#modalText').textContent = t('fullText'); $('#modalBtn').textContent = t('next'); $('#modal').hidden = false;
    confetti(); playTone('good');
  }

  function resetPlay(){
    stopMotion();bites=0;finishing=false;eaten=[];reverseSeq=structuredClone(level().initial??[]);
    if(level().kind==='reverse'){bites=reverseSeq.length;eaten=structuredClone(reverseSeq);}
    $('#modal').hidden=true;$('#speak').textContent='';render();
  }
  function openLevel(index,fresh=false){
    rounds.checkpoint();stopMotion();levelIndex=index;
    if(fresh&&rounds.record(level().key).play)LEVELS[index]=rounds.next(level().key);
    resetPlay();const play=rounds.record(level().key).play;if(play){try{restorePlay(play);}catch{resetPlay();}}
    store.set(CURRENT_KEY,String(levelIndex));rounds.checkpoint();
  }
  function nextLevel(){openLevel((levelIndex+1)%LEVELS.length,true);}
  const inferPeriod=inferPattern;
  function thinkReverse() {
    startAudio();
    const p = inferPeriod(reverseSeq);
    if (reverseSeq.length>=12)return;
    if (p) { const next = reverseSeq[reverseSeq.length % p]; reverseSeq.push(next); eaten.push(next); bites = reverseSeq.length; speak(t('reverseGood'), '🤓'); playTone('good'); animateCat('happy');saveButterfly(); }
    else { speak(t('reverseBad'), '😵'); playTone('bad'); animateCat('sad'); }
    render();
  }

  function drawWingPreview() {
    if (!$('#modal') || $('#modal').hidden) return;
    drawButterfly(eaten);
  }
  function drawButterfly(items) {
    const c = $('#wingCanvas'); if (!c) return;
    const ctx = c.getContext('2d'); const w = c.width; const h = c.height;
    ctx.clearRect(0, 0, w, h); ctx.lineWidth = 5; ctx.strokeStyle = cssVar('--line-strong'); ctx.fillStyle = cssVar('--card');
    const grad = ctx.createLinearGradient(0, 0, w, h); grad.addColorStop(0, cssVar('--accent-2')); grad.addColorStop(0.5, cssVar('--accent')); grad.addColorStop(1, cssVar('--leaf'));
    ctx.fillStyle = grad;
    wing(ctx, w / 2 - 8, h / 2, -1); wing(ctx, w / 2 + 8, h / 2, 1);
    ctx.fillStyle = cssVar('--ink'); round(ctx, w / 2 - 9, 70, 18, 118, 12); ctx.fill();
    ctx.strokeStyle = cssVar('--line-strong'); ctx.stroke();
    (items.length ? items : [{ color: 'red' }, { color: 'yellow' }, { shape: 'star' }]).slice(0, 14).forEach((it, i) => {
      const side = i % 2 ? 1 : -1; const x = w / 2 + side * (48 + (i % 4) * 30); const y = 72 + ((i * 31) % 125);
      ctx.save(); ctx.translate(x, y); ctx.scale(side, 1); drawMotif(ctx, it, i); ctx.restore();
      ctx.save(); ctx.translate(w - x, y); ctx.scale(-side, 1); drawMotif(ctx, it, i); ctx.restore();
    });
  }
  function wing(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + s * 40, y - 120, x + s * 190, y - 95, x + s * 160, y - 8); ctx.bezierCurveTo(x + s * 210, y + 85, x + s * 72, y + 102, x, y + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function round(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawMotif(ctx, it, i) {
    ctx.fillStyle = it.color ? cssVar(it.color === 'red' ? '--tomato' : it.color === 'yellow' ? '--accent-2' : it.color === 'blue' ? '--blue' : '--leaf') : [cssVar('--accent'), cssVar('--accent-2'), cssVar('--blue')][i % 3];
    ctx.strokeStyle = cssVar('--line-strong'); ctx.lineWidth = 3;
    if (it.shape === 'star') { ctx.font = '32px serif'; ctx.fillText('★', -15, 12); }
    else if (it.shape === 'square') { ctx.fillRect(-14, -14, 28, 28); ctx.strokeRect(-14, -14, 28, 28); }
    else { ctx.beginPath(); ctx.arc(0, 0, 12 + (it.count || 1) * 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    if (it.sound || it.action) { ctx.font = '24px sans-serif'; ctx.fillText(it.sound ? SOUNDS[it.sound] : ACTIONS[it.action], -13, 9); }
  }

  function confetti() {
    for (let i = 0; i < 36; i++) { const c = document.createElement('i'); c.className = 'confetti'; c.style.left = `${Math.random() * 100}%`; c.style.background = ['var(--accent)', 'var(--accent-2)', 'var(--leaf)', 'var(--blue)'][i % 4]; c.style.animationDuration = `${1.5 + Math.random() * 1.4}s`; document.body.appendChild(c); setTimeout(() => c.remove(), 3200); }
  }

  function bind() {
    document.addEventListener('click', startAudio, { once: true });
    $('#choices').addEventListener('click', (e) => {
      const b = e.target.closest('[data-choice]'); if (!b) return;
      const item = currentChoices[Number(b.dataset.choice)]; chooseItem(item, b);
    });
    $('#demoBtn').addEventListener('click', playDemo);
    $('#muteBtn').addEventListener('click', () => { soundOn = !soundOn; store.set('kidslab.caterpillar.sound', soundOn ? 'on' : 'off'); render(); });
    $('#gardenBtn').addEventListener('click', () => { const n = getButterflies().length; $('#modalEmoji').textContent = '🦋'; $('#modalTitle').textContent = t('gardenTitle'); $('#modalText').textContent = t('gardenText')(n); $('#modalBtn').textContent = t('next'); $('#modal').hidden = false; drawButterfly((getButterflies()[0] || {}).items || eaten); });
    $('#levelStrip').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)openLevel(Number(b.dataset.level));});
    $('#thinkBtn').addEventListener('click', thinkReverse);
    $('#resetReverseBtn').addEventListener('click', () => { stopMotion();reverseSeq = []; eaten = []; bites = 0; render(); });
    $('#modalBtn').addEventListener('click', nextLevel);
    addEventListener('resize', drawWingPreview);
    addEventListener('themechange', drawWingPreview);
  }

  /* ============================ 启动 ============================ */
  const timers=new Set();
  function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();rounds.checkpoint();},ms);timers.add(id);return id;}
  function stopMotion(){for(const id of timers)clearTimeout(id);timers.clear();finishTimer=null;if(scheduler)clearInterval(scheduler);scheduler=null;}
  function restorePlay(s){
    const legal=item=>[...level().choices,...level().pattern].some(c=>same(c,item));
    if(!Number.isInteger(s.bites)||s.bites<0||s.bites>12||!Array.isArray(s.eaten)||!Array.isArray(s.reverseSeq)||!s.eaten.every(legal)||!s.reverseSeq.every(legal))throw new Error('Invalid pattern snapshot');
    if(level().kind!=='reverse'&&(s.eaten.length!==s.bites||s.eaten.some((item,i)=>!same(item,expectedAt(i+4)))))throw new Error('Invalid pattern history');
    ({bites,eaten,reverseSeq,finishing}=s);render();
    if(finishing&&level().kind!=='reverse')finishLevel();
  }
  const selected=LEVELS.findIndex(l=>l.key===rounds.active);if(selected>=0)levelIndex=selected;
  resetPlay();
  const readBtn=document.createElement('button');readBtn.id='readPattern';readBtn.className='btn btn--ghost';readBtn.type='button';readBtn.textContent='🔈';readBtn.addEventListener('click',()=>window.cool?.speech?.speak?.(patternSpeech(level(),visibleSeq(),lang),{lang}));document.querySelector('.hero__buttons').append(readBtn);
  bind();
  applyTheme();
  applyLang();
  rounds.attach({parent:'.bar__actions',compact:true,dialog:'#modal',active:()=>level().key,capture:()=>({bites,eaten,reverseSeq,finishing}),restore:restorePlay,retry:resetPlay,beforeReload:stopMotion});
})();
