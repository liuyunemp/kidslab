import assert from 'node:assert/strict';
import test from 'node:test';
import { courses } from '../../scripts/g1-games/data.mjs';
import { ROUND_COUNT, currentTask, initialState, replay, restoreState, submit } from '../../scripts/g1-games/model.js';

test('每个独立游戏有至少十道稳定且不重复的任务，单轮只取八道', () => {
  assert.equal(courses.length, 11);
  for (const id of ['g1-compare-bridge','g1-addition-depot','g1-subtraction-depot','g1-mixed-relay','g1-flat-shapes']) assert.equal(courses.some(course => course.id === id), false, `${id} must not be overwritten by the old generator`);
  for (const course of courses) {
    assert.ok(course.tasks.length >= 10, course.id);
    assert.equal(new Set(course.tasks.map((task) => task.id)).size, course.tasks.length, course.id);
    const state = initialState(course);
    assert.equal(state.active.length, ROUND_COUNT, course.id);
    assert.equal(new Set(state.active).size, ROUND_COUNT, course.id);
  }
});

for (const course of courses) {
  test(`${course.id}: 错误、连点、重载和重玩保持八题边界`, () => {
    let state = initialState(course);
    const first = currentTask(course, state);
    assert.equal(submit(course, state, first.id, '__wrong__').accepted, false);
    for (let i = 0; i < ROUND_COUNT; i++) {
      const task = currentTask(course, state);
      assert.equal(task.id, state.active[i]);
      const result = submit(course, state, task.id, task.answer);
      assert.equal(result.accepted, true);
      state = result.state;
      assert.equal(submit(course, state, task.id, task.answer).accepted, false);
      state = restoreState(course, JSON.parse(JSON.stringify(state)));
      assert.equal(state.done.length, i + 1);
      if (i < ROUND_COUNT - 1) assert.ok(currentTask(course, state));
    }
    assert.equal(currentTask(course, state), null);
    assert.equal(submit(course, state, first.id, first.answer).accepted, false);
    const next = replay(course, state);
    assert.equal(next.done.length, 0);
    assert.notDeepEqual(next.active, state.active);
    assert.equal(currentTask(course, next).id, next.active[0]);
  });
}

test('顺序点击题型的卡片标识在题内唯一，答案串与卡片一致', () => {
  for (const course of courses.filter((entry) => ['poem', 'stroke-order'].includes(entry.kind))) {
    for (const task of course.tasks) {
      const sequential = course.kind === 'poem' ? task.form === 'order' : true;
      if (!sequential) continue;
      const keys = course.kind === 'poem' ? task.lines : task.strokes.map((stroke) => stroke.key);
      assert.equal(new Set(keys).size, keys.length, `${course.id}/${task.id} 卡片标识必须唯一`);
      assert.equal(keys.join('|'), task.answer, `${course.id}/${task.id} 答案串必须与卡片顺序一致`);
    }
  }
});

test('选择题型的候选里必须包含答案且供错误路径使用', () => {
  for (const course of courses) {
    for (const task of course.tasks) {
      if (!Array.isArray(task.choices)) continue;
      assert.ok(task.choices.includes(task.answer), `${course.id}/${task.id} choices 缺少答案`);
      assert.ok(task.choices.some((choice) => choice !== task.answer), `${course.id}/${task.id} choices 缺少错误项`);
    }
  }
});

test('分类题的筐集合包含答案且标签齐备', () => {
  const course = courses.find((entry) => entry.kind === 'sort');
  assert.ok(course, '缺少分类题型课件');
  for (const task of course.tasks) {
    const ids = task.baskets.map(([id]) => id);
    assert.ok(ids.includes(task.answer), `${task.id} 筐集合缺少答案`);
    for (const basket of task.baskets) {
      assert.equal(basket.length, 4, `${task.id} 筐需要 id/中文名/英文名/图标 四项`);
    }
  }
});
