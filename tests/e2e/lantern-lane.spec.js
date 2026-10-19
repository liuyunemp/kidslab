import { test, expect } from '@playwright/test';
import {levelInstance} from './random-task-helpers.js';

// The five interval stages are generated, so titles and equations are derived from the instances.
const level = (page, index) => levelInstance(page, 'lantern-lane', index);

const titles = ([a, b, c, d, e]) => [
  `${a.length} 米长街，每 ${a.gap} 米一盏`,
  `${b.length} 米石桥，每 ${b.gap} 米一根柱`,
  `周长 ${c.length} 米的湖，每 ${c.gap} 米一盏`,
  `把圆木锯成 ${d.length} 段`,
  `从 ${e.startFloor} 楼爬到 ${e.endFloor} 楼`,
];
const equations = ([a, b, c, d, e]) => [
  `${a.length} ÷ ${a.gap} + 1 = ${a.answer}`,
  `${b.length} ÷ ${b.gap} − 1 = ${b.answer}`,
  `${c.length} ÷ ${c.gap} = ${c.answer}`,
  `${d.length} − 1 = ${d.answer}`,
  `${e.endFloor} − ${e.startFloor} = ${e.answer}`,
];

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
          text: element.textContent.trim(),
          width: rect.width,
          height: rect.height,
          font: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      })
      .filter(({ width, height }) => width > 0 && height > 0),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
    canvasHeight: document.querySelector('#sceneCanvas').getBoundingClientRect().height,
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  // Mobile can scroll slightly; desktop should stay within one screen.
  if (layout.viewportWidth >= 900) {
    expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  }
  expect(layout.controls.filter(({ width, height }) => width < 44 || height < 44)).toEqual([]);
  expect(layout.controls.filter(({ font }) => font < 16)).toEqual([]);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.canvasHeight).toBeGreaterThanOrEqual(105);
}

async function setGuess(page, value) {
  const current = Number(await page.locator('#guessValue').textContent());
  const delta = value - current;
  const button = delta > 0 ? page.locator('#plusBtn') : page.locator('#minusBtn');
  for (let i = 0; i < Math.abs(delta); i += 1) {
    // The scene repaints every frame while its sparkle animation runs, so the control is
    // never "stable" for Playwright; the click itself is still a real user gesture.
    await button.click({ force: true });
  }
  await expect(page.locator('#guessValue')).toHaveText(String(value));
}

// Every stage is solved from its own instance instead of a fixed count.
async function solveStage(page, index, {wrong} = {}) {
  const instance = await level(page, index);
  await setGuess(page, wrong ? instance.defaultGuess : instance.answer);
  await page.locator('#placeBtn').click();
  return instance;
}

async function clearStage(page, index) {
  await solveStage(page, index);
  await expect(page.locator('#status')).toContainText(/=/);
  await page.locator('#nextBtn').click();
}

test.describe('lantern lane', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.lantern-lane');
      localStorage.removeItem('kidslab.progress.lantern-lane');
      localStorage.removeItem('kidslab.sound.muted');
    });
    await page.goto('/courseware/lantern-lane/?seed=987');
  });

  test('recovers from wrong counts and completes all five interval stages', async ({ page }) => {
    const stages = await Promise.all([0, 1, 2, 3, 4].map((index) => level(page, index)));
    const stageTitles = titles(stages);
    const stageEquations = equations(stages);
    await expect(page.getByRole('heading', { name: stageTitles[0] })).toBeVisible();

    // One too few, then one too many, then the correct count — all from the current instance.
    const first = stages[0];
    const tooFew = first.answer - 1;
    const tooMany = first.answer + 1;
    await setGuess(page, tooFew);
    await page.locator('#placeBtn').click();
    await expect(page.locator('#status')).toContainText('少了');
    await expect(page.locator('#stage')).toHaveAttribute('data-result', 'short');

    await setGuess(page, tooMany);
    await page.locator('#placeBtn').click();
    await expect(page.locator('#status')).toContainText('多了');
    await expect(page.locator('#stage')).toHaveAttribute('data-result', 'extra');

    await setGuess(page, first.answer);
    await page.locator('#placeBtn').click();
    await expect(page.locator('#status')).toContainText(stageEquations[0]);
    await page.locator('#nextBtn').click();

    await expect(page.getByRole('heading', { name: stageTitles[1] })).toBeVisible();
    await clearStage(page, 1);

    await expect(page.getByRole('heading', { name: stageTitles[2] })).toBeVisible();
    await clearStage(page, 2);

    await expect(page.getByRole('heading', { name: stageTitles[3] })).toBeVisible();
    await clearStage(page, 3);

    await expect(page.getByRole('heading', { name: stageTitles[4] })).toBeVisible();
    await solveStage(page, 4);
    await expect(page.locator('#status')).toContainText(stageEquations[4]);
    await page.locator('#nextBtn').click();

    await expect(page.getByRole('heading', { name: '你点亮了整条灯笼街！' })).toBeVisible();
    await expect(page.locator('#playAgainBtn')).toBeFocused();
    await expect(page.locator('#course')).toHaveJSProperty('inert', true);
    await expect(page.locator('#finaleGrid article')).toHaveCount(5);
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.lantern-lane') || 'null')?.status)).toBe('completed');
  });

  test('persists progress and supports language, theme, sound, and target viewports', async ({ page }) => {
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const stages = await Promise.all([0, 1, 2, 3, 4].map((index) => level(page, index)));
    await clearStage(page, 0);
    const second = stages[1];
    await setGuess(page, second.answer);
    await page.locator('#placeBtn').click();
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: `${second.length} m bridge, posts every ${second.gap} m` })).toBeVisible();
    await expect(page.locator('#status')).toContainText('No ends');
    await expectFitsViewport(page);

    await page.reload();
    await expect(page.locator('#nextBtn')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#guessValue')).toHaveText(String(second.answer));
    await expectFitsViewport(page);
  });

  test('restores completion and can start a fresh festival', async ({ page }) => {
    const stages = await Promise.all([0, 1, 2, 3, 4].map((index) => level(page, index)));
    for (const index of [0, 1, 2, 3, 4]) {
      await solveStage(page, index);
      await page.locator('#nextBtn').click();
    }
    await expect(page.locator('#finale')).toBeVisible();

    await page.reload();
    await expect(page.locator('#finale')).toBeVisible();
    await expect(page.getByRole('heading', { name: '你点亮了整条灯笼街！' })).toBeVisible();

    await page.locator('#playAgainBtn').click();
    await expect(page.locator('#finale')).toBeHidden();
    // Replaying starts a fresh set of stages, so read the new first stage instead of the old title.
    const replay = await level(page, 0);
    await expect(page.getByRole('heading', { name: `${replay.length} 米长街，每 ${replay.gap} 米一盏` })).toBeVisible();
    await expect(page.locator('#guessValue')).toHaveText(String(replay.defaultGuess));
    await expect.poll(() => page.evaluate(() =>
      localStorage.getItem('kidslab.progress.lantern-lane'))).toBeNull();
  });
});
