import {createRounds} from './random-rounds.js';
import {detectiveClassic,detectiveTask,validDetective,detectiveIdentity,detectiveLinkDeductions} from './random-model.js';
import {LEGACY_CASES} from './classic-cases.js';
/* ============================================================
   侦探线索板 · KidsLab 双语/主题模板
   —— 「语言 & 主题」段落是平台约定，整段复制、按需加 key，勿改机制
   ============================================================ */
(async () => {
  'use strict';

  /* ================= 语言 & 主题 · Language & Theme ================= */
  const I18N = {
    zh: {
      doc: '侦探线索板 · KidsLab',
      back: '返回平台',
      title: '侦探线索板',
      tip0: '先点右侧亮起的线索卡，再照中间提示在棋盘上钉图钉。',
      eyebrow: '软木板侦探社', progressLabel: '线索进度', cluesTitle: '线索卡', cluesLead: '先点一张线索，再照中间的「下一步」操作。',
      nextMove: '下一步', markLabel: '选择图钉', pinNo: '排除', pinYes: '确定',
      hintBtn: '给我一步提示 ×3', resetBtn: '重开本案', closedStamp: '结案', restoreTitle: '案情还原', nextCase: '下一案 →',
      intuition: (n) => `侦探直觉 ×${n}`, noHints: '本案直觉用完啦。相信排除法！',
      hintTip: '已为你点亮下一条线索，跟着中间的「下一步」做。', solvedTip: '红线织好了！真相浮出软木板。',
      progressTip: (done, total) => `已经记录 ${done}/${total} 条线索。`,
      stepsLeft: (a, b) => `还有 ${a} 条线索待完成${b ? ` · ${b} 个图钉需要改正` : ''}`,
      guideStart: '先点右侧一张线索卡。系统会告诉你该钉哪个格子。',
      guidePin: (clueText, targets, pin) => `根据「${clueText}」，在 ${targets} 钉下 ${pin}。`,
      guideLink: (clueText) => `「${clueText}」会在相关人物被确定后自动连线。先完成有明确人名的线索。`,
      guideDone: '这条线索已经记录。点下一张还没完成的线索。',
      guideLiar: '所有真线索都记录好了。现在在右侧指出那一条假证词。',
      chooseClueFirst: '先从右侧亮起的线索卡开始。',
      wrongCell: (targets) => `这条线索对应的是 ${targets}，先找这些格子。`,
      wrongPin: (pin) => `这一步应该钉下 ${pin}。`,
      clueActive: '正在推理', clueDone: '已记录', clueLink: '等待连线', falseReady: '可以指认',
      falseAsk: '这条是假线索', falsePicked: '已指出假线索', liarTip: '这案有一条证词是假的：先排除，再指出那个捣乱的证人。',
      wrongFalse: '这张卡看起来还能成立，别急着说它假。',
    },
    en: {
      doc: 'Detective Clue Board · KidsLab',
      back: 'Back to platform',
      title: 'Detective Clue Board',
      tip0: 'Start with the glowing clue card, then follow the center prompt to pin the board.',
      eyebrow: 'Corkboard Detective Club', progressLabel: 'Clue progress', cluesTitle: 'Clue cards', cluesLead: 'Pick one clue, then follow the center “Next move” prompt.',
      nextMove: 'Next move', markLabel: 'Choose a pin', pinNo: 'Rule out', pinYes: 'Confirm',
      hintBtn: 'Show my next move ×3', resetBtn: 'Restart case', closedStamp: 'Closed', restoreTitle: 'Case replay', nextCase: 'Next case →',
      intuition: (n) => `Detective hunch ×${n}`, noHints: 'No hunches left for this case. Trust elimination!',
      hintTip: 'The next clue is highlighted. Follow the center “Next move” prompt.', solvedTip: 'The red strings are complete — truth pops off the corkboard.',
      progressTip: (done, total) => `${done}/${total} clues recorded.`,
      stepsLeft: (a, b) => `${a} clues still need work${b ? ` · ${b} pins need fixing` : ''}`,
      guideStart: 'Pick a clue card on the right. We will show exactly which square to pin.',
      guidePin: (clueText, targets, pin) => `From “${clueText}”, pin ${pin} on ${targets}.`,
      guideLink: (clueText) => `“${clueText}” will connect automatically once its person is confirmed. Finish the clues with named people first.`,
      guideDone: 'This clue is recorded. Pick the next unfinished clue.',
      guideLiar: 'Every true clue is recorded. Now identify the false testimony on the right.',
      chooseClueFirst: 'Start with the glowing clue card on the right.',
      wrongCell: (targets) => `This clue belongs on ${targets}. Find that square first.`,
      wrongPin: (pin) => `This step needs the ${pin} pin.`,
      clueActive: 'Working on this', clueDone: 'Recorded', clueLink: 'Waiting for a link', falseReady: 'Ready to accuse',
      falseAsk: 'This clue is false', falsePicked: 'False clue marked', liarTip: 'One testimony is false: try deductions, then name the troublemaker.',
      wrongFalse: 'This card can still be true. Do not accuse it yet.',
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
    buildStatic();
    for(const [k,v] of Object.entries(marks))setMark(...k.split('|'),v);
    render();if(won)showWin(); // 语言切换后重绘动态文案
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

  /* ======================= 游戏区 · Game ======================= */
  const $ = (s) => document.querySelector(s);
  const byId = (id) => document.getElementById(id);
  const L = (zh, en) => ({ zh, en });
  const text = (obj) => obj?.[lang] || obj?.zh || '';

  const rounds=createRounds('detective-board');
  const CASES=[];
  for(const [i,raw] of LEGACY_CASES.entries()){
    const base=detectiveClassic(raw);
    CASES.push(await rounds.defineAsync(i,base,detectiveTask,validDetective,detectiveIdentity,{generator:'detectiveTask',validator:'validDetective',identity:'detectiveIdentity'}));
  }


  let caseIndex = 0;
  let marks = {};
  let hintsLeft = 3;
  let hintClue = -1;
  let markMode = 'no';
  let falsePick = null;
  let lastLines = [];
  let won = false;
  const timers=new Set();
  function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;}
  function cancel(){for(const id of timers)clearTimeout(id);timers.clear();}
  let completed=[];try{const old=JSON.parse(localStorage.getItem('kidslab.detective-board'));if(Array.isArray(old?.completed))completed=old.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<CASES.length);}catch{}


  const el = {
    title: byId('caseTitle'), tip: byId('tip'), ring: byId('ring'), progressText: byId('progressText'),
    tabs: byId('caseTabs'), suspects: byId('suspects'), grids: byId('grids'), clueList: byId('clueList'), strings: byId('strings'),
    hint: byId('hintBtn'), reset: byId('resetBtn'), modal: byId('winModal'), story: byId('story'), next: byId('nextBtn'), board: byId('boardWrap'),
    guide: byId('boardGuide'), guideText: byId('guideText'), guideStep: byId('guideStep'),
    markTools: Array.from(document.querySelectorAll('[data-mark-mode]')),
  };

  function cur() { return CASES[caseIndex]; }
  function key(person, dimId, val) { return `${person}|${dimId}|${val}`; }
  function getMark(person, dimId, val) { return marks[key(person, dimId, val)] || ''; }
  function setMark(person, dimId, val, mark, auto = false) {
    const k = key(person, dimId, val);
    if (mark) marks[k] = mark; else delete marks[k];
    const cell = document.querySelector(`[data-key="${CSS.escape(k)}"]`);
    if (cell) {
      cell.textContent = mark === 'yes' ? '✅' : mark === 'no' ? '❌' : '';
      cell.className = `cell ${mark || ''}${auto ? ' auto' : ''}`;
      if (auto) later(() => cell.classList.remove('auto'), 900);
    }
  }

  function newCase(i = caseIndex) {
    cancel();
    caseIndex = (i + CASES.length) % CASES.length;
    marks = {};
    hintsLeft = 3;
    hintClue = nextPendingClue();
    markMode = modeForClue(hintClue);
    falsePick = null;
    lastLines = [];
    won = false;
    el.modal.hidden = true;
    buildStatic();
    render();
  }

  function buildStatic() {
    const c = cur();
    el.title.textContent = `${c.icon} ${text(c.title)}`;
    el.suspects.innerHTML = c.people.map((person) => `<div class="suspect"><div class="face">${person.emoji}</div><div><div class="name">${text(person.name)}</div><div class="role">${text(c.brief)}</div></div></div>`).join('');
    el.tabs.innerHTML = CASES.map((ca, i) => `<button class="caseTab ${i === caseIndex ? 'on' : ''}" type="button" data-case="${i}" aria-label="case ${i + 1}">${ca.icon}</button>`).join('');
    el.tabs.querySelectorAll('.caseTab').forEach((b) => b.addEventListener('click', () => switchCase(Number(b.dataset.case))));
    el.grids.innerHTML = c.dims.map((d) => gridHTML(c, d)).join('');
    el.grids.querySelectorAll('.cell').forEach((cell) => cell.addEventListener('click', () => markCell(cell)));
    el.clueList.innerHTML = c.clues.map((cl, i) => `<article class="clue" data-clue="${i}"><button class="clue__select" type="button" data-select-clue="${i}"><span class="clue__copy">${text(cl.label)}</span><span class="clue__state"></span></button>${c.liar ? `<button class="falseBtn" type="button" data-false="${i}" hidden>${t(falsePick === i ? 'falsePicked' : 'falseAsk')}</button>` : ''}</article>`).join('');
    el.clueList.querySelectorAll('.clue__select').forEach((button) => button.addEventListener('click', () => selectClue(Number(button.dataset.selectClue))));
    el.clueList.querySelectorAll('.falseBtn').forEach((btn) => btn.addEventListener('click', (ev) => {
      ev.stopPropagation();if(won)return;
      const i = Number(btn.dataset.false);
      falsePick = i;
      if (i !== c.falseClue) flashTip(t('wrongFalse'));
      render(); checkWin();
    }));
    clearLines();
  }

  function gridHTML(c, d) {
    const cols = d.values.length + 1;
    const heads = `<div></div>${d.values.map((val) => `<div class="gHead">${val.emoji}<br>${text(val.name)}</div>`).join('')}`;
    const rows = c.people.map((person) => `<div class="rowHead"><span>${person.emoji}</span><span>${text(person.name)}</span></div>${d.values.map((val) => `<button class="cell" type="button" data-key="${key(person.id, d.id, val.id)}" data-person="${person.id}" data-dim="${d.id}" data-val="${val.id}" aria-label="${text(person.name)} ${text(d.name)} ${text(val.name)}"></button>`).join('')}`).join('');
    return `<section class="gridCard"><p class="gridTitle"><span>${d.emoji} ${text(d.name)}</span><small>${d.values.length}×${d.values.length}</small></p><div class="logicGrid" style="grid-template-columns: 1.15fr repeat(${cols - 1}, minmax(42px,1fr))">${heads}${rows}</div></section>`;
  }

  function directTargets(clue) {
    return clue.rules
      .filter((rule) => rule.kind === 'is' || rule.kind === 'not')
      .map((rule) => ({ ...rule, mark: rule.kind === 'is' ? 'yes' : 'no' }));
  }

  function pendingDirectTargets(clue) {
    return directTargets(clue).filter((target) => getMark(target.person, target.dimId, target.val) !== target.mark);
  }

  function targetLabel(target) {
    const c = cur();
    const person = c.people.find((item) => item.id === target.person);
    const dimension = c.dims.find((item) => item.id === target.dimId);
    const value = dimension?.values.find((item) => item.id === target.val);
    return `「${person?.emoji || ''}${text(person?.name)} × ${value?.emoji || ''}${text(value?.name)}」`;
  }

  function targetLabels(targets) {
    return targets.map(targetLabel).join(lang === 'zh' ? '、' : ' or ');
  }

  function pinLabel(mark) {
    return mark === 'yes' ? `✅ ${t('pinYes')}` : `❌ ${t('pinNo')}`;
  }

  function nextPendingClue() {
    const c = cur();
    return c.clues.findIndex((clue, index) => index !== c.falseClue && !clue.rules.every(ruleUsed));
  }

  function modeForClue(index) {
    if (index < 0) return 'no';
    return pendingDirectTargets(cur().clues[index])[0]?.mark || 'no';
  }

  function selectClue(index) {
    if (won) return;
    hintClue = index;
    const target = pendingDirectTargets(cur().clues[index])[0];
    if (target) markMode = target.mark;
    render();
  }

  function advanceClue() {
    hintClue = nextPendingClue();
    if (hintClue >= 0) markMode = modeForClue(hintClue);
  }

  function guideState() {
    const c = cur();
    const pr = progress();
    if (c.liar && pr.nonFalseDone === pr.nonFalseTotal && falsePick !== c.falseClue) {
      return { step: '③', message: t('guideLiar'), canMark: false };
    }
    if (hintClue < 0) return { step: '①', message: t('guideStart'), canMark: false };
    const clue = c.clues[hintClue];
    if (clue.falseRule) return { step: '③', message: t('guideLiar'), canMark: false };
    if (clue.rules.every(ruleUsed)) return { step: '①', message: t('guideDone'), canMark: false };
    const targets = pendingDirectTargets(clue);
    if (!targets.length) return { step: '②', message: t('guideLink')(text(clue.label)), canMark: false };
    return {
      step: '②',
      message: t('guidePin')(text(clue.label), targetLabels(targets), pinLabel(targets[0].mark)),
      canMark: true,
    };
  }

  function markCell(cell) {
    if (won) return;
    const guide = guideState();
    if (!guide.canMark) {
      flashTip(hintClue < 0 ? t('chooseClueFirst') : guide.message);
      return;
    }
    const { person, dim, val } = cell.dataset;
    const clue = cur().clues[hintClue];
    const targets = pendingDirectTargets(clue);
    const target = targets.find((item) => item.person === person && item.dimId === dim && item.val === val);
    if (!target) {
      cell.classList.remove('wiggle');
      void cell.offsetWidth;
      cell.classList.add('wiggle');
      flashTip(t('wrongCell')(targetLabels(targets)));
      return;
    }
    if (target.mark !== markMode) {
      flashTip(t('wrongPin')(pinLabel(target.mark)));
      return;
    }
    setMark(person, dim, val, markMode);
    if (markMode === 'yes') propagateYes(person, dim, val);
    runCascade();
    const completed = clue.rules.every(ruleUsed);
    if (completed) advanceClue();
    render();
    if (completed) flashTip(t('guideDone'));
    checkWin();
  }

  function propagateYes(person, dimId, val) {
    const c = cur();
    const d = c.dims.find((x) => x.id === dimId);
    d.values.forEach((v0) => { if (v0.id !== val && getMark(person, dimId, v0.id) !== 'yes') setMark(person, dimId, v0.id, 'no'); });
    c.people.forEach((p0) => { if (p0.id !== person && getMark(p0.id, dimId, val) !== 'yes') setMark(p0.id, dimId, val, 'no'); });
  }

  function runCascade() {
    const c = cur();
    let changed = true;
    let safety = 0;
    while (changed && safety < 40) {
      changed = false; safety += 1;
      c.dims.forEach((d) => {
        c.people.forEach((p0) => {
          if (d.values.some((v0) => getMark(p0.id, d.id, v0.id) === 'yes')) return;
          const open = d.values.filter((v0) => getMark(p0.id, d.id, v0.id) !== 'no');
          if (open.length === 1) { autoYes(p0.id, d.id, open[0].id); changed = true; }
        });
        d.values.forEach((v0) => {
          if (c.people.some((p0) => getMark(p0.id, d.id, v0.id) === 'yes')) return;
          const open = c.people.filter((p0) => getMark(p0.id, d.id, v0.id) !== 'no');
          if (open.length === 1) { autoYes(open[0].id, d.id, v0.id); changed = true; }
        });
      });
      c.clues.forEach((clue) => {
        if (clue.falseRule) return;
        clue.rules.forEach((rule) => {
          if (rule.kind === 'link' && applyLinkRule(rule)) changed = true;
        });
      });
    }
  }

  function applyLinkRule(rule) {
    const deductions=detectiveLinkDeductions(rule,cur().people,marks);
    for(const d of deductions){const [p,dim,val]=d.key.split('|');if(d.mark==='yes')autoYes(p,dim,val);else setMark(p,dim,val,'no',true);}
    return deductions.length>0;
  }


  function autoYes(person, dimId, val) {
    setMark(person, dimId, val, 'yes', true);
    propagateYes(person, dimId, val);
    const cell = document.querySelector(`[data-key="${CSS.escape(key(person, dimId, val))}"]`);
    const clue = firstRelatedClue(person, dimId, val);
    if (cell && clue >= 0) drawLine(cell, document.querySelector(`[data-clue="${clue}"]`));
  }

  function firstRelatedClue(person, dimId, val) {
    return cur().clues.findIndex((cl, idx) => idx !== cur().falseClue && cl.rules.some((r) => ruleTouches(r, person, dimId, val)));
  }

  function ruleTouches(r, person, dimId, val) {
    if ((r.kind === 'is' || r.kind === 'not') && r.person === person && r.dimId === dimId && r.val === val) return true;
    if (r.kind === 'link') return (r.dimA === dimId && r.valA === val) || (r.dimB === dimId && r.valB === val);
    return false;
  }

  function drawLine(a, b) {
    if (!a || !b) return;
    const br = el.board.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    const cr = b.getBoundingClientRect();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(ar.left + ar.width / 2 - br.left));
    line.setAttribute('y1', String(ar.top + ar.height / 2 - br.top));
    line.setAttribute('x2', String(Math.max(0, Math.min(br.width, cr.left + 16 - br.left))));
    line.setAttribute('y2', String(Math.max(0, Math.min(br.height, cr.top + 20 - br.top))));
    el.strings.appendChild(line);
    lastLines.push(line);
    if (lastLines.length > 9) lastLines.shift().remove();
  }

  function clearLines() { el.strings.innerHTML = ''; lastLines = []; }

  function solutionYes(person, dimId) { return cur().solution[person][dimId]; }
  function isCorrectMark(person, dimId, val, mark) {
    const yes = solutionYes(person, dimId) === val;
    return mark === 'yes' ? yes : mark === 'no' ? !yes : true;
  }

  function progress() {
    const c = cur();
    let assignmentsTotal = 0; let correctYes = 0; let wrong = 0;
    c.people.forEach((p0) => c.dims.forEach((d) => {
      assignmentsTotal += 1;
      const sol = solutionYes(p0.id, d.id);
      if (getMark(p0.id, d.id, sol) === 'yes') correctYes += 1;
      d.values.forEach((v0) => { const m = getMark(p0.id, d.id, v0.id); if (m && !isCorrectMark(p0.id, d.id, v0.id, m)) wrong += 1; });
    }));
    const nonFalseTotal = c.clues.filter((clue, index) => index !== c.falseClue).length;
    const nonFalseDone = c.clues.filter((clue, index) => index !== c.falseClue && clue.rules.every(ruleUsed)).length;
    const cluesDone = nonFalseDone + (c.liar && falsePick === c.falseClue ? 1 : 0);
    return {
      assignmentsTotal,
      correctYes,
      wrong,
      cluesDone,
      cluesTotal: c.clues.length,
      nonFalseDone,
      nonFalseTotal,
    };
  }

  function ruleUsed(rule) {
    const c = cur();
    if (rule.kind === 'is') return getMark(rule.person, rule.dimId, rule.val) === 'yes';
    if (rule.kind === 'not') return getMark(rule.person, rule.dimId, rule.val) === 'no';
    const peopleA = c.people.filter((p0) => getMark(p0.id, rule.dimA, rule.valA) === 'yes');
    if (!peopleA.length) return false;
    return peopleA.every((p0) => getMark(p0.id, rule.dimB, rule.valB) === (rule.neg ? 'no' : 'yes'));
  }

  function render() {
    if (!el.title) return;
    const c = cur();
    el.title.textContent = `${c.icon} ${text(c.title)}`;
    const pr = progress();
    const pct = pr.cluesTotal ? Math.round((pr.cluesDone / pr.cluesTotal) * 100) : 0;
    el.ring.style.setProperty('--p', String(pct));
    el.progressText.textContent = `${pr.cluesDone}/${pr.cluesTotal}`;
    el.hint.textContent = t('intuition')(hintsLeft);
    const left = Math.max(0, pr.cluesTotal - pr.cluesDone);
    el.tip.textContent = pr.wrong ? t('stepsLeft')(left, pr.wrong) : t('progressTip')(pr.cluesDone, pr.cluesTotal);
    const guide = guideState();
    el.guideStep.textContent = guide.step;
    el.guideText.textContent = guide.message;
    el.guide.classList.toggle('is-ready', guide.canMark);
    el.markTools.forEach((button) => {
      const active = button.dataset.markMode === markMode;
      button.classList.toggle('on', active);
      button.disabled = !guide.canMark || won;
      button.setAttribute('aria-pressed', String(active));
    });
    const canAccuse = c.liar && pr.nonFalseDone === pr.nonFalseTotal;
    el.clueList.querySelectorAll('.clue').forEach((card) => {
      const i = Number(card.dataset.clue);
      const clue = c.clues[i];
      const used = i !== c.falseClue && clue.rules.every(ruleUsed);
      card.classList.toggle('active', i === hintClue);
      card.classList.toggle('hint', i === hintClue && !used);
      card.classList.toggle('falsePick', i === falsePick);
      card.classList.toggle('used', used && i !== c.falseClue);
      const select = card.querySelector('.clue__select');
      select.setAttribute('aria-pressed', String(i === hintClue));
      const copy = card.querySelector('.clue__copy');
      copy.textContent = text(clue.label);
      const state = card.querySelector('.clue__state');
      if (used) state.textContent = t('clueDone');
      else if (c.liar && i === c.falseClue && canAccuse) state.textContent = t('falseReady');
      else if (i === hintClue && clue.rules.some((rule) => rule.kind === 'link') && !pendingDirectTargets(clue).length) state.textContent = t('clueLink');
      else if (i === hintClue) state.textContent = t('clueActive');
      else state.textContent = '';
      const btn = card.querySelector('.falseBtn');
      if (btn) {
        btn.hidden = !canAccuse || won;
        btn.textContent = t(falsePick === i ? 'falsePicked' : 'falseAsk');
      }
    });
    el.tabs.querySelectorAll('.caseTab').forEach((b) => b.classList.toggle('on', Number(b.dataset.case) === caseIndex));
  }

  function useHint() {
    if (hintsLeft <= 0) { flashTip(t('noHints')); return; }
    const idx = nextPendingClue();
    if (idx < 0) {
      flashTip(cur().liar ? t('guideLiar') : t('solvedTip'));
      return;
    }
    selectClue(idx);
    hintsLeft -= 1;
    flashTip(t('hintTip'));
  }

  function flashTip(msg) {
    el.tip.textContent = msg;
    el.tip.classList.remove('wiggle');
    void el.tip.offsetWidth;
    el.tip.classList.add('wiggle');
    later(render, 1600);
  }

  function checkWin() {
    if(won)return;
    const c = cur();
    const pr = progress();
    if (pr.correctYes !== pr.assignmentsTotal || pr.wrong > 0) return;
    if (c.liar && falsePick !== c.falseClue) return;
    won = true;
    if(!completed.includes(caseIndex)){completed.push(caseIndex);try{localStorage.setItem('kidslab.detective-board',JSON.stringify({completed}));}catch{}window.cool?.stage?.(`case-${caseIndex+1}`);if(completed.length===CASES.length)window.cool?.complete?.();}
    rounds.checkpoint();
    clearLines();
    document.querySelectorAll('.cell.yes').forEach((cell, i) => later(() => {
      const clueCard = document.querySelector(`[data-clue="${i % c.clues.length}"]`);
      drawLine(cell, clueCard);
    }, i * 90));
    later(showWin, 850);
  }

  function showWin() {
    el.story.innerHTML = cur().story.map((s, i) => `<p style="animation-delay:${i * 0.18}s">${text(s)}</p>`).join('');
    el.modal.hidden = false;
    flashTip(t('solvedTip'));
  }

  el.markTools.forEach((button) => button.addEventListener('click', () => {
    if (!button.disabled) {
      markMode = button.dataset.markMode;
      render();
    }
  }));
  el.hint.addEventListener('click', useHint);
  el.reset.addEventListener('click', () => newCase(caseIndex));
  el.next.addEventListener('click',()=>switchCase((caseIndex+1)%CASES.length,true));
  addEventListener('resize', () => { clearLines(); });
  addEventListener('themechange', () => { cssVar('--ink'); clearLines(); });

  let changing=false;
  async function switchCase(index,fresh=false){
    if(changing)return;changing=true;rounds.checkpoint();
    try{if(fresh)CASES[index]=await rounds.nextAsync(index);newCase(index);const s=rounds.record(index).play;if(s){try{restorePlay(s);}catch{newCase(index);}}rounds.checkpoint();}finally{changing=false;}
  }
  function restorePlay(s){
    const c=cur(),keys=new Set(c.people.flatMap(p=>c.dims.flatMap(d=>d.values.map(v=>key(p.id,d.id,v.id)))));
    if(!s||!s.marks||Array.isArray(s.marks)||Object.entries(s.marks).some(([k,v])=>!keys.has(k)||!['yes','no'].includes(v))||!Number.isInteger(s.hintsLeft)||s.hintsLeft<0||s.hintsLeft>3||!Number.isInteger(s.hintClue)||s.hintClue< -1||s.hintClue>=c.clues.length||!['yes','no'].includes(s.markMode)||s.falsePick!==null&&(!c.liar||!Number.isInteger(s.falsePick)||s.falsePick<0||s.falsePick>=c.clues.length))throw new Error('Invalid detective snapshot');
    for(const [k,v] of Object.entries(s.marks))if(!isCorrectMark(...k.split('|'),v))throw new Error('Invalid recorded deduction');
    marks=s.marks;hintsLeft=s.hintsLeft;hintClue=s.hintClue;markMode=s.markMode;falsePick=s.falsePick;won=Boolean(s.won);
    const pr=progress();if(won&&(pr.correctYes!==pr.assignmentsTotal||pr.wrong||c.liar&&falsePick!==c.falseClue))throw new Error('Invalid case completion');
    buildStatic();for(const [k,v] of Object.entries(marks))setMark(...k.split('|'),v);render();if(won)showWin();
  }
  const initial=Number(rounds.active??0);newCase(Number.isInteger(initial)&&initial>=0&&initial<CASES.length?initial:0);applyTheme();applyLang();
  rounds.attach({parent:'.bar__actions',compact:true,dialog:'#winModal',active:()=>caseIndex,capture:()=>({marks,hintsLeft,hintClue,markMode,falsePick,won}),restore:restorePlay,retry:()=>newCase(caseIndex),beforeReload:cancel});
})();
