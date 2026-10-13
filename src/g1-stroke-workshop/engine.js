import { ROUND_COUNT, currentTask, initialState, replay, restoreState, submit } from './model.js';

const WORDS = {
  zh: {
    back: '返回', musicOn: '关闭音乐', musicOff: '打开音乐', effectsOn: '关闭音效', effectsOff: '打开音效',
    play: '开始玩', restart: '再玩一轮', finished: '八个任务完成啦！', success: '好棒！前往下一关',
    tryAgain: '再试一次，场景还在这里。', task: '任务', compare: '把合适的桥牌放到中间',
    add: '开动数线小火车，送到正确的站台', subtract: '让小火车退到正确的站台',
    mixed1: '第一站：先算加法', mixed2: '第二站：再算减法', arrive: '到站！', nextStop: '开往下一站',
    weight: '哪边更重？', left: '左边', right: '右边', equal: '一样重',
    mapFront: '前 ↑', mapLeft: '← 左', mapRight: '右 →',
    shape: '为场景挑合适的图形', character: '这个字是哪幅图？',
    pinyin: '接上声母、韵母和声调车厢', initial: '声母', final: '韵母', tone: '声调', check: '拼好啦',
    stroke: '从亮点出发，顺着箭头描一描', word: '把词语送到这幅图的信箱', rhyme: '谁和它是一对？',
    sentence: '按“谁 → 在哪里 → 做什么”连车厢', clear: '重新排列',
    names: { circle: '圆形', triangle: '三角形', square: '正方形', rectangle: '长方形', parallelogram: '平行四边形' },
  },
  en: {
    back: 'Back', musicOn: 'Turn music off', musicOff: 'Turn music on', effectsOn: 'Turn effects off', effectsOff: 'Turn effects on',
    play: 'Play', restart: 'Play another round', finished: 'All eight tasks complete!', success: 'Great! Next task',
    tryAgain: 'Try again. Your scene is still here.', task: 'Task', compare: 'Fit the right bridge sign',
    add: 'Drive the number train to the right stop', subtract: 'Drive the train back to the right stop',
    mixed1: 'First stop: add', mixed2: 'Second stop: subtract', arrive: 'Arrive!', nextStop: 'Next stop',
    weight: 'Which side is heavier?', left: 'Left', right: 'Right', equal: 'Same weight',
    mapFront: 'Front ↑', mapLeft: '← Left', mapRight: 'Right →',
    shape: 'Pick a shape for the scene', character: 'Which picture matches this character?',
    pinyin: 'Join an initial, final and tone', initial: 'Initial', final: 'Final', tone: 'Tone', check: 'Check',
    stroke: 'Start at the glowing dot and trace the line', word: 'Deliver a word to this picture', rhyme: 'Which word pairs with it?',
    sentence: 'Link who → where → action', clear: 'Start arrangement again',
    names: { circle: 'Circle', triangle: 'Triangle', square: 'Square', rectangle: 'Rectangle', parallelogram: 'Parallelogram' },
  },
};

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const rotate = (values, shift) => values.map((_, index) => values[(index + shift) % values.length]);
const symbol = (name) => ({ circle: '●', triangle: '▲', square: '■', rectangle: '▰', parallelogram: '▱' }[name] || '◆');

export function startGame(config) {
  const cool = window.cool;
  const storage = cool.storage;
  const key = `kidslab.g1game.${config.id}`;
  const $ = (selector) => document.querySelector(selector);
  const t = (value) => typeof value === 'object' && value !== null ? (value[cool.preferences.lang] ?? value.zh ?? '') : value;
  const w = () => WORDS[cool.preferences.lang] || WORDS.zh;
  let state;
  try { state = restoreState(config, JSON.parse(storage.get(key, 'null'))); }
  catch { state = initialState(config); }
  let draft = null;
  let phase = 0;
  let sentenceParts = [];
  let syllable = { initial: '', final: '', tone: '' };
  let busy = false;
  let gestureSeen = false;
  let audioContext = null;
  let musicOn = storage.get('kidslab.g1.music', '1') !== '0';
  let effectsOn = storage.get('kidslab.g1.effects', '1') !== '0';
  const bgm = new Audio('./audio/bgm.ogg');
  bgm.loop = true;
  bgm.volume = 0.15;

  document.documentElement.style.setProperty('--accent', config.accent);
  document.documentElement.style.setProperty('--backdrop', config.backdrop);
  document.body.dataset.kind = config.kind;

  function playMusic() {
    if (gestureSeen && musicOn && !document.hidden) bgm.play().catch(() => {});
  }
  function sound(kind) {
    if (!effectsOn || !gestureSeen) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioContext ||= new AC();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const notes = kind === 'wrong' ? [260] : kind === 'win' ? [523, 659, 784, 1046] : [587, 784];
      notes.forEach((frequency, index) => {
        const start = audioContext.currentTime + index * 0.09;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = kind === 'wrong' ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.09, start + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.2);
      });
    } catch { /* Audio is optional. */ }
  }
  document.addEventListener('pointerdown', () => { gestureSeen = true; playMusic(); }, { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) bgm.pause(); else playMusic(); });
  window.addEventListener('pagehide', () => { bgm.pause(); audioContext?.close().catch(() => {}); });

  function save() { storage.set(key, JSON.stringify(state)); }
  function feedback(message, bad = false) {
    $('#feedback').textContent = message;
    $('#feedback').dataset.bad = String(bad);
  }
  function countPiles(number) {
    const tens = Math.floor(number / 10);
    const ones = number % 10;
    return `<div class="number-card"><strong>${number}</strong><div class="bundles" aria-hidden="true">${'▥'.repeat(tens)}${'•'.repeat(ones)}</div></div>`;
  }
  function progress() {
    const count = state.done.length;
    $('#count').textContent = `${Math.min(count + 1, ROUND_COUNT)}/${ROUND_COUNT}`;
    $('#stars').textContent = `⭐ ${count}`;
    $('#track').innerHTML = Array.from({ length: ROUND_COUNT }, (_, i) => `<span class="track-dot ${i < count ? 'done' : ''}" aria-hidden="true"></span>`).join('');
  }
  function controls() {
    const words = w();
    document.documentElement.style.setProperty('--backdrop', cool.preferences.theme === 'dark' ? '#191c2d' : config.backdrop);
    $('#musicBtn').textContent = musicOn ? '♫' : '♩';
    $('#musicBtn').setAttribute('aria-label', musicOn ? words.musicOn : words.musicOff);
    $('#musicBtn').setAttribute('aria-pressed', String(musicOn));
    $('#effectsBtn').textContent = effectsOn ? '🔔' : '🔕';
    $('#effectsBtn').setAttribute('aria-label', effectsOn ? words.effectsOn : words.effectsOff);
    $('#effectsBtn').setAttribute('aria-pressed', String(effectsOn));
    $('#languageBtn').textContent = cool.preferences.lang === 'zh' ? 'EN' : '中';
    $('#themeBtn').textContent = cool.preferences.theme === 'dark' ? '☀️' : '🌙';
  }
  function resetDraft() {
    draft = null;
    phase = 0;
    sentenceParts = [];
    syllable = { initial: '', final: '', tone: '' };
  }
  function choiceButtons(values, answer, className = 'choice') {
    return rotate(values, state.done.length % values.length).map((value) =>
      `<button class="${className}" type="button" data-answer="${esc(value)}">${esc(value)}</button>`).join('');
  }
  function renderTask(task) {
    const words = w();
    const k = config.kind;
    if (k === 'compare') return `<p class="prompt">${esc(t(task.prompt) || words.compare)}</p><div class="compare-scene">${countPiles(task.left)}<div class="bridge" aria-hidden="true">?</div>${countPiles(task.right)}</div><div class="choices">${choiceButtons(['>', '<', '='])}</div>`;
    if (k === 'add' || k === 'subtract' || k === 'mixed') {
      if (draft === null) draft = task.a;
      const expression = k === 'add' ? `${task.a} + ${task.b}` : k === 'subtract' ? `${task.a} − ${task.b}` : `${task.a} + ${task.b} − ${task.c}`;
      const title = k === 'mixed' ? phase === 0 ? words.mixed1 : words.mixed2 : words[k];
      return `<p class="prompt">${esc(title)}</p><div class="arithmetic-scene"><div class="expression">${expression}</div><div class="number-line"><span class="line-start">0</span><span class="train" style="left:${draft}%">${esc(config.mascot)}</span><span class="line-end">100</span></div><div class="readout">${draft}</div><div class="step-controls"><button data-step="-10">−10</button><button data-step="-1">−1</button><button data-step="1">+1</button><button data-step="10">+10</button></div><button class="submit" data-submit="number" type="button">${esc(k === 'mixed' && phase === 0 ? words.nextStop : words.arrive)}</button></div>`;
    }
    if (k === 'weight') {
      const tilt = task.leftMass === task.rightMass ? 0 : task.leftMass > task.rightMass ? -8 : 8;
      return `<p class="prompt">${esc(words.weight)}</p><div class="scale-scene"><div class="scale-beam" style="--tilt:${tilt}deg"><div class="pan">${task.leftEmoji}</div><div class="pan">${task.rightEmoji}</div></div><div class="scale-post"></div></div><div class="choices">${[['left', words.left], ['equal', words.equal], ['right', words.right]].map(([id,label]) => `<button class="choice" data-answer="${id}">${esc(label)}</button>`).join('')}</div>`;
    }
    if (k === 'direction') return `<p class="prompt">${esc(t(task.prompt))}</p><div class="map-label">${esc(words.mapFront)}</div><div class="map-scene">${task.items.map((item, i) => `<button class="map-person ${i === task.anchor ? 'anchor' : ''}" type="button" data-answer="${i}" aria-label="${esc(item)}">${item}</button>`).join('')}</div><div class="map-axis">${esc(words.mapLeft)} · ${esc(words.mapRight)}</div>`;
    if (k === 'shape') {
      const names = ['circle', 'triangle', 'square', 'rectangle', 'parallelogram'];
      return `<p class="prompt">${esc(words.shape)}：${esc(t(task.scene))}</p><div class="shape-silhouette ${task.answer}" aria-hidden="true">${symbol(task.answer)}</div><div class="choices shapes">${rotate(names, state.done.length % names.length).map((name) => `<button class="shape-choice" data-answer="${name}" type="button"><span aria-hidden="true">${symbol(name)}</span><b>${esc(words.names[name])}</b></button>`).join('')}</div>`;
    }
    if (k === 'character') return `<p class="prompt">${esc(words.character)}</p><div class="big-char">${esc(task.char)}</div><div class="choices pictures">${rotate(task.choices, state.done.length % 3).map((picture) => `<button class="picture-choice" data-answer="${esc(picture)}" type="button">${esc(picture)}</button>`).join('')}</div>`;
    if (k === 'word') return `<p class="prompt">${esc(words.word)}</p><div class="big-picture">${esc(task.picture)}</div><div class="choices">${choiceButtons(task.choices, task.answer, 'word-choice')}</div>`;
    if (k === 'rhyme') return `<p class="prompt">${esc(words.rhyme)}</p><div class="rhyme-scene"><span>${esc(task.left)}</span><span class="rhyme-drum">🥁</span><span>？</span></div><div class="choices">${choiceButtons(task.choices, task.answer, 'word-choice')}</div>`;
    if (k === 'pinyin') {
      const options = { initial: [task.initial, 'b', 'm', 't', 'h', 'sh', 'n', 'f'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4), final: [task.final, 'a', 'i', 'u', 'an', 'ao', 'ua'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4), tone: ['1', '2', '3', '4'] };
      const group = (part) => `<div class="pinyin-group"><b>${words[part]}</b><div>${rotate(options[part], state.done.length % options[part].length).map((value) => `<button type="button" data-part="${part}" data-value="${value}" class="${syllable[part] === value ? 'selected' : ''}">${part === 'tone' ? ['ˉ','ˊ','ˇ','ˋ'][Number(value)-1] : value}</button>`).join('')}</div></div>`;
      return `<p class="prompt">${esc(words.pinyin)}</p><div class="pinyin-picture">${task.picture}<strong>${esc(task.char)}</strong></div><div class="pinyin-train">${esc(syllable.initial || '○')} · ${esc(syllable.final || '○')} · ${esc(syllable.tone || '○')}</div>${group('initial')}${group('final')}${group('tone')}<button class="submit" type="button" data-submit="pinyin">${esc(words.check)}</button>`;
    }
    if (k === 'stroke') {
      const points = task.points.map(([x,y]) => `${x},${y}`).join(' ');
      return `<p class="prompt">${esc(words.stroke)}</p><div class="stroke-name">${esc(t(task.stroke))}</div><svg id="trace" class="trace" viewBox="0 0 100 100" role="img" aria-label="${esc(t(task.stroke))}"><polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".42"/><circle cx="${task.points[0][0]}" cy="${task.points[0][1]}" r="10" fill="var(--accent)"/><circle cx="${task.points.at(-1)[0]}" cy="${task.points.at(-1)[1]}" r="6" fill="var(--ink)"/></svg>`;
    }
    if (k === 'sentence') {
      const choices = rotate(task.words, state.done.length % task.words.length);
      return `<p class="prompt">${esc(words.sentence)}</p><div class="sentence-track">${sentenceParts.map((part) => `<span>${esc(part)}</span>`).join('')}${Array.from({ length: 3 - sentenceParts.length }, () => '<span class="empty">＋</span>').join('')}</div><div class="choices">${choices.map((part) => `<button class="word-choice" type="button" data-word="${esc(part)}" ${sentenceParts.includes(part) ? 'disabled' : ''}>${esc(part)}</button>`).join('')}</div><button class="subtle" type="button" data-clear>${esc(words.clear)}</button>`;
    }
    return '';
  }
  function render() {
    const task = currentTask(config, state);
    document.title = `${t(config.title)} · KidsLab`;
    $('#title').textContent = `${config.icon} ${t(config.title)}`;
    $('#intro').textContent = t(config.description);
    $('#back').textContent = `← ${w().back}`;
    progress(); controls();
    if (!task) {
      $('#stage').innerHTML = `<div class="end-scene"><div>🎉</div><h2>${esc(w().finished)}</h2><button id="replay" class="submit" type="button">${esc(w().restart)}</button></div>`;
      $('#replay').addEventListener('click', () => { state = replay(config, state); save(); resetDraft(); feedback(''); render(); cool.stage('round-1'); });
      return;
    }
    $('#stage').innerHTML = renderTask(task);
    $('#stage').setAttribute('aria-label', `${w().task} ${state.done.length + 1}/${ROUND_COUNT}`);
    if (config.kind === 'stroke') wireStroke(task);
  }
  function answer(value) {
    if (busy) return;
    const task = currentTask(config, state);
    if (!task) return;
    const result = submit(config, state, task.id, value);
    if (!result.accepted) { sound('wrong'); feedback(w().tryAgain, true); $('#stage').classList.remove('wobble'); void $('#stage').offsetWidth; $('#stage').classList.add('wobble'); return; }
    busy = true;
    state = result.state; save();
    sound(state.done.length === ROUND_COUNT ? 'win' : 'good');
    feedback(w().success);
    progress();
    cool.stage(`round-${state.done.length}`);
    if (state.done.length === ROUND_COUNT) cool.complete?.();
    setTimeout(() => { busy = false; resetDraft(); feedback(''); render(); }, 650);
  }
  function wireStroke(task) {
    const svg = $('#trace');
    let active = false;
    let nextPoint = 1;
    const coordinates = (event) => { const box = svg.getBoundingClientRect(); return [(event.clientX - box.left) / box.width * 100, (event.clientY - box.top) / box.height * 100]; };
    const closeTo = (point, event) => { const [x, y] = coordinates(event); return Math.hypot(x - point[0], y - point[1]) < 17; };
    svg.addEventListener('pointerdown', (event) => {
      if (!closeTo(task.points[0], event)) return;
      event.preventDefault();
      active = true; nextPoint = 1; svg.setPointerCapture(event.pointerId); svg.classList.add('drawing');
    });
    svg.addEventListener('pointermove', (event) => {
      if (!active) return;
      if (nextPoint < task.points.length && closeTo(task.points[nextPoint], event)) nextPoint += 1;
      if (nextPoint === task.points.length) svg.classList.add('complete-trace');
    });
    svg.addEventListener('pointerup', (event) => {
      if (!active) return;
      active = false; svg.classList.remove('drawing');
      if (nextPoint === task.points.length - 1 && closeTo(task.points[nextPoint], event)) nextPoint += 1;
      if (nextPoint === task.points.length && closeTo(task.points.at(-1), event)) answer('traced');
      else feedback(w().tryAgain, true);
    });
    svg.addEventListener('pointercancel', () => { active = false; svg.classList.remove('drawing'); });
  }

  $('#stage').addEventListener('click', (event) => {
    if (busy) return;
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.answer !== undefined) return answer(button.dataset.answer);
    if (button.dataset.step !== undefined) { draft = Math.max(0, Math.min(100, (draft ?? 0) + Number(button.dataset.step))); render(); return; }
    if (button.dataset.part) { syllable[button.dataset.part] = button.dataset.value; render(); return; }
    if (button.dataset.word) {
      sentenceParts.push(button.dataset.word);
      if (sentenceParts.length === 3) { answer(sentenceParts.join('|')); if (!busy) { sentenceParts = []; render(); } }
      else render();
      return;
    }
    if (button.hasAttribute('data-clear')) { sentenceParts = []; render(); return; }
    if (button.dataset.submit === 'pinyin') return answer(`${syllable.initial}|${syllable.final}|${syllable.tone}`);
    if (button.dataset.submit === 'number') {
      const task = currentTask(config, state);
      if (config.kind === 'mixed' && phase === 0) {
        if (draft === task.a + task.b) { phase = 1; feedback(w().success); render(); }
        else { sound('wrong'); feedback(w().tryAgain, true); }
        return;
      }
      return answer(draft);
    }
  });
  $('#musicBtn').addEventListener('click', () => { musicOn = !musicOn; storage.set('kidslab.g1.music', musicOn ? '1' : '0'); if (!musicOn) bgm.pause(); else playMusic(); controls(); });
  $('#effectsBtn').addEventListener('click', () => { effectsOn = !effectsOn; storage.set('kidslab.g1.effects', effectsOn ? '1' : '0'); controls(); });
  $('#languageBtn').addEventListener('click', () => cool.preferences.toggleLang());
  $('#themeBtn').addEventListener('click', () => cool.preferences.toggleTheme());
  cool.preferences.subscribe(() => render());
  if (state.done.length < ROUND_COUNT) cool.stage(`round-${state.done.length + 1}`);
  render();
}
