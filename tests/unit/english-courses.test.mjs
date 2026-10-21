import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { courses, UI } from '../../scripts/english/courses.mjs';
import {
  canPresent, currentWord, initialState, progress, reduce, restore, sentenceFor, serialize,
} from '../../scripts/english/english-model.js';
import { speechPlan } from '../../scripts/speech/model.js';
import { validateFactsDocument } from '../../scripts/facts.mjs';

const byKind = (kind) => courses.find((course) => course.kind === kind);
const run = (course, state, action) => reduce(course, state, action);

function act(course, state, actions) {
  let next = state;
  for (const action of actions) next = run(course, next, action).state;
  return next;
}

test('authoring catalog ships six primary English games with bilingual metadata', () => {
  assert.equal(courses.length, 6);
  assert.deepEqual(courses.map((course) => course.kind).sort(), ['animal', 'body', 'color', 'fruit', 'number', 'school']);
  for (const course of courses) {
    assert.equal(course.category, 'english');
    assert.deepEqual(course.levels, ['primary']);
    assert.deepEqual(course.grades, ['g1', 'g2', 'g3']);
    assert.ok(course.title.zh && course.title.en);
    assert.ok(course.invitation.zh && course.invitation.en);
    assert.ok(course.items.length >= 8, `${course.id} needs at least eight words`);
    const ids = new Set(course.items.map((item) => item.id));
    assert.equal(ids.size, course.items.length, `${course.id} has duplicate words`);
    for (const item of course.items) {
      assert.ok(item.en && item.zh && item.sentence, `${course.id}/${item.id} is incomplete`);
      assert.ok(
        item.sentence.toLowerCase().includes(item.en.toLowerCase()),
        `${course.id}/${item.id} sentence must contain the word`,
      );
    }
  }
});

test('colour studio paints three toys, rejects repeats and shows only when ready', () => {
  const course = byKind('color');
  let state = initialState(course);
  assert.deepEqual(state.paints, [null, null, null]);
  assert.equal(progress(course, state), 0);
  assert.equal(canPresent(course, state), false);

  const early = run(course, state, { type: 'present' });
  assert.equal(early.changed, false);
  assert.equal(early.error, 'hint');

  state = act(course, state, [{ type: 'paint', index: 0, id: 'red' }]);
  assert.equal(state.paints[0], 'red');
  // The brush hops to the next blank toy, so one more tap keeps making progress.
  assert.equal(state.target, 1);
  const repeat = run(course, state, { type: 'paint', index: 0, id: 'red' });
  assert.equal(repeat.changed, false);
  assert.equal(repeat.error, 'same');
  assert.equal(run(course, state, { type: 'paint', index: 3, id: 'red' }).error, 'invalid');
  assert.equal(run(course, state, { type: 'paint', index: 0, id: 'nope' }).error, 'invalid');
  assert.equal(run(course, state, { type: 'target', index: 3 }).error, 'invalid');

  state = act(course, state, [{ type: 'target', index: 1 }, { type: 'paint', index: 1, id: 'blue' }]);
  state = act(course, state, [{ type: 'target', index: 2 }, { type: 'paint', index: 2, id: 'green' }]);
  assert.equal(progress(course, state), 3);
  assert.equal(canPresent(course, state), true);

  const shown = run(course, state, { type: 'present' });
  assert.equal(shown.changed, true);
  assert.equal(shown.completedNow, true);
  assert.equal(shown.state.completed, true);
  assert.equal(shown.state.presented, shown.state.revision);

  const again = run(course, shown.state, { type: 'present' });
  assert.equal(again.changed, false);
  assert.equal(again.error, 'same');
  assert.equal(again.completedNow ?? false, false);
});

test('fruit basket holds three picks, refuses a fourth, and recovers through remove/undo', () => {
  const course = byKind('fruit');
  let state = initialState(course);
  assert.equal(run(course, state, { type: 'remove' }).error, 'empty');
  assert.equal(run(course, state, { type: 'place', id: 'rocket' }).error, 'invalid');

  state = act(course, state, [
    { type: 'place', id: 'apple' },
    { type: 'place', id: 'banana' },
    { type: 'place', id: 'grape' },
  ]);
  assert.deepEqual(state.placed, ['apple', 'banana', 'grape']);
  assert.equal(progress(course, state), 3);
  const full = run(course, state, { type: 'place', id: 'pear' });
  assert.equal(full.error, 'full');
  assert.deepEqual(full.state.placed, state.placed);

  const removed = run(course, state, { type: 'remove' });
  assert.deepEqual(removed.state.placed, ['apple', 'banana']);
  assert.equal(removed.state.revision, state.revision + 1);

  const undone = run(course, removed.state, { type: 'undo' });
  assert.deepEqual(undone.state.placed, ['apple', 'banana', 'grape']);
  const drained = act(course, removed.state, [{ type: 'undo' }, { type: 'undo' }, { type: 'undo' }, { type: 'undo' }]);
  assert.deepEqual(drained.placed, []);
  assert.equal(run(course, drained, { type: 'undo' }).error, 'nothing');
});

test('animal park and school bag share the same slot rules without losing selection', () => {
  for (const kind of ['animal', 'school']) {
    const course = byKind(kind);
    let state = initialState(course);
    if (kind === 'school') {
      assert.notEqual(state.selected, 'bag', 'the bag is a container, not a pick');
      assert.equal(run(course, state, { type: 'place', id: 'bag' }).error, 'bag');
    }
    const picks = course.items.filter((item) => item.id !== 'bag').slice(0, 3);
    state = act(course, state, picks.map((item) => ({ type: 'place', id: item.id })));
    assert.equal(state.placed.length, 3);
    // Selection moves on to whatever is still on the shelf, so repeated taps never
    // pick the same already-placed item over and over.
    const nextUp = course.items.find((item) => !state.placed.includes(item.id) && item.id !== 'bag');
    assert.equal(state.selected, nextUp.id);
    assert.equal(progress(course, state), 3);
    assert.equal(run(course, state, { type: 'present' }).completedNow, true);
  }
});

test('number train counts 0-10, swaps singular/plural and never overfills', () => {
  const course = byKind('number');
  let state = initialState(course);
  assert.equal(state.count, 0);
  assert.equal(run(course, state, { type: 'remove' }).error, 'empty');
  assert.equal(canPresent(course, state), false);

  const first = run(course, state, { type: 'add' });
  assert.equal(first.state.count, 1);
  assert.equal(first.state.selected, 'one');
  assert.equal(canPresent(course, first.state), true);

  state = act(course, state, Array.from({ length: 10 }, () => ({ type: 'add' })));
  assert.equal(state.count, 10);
  assert.equal(state.selected, 'ten');
  assert.equal(run(course, state, { type: 'add' }).error, 'full');

  const back = run(course, state, { type: 'remove' });
  assert.equal(back.state.count, 9);
  assert.equal(back.state.selected, 'nine');

  assert.equal(course.items[0].sentence, 'One block.');
  assert.equal(course.items[1].sentence, 'Two blocks.');
  assert.equal(new Set(course.items.map((item) => item.sentence)).size, 10);
});

test('body show records unique parts and needs three before the action show', () => {
  const course = byKind('body');
  let state = initialState(course);
  assert.equal(run(course, state, { type: 'body', id: 'tail' }).error, 'invalid');
  state = act(course, state, [{ type: 'body', id: 'nose' }, { type: 'body', id: 'nose' }]);
  assert.deepEqual(state.visited, ['nose']);
  assert.equal(progress(course, state), 1);
  assert.equal(run(course, state, { type: 'present' }).error, 'hint');
  state = act(course, state, [{ type: 'body', id: 'hand' }, { type: 'body', id: 'foot' }]);
  assert.deepEqual(state.visited, ['nose', 'hand', 'foot']);
  assert.equal(run(course, state, { type: 'present' }).completedNow, true);
});

test('unknown activity and malformed actions are rejected without touching state', () => {
  const course = byKind('fruit');
  const state = initialState(course);
  assert.throws(() => initialState({ ...course, kind: 'quiz' }), TypeError);
  assert.throws(() => initialState({ ...course, items: [] }), TypeError);
  for (const action of [null, 42, 'place', {}, { type: 'dance' }]) {
    const result = run(course, state, action);
    assert.equal(result.changed, false);
    assert.equal(result.error, 'invalid');
    assert.equal(result.state, state);
  }
  assert.equal(run(course, state, { type: 'paint', index: 0, id: 'apple' }).error, 'invalid');
  assert.equal(run(course, state, { type: 'add' }).error, 'invalid');
  assert.equal(run(course, state, { type: 'body', id: 'apple' }).error, 'invalid');
});

test('saved games restore exactly, tolerate damage, and never execute stored strings', () => {
  for (const course of courses) {
    let state = initialState(course);
    if (course.kind === 'color') state = act(course, state, [{ type: 'paint', index: 0, id: course.items[1].id }]);
    else if (course.kind === 'number') state = act(course, state, [{ type: 'add' }, { type: 'add' }]);
    else if (course.kind === 'body') state = act(course, state, [{ type: 'body', id: course.items[2].id }]);
    else state = act(course, state, [{ type: 'place', id: course.items[1].id }]);
    const saved = serialize(state);
    const restored = restore(course, JSON.stringify(saved));
    assert.deepEqual(restored, saved, `${course.id} must round-trip`);
    assert.deepEqual(restore(course, 'not json'), initialState(course));
    assert.deepEqual(restore(course, '{}'), initialState(course));
    assert.deepEqual(restore(course, { ...saved, courseId: 'another-course' }), initialState(course));
    assert.deepEqual(restore(course, { ...saved, painted: '<img onerror=alert(1)>' }), saved);
    const badHistory = { ...saved, history: [{ ...saved, revision: -1 }] };
    assert.deepEqual(restore(course, badHistory), initialState(course));
  }
});

test('reset clears the round but keeps the finished badge', () => {
  const course = byKind('fruit');
  let state = act(course, initialState(course), [
    { type: 'place', id: 'apple' }, { type: 'place', id: 'pear' }, { type: 'place', id: 'grape' }, { type: 'present' },
  ]);
  assert.equal(state.completed, true);
  const reset = run(course, state, { type: 'reset' });
  assert.equal(reset.changed, true);
  assert.deepEqual(reset.state.placed, []);
  assert.equal(reset.state.completed, true);
  assert.equal(reset.state.revision, 0);
  assert.equal(progress(course, reset.state), 0);
});

test('current word and sentence follow the latest pick', () => {
  const course = byKind('school');
  const state = act(course, initialState(course), [{ type: 'select', id: 'ruler' }]);
  assert.equal(currentWord(course, state).id, 'ruler');
  assert.equal(sentenceFor(course, state), 'I have a ruler.');
  assert.equal(sentenceFor(course, { ...state, selected: 'missing' }), course.items[0].sentence);
});

test('every English course ships a runnable model copy, facts and metadata', async () => {
  const shared = await readFile(new URL('../../scripts/english/english-model.js', import.meta.url), 'utf8');
  for (const course of courses) {
    const dir = new URL(`../../src/${course.id}/`, import.meta.url);
    const model = await readFile(new URL('english-model.js', dir), 'utf8');
    assert.equal(model, shared, `${course.id}/english-model.js drifted; run npm run english:sync`);
    for (const file of ['index.html', 'style.css', 'engine.js', 'scene.js', 'objects.js', 'audio.js', 'content.js', 'main.js']) {
      assert.ok((await readFile(new URL(file, dir), 'utf8')).length > 100, `${course.id}/${file} is missing`);
    }
    assert.ok((await readFile(new URL('vendor/three.module.min.js', dir))).length > 500000, `${course.id} needs a local three.js copy`);
    assert.ok((await readFile(new URL('audio/lab-glow.ogg', dir))).length > 100000, `${course.id} needs local BGM`);

    const meta = JSON.parse(await readFile(new URL('course.json', dir), 'utf8'));
    assert.equal(meta.id, course.id);
    assert.equal(meta.category, 'english');
    assert.deepEqual(meta.grades, ['g1', 'g2', 'g3']);
    assert.equal(meta.badge, 'new');
    assert.ok(meta.tags.includes('英语启蒙'));

    const facts = await readFile(new URL('facts.md', dir), 'utf8');
    assert.deepEqual(validateFactsDocument(course.id, facts.replaceAll('\r\n', '\n')), [], `${course.id}/facts.md`);
  }
});

test('every spoken English word, sentence and prompt has a local recording', async () => {
  const retry = { zh: '暂时没能播放，点一下再试。', en: 'Could not play. Tap to try again.' };
  for (const course of courses) {
    const { manifest } = await import(`../../src/${course.id}/speech-manifest.js`);
    const entries = manifest.entries;
    for (const item of course.items) {
      assert.ok(entries.en[item.en], `${course.id}: no clip for "${item.en}"`);
      assert.ok(entries.en[item.sentence], `${course.id}: no clip for "${item.sentence}"`);
      assert.equal(speechPlan(item.sentence, 'en', manifest).text, item.sentence);
    }
    for (const lang of ['zh', 'en']) {
      for (const text of [course.invitation[lang], course.hint[lang], retry[lang]]) {
        assert.ok(entries[lang][text], `${course.id}: no ${lang} clip for "${text}"`);
        assert.equal(speechPlan(text, lang, manifest).text, text);
      }
      for (const key of ['done', 'full', 'empty', 'invalid', 'nothing', 'same', 'bag']) {
        assert.ok(entries[lang][UI[lang][key]], `${course.id}: no ${lang} clip for UI.${key}`);
      }
    }
  }
});
