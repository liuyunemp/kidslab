// 无 DOM 的关卡判定与奖励模型（可单测）
// 关卡对象的最小约定：{ type, answer, ... }，answer 为基本类型（数字或字符串）。
// 不同题型的渲染与数据形态由各课件 levels.js 决定，这里只负责"判定/奖励/解锁"三件纯逻辑。

export const LEVEL_TYPES = [
  'count', 'compare', 'calc', 'clock', 'pattern',
  'weight', 'direction', 'money', 'shape', 'tangram', 'match',
];

/**
 * 判定答案是否正确。
 * @param {string} type 关卡类型，必须在 LEVEL_TYPES 内
 * @param {*} input 玩家输入
 * @param {object} level 关卡对象（至少含 answer）
 * @returns {boolean}
 */
export function checkAnswer(type, input, level = {}) {
  if (!LEVEL_TYPES.includes(type)) throw new TypeError(`未知关卡类型: ${type}`);
  if (input == null || input === '') throw new RangeError('输入不能为空');
  const ans = level.answer;
  if (ans == null) throw new RangeError('关卡缺少 answer');
  return String(input) === String(ans);
}

/**
 * 累加奖励。错误不惩罚：状态原样返回。
 * 每答对一题 +1 星 +5 金币；每累计满 5 颗星额外 +1 贴纸。
 * @param {{stars?:number,coins?:number,stickers?:number}} state
 * @param {boolean} correct
 */
export function award(state, correct) {
  const s = { stars: 0, coins: 0, stickers: 0, ...state };
  if (!correct) return s;
  const stars = s.stars + 1;
  const coins = s.coins + 5;
  const stickers = s.stickers + (stars % 5 === 0 ? 1 : 0);
  return { stars, coins, stickers };
}

/**
 * 第 index 关是否解锁：首关恒解锁，其余要求前一关已完成。
 * @param {number} index
 * @param {boolean[]} completed 已完成关卡布尔数组（按 levels 顺序）
 */
export function isUnlocked(index, completed = []) {
  if (index <= 0) return true;
  return !!completed[index - 1];
}

/** 是否全部通关 */
export function allDone(completed = [], expectedCount = 0) {
  return Number.isInteger(expectedCount) && expectedCount > 0 &&
    Array.from({ length: expectedCount }, (_, index) => completed[index] === true).every(Boolean);
}
