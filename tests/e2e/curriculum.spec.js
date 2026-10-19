import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { loadCurriculum } from '../../scripts/curriculum.mjs';

test.use({ serviceWorkers: 'block' });
const makeEntry = (unit, page, extra = {}) => ({
  bookId: 'math-g1a', bookTitle: { zh: '数学 一年级上册', en: 'Math · Grade 1 · Fall' }, grade: 'g1a',
  unitId: String(unit), unitNumber: unit, unitKind: 'unit', unitOrder: unit, page, lessonOrder: 1,
  unitTitle: { zh: unit === 2 ? '认识数' : '综合实践', en: unit === 2 ? 'Numbers' : 'Projects' },
  topic: { zh: '数的认识', en: 'Number sense' }, ...extra,
});
const makeCourse = (id, curriculum, extra = {}) => ({
  id, title: { zh: id, en: id }, description: { zh: '动手试一试', en: 'Try it' }, category: 'math',
  levels: ['primary'], grades: ['g1a'], tags: [], icon: '🔎', path: `courseware/${id}/index.html`, curriculum, ...extra,
});
const courses = [
  makeCourse('late', [makeEntry(2, 8)], { pinned: true }),
  makeCourse('early', [makeEntry(2, 2), makeEntry(10, 90)]),
  makeCourse('activity', [makeEntry(2, 5, { activity: 'read-five', activityTitle: { zh: '读一读五', en: 'Read five' }, topic: { zh: '认读五', en: 'Reading five' } })]),
  makeCourse('spring', [makeEntry(1, 1, { grade: 'g1b', bookId: 'math-g1b' })], { grades: ['g1b'] }),
  makeCourse('chinese', [makeEntry(2, 1, { bookId: 'chinese-g1a', bookTitle: { zh: '语文 一年级上册', en: 'Chinese · Grade 1 · Fall' } })], { category: 'chinese' }),
];

test.describe('教材单元分组', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/courseware/index.json', route => route.fulfill({ json: { courses } }));
  });

  test('数字单元顺序、单元内知识顺序、去重课件计数与活动入口', async ({ page }) => {
    await page.goto('/?lang=zh&grade=g1&term=a&cat=math');
    await expect(page.locator('.curriculum-unit__title')).toHaveText(['第二单元 · 认识数', '第十单元 · 综合实践']);
    const first = page.locator('.curriculum-unit').first();
    await expect(first.locator('.card__title')).toHaveText(['early', '读一读五', 'late']);
    await expect(first.locator('[data-activity="read-five"]')).toHaveAttribute('href', 'courseware/activity/index.html?activity=read-five');
    await expect(page.locator('#countText')).toHaveText('共 3 个课件 · 4 个探索入口');
    await expect(page.locator('[data-cat="math"] .cat__count')).toHaveText('3');
    await expect(page.locator('[data-grade="g1"] .grade__count')).toHaveText('4');
    await expect(page.locator('[data-term="a"] .grade__count')).toHaveText('3');
    await expect(page.locator('[data-course-id="spring"]')).toHaveCount(0);
    await expect(page.locator('[data-course-id="chinese"]')).toHaveCount(0);
    await page.reload();
    await expect(first.locator('.card__title')).toHaveText(['early', '读一读五', 'late']);
  });

  test('搜索单元及活动只保留对应入口，语言切换保持教材顺序', async ({ page }) => {
    await page.goto('/?lang=zh&grade=g1&term=a&cat=math');
    await page.locator('#searchInput').fill('第十单元');
    await expect(page.locator('.curriculum-unit__title')).toHaveText(['第十单元 · 综合实践']);
    await expect(page.locator('#grid .card')).toHaveCount(1);
    await expect(page.locator('[data-cat="math"] .cat__count')).toHaveText('1');
    await page.locator('#searchInput').fill('认读五');
    await expect(page.locator('#grid .card__title')).toHaveText(['读一读五']);
    await page.locator('#langBtn').click();
    await expect(page.locator('.curriculum-unit__title')).toHaveText(['Unit 2 · Numbers']);
    await expect(page.locator('#grid .card__title')).toHaveText(['Read five']);
    await page.locator('#searchInput').fill('no-such-activity');
    await expect(page.locator('#emptyBox')).toBeVisible();
    await expect(page.locator('.curriculum-unit')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('#emptyBox')).toBeVisible();
    await expect(page.locator('[data-grade="g1"]')).toHaveAttribute('aria-checked', 'true');
  });

  test('全部年级保持一课一卡，全部科目下不同教材的同号单元独立显示', async ({ page }) => {
    await page.goto('/?lang=zh&grade=all');
    await expect(page.locator('#grid .card')).toHaveCount(5);
    await expect(page.locator('.curriculum-unit')).toHaveCount(0);
    await page.goto('/?lang=zh&grade=g1&term=a');
    await expect(page.locator('.curriculum-unit')).toHaveCount(3);
    await expect(page.locator('[data-book="math-g1a"][data-unit="2"]')).toHaveCount(1);
    await expect(page.locator('[data-book="chinese-g1a"][data-unit="2"]')).toHaveCount(1);
    const headings = page.locator('.curriculum-unit__title');
    for (const heading of await headings.all()) {
      const style = await heading.evaluate(element => ({ size: parseFloat(getComputedStyle(element).fontSize), right: element.getBoundingClientRect().right }));
      expect(style.size).toBeGreaterThanOrEqual(16);
      expect(style.right).toBeLessThanOrEqual(page.viewportSize().width);
    }
  });
});

test('教材活动入口直达目标，已有进度保留，非法活动回退到可用存档', async ({ page }) => {
  await page.goto('/?lang=zh&grade=g1&term=b&cat=chinese&q=手的动作');
  const card = page.locator('[data-course-id="g1b-character-lab"][data-activity="character-4"]');
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator('#activitySelect')).toHaveValue('3');
  await expect(page.locator('#progress')).toHaveText('0/8');
  await page.locator('[data-action="assemble"][data-index="0"]').click();
  await page.locator('[data-action="dismantle"]').click();
  await page.locator('[data-action="assemble"][data-index="1"]').click();
  await expect(page.locator('#progress')).toHaveText('1/8');
  await page.goto('/courseware/g1b-character-lab/?activity=character-6');
  await expect(page.locator('#activitySelect')).toHaveValue('5');
  await expect(page.locator('#progress')).toHaveText('1/8');
  await page.reload();
  await expect(page.locator('#activitySelect')).toHaveValue('5');
  await page.goto('/courseware/g1b-character-lab/?activity=missing');
  await expect(page.locator('#activitySelect')).toHaveValue('5');
  await page.locator('#activitySelect').selectOption('2');
  await page.reload();
  await expect(page.locator('#activitySelect')).toHaveValue('2');
  await expect(page).toHaveURL(/activity=character-3/);
  await page.goto('/courseware/g1b-character-lab/');
  await expect(page.locator('#activitySelect')).toHaveValue('2');
  await expect(page.locator('#progress')).toHaveText('1/8');
});

test('同课件多关聚合成一张卡：关卡按钮直达、显示算式与玩过✓、语言切换', async ({ page }) => {
  const entry = (id, detail) => ({
    bookId: 'math-g1a', bookTitle: { zh: '数学 一年级上册', en: 'Math · Grade 1 · Fall' }, grade: 'g1a',
    unitId: '2', unitNumber: 2, unitKind: 'unit', unitOrder: 2, page: 2, lessonOrder: 1,
    topic: { zh: '认读五', en: 'Reading five' },
    activity: id, activityTitle: { zh: `读一读 ${id}`, en: `Read ${id}` }, invite: { zh: '试一试', en: 'Try it' },
    ...(detail ? { detail } : {}),
  });
  const courses = [makeCourse('grouped', [entry('read-1', '2 + 3'), entry('read-2', '1 + 4'), entry('read-3')])];
  await page.addInitScript(() => {
    // 模拟课件存档（新格式含 done）与课件级进度。
    localStorage.setItem('kidslab.exploration-v2.grouped', JSON.stringify({ version: 1, courseId: 'grouped', done: ['read-2'] }));
    localStorage.setItem('kidslab.progress.grouped', JSON.stringify({ status: 'played', updatedAt: 1 }));
  });
  await page.route('**/courseware/index.json', route => route.fulfill({ json: { courses } }));
  await page.goto('/?lang=zh&grade=g1&term=a&cat=math');
  const card = page.locator('.card--group[data-course-id="grouped"]');
  await expect(card.locator('.card__title')).toHaveText('grouped');
  // 关卡默认收进 details，先展开再断言关卡按钮。
  await expect(card.locator('.card__stages')).toBeHidden();
  await card.locator('.card__stages-summary').click();
  await expect(card.locator('.card__stages')).toBeVisible();
  await expect(card.locator('.card__group-meta')).toHaveText('3 关 · 已玩 1 关');
  const stages = card.locator('.stage');
  await expect(stages).toHaveCount(3);
  await expect(stages.nth(0).locator('.stage__label')).toHaveText('2 + 3');
  await expect(stages.nth(1)).toHaveAttribute('data-done', '');
  await expect(stages.nth(2).locator('.stage__label')).toHaveText('读一读 read-3');
  await expect(stages.nth(1)).toHaveAttribute('href', 'courseware/grouped/index.html?activity=read-2');
  await expect(card.locator('.card__progress--played')).toHaveText('玩过');
  await expect(page.locator('#countText')).toHaveText('共 1 个课件 · 3 个探索入口');
  await page.locator('#langBtn').click();
  await expect(card.locator('.card__group-meta')).toHaveText('3 levels · 1 played');
  // 语言切换会重建网格，details 回到收起态；重新展开后再断言关卡文案。
  await card.locator('.card__stages-summary').click();
  await expect(stages.nth(2).locator('.stage__label')).toHaveText('Read read-3');
});

test('聚合卡默认只显示课件介绍，关卡收进可展开的 details', async ({ page }) => {
  const entry = (id, detail) => ({
    bookId: 'math-g1a', bookTitle: { zh: '数学 一年级上册', en: 'Math · Grade 1 · Fall' }, grade: 'g1a',
    unitId: '2', unitNumber: 2, unitKind: 'unit', unitOrder: 2, page: 2, lessonOrder: 1,
    topic: { zh: '认读五', en: 'Reading five' },
    activity: id, activityTitle: { zh: `读一读 ${id}`, en: `Read ${id}` }, invite: { zh: '试一试', en: 'Try it' },
    ...(detail ? { detail } : {}),
  });
  const courses = [makeCourse('grouped', [entry('read-1', '2 + 3'), entry('read-2', '1 + 4'), entry('read-3')])];
  await page.route('**/courseware/index.json', route => route.fulfill({ json: { courses } }));
  await page.goto('/?lang=zh&grade=g1&term=a&cat=math');
  const card = page.locator('.card--group[data-course-id="grouped"]');

  // 卡片首屏是 emoji 封面 + 标题 + 一句介绍 + 分类，关卡按钮不占位。
  await expect(card.locator('.card__emoji')).toBeVisible();
  await expect(card.locator('.card__title')).toHaveText('grouped');
  await expect(card.locator('.card__desc')).toHaveText('动手试一试');
  await expect(card.locator('.chip--cat')).toHaveText('数学');
  await expect(card.locator('.stage')).toHaveCount(3);
  await expect(card.locator('.stage').first()).toBeHidden();

  // summary 是可点开的展开控件，承载关卡统计与提示文案。
  const summary = card.locator('.card__stages-summary');
  await expect(summary).toBeVisible();
  await expect(summary.locator('.card__group-meta')).toHaveText('3 关 · 已玩 0 关');
  await expect(summary.locator('.card__stages-hint')).toHaveText('查看 3 个关卡 ▾');
  const box = await summary.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);

  await summary.click();
  await expect(card.locator('.stage').first()).toBeVisible();
  await expect(summary.locator('.card__stages-hint')).toHaveText('收起 3 个关卡 ▴');
  await expect(card.locator('.stage').nth(0)).toHaveAttribute('href', 'courseware/grouped/index.html?activity=read-1');

  // 再点一次收起，回到介绍态。
  await summary.click();
  await expect(card.locator('.stage').first()).toBeHidden();

  // 切换语言后展开提示同步为英文。
  await page.locator('#langBtn').click();
  await expect(card.locator('.card__desc')).toHaveText('Try it');
  await expect(card.locator('.card__stages-summary .card__stages-hint')).toHaveText('Show 3 levels ▾');

  // 单关课件（如数字萤火虫）走普通卡分支，不受影响。
  await page.goto('/?lang=zh&grade=all&cat=all');
  await expect(page.locator('.card--group')).toHaveCount(0);
});

test('构建清单包含与源码相同的教材映射', async ({ request }) => {
  const root = new URL('../../', import.meta.url);
  const courses = readdirSync(new URL('src/', root), { withFileTypes: true }).filter(dir => dir.isDirectory())
    .map(dir => JSON.parse(readFileSync(new URL(`src/${dir.name}/course.json`, root), 'utf8')));
  const expected = await loadCurriculum(fileURLToPath(root), courses);
  const manifest = await (await request.get('/courseware/index.json')).json();
  const actual = Object.fromEntries(manifest.courses.filter(c => c.curriculum).map(c => [c.id, c.curriculum]));
  expect(actual).toEqual(JSON.parse(JSON.stringify(expected)));
});
