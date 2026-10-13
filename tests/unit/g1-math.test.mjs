import assert from 'node:assert/strict';
import test from 'node:test';

import { LEVEL_TYPES, checkAnswer, award, isUnlocked, allDone } from '../../src/g1-math/level-model.js';
import { levels as courseLevels } from '../../src/g1-math/levels.js';

const levels = {
  count: { type: 'count', answer: 7 },
  compareNum: { type: 'compare', answer: 'gt' },
  compareGroup: { type: 'compare', answer: 'more' },
  calc: { type: 'calc', answer: 13 },
  clock: { type: 'clock', answer: '7:30' },
  pattern: { type: 'pattern', answer: 'r' },
  weight: { type: 'weight', answer: 'left' },
  direction: { type: 'direction', answer: 'cat' },
  money: { type: 'money', answer: 200 },
  shape: { type: 'shape', answer: 'circle' },
  tangram: { type: 'tangram', answer: 't-big' },
  match: { type: 'match', answer: 'sky' },
};

test('checkAnswer 对每种题型正确/错误判定', () => {
  assert.equal(checkAnswer('count', 7, levels.count), true);
  assert.equal(checkAnswer('count', 6, levels.count), false);
  assert.equal(checkAnswer('compare', 'gt', levels.compareNum), true);
  assert.equal(checkAnswer('compare', 'lt', levels.compareNum), false);
  assert.equal(checkAnswer('compare', 'more', levels.compareGroup), true);
  assert.equal(checkAnswer('calc', 13, levels.calc), true);
  assert.equal(checkAnswer('calc', '13', levels.calc), true);
  assert.equal(checkAnswer('clock', '7:30', levels.clock), true);
  assert.equal(checkAnswer('pattern', 'r', levels.pattern), true);
  assert.equal(checkAnswer('weight', 'left', levels.weight), true);
  assert.equal(checkAnswer('direction', 'cat', levels.direction), true);
  assert.equal(checkAnswer('money', '200', levels.money), true);
  assert.equal(checkAnswer('money', 200, levels.money), true);
  assert.equal(checkAnswer('shape', 'circle', levels.shape), true);
  assert.equal(checkAnswer('tangram', 't-big', levels.tangram), true);
  assert.equal(checkAnswer('match', 'sky', levels.match), true);
});

test('checkAnswer 边界：count 为 1 与最大值', () => {
  assert.equal(checkAnswer('count', 1, { type: 'count', answer: 1 }), true);
  assert.equal(checkAnswer('count', 10, { type: 'count', answer: 10 }), true);
  assert.equal(checkAnswer('count', 9, { type: 'count', answer: 10 }), false);
});

test('checkAnswer 非法输入/未知类型/缺 answer 抛错', () => {
  assert.throws(() => checkAnswer('unknown', 1, { type: 'unknown', answer: 1 }), TypeError);
  assert.throws(() => checkAnswer('count', null, levels.count), RangeError);
  assert.throws(() => checkAnswer('count', '', levels.count), RangeError);
  assert.throws(() => checkAnswer('count', 1, { type: 'count' }), RangeError);
});

test('LEVEL_TYPES 与课件实际使用的题型一致', () => {
  const used = Object.values(levels).map((l) => l.type);
  for (const t of used) assert.ok(LEVEL_TYPES.includes(t), `题型 ${t} 未注册`);
  assert.deepEqual(
    LEVEL_TYPES,
    ['count', 'compare', 'calc', 'clock', 'pattern', 'weight', 'direction', 'money', 'shape', 'tangram', 'match'],
  );
});

test('award 答对 +1 星 +5 金币，每 5 星 +1 贴纸；答错不惩罚', () => {
  let s = { stars: 0, coins: 0, stickers: 0 };
  s = award(s, true);
  assert.deepEqual(s, { stars: 1, coins: 5, stickers: 0 });
  s = award(s, false); // 错误原样返回
  assert.deepEqual(s, { stars: 1, coins: 5, stickers: 0 });
  let big = { stars: 0, coins: 0, stickers: 0 };
  for (let i = 0; i < 5; i++) big = award(big, true);
  assert.equal(big.stars, 5);
  assert.equal(big.coins, 25);
  assert.equal(big.stickers, 1); // 第 5 颗星触发贴纸
});

test('isUnlocked / allDone 解锁与通关逻辑', () => {
  assert.equal(isUnlocked(0, []), true);
  assert.equal(isUnlocked(1, [false]), false);
  assert.equal(isUnlocked(1, [true]), true);
  assert.equal(isUnlocked(2, [true, false]), false);
  assert.equal(allDone([], 3), false);
  assert.equal(allDone([true], 3), false);
  assert.equal(allDone([true, true, true], 3), true);
  assert.equal(allDone([true, false, true], 3), false);
});

test('实际钱币关的选项金额各不相同，且只有一个正确答案', () => {
  for (const level of courseLevels.filter((item) => item.type === 'money')) {
    const amounts = level.options.map((option) => option.fen);
    assert.equal(new Set(amounts).size, amounts.length);
    assert.equal(amounts.filter((amount) => checkAnswer('money', amount, level)).length, 1);
  }
});
