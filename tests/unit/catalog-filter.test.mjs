import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { isValidGrade } from '../../scripts/grades.mjs';
import { courses as generatedCourses } from '../../scripts/g1-games/data.mjs';

// 直接执行主站使用的无 DOM 规则，不复制一套测试专用筛选逻辑。
const source = readFileSync(new URL('../../assets/js/app.js', import.meta.url), 'utf8');
const boundary = source.indexOf('/* ---------- 平台 UI ---------- */');
assert.ok(boundary > 0, '目录规则应可脱离 DOM 执行');
const sandbox = vm.createContext({});
vm.runInContext(source.slice(0, boundary), sandbox);
const catalog = vm.runInContext('CourseCatalog', sandbox);
const make = (overrides = {}) => ({ id: 'lesson', category: 'math', levels: ['primary'], grades: ['g1a'], ...overrides });

test('年级只读取规范 grades；空值、旧缓存和标签不能补推归属', () => {
  for (const grades of [undefined, [], null, 'g1a', ['一年级', 'Grade 1', 'G1', 'g13', 1]]) {
    const course = make({ grades, tags: ['一年级', 'g1'], _gradeSet: new Set(['g1']) });
    assert.equal(catalog.matchesGrade(course, 'g1'), false);
    assert.equal(catalog.matchesGrade(course, 'all'), true);
  }
  assert.deepEqual([...catalog.grades(make({ grades: ['g1a', 'g1a', 'g2b'] }))], ['g1a', 'g2b']);
});

test('上下册隔离，整年级与明确双册按合同匹配', () => {
  for (let n = 1; n <= 12; n++) {
    const grade = `g${n}`;
    const upper = make({ grades: [`${grade}a`] });
    assert.equal(catalog.matchesGrade(upper, grade), true);
    assert.equal(catalog.matchesGrade(upper, grade, 'a'), true);
    assert.equal(catalog.matchesGrade(upper, grade, 'b'), false);
    assert.equal(catalog.matchesGrade(upper, `g${n === 12 ? 1 : n + 1}`), false);
    for (const term of ['a', 'b', 'all']) {
      assert.equal(catalog.matchesGrade(make({ grades: [grade] }), grade, term), true);
      assert.equal(catalog.matchesGrade(make({ grades: [`${grade}a`, `${grade}b`] }), grade, term), true);
    }
  }
});

test('多个明确年级逐项匹配，不把另一年级的册次借给当前年级', () => {
  const course = make({ grades: ['g1a', 'g2b'] });
  for (const [grade, term, expected] of [
    ['g1', 'all', true], ['g1', 'a', true], ['g1', 'b', false],
    ['g2', 'all', true], ['g2', 'a', false], ['g2', 'b', true], ['g3', 'all', false],
  ]) assert.equal(catalog.matchesGrade(course, grade, term), expected, `${grade}/${term}`);
});

test('学段、年级、册次、科目取交集；置顶不能越过筛选', () => {
  const welcome = make({ id: 'welcome', category: 'featured', grades: [], pinned: true });
  assert.equal(catalog.matchesScope(welcome, { level: 'primary' }), true);
  assert.equal(catalog.matchesScope(welcome, { level: 'primary', grade: 'g1' }), false);
  assert.equal(catalog.matchesScope(welcome, { level: 'primary', cat: 'math' }), false);
  for (const filters of [
    { level: 'junior' }, { level: 'primary', grade: 'g2' },
    { level: 'primary', grade: 'g1', term: 'b' }, { level: 'primary', cat: 'chinese' },
  ]) assert.equal(catalog.matchesScope(make({ pinned: true }), filters), false);
  assert.equal(catalog.matchesScope(make(), { level: 'primary', grade: 'g1', term: 'a', cat: 'math' }), true);
  assert.equal(catalog.matchesScope(make({ listed: false }), { level: 'primary' }), false);
});

test('最近探索与最新创建也受年级约束，完成进度不改变归属', () => {
  const course = make({ pinned: true, badge: 'new' });
  const progress = () => ({ status: 'completed', updatedAt: 1 });
  for (const cat of ['recent', 'newest']) {
    assert.equal(catalog.matchesScope(course, { level: 'primary', grade: 'g1', cat }, progress), true);
    assert.equal(catalog.matchesScope(course, { level: 'primary', grade: 'g2', cat }, progress), false);
    assert.equal(catalog.matchesScope({ ...course, grades: [] }, { level: 'primary', grade: 'g1', cat }, progress), false);
  }
  assert.equal(catalog.matchesCategory(course, 'recent'), false);
  assert.equal(catalog.matchesCategory(make(), 'newest'), false);
});

test('非法条件拒绝匹配；改正条件后可恢复且不修改输入', () => {
  const course = Object.freeze(make({ grades: Object.freeze(['g1a']) }));
  for (const [grade, term] of [['g0', 'all'], ['g13', 'a'], ['g1a', 'all'], ['g1', 'c'], ['all', 'a']]) {
    assert.equal(catalog.matchesGrade(course, grade, term), false);
  }
  assert.equal(catalog.matchesGrade(course, 'g1', 'a'), true);
  assert.deepEqual(course.grades, ['g1a']);
});

test('源码年级与学段一致，且不存在整年级加单册的冗余标记', () => {
  const root = new URL('../../src/', import.meta.url);
  for (const dir of readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const course = JSON.parse(readFileSync(new URL(`${dir.name}/course.json`, root), 'utf8'));
    for (const token of course.grades || []) {
      assert.ok(isValidGrade(token), `${course.id}: ${token}`);
      const n = Number(token.match(/\d+/)[0]);
      assert.ok(course.levels.includes(n <= 6 ? 'primary' : n <= 9 ? 'junior' : 'senior'), course.id);
      if (/[ab]$/.test(token)) assert.ok(!course.grades.includes(token.slice(0, -1)), course.id);
    }
  }
});

const sourceRoot = new URL('../../src/', import.meta.url);
const readMeta = id => JSON.parse(readFileSync(new URL(`${id}/course.json`, sourceRoot), 'utf8'));

test('重点核查结论锁定：一年级下册、二年级迁移、跨年级综合与科目归属', () => {
  const expected = {
    'g1-compare-bridge': ['math', ['g1a', 'g1b']],
    'g1-direction-town': ['science', ['g1b']],
    'g1-sort-laundry': ['math', ['g2a']],
    'clock-town': ['math', ['g2b']],
    'number-fireflies': ['math', ['g1a', 'g1b']],
    'bet-party': ['math', ['g6b']],
    /* 2026-10-16 解耦修订：年级回归适龄语义，以下课件恢复年龄标注；教材映射仍待逐课核准。 */
    'data-studio': ['math', ['g3', 'g4', 'g5', 'g6']],
    'function-grapher': ['math', ['g8', 'g9', 'g10', 'g11']],
    'pattern-caterpillar': ['math', ['g1b']],
    'tangram-theater': ['math', ['g1b']],
    'welcome': ['featured', []],
    'ohms-law-lab': ['physics', ['g9', 'g11']],
  };
  for (const [id, [category, grades]] of Object.entries(expected)) {
    const course = readMeta(id);
    assert.equal(course.category, category, id);
    assert.deepEqual(course.grades, grades, id);
  }
});

test('核查表逐课覆盖可见源码，配置与生成器不会回写旧分类', async () => {
  const audit = readFileSync(new URL('../../docs/courseware-plan/classification-audit.md', import.meta.url), 'utf8');
  const rows = [...audit.matchAll(/^\| [^\n]*?（([a-z0-9-]+)） \|/gm)].map(match => match[1]);
  const visible = [];
  for (const dir of readdirSync(sourceRoot, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const meta = readMeta(dir.name);
    if (meta.listed !== false) visible.push(meta.id);
    for (const file of ['config.js', 'content.js']) {
      const url = new URL(`${dir.name}/${file}`, sourceRoot);
      if (!existsSync(url)) continue;
      // 配置文件仅声明数据；不导入入口或场景代码。
      const module = await import(url.href);
      const config = module.config || module.course;
      if (!config || config.id !== meta.id) continue;
      if (config.category !== undefined) assert.equal(config.category, meta.category, `${meta.id}/${file}`);
      if (config.grades !== undefined) assert.deepEqual(config.grades, meta.grades, `${meta.id}/${file}`);
    }
  }
  assert.equal(new Set(rows).size, rows.length, '核查表不能重复列课');
  assert.deepEqual(rows.sort(), visible.sort(), '可见课件必须逐课记录依据');
  for (const config of generatedCourses) {
    const meta = readMeta(config.id);
    assert.equal(config.category, meta.category, config.id);
    assert.deepEqual(config.grades, meta.grades, config.id);
  }
});
