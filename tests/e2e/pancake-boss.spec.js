import { test, expect } from '@playwright/test';
import {levelInstance} from './random-task-helpers.js';

async function place(page, token, cell) {
  await page.locator(`[data-token="${token}"]`).click();
  await page.locator(`[data-cell="${cell}"]`).click();
}

async function fillOptimalThreePancakes(page) {
  await place(page, 'A1', 0);
  await place(page, 'B1', 1);
  await place(page, 'A2', 2);
  await place(page, 'C1', 3);
  await place(page, 'B2', 4);
  await place(page, 'C2', 5);
}

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    controls: [...document.querySelectorAll('button:not([hidden]), a:not([hidden]), .clock-options span')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height, font: Number.parseFloat(getComputedStyle(element).fontSize) };
      })
      .filter(({ width, height }) => width > 0 && height > 0),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
    missionFont: Number.parseFloat(getComputedStyle(document.querySelector('#missionText')).fontSize),
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.controls.filter(({ width }) => width < 40)).toEqual([]);
  expect(layout.controls.filter(({ height }) => height < 40)).toEqual([]);
  expect(Math.min(...layout.controls.map(({ font }) => font))).toBeGreaterThanOrEqual(14);
  expect(layout.statusFont).toBeGreaterThanOrEqual(14);
  expect(layout.missionFont).toBeGreaterThanOrEqual(14);
}

test.describe('pancake boss', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.pancake-boss');
      localStorage.removeItem('kidslab.progress.pancake-boss');
      localStorage.removeItem('kidslab.sound.muted');
    });
    await page.goto('/courseware/pancake-boss/?seed=987');
  });

  test('recovers from scheduling mistakes and completes the breakfast rush', async ({ page }) => {
    // Each round's duration is generated, so the best finishing time comes from the instance.
    const firstRound = await levelInstance(page, 'pancake-boss', 0);
    const bestMinutes = firstRound.rounds * firstRound.minutes;
    await expect(page.getByRole('heading', { name: '两张饼，铁板别空着' })).toBeVisible();
    await place(page, 'A1', 0);
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText('还有 3 个饼面没排');
    await place(page, 'B1', 1);
    await place(page, 'A2', 2);
    await place(page, 'B2', 3);
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText(`${bestMinutes} 分钟完成`);
    await page.locator('#nextBtn').click();

    await place(page, 'A1', 0);
    await place(page, 'A2', 1);
    await place(page, 'B1', 2);
    await place(page, 'C1', 3);
    await place(page, 'B2', 4);
    await place(page, 'C2', 5);
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText('两面不能同时煎');

    await page.locator('#clearBtn').click();
    await fillOptimalThreePancakes(page);
    await page.locator('#checkBtn').click();
    const second = await levelInstance(page, 'pancake-boss', 1);
    await expect(page.locator('#status')).toContainText(`最快 ${second.rounds * second.minutes} 分钟`);
    await page.locator('#nextBtn').click();

    await fillOptimalThreePancakes(page);
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText('启动豆浆机');
    await page.locator('#soyBtn').click();
    // The serving time and its choices are generated from the same task parameters.
    const clock = (minute) => `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, '0')}`;
    const third = await levelInstance(page, 'pancake-boss', 2);
    const end = third.start + Math.max(third.rounds * third.minutes, third.soy);
    await page.getByLabel(clock(end + 3)).check();
    await page.locator('#checkBtn').click();
    // A wrong clock reading is answered with the "minutes restart at 00" hint.
    await expect(page.locator('#status')).toContainText(/分钟要从 00|重新计数/);
    await page.getByLabel(clock(end)).check();
    await page.locator('#checkBtn').click();

    await expect(page.getByRole('heading', { name: '早高峰统筹大师！' })).toBeVisible();
    await expect(page.locator('#playAgainBtn')).toBeFocused();
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.pancake-boss') || 'null')?.status)).toBe('completed');
  });

  test('supports undo, sound, language, theme, and target viewports', async ({ page }) => {
    await place(page, 'A1', 0);
    await page.locator('#undoBtn').click();
    await expect(page.locator('[data-cell="0"]')).toContainText('空位');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: 'Keep Both Griddle Spots Busy' })).toBeVisible();
    await expect(page.locator('#missionNav')).toHaveAttribute('aria-label', 'Orders');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');
    await expectFitsViewport(page);
  });

  test('keeps every order readable in Chinese and English', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.pancake-boss', JSON.stringify({ unlocked: 2, completed: [0, 1] }));
    });
    await page.reload();
    for (let index = 0; index < 3; index += 1) {
      await page.locator('#missionNav button').nth(index).click();
      await expectFitsViewport(page);
    }
    await page.locator('#langBtn').click();
    for (let index = 0; index < 3; index += 1) {
      await page.locator('#missionNav button').nth(index).click();
      await expectFitsViewport(page);
    }
  });
});
