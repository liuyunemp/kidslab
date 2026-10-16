import { readFileSync, readdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// 固定目录隔离真实课件数量变化；桌面和手机配置均执行。不要在刷新时清空偏好。
test.use({ serviceWorkers: 'block' });
const lesson = (id, grades, extra = {}) => ({
  id, grades, levels: ['primary'], category: 'math', icon: '🔎',
  title: { zh: id, en: id }, description: { zh: '观察课件', en: 'Explore' },
  tags: [], path: `courseware/${id}/index.html`, ...extra,
});
const courses = [
  lesson('upper', ['g1a'], { title: { zh: '星光上册', en: 'Starlight fall' }, badge: 'new' }),
  lesson('lower', ['g1b'], { badge: 'new' }),
  lesson('year', ['g1'], { title: { zh: '星光全年', en: 'Starlight year' } }),
  lesson('cross', ['g1a', 'g2b']),
  lesson('other', ['g2a']),
  lesson('chinese', ['g1a'], { category: 'chinese' }),
  lesson('ungraded', [], { title: { zh: '星光拓展', en: 'Starlight extra' }, tags: ['一年级', 'g1'] }),
  lesson('welcome', [], { category: 'featured', pinned: true, levels: ['primary', 'junior', 'senior'] }),
  lesson('senior', ['g10b'], { levels: ['senior'] }),
  lesson('hidden', ['g1a'], { listed: false }),
];

async function expectCards(page, ids) {
  await expect(page.locator('#grid .card')).toHaveCount(ids.length);
  expect(await page.locator('#grid .card').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))))
    .toEqual(ids.map(id => `courseware/${id}/index.html`));
  await expect(page.locator('#countText')).toHaveText(`共 ${ids.length} 个课件`);
}

async function choose(page, selector) {
  const menu = page.locator('#menuBtn');
  const target = page.locator(selector);
  if (await menu.isVisible()) {
    // 学段/科目在抽屉内，年级/册次在主区；打开抽屉会使主区 inert。
    const inSidebar = await target.evaluate(element => Boolean(element.closest('#sidebar')));
    const isOpen = await menu.getAttribute('aria-expanded') === 'true';
    if (inSidebar && !isOpen) await menu.click();
    if (!inSidebar && isOpen) await page.keyboard.press('Escape');
  }
  await target.click();
}

test.describe('严格年级和科目筛选', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/courseware/index.json', route => route.fulfill({ json: { courses } }));
  });

  test('上下册、科目与搜索取交集，侧栏计数反映对应选择结果', async ({ page }) => {
    await page.goto('/?lang=zh&level=primary&grade=g1&term=a&cat=math');
    await expectCards(page, ['upper', 'year', 'cross']);
    await expect(page.locator('[data-grade="g1"] .grade__count')).toHaveText('4');
    await expect(page.locator('[data-term="a"] .grade__count')).toHaveText('3');
    await expect(page.locator('[data-term="b"] .grade__count')).toHaveText('2');
    await expect(page.locator('[data-cat="all"] .cat__count')).toHaveText('4');
    await expect(page.locator('[data-cat="math"] .cat__count')).toHaveText('3');
    await expect(page.locator('[data-cat="chinese"] .cat__count')).toHaveText('1');
    await page.locator('#searchInput').fill('星光');
    await expectCards(page, ['upper', 'year']);
    await expect(page.locator('[data-cat="math"] .cat__count')).toHaveText('2');
    await expect(page.locator('[data-term="b"] .grade__count')).toHaveText('1');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('星光');
    await page.reload();
    await expectCards(page, ['upper', 'year']);
    await expect(page.locator('#searchInput')).toHaveValue('星光');
    await choose(page, '[data-term="b"]');
    await expectCards(page, ['year']);
  });

  test('无年级及置顶只在匹配的全部年级出现，标签不能补推年级', async ({ page }) => {
    await page.goto('/?lang=zh&level=primary');
    await expectCards(page, ['welcome', 'upper', 'lower', 'year', 'cross', 'other', 'chinese', 'ungraded']);
    await expect(page.locator('[data-cat="all"] .cat__count')).toHaveText('8');
    await choose(page, '[data-grade="g1"]');
    await expectCards(page, ['upper', 'lower', 'year', 'cross', 'chinese']);
    await choose(page, '[data-grade="all"]');
    await choose(page, '[data-cat="math"]');
    await expectCards(page, ['upper', 'lower', 'year', 'cross', 'other', 'ungraded']);
    await page.locator('#searchInput').fill('星光');
    await expectCards(page, ['upper', 'year', 'ungraded']);
    await choose(page, '[data-cat="all"]');
    await page.locator('#searchInput').fill('welcome');
    await expectCards(page, ['welcome']);
    await choose(page, '[data-grade="g1"]');
    await expectCards(page, []);
    await expect(page.locator('#emptyBox')).toBeVisible();
  });

  test('零结果保留合法年级册次，刷新及无参数重开恢复偏好，清除后恢复目录', async ({ page }) => {
    await page.goto('/?lang=zh&level=primary&grade=g6&term=b&cat=chinese');
    await expectCards(page, []);
    await expect(page.locator('#emptyBox')).toBeVisible();
    await page.reload();
    await expectCards(page, []);
    await expect(page.locator('[data-grade="g6"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('[data-term="b"]')).toHaveAttribute('aria-checked', 'true');
    expect(new URL(page.url()).searchParams.get('grade')).toBe('g6');
    expect(new URL(page.url()).searchParams.get('term')).toBe('b');
    expect(await page.evaluate(() => [localStorage.getItem('kidslab.grade'), localStorage.getItem('kidslab.term')]))
      .toEqual(['g6', 'b']);
    await page.goto('/');
    await expectCards(page, []);
    await expect(page.locator('[data-cat="chinese"]')).toHaveClass('is-active');
    await expect(page.locator('[data-grade="g6"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('[data-term="b"]')).toHaveAttribute('aria-checked', 'true');
    await page.locator('#resetBtn').click();
    await expectCards(page, ['welcome', 'upper', 'lower', 'year', 'cross', 'other', 'chinese', 'ungraded']);
    await expect(page.locator('#emptyBox')).toBeHidden();
  });

  test('跨年级标记逐册匹配，切换学段保留科目，零结果科目不自动放宽', async ({ page }) => {
    await page.goto('/?lang=zh&level=primary&grade=g2&term=b&cat=math');
    await expectCards(page, ['cross']);
    await choose(page, '[data-term="a"]');
    await expectCards(page, ['other']);
    await choose(page, '[data-level="senior"]');
    // 学段按钮保留抽屉，先关闭后再检查主区域。
    await page.keyboard.press('Escape');
    await expectCards(page, ['senior']);
    await choose(page, '[data-grade="g10"]');
    await choose(page, '[data-term="a"]');
    await expectCards(page, []);
    await choose(page, '[data-term="b"]');
    await expectCards(page, ['senior']);
    await choose(page, '[data-cat="physics"]');
    await choose(page, '[data-level="primary"]');
    await page.keyboard.press('Escape');
    await expectCards(page, []);
    await expect(page.locator('[data-cat="physics"]')).toHaveClass('is-active');
    await page.reload();
    await expectCards(page, []);
    await expect(page.locator('[data-cat="physics"]')).toHaveClass('is-active');
  });

  test('最近探索和最新创建遵守年级，清除进度同步清空计数且刷新不恢复', async ({ page }) => {
    await page.goto('/?lang=zh&level=primary');
    await page.evaluate(() => {
      for (const [index, id] of ['upper', 'lower', 'ungraded', 'welcome'].entries()) {
        localStorage.setItem(`kidslab.progress.${id}`, JSON.stringify({ status: 'played', updatedAt: index + 1 }));
      }
    });
    await page.goto('/?lang=zh&level=primary&grade=g1&term=a&cat=recent');
    await expectCards(page, ['upper']);
    await expect(page.locator('[data-cat="recent"] .cat__count')).toHaveText('1');
    await choose(page, '[data-cat="newest"]');
    await expectCards(page, ['upper']);
    await choose(page, '[data-cat="recent"]');
    page.once('dialog', dialog => dialog.accept());
    await choose(page, '#clearProgressBtn');
    await expectCards(page, []);
    await expect(page.locator('[data-cat="recent"] .cat__count')).toHaveText('0');
    await page.reload();
    await expectCards(page, []);
  });
});

test('统一构建后清单的分类与已核查源码一致', async ({ request }) => {
  const root = new URL('../../src/', import.meta.url);
  const source = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory())
    .map(entry => JSON.parse(readFileSync(new URL(`${entry.name}/course.json`, root), 'utf8')))
    .filter(course => course.listed !== false);
  const manifest = await (await request.get('/courseware/index.json')).json();
  const classification = list => list.map(({ id, category, levels, grades = [] }) => ({ id, category, levels, grades }))
    .sort((a, b) => a.id.localeCompare(b.id));
  expect(classification(manifest.courses)).toEqual(classification(source));
});
