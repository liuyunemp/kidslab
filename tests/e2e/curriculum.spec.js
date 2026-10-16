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
  const card = page.locator('.card[data-course-id="g1b-character-lab"][data-activity="character-4"]');
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

test('构建清单包含与源码相同的教材映射', async ({ request }) => {
  const root = new URL('../../', import.meta.url);
  const courses = readdirSync(new URL('src/', root), { withFileTypes: true }).filter(dir => dir.isDirectory())
    .map(dir => JSON.parse(readFileSync(new URL(`src/${dir.name}/course.json`, root), 'utf8')));
  const expected = await loadCurriculum(fileURLToPath(root), courses);
  const manifest = await (await request.get('/courseware/index.json')).json();
  const actual = Object.fromEntries(manifest.courses.filter(c => c.curriculum).map(c => [c.id, c.curriculum]));
  expect(actual).toEqual(JSON.parse(JSON.stringify(expected)));
});
