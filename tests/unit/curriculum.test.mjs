import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import { expandCurriculum, loadCurriculum } from '../../scripts/curriculum.mjs';
import { courses as activities, journey } from '../g1b-journeys.mjs';
import { initialState, reduce, restore, serialize, openActivity } from '../../src/g1b-character-lab/exploration-model.js';

const root = new URL('../../', import.meta.url);
const metadata = readdirSync(new URL('src/', root), { withFileTypes: true }).filter(dir => dir.isDirectory())
  .map(dir => JSON.parse(readFileSync(new URL(`src/${dir.name}/course.json`, root), 'utf8')));
const raw = JSON.parse(readFileSync(new URL('src/curriculum.json', root), 'utf8'));
const activityMap = Object.fromEntries(activities.map(course => [course.id, course]));
const expanded = expandCurriculum(raw, metadata, activityMap);
const source = readFileSync(new URL('assets/js/app.js', root), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(0, source.indexOf('/* ---------- 平台 UI ---------- */')), context);
const catalog = vm.runInContext('CourseCatalog', context);
const course = (id, entries, extra = {}) => ({ id, grades: ['g1a'], category: 'math', curriculum: entries, path: `courseware/${id}/index.html`, ...extra });
const entry = (unit, page, extra = {}) => ({ bookId: 'math-g1a', grade: 'g1a', unitId: `${unit}`, unitOrder: unit, page, lessonOrder: 1, ...extra });

test('所有已核准年级课件都有教材入口，136 个活动各自对应稳定的活动 ID', async () => {
  assert.deepEqual(Object.keys(expanded).sort(), metadata.filter(c => c.listed !== false && c.grades?.length).map(c => c.id).sort());
  assert.deepEqual(await loadCurriculum(fileURLToPath(root), metadata), expanded);
  for (const c of activities) {
    assert.deepEqual(expanded[c.id].map(e => e.activity).sort(), c.activities.map(a => a.id).sort(), c.id);
    for (const e of expanded[c.id]) {
      assert.deepEqual(e.activityTitle, c.activities.find(a => a.id === e.activity).title);
    }
  }
});

test('教材顺序按单元、页码、知识次序排列，不受创建顺序或置顶打乱', () => {
  const courses = [course('late', [entry(10, 9)]), course('pinned', [entry(2, 8)], { pinned: true }),
    course('first', [entry(2, 2)]), course('tie', [entry(2, 8, { lessonOrder: 2 })])];
  const groups = catalog.curriculumGroups(courses, { grade: 'g1', term: 'a' });
  assert.deepEqual(Array.from(groups, g => g.unitId), ['2', '10']);
  assert.deepEqual(Array.from(groups[0].items, item => item.course.id), ['first', 'pinned', 'tie']);
  assert.deepEqual(Array.from(catalog.curriculumGroups([...courses].reverse(), { grade: 'g1' }), g => Array.from(g.items, i => i.course.id)),
    [['first', 'pinned', 'tie'], ['late']]);
  assert.equal(courses[0].id, 'late', '不能修改输入顺序');
});

test('不同教材同名单元不合并，上下册及跨年级入口不混排，全部年级不分组', () => {
  const c = course('multi', [entry(1, 1), entry(1, 2, { bookId: 'math-g1b', grade: 'g1b' }),
    entry(1, 3, { bookId: 'math-g2b', grade: 'g2b' })], { grades: ['g1a', 'g1b', 'g2b'] });
  const other = course('chinese', [entry(1, 1, { bookId: 'chinese-g1a' })], { category: 'chinese' });
  assert.equal(catalog.curriculumGroups([c, other], { grade: 'g1' }).length, 3);
  assert.equal(catalog.curriculumGroups([c], { grade: 'g1', term: 'b' })[0].bookId, 'math-g1b');
  assert.equal(catalog.curriculumGroups([c], { grade: 'g2', term: 'a' }).length, 0);
  assert.equal(catalog.curriculumGroups([c], { grade: 'all' }).length, 0);
  assert.equal(catalog.curriculumGroups([], { grade: 'g1' }).length, 0);
  assert.equal(catalog.curriculumEntries(course('wrong', [entry(1, 1, { grade: 'g1b' })]), 'g1', 'b').length, 0);
});

test('同一游戏的不同单元入口可独立过滤，链接携带活动 ID 并保留原参数', () => {
  const c = course('game', [entry(1, 1, { activity: 'one' }), entry(2, 8, { activity: 'two' })]);
  const groups = catalog.curriculumGroups([c], { grade: 'g1' }, (_, e) => e.activity === 'two');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].unitId, '2');
  assert.equal(catalog.entryPath(c, groups[0].items[0].entry), 'courseware/game/index.html?activity=two');
  assert.equal(catalog.entryPath({ path: 'courseware/game/?lang=en#tools' }, { activity: 'two' }), 'courseware/game/?lang=en&activity=two#tools');
  assert.equal(catalog.entryPath(c), c.path);
});

test('官方无编号专题保留名称；按教材页码排列在相邻单元之间', () => {
  const all = metadata.map(c => ({ ...c, curriculum: expanded[c.id] }));
  const groups = catalog.curriculumGroups(all.filter(c => c.category === 'math'), { grade: 'g1', term: 'b' });
  assert.deepEqual(Array.from(groups, g => g.unitId), ['1', '2', '3', '4', '5', '6', 'shopping', '7']);
  assert.equal(groups[6].unitKind, 'topic');
  assert.equal(groups[6].unitNumber, undefined);
  assert.equal(groups[6].unitTitle.zh, '欢乐购物街');
  const third = groups.find(g => g.unitId === '3');
  assert.deepEqual([...new Set(Array.from(third.items, i => i.course.id))], ['hundred-metro', 'g1-compare-bridge']);
  const dictionary = expanded['g1b-dictionary-house'];
  assert.ok(dictionary.every(e => e.unitId === '3' && e.page === 34), '音序查字以第三单元核心页码排序，不用前置字母表页码');
});

test('错误教材映射拒绝发布，修正后可恢复且不修改原数据', () => {
  for (const mutate of [
    data => { data.courses['g1-direction-town'][0].book = 'm1b'; },
    data => { data.courses['g1-compare-bridge'][0].unit = 'unknown'; },
    data => { data.courses['g1-compare-bridge'][0].activity = 'missing'; },
    data => { data.courses['g1-compare-bridge'][0].page = -1; },
    data => { data.courses['g1-compare-bridge'][0].page = 90; },
    data => { data.courses['g1-compare-bridge'].push(data.courses['g1-compare-bridge'][0]); },
    data => { data.courses.unknown = data.courses['g1-compare-bridge']; },
    data => { data.books.m1b.grade = 'g2a'; },
    data => { data.books.m1b.url = 'https://book.pep.com.cn/123456789/mobile/index.html'; },
    data => { data.books.m1b.units[0].title = { zh: '只有中文' }; },
  ]) {
    const broken = structuredClone(raw); mutate(broken);
    assert.throws(() => expandCurriculum(broken, metadata, activityMap), /校验失败/);
  }
  assert.deepEqual(expandCurriculum(structuredClone(raw), metadata, activityMap), expanded);
});

test('教材入口选择活动保留已有发现和撤销记录；无效入口不改状态，重载不重复写日志', () => {
  for (const c of activities) {
    let state = initialState(c);
    const first = c.activities[0];
    for (let action of journey(c, first)) {
      if (action.type === 'shift') {
        const p = state.rooms[0].positions[action.index];
        action = { type: 'position', index: action.index, x: p.x + .5, z: p.z - 1 };
      }
      state = reduce(c, state, action).state;
    }
    const original = structuredClone(state);
    const target = c.activities.at(-1).id;
    const selected = openActivity(c, state, target);
    assert.equal(selected.active, 7, c.id);
    assert.deepEqual(selected.done, original.done, c.id);
    assert.deepEqual(selected.rooms, original.rooms, c.id);
    assert.deepEqual(selected.histories, original.histories, c.id);
    assert.deepEqual(state, original, '输入不被修改');
    const restored = restore(c, serialize(selected));
    assert.deepEqual(restored, selected, c.id);
    assert.equal(openActivity(c, restored, target), restored);
    for (const invalid of [null, '', 'missing', 0]) assert.equal(openActivity(c, selected, invalid), selected);
    const free = reduce(c, selected, { type: 'free', value: true }).state;
    const opened = openActivity(c, free, target);
    assert.equal(opened.free, false);
    assert.deepEqual(opened.done, selected.done);
  }
});
