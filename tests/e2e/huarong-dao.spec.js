import { test, expect } from '@playwright/test';
import { roundRecord } from './random-task-helpers.js';

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    panel: document.querySelector('#panel').getBoundingClientRect().toJSON(),
    controls: [...document.querySelectorAll('button:not([hidden])')]
      .filter((button) => button.getClientRects().length)
      .map((button) => ({
        id: button.id,
        width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height,
      })),
  }));
  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.panel.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.panel.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(Math.min(...layout.controls.map(({ height }) => height))).toBeGreaterThanOrEqual(40);
}

test.describe('3D Huarong Dao', () => {
  test.describe.configure({ mode: 'serial', timeout: 90000 });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.setItem('kidslab.huarong-dao.guided', '1');
      localStorage.setItem('kidslab.huarong-dao.music', '0');
      localStorage.setItem('kidslab.huarong-dao.sfx', '0');
      localStorage.removeItem('kidslab.progress.huarong-dao');
    });
    await page.goto('/courseware/huarong-dao/?seed=987');
    await expect(page.locator('.random-round-menu')).toBeVisible();
  });

  test('recovers from an invalid direction, follows a hint, and undoes it', async ({ page }) => {
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#coachTitle')).toHaveText('这边被挡住了');

    await page.locator('#hintBtn').click();
    const hinted = page.locator('#movePad button.is-hint:not(:disabled)');
    await expect(hinted).toHaveCount(1);
    await hinted.click();
    await expect(page.locator('#moveValue')).toHaveText('1');

    await page.locator('#undoBtn').click();
    await expect(page.locator('#moveValue')).toHaveText('0');
    await expect(page.locator('#coachTitle')).toHaveText('退回一步');
  });

  test('completes the generated practice through progressive hints', async ({ page }) => {
    await page.locator('[data-level="practice"]').click();
    await expect(page.locator('[data-level="practice"]')).toHaveClass(/is-on/);
    const steps=(await roundRecord(page,'huarong-dao')).instance.solution.length;
    await page.evaluate(async steps => {
      const waitFor = async (predicate, message) => {
        const deadline = performance.now() + 15000;
        while (performance.now() < deadline) {
          const value = predicate();
          if (value) return value;
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
        throw new Error(message);
      };

      for (let step = 0; step < steps; step += 1) {
        const hint = document.querySelector('#hintBtn:not(:disabled)');
        if (!hint) throw new Error(`Hint unavailable at practice step ${step + 1}`);
        hint.click();
        const move = await waitFor(
          () => document.querySelector('#movePad button.is-hint:not(:disabled)'),
          `Hinted move unavailable at practice step ${step + 1}`,
        );
        move.click();
        await waitFor(
          () => document.querySelector('#moveValue')?.textContent === String(step + 1),
          `Practice move ${step + 1} did not finish`,
        );
      }
    },steps);

    await expect(page.locator('#win')).toBeVisible();
    await expect(page.locator('#moveValue')).toHaveText(String(steps));
    await expect(page.locator('#winStats')).toContainText(`${steps} 格步`);
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.huarong-dao') || 'null')?.status)).toBe('completed');
  });

  test('offers a pausable solution timeline and keeps bilingual layouts in view', async ({ page }) => {
    await page.locator('[data-level="practice"]').click();
    await page.locator('#demoBtn').click();
    // The demo bar only shows up once the solver worker answers, which is slow on a loaded
    // machine: wait for it instead of assuming it exists within the default 5s.
    const demoPlay = page.locator('#demoPlayBtn');
    await expect(demoPlay).toBeVisible({ timeout: 20000 });
    await demoPlay.click();
    await expect(demoPlay).toHaveAttribute('aria-label', '继续演示');

    const before = Number(await page.locator('#demoRange').inputValue());
    await page.locator('#demoNextBtn').click();
    await expect.poll(async () => Number(await page.locator('#demoRange').inputValue())).toBeGreaterThan(before);
    await page.locator('#demoExitBtn').click();

    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.locator('#demoBtn')).toHaveText(/Watch the solution/);
    await expectFitsViewport(page);
  });
});
