import assert from 'node:assert/strict';
import test from 'node:test';
import { distanceToPath, evaluateTrace, pathDeviation, pointToSegmentDistance } from '../../scripts/g1-games/model.js';
import { config as strokeWorkshop } from '../../src/g1-stroke-workshop/config.js';

/* 沿参考折线均匀采样出一份“写得笔直”的墨迹 */
function sampleGuide(guide, step = 2) {
  const ink = [];
  for (let i = 1; i < guide.length; i++) {
    const [ax, ay] = guide[i - 1], [bx, by] = guide[i];
    const length = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.round(length / step));
    for (let k = 0; k < steps; k++) ink.push([ax + (bx - ax) * k / steps, ay + (by - ay) * k / steps]);
  }
  ink.push([...guide[guide.length - 1]]);
  return ink;
}

/* 整条墨迹向法线方向平移 offset */
function offsetInk(ink, offset) {
  return ink.map(([x, y]) => [x, y + offset]);
}

const GUIDE = [[25, 55], [50, 55], [80, 55]]; // 横

test('点到线段：垂足在段上取垂直距离，在段外取端点距离', () => {
  assert.equal(pointToSegmentDistance([50, 50], [25, 55], [80, 55]), 5);
  assert.equal(pointToSegmentDistance([10, 55], [25, 55], [80, 55]), 15);
  assert.equal(pointToSegmentDistance([90, 55], [25, 55], [80, 55]), 10);
  assert.equal(pointToSegmentDistance([40, 40], [30, 20], [30, 80]), 10);
});

test('点到线段：零长度线段退化为点距离，非法输入返回 Infinity', () => {
  assert.equal(pointToSegmentDistance([3, 4], [0, 0], [0, 0]), 5);
  assert.equal(pointToSegmentDistance(null, [0, 0], [1, 1]), Infinity);
  assert.equal(pointToSegmentDistance([0, 0], ['x', 0], [1, 1]), Infinity);
});

test('distanceToPath / pathDeviation：取各段最小距离', () => {
  const zigzag = [[0, 0], [10, 0], [10, 10]];
  assert.equal(distanceToPath([5, 5], zigzag), 5);
  assert.equal(distanceToPath([15, 5], zigzag), 5);
  assert.deepEqual(pathDeviation([[5, 1], [15, 5]], zigzag), [1, 5]);
  assert.equal(distanceToPath([0, 0], []), Infinity);
  assert.deepEqual(pathDeviation(null, zigzag), []);
});

test('evaluateTrace：贴线直写 → straight 且通过', () => {
  const result = evaluateTrace(sampleGuide(GUIDE), GUIDE, 12);
  assert.equal(result.passed, true);
  assert.equal(result.verdict, 'straight');
  assert.equal(result.avgDev, 0);
});

test('evaluateTrace：整体轻偏但在容差内 → wobbly 且通过', () => {
  const result = evaluateTrace(offsetInk(sampleGuide(GUIDE), 8), GUIDE, 12);
  assert.equal(result.passed, true);
  assert.equal(result.verdict, 'wobbly');
});

test('evaluateTrace：中段大幅跑偏（平均超容差）→ offtrack 拒绝', () => {
  const ink = sampleGuide(GUIDE).map(([x, y]) => [x, x >= 40 && x <= 70 ? y + 25 : y]);
  const result = evaluateTrace(ink, GUIDE, 12);
  assert.equal(result.passed, false);
  assert.equal(result.verdict, 'offtrack');
});

test('evaluateTrace：没写到起点或终点 → incomplete 拒绝', () => {
  assert.equal(evaluateTrace(sampleGuide(GUIDE).filter(([x]) => x <= 55), GUIDE, 12).verdict, 'incomplete');
  assert.equal(evaluateTrace([[5, 55], ...sampleGuide(GUIDE).slice(1)], GUIDE, 12).verdict, 'incomplete');
});

test('evaluateTrace：空迹、坏容差、坏数据一律拒绝且不抛错', () => {
  for (const [ink, guide, tol] of [[[], GUIDE, 12], [sampleGuide(GUIDE), null, 12], [sampleGuide(GUIDE), GUIDE, 0], [sampleGuide(GUIDE), GUIDE, -3], [sampleGuide(GUIDE), GUIDE, NaN], [[25, 55], GUIDE, 12], [sampleGuide(GUIDE), [25, 55], 12], [['x', 1], GUIDE, 12]]) {
    const result = evaluateTrace(ink, guide, tol);
    assert.equal(result.passed, false);
    assert.equal(result.verdict, 'incomplete');
  }
});

test('笔画工坊全部任务：完美描红必须判定为 straight', () => {
  assert.equal(strokeWorkshop.kind, 'stroke');
  for (const task of strokeWorkshop.tasks) {
    assert.ok(Array.isArray(task.points) && task.points.length >= 2, task.id);
    const result = evaluateTrace(sampleGuide(task.points), task.points, 12);
    assert.equal(result.passed, true, task.id);
    assert.equal(result.verdict, 'straight', task.id);
  }
});

test('笔画工坊全部任务：轻微抖动（偏 6 单位）仍应通过，跑偏 25 单位必须拒绝', () => {
  for (const task of strokeWorkshop.tasks) {
    const gentle = offsetInk(sampleGuide(task.points), 6);
    assert.equal(evaluateTrace(gentle, task.points, 12).passed, true, task.id);
    const wild = offsetInk(sampleGuide(task.points), 25);
    assert.equal(evaluateTrace(wild, task.points, 12).passed, false, task.id);
  }
});
