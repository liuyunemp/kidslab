import assert from 'node:assert/strict';
import test from 'node:test';

import { checkAnswer, award, isUnlocked, allDone } from '../../src/g1-chinese/level-model.js';

const level = { type: 'match', char: '天', answer: 'sky' };

test('match 题型判定：正确选项通过，干扰项不通过', () => {
  assert.equal(checkAnswer('match', 'sky', level), true);
  assert.equal(checkAnswer('match', 'earth', level), false);
  assert.equal(checkAnswer('match', 'tree', level), false);
});

test('match 题非法输入抛错', () => {
  assert.throws(() => checkAnswer('match', null, level), RangeError);
  assert.throws(() => checkAnswer('match', '', level), RangeError);
  assert.throws(() => checkAnswer('weird', 'sky', level), TypeError);
});

test('award 与解锁逻辑（与数学引擎同源）', () => {
  const s = award({ stars: 0, coins: 0, stickers: 0 }, true);
  assert.equal(s.stars, 1);
  assert.equal(s.coins, 5);
  assert.equal(isUnlocked(0, []), true);
  assert.equal(isUnlocked(2, [true, true]), true);
  assert.equal(allDone([true, true, true, true]), true);
});
