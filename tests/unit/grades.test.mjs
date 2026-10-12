import assert from 'node:assert/strict';
import test from 'node:test';

import { GRADE_RE, isValidGrade } from '../../scripts/grades.mjs';

test('接受整年级 g1–g12', () => {
  for (let n = 1; n <= 12; n += 1) assert.ok(GRADE_RE.test(`g${n}`), `g${n} 应有效`);
});

test('接受上册(a)/下册(b)后缀', () => {
  assert.ok(isValidGrade('g1a'));
  assert.ok(isValidGrade('g6b'));
  assert.ok(isValidGrade('g12a'));
});

test('拒绝越界与非法册后缀', () => {
  for (const bad of ['g0', 'g13', 'g1c', 'g1ab', 'ga', 'g', '1', 'G1', 'g1A', '']) {
    assert.equal(isValidGrade(bad), false, `${bad} 应无效`);
  }
});

test('isValidGrade 对非字符串返回 false', () => {
  assert.equal(isValidGrade(1), false);
  assert.equal(isValidGrade(null), false);
  assert.equal(isValidGrade(undefined), false);
});
