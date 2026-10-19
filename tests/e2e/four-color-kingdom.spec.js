import { test, expect } from '@playwright/test';
import {levelRecord} from './random-task-helpers.js';

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    controls: [...document.querySelectorAll('button:not([hidden]), a:not([hidden])')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          font: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      })
      .filter(({ width, height }) => width > 0 && height > 0),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
    lessonFont: Number.parseFloat(getComputedStyle(document.querySelector('#lessonText')).fontSize),
    containers: ['.atlas', '.desk'].map((selector) => {
      const element = document.querySelector(selector);
      return { selector, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight };
    }),
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.controls.filter(({ width }) => width < 44)).toEqual([]);
  expect(layout.controls.filter(({ height }) => height < 44)).toEqual([]);
  expect(Math.min(...layout.controls.map(({ font }) => font))).toBeGreaterThanOrEqual(16);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.lessonFont).toBeGreaterThanOrEqual(14);
  expect(layout.containers.filter(({ clientHeight, scrollHeight }) => scrollHeight > clientHeight + 1)).toEqual([]);
}

// Entering a map regenerates it asynchronously, so wait for the stage number and then read the
// instance that the page has actually published, rather than racing the generation.
const mapInstance = async (page, index) => {
  await expect(page.locator('#missionNumber')).toHaveText(String(index + 1).padStart(2, '0'));
  let instance = null;
  await expect.poll(async () => {
    const record = await levelRecord(page, 'four-color-kingdom', index).catch(() => null);
    if (!record?.instance) return 0;
    instance = record.instance;
    return 1;
  }).toBe(1);
  return instance;
};


// Tapping a land paints it with the loaded bucket, and tapping a bucket repaints the land that is
// still current, so a land is always made current before its colour is chosen.
async function paint(page, regionId, colorId) {
  await page.locator(`[data-region="${regionId}"]`).click();
  await page.locator(`[data-color="${colorId}"]`).click();
}

// Reads the colour each region currently shows, straight from the rendered map.
async function paintedColors(page) {
  return page.evaluate(() => {
    const toRgb = (hex) => {
      const value = hex.replace('#', '');
      const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16));
      return `rgb(${r}, ${g}, ${b})`;
    };
    const swatches = {};
    for (const button of document.querySelectorAll('[data-color]')) {
      swatches[(button.querySelector('.swatch__blob')?.style?.background || '').trim()] = button.dataset.color;
    }
    const painted = {};
    for (const path of document.querySelectorAll('path.region[data-region]')) {
      const fill = (path.getAttribute('fill') || '').trim();
      painted[path.dataset.region] = swatches[fill] ?? swatches[toRgb(fill)] ?? null;
    }
    return painted;
  });
}

// Repaints until every region matches the model's solution, because the closing operations of the
// sweep can still move the previous bucket onto the region that was painted last.
async function paintAll(page, layout) {
  const { regions, solution, fixed = {} } = layout;
  const target = regions.filter((region) => !fixed[region.id]);
  for (let pass = 0; pass < 4; pass += 1) {
    for (const region of target) await paint(page, region.id, solution[region.id]);
    const painted = await paintedColors(page);
    if (target.every((region) => painted[region.id] === solution[region.id])) return;
  }
  throw new Error('the map never matched the generated solution');
}

async function present(page) {
  await page.locator('#checkBtn').click();
}

// Paints one map with the solution the model produced for it, skipping the fixed regions.
async function solveMap(page, layout) {
  await paintAll(page, layout);
}

test.describe('four-color kingdom', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.four-color-kingdom');
      localStorage.removeItem('kidslab.progress.four-color-kingdom');
      localStorage.removeItem('kidslab.sound.muted');
    });
    await page.goto('/courseware/four-color-kingdom/?seed=987');
    // The course solves its first map asynchronously, so the controls are only wired once the
    // palette has rendered. Clicking before that silently does nothing.
    await expect(page.locator('#palette [data-color]').first()).toBeVisible();
  });

  test('recovers from conflicts and budget mistakes, then finishes all four maps', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '相邻领地，不能同色' })).toBeVisible();

    // Map 1: the opening four-way conflict. Every region touches the other three.
    const welcome = await mapInstance(page, 0);
    const first = welcome.regions[0];
    const neighbour = welcome.regions.find((region) => first.neighbors.includes(region.id));
    expect(neighbour, 'the opening map must keep a neighbouring pair').toBeTruthy();
    // Leave one region unpainted so the first submit reports the missing colour.
    const others = welcome.regions.filter((region) => region.id !== first.id && region.id !== neighbour.id);
    await paint(page, first.id, 'rose');
    await paint(page, neighbour.id, 'rose');
    await present(page);
    await expect(page.locator('#status')).toContainText('空白');

    // Painting every remaining region the same colour makes the conflict visible.
    for (const region of others) await paint(page, region.id, 'rose');
    await present(page);
    await expect(page.locator('#status')).toContainText('相邻同色');

    await solveMap(page, welcome);
    await present(page);
    await expect(page.locator('#status')).toContainText('过关');
    await page.locator('#nextBtn').click();

    // Map 2 is a three-colour budget map: opening a fourth colour must be refused.
    const budget = await mapInstance(page, 1);
    expect(budget.budget, 'the second map keeps its three-colour budget').toBe(3);
    // Fill the map with the model's three-colour solution first.
    await solveMap(page, budget);
    const outside = ['rose', 'sun', 'mint', 'sky'].find((color) => !Object.values(budget.solution).includes(color));
    expect(outside, 'the budgeted map holds a fourth colour back').toBeTruthy();
    // Repainting a region whose colour is used elsewhere would keep all three colours open
    // and add this fourth one, which is exactly what the budget forbids.
    const counts = Object.values(budget.solution).reduce((tally, color) => ({ ...tally, [color]: (tally[color] ?? 0) + 1 }), {});
    const spareRegion = budget.regions.find(
      (region) => !budget.fixed?.[region.id] && counts[budget.solution[region.id]] > 1,
    );
    expect(spareRegion, 'the three-colour map repeats a colour so a fourth would overspend').toBeTruthy();
    // Selecting the bucket first and then the land is the shape that reaches the budget check:
    // tapping a land after a bucket would otherwise paint it with the bucket already loaded.
    await page.locator(`[data-color="${outside}"]`).click();
    await page.locator(`[data-region="${spareRegion.id}"]`).click();
    await expect(page.locator('#status')).toContainText('预算');
    // The refused colour is never applied, so the map keeps the model's valid solution.
    expect(await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('kidslab.random.v1.four-color-kingdom'));
      return JSON.parse(localStorage.getItem(key)).levels['1'].play?.colors ?? {};
    })).toEqual(budget.solution);

    await present(page);
    await expect(page.locator('#status')).toContainText('过关');
    await page.locator('#nextBtn').click();

    // Map 3 locks one region; the rest still follow the generated solution.
    const locked = await mapInstance(page, 2);
    const lockedRegion = Object.keys(locked.fixed ?? {})[0];
    expect(lockedRegion, 'the third map locks a lord keep').toBeTruthy();
    await page.locator(`[data-region="${lockedRegion}"]`).click();
    await expect(page.locator('#status')).toContainText('锁');
    await solveMap(page, locked);
    await present(page);
    await expect(page.locator('#status')).toContainText('过关');
    await page.locator('#nextBtn').click();

    // Map 4 is the four-colour challenge.
    const devil = await mapInstance(page, 3);
    await solveMap(page, devil);
    await present(page);
    await expect(page.getByRole('heading', { name: '你摸到了四色定理的手感！' })).toBeVisible();
    await expect(page.locator('#playAgainBtn')).toBeFocused();
    await expect(page.locator('#course')).toHaveJSProperty('inert', true);
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.four-color-kingdom') || 'null')?.status)).toBe('completed');
  });

  test('supports sound, language, theme, and target viewport layout', async ({ page }) => {
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: 'Neighbors Cannot Share a Color' })).toBeVisible();
    await expect(page.locator('#missionNav')).toHaveAttribute('aria-label', 'Kingdom map missions');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');
    await expectFitsViewport(page);
  });

  test('keeps every unlocked mission readable in Chinese and English', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.four-color-kingdom', JSON.stringify({ unlocked: 3, completed: [0, 1, 2] }));
    });
    await page.reload();
    for (let index = 0; index < 4; index += 1) {
      await page.locator('#missionNav button').nth(index).click();
      await expectFitsViewport(page);
    }
    await page.locator('#langBtn').click();
    for (let index = 0; index < 4; index += 1) {
      await page.locator('#missionNav button').nth(index).click();
      await expectFitsViewport(page);
    }
  });

  test('restores completion and can restart from the first mission', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.four-color-kingdom', JSON.stringify({ unlocked: 3, completed: [0, 1, 2, 3] }));
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: '你摸到了四色定理的手感！' })).toBeVisible();
    await page.locator('#playAgainBtn').click();
    await expect(page.getByRole('heading', { name: '相邻领地，不能同色' })).toBeVisible();
    await expect(page.locator('#missionNumber')).toHaveText('01');
  });
});
