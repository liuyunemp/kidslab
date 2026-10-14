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
    zh: ['八题全对，你太棒了！', '全部完成，你太厉害了！', '八题全对，真了不起！'],
    en: ['All eight right. You are amazing!', 'You finished them all. Wonderful!', 'Eight out of eight. Well done!'],
  },
};

/* 夸奖语按次数确定性轮转，同一局里不重复同一句。 */
export function praiseText(key, times = 0, lang = 'zh') {
  const list = PRAISE[key] && PRAISE[key][lang === 'en' ? 'en' : 'zh'];
  if (!Array.isArray(list) || !list.length) return '';
  return list[Math.abs(Math.floor(Number(times) || 0)) % list.length];
}
