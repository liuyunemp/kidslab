import assert from 'node:assert/strict';
import test from 'node:test';
import { courses } from '../../scripts/g1-games/data.mjs';
import { ROUND_COUNT, currentTask, initialState, replay, restoreState, submit } from '../../scripts/g1-games/model.js';

test('每个独立游戏有至少十道稳定且不重复的任务，单轮只取八道', () => {
  assert.equal(courses.length, 13);
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
