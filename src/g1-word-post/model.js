// Pure model copied into each standalone game by generate.mjs.
export const ROUND_COUNT = 8;

export function roundTasks(config, variant = 0) {
  if (!config || !Array.isArray(config.tasks) || config.tasks.length < ROUND_COUNT) {
    throw new RangeError('At least eight tasks are required');
  }
  const ids = config.tasks.map((task) => task.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => typeof id !== 'string' || !id)) {
    throw new TypeError('Task IDs must be unique nonempty strings');
  }
  const offset = (Math.max(0, Math.floor(Number(variant) || 0)) * 2) % config.tasks.length;
  return Array.from({ length: ROUND_COUNT }, (_, index) => config.tasks[(offset + index) % config.tasks.length]);
}

export function initialState(config, variant = 0) {
  return { version: 1, variant, done: [], active: roundTasks(config, variant).map((task) => task.id) };
}

export function restoreState(config, saved) {
  if (!saved || saved.version !== 1 || !Number.isInteger(saved.variant) || saved.variant < 0) return initialState(config);
  const expected = roundTasks(config, saved.variant).map((task) => task.id);
  if (!Array.isArray(saved.active) || !Array.isArray(saved.done) ||
      saved.active.length !== ROUND_COUNT || saved.active.some((id, i) => id !== expected[i]) ||
      saved.done.length > ROUND_COUNT || saved.done.some((id, i) => id !== expected[i])) return initialState(config);
  return { version: 1, variant: saved.variant, active: expected, done: [...saved.done] };
}

export function currentTask(config, state) {
  if (state.done.length >= ROUND_COUNT) return null;
  return config.tasks.find((task) => task.id === state.active[state.done.length]) || null;
}

export function isCorrect(task, answer) {
  if (!task || answer === null || answer === undefined) return false;
  return String(answer) === String(task.answer);
}

export function submit(config, state, taskId, answer) {
  const task = currentTask(config, state);
  if (!task || task.id !== taskId || !isCorrect(task, answer)) return { accepted: false, state };
  return { accepted: true, state: { ...state, done: [...state.done, taskId] } };
}

export function replay(config, state) {
  return initialState(config, state.variant + 1);
}

/* 连对多少题给一次语音夸奖 */
export const MILESTONE_STREAK = 3;

export function pickText(value, lang = 'zh') {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value[lang] ?? value.zh ?? value.en ?? '';
}

/* 题面朗读组句：只念动作邀请、算式和题面本身，绝不包含答案。 */
export function speakText({ kind, task, words = {}, phase = 0, lang = 'zh' } = {}) {
  if (!task || !words || typeof words !== 'object') return '';
  const parts = [];
  const push = (value) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text) parts.push(text);
  };
  const counted = (...values) => values.every((value) => Number.isFinite(Number(value)));
  switch (kind) {
    case 'compare':
      push(words.compare);
      if (counted(task.left, task.right)) {
        push(lang === 'en' ? `${task.left} and ${task.right}` : `${task.left} 和 ${task.right}`);
      }
      break;
    case 'add':
      push(words.add);
      if (counted(task.a, task.b)) push(lang === 'en' ? `${task.a} plus ${task.b}` : `${task.a} 加 ${task.b}`);
      break;
    case 'subtract':
      push(words.subtract);
      if (counted(task.a, task.b)) push(lang === 'en' ? `${task.a} minus ${task.b}` : `${task.a} 减 ${task.b}`);
      break;
    case 'mixed':
      push(phase === 0 ? words.mixed1 : words.mixed2);
      if (counted(task.a, task.b, task.c)) {
        push(lang === 'en'
          ? `${task.a} plus ${task.b} minus ${task.c}`
          : `${task.a} 加 ${task.b} 减 ${task.c}`);
      }
      break;
    case 'weight':
      /* 两张秤盘上的东西是 emoji，念不出质量，只念问句。 */
      push(words.weight);
      break;
    case 'direction':
      push(pickText(task.prompt, lang));
      break;
    case 'shape':
      push(words.shape);
      push(pickText(task.scene, lang));
      break;
    case 'character':
      push(words.character);
      push(task.char);
      break;
    case 'word':
      /* 题面是图画、答案是词语，只念指令。 */
      push(words.word);
      break;
    case 'rhyme':
      push(words.rhyme);
      push(task.left);
      break;
    case 'pinyin':
      /* 只念要拼的字，声母、韵母、声调正是答案。 */
      push(words.pinyin);
      push(task.char);
      break;
    case 'stroke':
      push(words.stroke);
      push(pickText(task.stroke, lang));
      break;
    case 'sentence':
      push(words.sentence);
      break;
    case 'sort':
      /* 筐的编号正是答案，只念指令与分类标准。 */
      push(words.sort);
      push(pickText(task.criterion, lang));
      break;
    case 'poem':
      /* 排序题念出诗句就等于念出答案，只有它只念指令。 */
      if (task.form === 'guess') { push(words.poem); push(pickText(task.title, lang)); }
      else if (task.form === 'next') { push(words.poemNext); push(pickText(task.line, lang)); }
      else push(words.poemOrder);
      break;
    case 'stroke-order':
      /* 笔画顺序正是答案，只念指令与要写的字。 */
      push(words.strokeOrder);
      push(task.char);
      break;
    default:
      return '';
  }
  return parts.join(lang === 'en' ? '. ' : '，');
}

/* 里程碑判定：先判通关，再判连对。 */
export function milestoneFor({ done = 0, streak = 0, total = ROUND_COUNT } = {}) {
  if (done >= total) return 'clear';
  if (streak >= MILESTONE_STREAK && streak % MILESTONE_STREAK === 0) return 'streak3';
  return null;
}

const PRAISE = {
  streak3: {
    zh: ['连对三题，真厉害！', '三题全对，太棒了！', '连对三题，你真行！'],
    en: ['Three in a row. Great job!', 'Three right in a row!', 'You are on a roll!'],
  },
  clear: {
    zh: ['八题完成，你太棒了！', '全部完成，你太厉害了！', '坚持完成，真了不起！'],
    en: ['All eight completed. You are amazing!', 'You finished them all. Wonderful!', 'You kept going. Well done!'],
  },
};

/* 夸奖语按次数确定性轮转，同一局里不重复同一句。 */
export function praiseText(key, times = 0, lang = 'zh') {
  const list = PRAISE[key] && PRAISE[key][lang === 'en' ? 'en' : 'zh'];
  if (!Array.isArray(list) || !list.length) return '';
  return list[Math.abs(Math.floor(Number(times) || 0)) % list.length];
}

/* 答错时的鼓励语：先安抚再指路，绝不复述答案、也不说「错了」。
   连错越多越温柔，避免孩子在同一个坎上被反复否定。 */
const ENCOURAGE = {
  zh: [
    ['没关系，再试一次就好', '加把劲儿，你可以的', '别着急，慢慢想一想'],
    ['专心一点，再仔细看看', '再看一眼，你会发现线索的', '不慌，静下来再试一次'],
    ['再想一想，答案就在眼前', '慢慢来，我陪着你', '别灰心，换个思路试试'],
  ],
  en: [
    ['It is okay. Have another go', 'Keep going. You can do it', 'No rush. Take your time'],
    ['Focus a little. Look again', 'One more look. You will spot the clue', 'Stay calm. Try once more'],
    ['Think again. The answer is close', 'Take your time. I am here with you', 'Do not give up. Try another way'],
  ],
};

/* 同一道题上连错的次数决定用哪一档；次数多了会往后轮，再回到最温柔的一档。 */
export function encourageText(missCount = 0, lang = 'zh') {
  const table = ENCOURAGE[lang === 'en' ? 'en' : 'zh'];
  const index = Math.max(0, Math.floor(Number(missCount) || 0));
  const tier = table[Math.min(index, table.length - 1)];
  return tier[index % tier.length];
}

/* ===== 描红判定（笔画工坊用，纯几何，无 DOM） ===== */

const point = (value) => (Array.isArray(value) && value.length === 2 && value.every((n) => Number.isFinite(Number(n)))
  ? [Number(value[0]), Number(value[1])] : null);

/* 点到线段的最小距离（viewBox 单位）；输入非法返回 Infinity。 */
export function pointToSegmentDistance(p, a, b) {
  const q = point(p), start = point(a), end = point(b);
  if (!q || !start || !end) return Infinity;
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((q[0] - start[0]) * dx + (q[1] - start[1]) * dy) / lengthSq));
  return Math.hypot(q[0] - (start[0] + t * dx), q[1] - (start[1] + t * dy));
}

/* 点到参考折线（路标点数组）的最小距离。 */
export function distanceToPath(p, guide) {
  if (!Array.isArray(guide) || guide.length < 2) return Infinity;
  let min = Infinity;
  for (let i = 1; i < guide.length; i++) min = Math.min(min, pointToSegmentDistance(p, guide[i - 1], guide[i]));
  return min;
}

/* 每个墨迹采样点到参考折线的最小距离数组。 */
export function pathDeviation(ink, guide) {
  if (!Array.isArray(ink)) return [];
  return ink.map((p) => distanceToPath(p, guide));
}

/*
 * 描红评估：墨迹采样点 vs 参考折线。
 * - 不到起点或终点 → 'incomplete'（没写完）
 * - 平均偏离超过容差 → 'offtrack'（跑出轨迹）
 * - 平均偏离在容差一半以内且峰值不超容差 → 'straight'（写得直）
 * - 其余 → 'wobbly'（写得完但有点歪）
 */
export const STRAIGHT_RATIO = 0.45;
export const EDGE_RATIO = 1.5;
export function evaluateTrace(ink, guide, tolerance = 12) {
  const tol = Number(tolerance);
  const bad = { passed: false, verdict: 'incomplete', avgDev: Infinity, maxDev: Infinity };
  if (!Array.isArray(ink) || !Array.isArray(guide) || guide.length < 2 || ink.length < 2 || !Number.isFinite(tol) || tol <= 0) return bad;
  const deviations = pathDeviation(ink, guide);
  if (deviations.some((d) => !Number.isFinite(d)) || deviations.length < 2) return bad;
  const edge = tol * EDGE_RATIO;
  const near = (p, target) => Math.hypot(p[0] - target[0], p[1] - target[1]) <= edge;
  const start = point(guide[0]), end = point(guide[guide.length - 1]);
  const first = point(ink[0]), last = point(ink[ink.length - 1]);
  if (!start || !end || !first || !last) return bad;
  if (!near(first, start) || !near(last, end)) return { ...bad, verdict: 'incomplete' };
  const maxDev = Math.max(...deviations);
  const avgDev = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
  if (avgDev > tol) return { passed: false, verdict: 'offtrack', avgDev, maxDev };
  const straight = avgDev <= tol * STRAIGHT_RATIO && maxDev <= tol;
  return { passed: true, verdict: straight ? 'straight' : 'wobbly', avgDev, maxDev };
}
