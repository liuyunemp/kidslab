import { test, expect } from '@playwright/test';
import {levelInstance} from './random-task-helpers.js';

// Mirrors the model's reflection rules so the expected holes are derived independently
// from the punch position stored for the current level.
function foldReflect(point, fold) {
  if (fold === 'v50') return { c: 3 - point.c, r: point.r };
  if (fold === 'h50') return { c: point.c, r: 3 - point.r };
  if (fold === 'v25') return { c: 1 - point.c, r: point.r };
  if (fold === 'h25') return { c: point.c, r: 1 - point.r };
  throw new RangeError(`Unknown fold: ${fold}`);
}
function foldHoles(level) {
  let points = [level.punch];
  for (const fold of [...level.folds].reverse()) {
    points = [...points, ...points.map((point) => foldReflect(point, fold))];
  }
  return [...new Set(points.map((point) => `${point.c},${point.r}`))].sort();
}
const predictionsFor = async (page, index) => foldHoles(await levelInstance(page, 'punch-origami', index));

async function selectPrediction(page, cells) {
  for (const cell of cells) {
    await page.locator(`[data-cell="${cell}"]`).click();
  }
}

async function unfold(page) {
  const slider = page.locator('#unfoldSlider');
  await slider.fill('100');
  // A range input does not always emit `input` from a programmatic fill, and the model
  // finishes the level only from that event, so dispatch it explicitly as a real drag would.
  await slider.evaluate((element) => {
    element.value = '100';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

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
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.controls.filter(({ width }) => width < 40)).toEqual([]);
  expect(layout.controls.filter(({ height }) => height < 40)).toEqual([]);
  expect(layout.controls
    .filter(({ width, height }) => width >= 44 && height >= 44)
    .filter(({ font }) => font < 16)).toEqual([]);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
}

test.describe('punch and fold house', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('kidslab.lang')) localStorage.setItem('kidslab.lang', 'zh');
      if (!localStorage.getItem('kidslab.theme')) localStorage.setItem('kidslab.theme', 'light');
    });
    await page.goto('/courseware/punch-origami/?seed=987');
  });

  test('recovers from wrong predictions and completes all four folds', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '一折以后，孔会去哪？' })).toBeVisible();
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText('还没有预测');

    // A wrong pick is any cell that is not part of this level's mirrored set.
    const first = await predictionsFor(page, 0);
    const wrongCell = ['0,0', '0,1', '0,2', '0,3'].find((cell) => !first.includes(cell));
    await page.locator(`[data-cell="${wrongCell}"]`).click();
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText('没有成镜像对');
    await expect(page.locator(`[data-cell="${wrongCell}"]`)).toHaveClass(/wrong/);
    await page.locator('#clearBtn').click();

    // Entering a room generates its question, so each room is read after it becomes current.
    for (let level = 0; level < 4; level += 1) {
      await expect(page.locator('.level-btn.current')).toHaveText(String(level + 1).padStart(2, '0'));
      const expected = await predictionsFor(page, level);
      await selectPrediction(page, expected);
      await page.locator('#checkBtn').click();
      await expect(page.locator('#status')).toContainText('预测全对');
      await expect(page.locator('#unfoldSlider')).toBeVisible();
      await unfold(page);
      await expect(page.locator('#status')).toContainText('展开完成');
      if (level < 3) {
        await page.locator('#nextBtn').click();
      }
    }

    await expect(page.getByRole('heading', { name: '纸上开出了十六朵花！' })).toBeVisible();
    await expect(page.locator('#playAgainBtn')).toBeFocused();
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.punch-origami') || 'null')?.status)).toBe('completed');
  });

  test('supports sound, language, theme, persistence, and required viewport', async ({ page }) => {
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: 'Where Does One Fold Send the Hole?' })).toBeVisible();
    await expect(page.locator('#levelNav')).toHaveAttribute('aria-label', 'Paper rooms');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');
    await expectFitsViewport(page);

    await selectPrediction(page, await predictionsFor(page, 0));
    await page.locator('#checkBtn').click();
    await unfold(page);
    await page.locator('#nextBtn').click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Which Holes Mirror Each Other?' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
