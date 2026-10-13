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
