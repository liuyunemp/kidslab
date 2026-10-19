import { test, expect } from '@playwright/test';
import {levelInstance} from './random-task-helpers.js';

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    buttonHeights: [...document.querySelectorAll('button:not([hidden])')]
      .map((button) => button.getBoundingClientRect().height)
      .filter((height) => height > 0),
    tipFont: Number.parseFloat(getComputedStyle(document.querySelector('#tip')).fontSize),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(Math.min(...layout.buttonHeights)).toBeGreaterThanOrEqual(40);
  expect(layout.tipFont).toBeGreaterThanOrEqual(16);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
}

test.describe('truth island', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.truth-island');
      localStorage.removeItem('kidslab.progress.truth-island');
      localStorage.removeItem('kidslab.sound.muted');
    });
    await page.goto('/courseware/truth-island/?seed=987');
  });

  test('recovers from wrong deductions and solves all three cases', async ({ page }) => {
    // The islander identities and the treasure road are generated per case, so each case is read
    // from its own instance instead of assuming a fixed cast.
    const caseOne = await levelInstance(page, 'truth-island', 0);
    const wrongRole = caseOne.roles.mia ? 'liar' : 'truth';
    const rightRole = caseOne.roles.mia ? 'truth' : 'liar';
    await page.locator(`[data-person="mia"][data-role="${wrongRole}"]`).click();
    await page.locator(`[data-person="noah"][data-role="${wrongRole === 'liar' ? 'truth' : 'liar'}"]`).click();
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText('至少一句话');

    await page.locator(`[data-person="mia"][data-role="${rightRole}"]`).click();
    await page.locator(`[data-person="noah"][data-role="${rightRole === 'liar' ? 'truth' : 'liar'}"]`).click();
    await page.locator('#checkBtn').click();
    await expect(page.getByRole('heading', { name: '徽章严丝合缝！' })).toBeVisible();
    await page.getByRole('button', { name: '打开下一案' }).click();

    const caseTwo = await levelInstance(page, 'truth-island', 1);
    const wrongRoad = caseTwo.road === 'left' ? 'right' : 'left';
    await page.locator(`[data-road="${wrongRoad}"]`).click();
    // The rejection explains why the claim cannot hold on the chosen road.
    await expect(page.locator('#status')).toContainText(/假|再看看|不对/);
    await page.locator(`[data-road="${caseTwo.road}"]`).click();
    await expect(page.getByRole('heading', { name: '月门线索破解！' })).toBeVisible();
    await page.getByRole('button', { name: '打开下一案' }).click();

    const caseThree = await levelInstance(page, 'truth-island', 2);
    const wrongFinal = caseThree.road === 'left' ? 'right' : 'left';
    await page.locator('[data-question="0"]').click();
    await expect(page.locator('#status')).toContainText('你还不知道回答者');
    await page.locator('[data-question="2"]').click();
    await expect(page.locator('#islandScene')).toHaveClass(/is-pointing/);
    await page.locator(`[data-final-road="${wrongFinal}"]`).click();
    await expect(page.locator('#status')).toContainText('把答案反过来');
    await page.locator(`[data-final-road="${caseThree.road}"]`).click();

    await expect(page.getByRole('heading', { name: '真话岛宝藏找到！' })).toBeVisible();
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.truth-island') || 'null')?.status)).toBe('completed');
  });

  test('supports hints, sound, language, theme, and target viewport layout', async ({ page }) => {
    await page.locator('#hintBtn').click();
    // The hint names the case's own cast, so it describes trying both identities.
    await expect(page.locator('#status')).toContainText(/身份|真话|反话/);

    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');

    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.locator('#tip')).toHaveText('Listen to each claim, then make every identity and clue agree.');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');

    await expectFitsViewport(page);
  });
});
