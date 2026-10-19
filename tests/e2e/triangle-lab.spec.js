import { test, expect } from '@playwright/test';
import {levelInstance} from './random-task-helpers.js';

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
    containers: ['.stage', '.console'].map((selector) => {
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
  expect(layout.lessonFont).toBeGreaterThanOrEqual(16);
  expect(layout.containers.filter(({ clientHeight, scrollHeight }) => scrollHeight > clientHeight + 1)).toEqual([]);
}

async function finishStability(page) {
  await page.locator('#loadBtn').click();
  await expect(page.locator('#status')).toContainText('货架歪了');
  await page.locator('#braceBtn').click();
  await page.locator('#loadBtn').click();
  await expect(page.locator('#status')).toContainText('稳稳托住');
  await page.locator('#nextLabBtn').click();
}

async function finishAngles(page) {
  await page.locator('#tearBtn').click();
  await expect(page.locator('#status')).toContainText('= 180°');
  await page.locator('#nextLabBtn').click();
}

test.describe('triangle lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.triangle-lab');
      localStorage.removeItem('kidslab.progress.triangle-lab');
      localStorage.removeItem('kidslab.sound.muted');
    });
    await page.goto('/courseware/triangle-lab/?seed=987');
  });

  test('recovers from failed experiments and completes all three labs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '斜撑让货架不再变形' })).toBeVisible();
    await finishStability(page);

    await expect(page.getByRole('heading', { name: '三个内角拼成一条直线' })).toBeVisible();
    // Grab a generated vertex instead of guessing a canvas position: the triangle is random.
    const canvas = page.locator('#labCanvas');
    const box = await canvas.boundingBox();
    const { triangles } = await levelInstance(page, 'triangle-lab', 1);
    const vertex = triangles[0][0];
    await page.mouse.move(box.x + box.width * vertex.x, box.y + box.height * vertex.y);
    await page.mouse.down();
    // Nudge towards the canvas centre so the new triangle stays inside the stage.
    await page.mouse.move(
      box.x + box.width * (vertex.x + (0.5 - vertex.x) * 0.25),
      box.y + box.height * (vertex.y + (0.5 - vertex.y) * 0.25),
      { steps: 8 },
    );
    await page.mouse.up();
    await expect(page.locator('#status')).toContainText('新形状完成');
    await finishAngles(page);

    await expect(page.getByRole('heading', { name: '两根短边必须够得着' })).toBeVisible();
    // Each stick set is generated when the lab opens, so read it once the stage is showing.
    await expect(page.locator('#status')).toContainText(/两根短边够不够跨过最长边|第 1 组/);
    const { sets } = await levelInstance(page, 'triangle-lab', 2);
    const [first, second, third] = sets.map(({ lengths }) => [...lengths].sort((a, b) => a - b));
    const formulaFor = ([a, b, c]) => `${a} + ${b} ${a + b > c ? '>' : a + b === c ? '=' : '<'} ${c}`;
    const buildable = ([a, b, c]) => a + b > c;

    await page.locator(buildable(first) ? '#cannotBuildBtn' : '#canBuildBtn').click();
    await expect(page.locator('#status')).toContainText('错误判断不会换题');
    // A wrong verdict keeps the same set, and the formula always names the two shorter sides.
    await expect(page.locator('#formula')).toHaveText(formulaFor(first));
    await page.locator(buildable(first) ? '#canBuildBtn' : '#cannotBuildBtn').click();
    // A correct verdict advances, so the confirmation itself names the set that was judged.
    await expect(page.locator('#status')).toContainText(`${first[0]} + ${first[1]}`);

    for (const set of [second, third]) {
      await page.locator(buildable(set) ? '#canBuildBtn' : '#cannotBuildBtn').click();
      await expect(page.locator('#status')).toContainText(/正确/);
      await expect(page.locator('#status')).toContainText(`${set[0]} + ${set[1]}`);
    }

    await expect(page.getByRole('heading', { name: '三角形专家认证！' })).toBeVisible();
    await expect(page.locator('#playAgainBtn')).toBeFocused();
    await expect(page.locator('.course')).toHaveJSProperty('inert', true);
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.triangle-lab') || 'null')?.status)).toBe('completed');
  });

  test('supports sound, language, theme, persistence, and target viewports', async ({ page }) => {
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: 'A Diagonal Brace Stops the Wobble' })).toBeVisible();
    await expect(page.locator('#missionNav')).toHaveAttribute('aria-label', 'Lab stations');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');
    await expectFitsViewport(page);

    await page.locator('#loadBtn').click();
    await page.locator('#braceBtn').click();
    await page.locator('#loadBtn').click();
    await page.locator('#nextLabBtn').click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Three Angles Make a Straight Line' })).toBeVisible();
    await expect(page.locator('#recordCount')).toHaveText('1/3');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectFitsViewport(page);
  });

  test('restores completed labs and can start over', async ({ page }) => {
    await finishStability(page);
    await finishAngles(page);
    const { sets } = await levelInstance(page, 'triangle-lab', 2);
    for (const set of sets) {
      const [a, b, c] = [...set.lengths].sort((x, y) => x - y);
      await page.locator(a + b > c ? '#canBuildBtn' : '#cannotBuildBtn').click();
    }
    await page.reload();
    await expect(page.getByRole('heading', { name: '三角形专家认证！' })).toBeVisible();
    await page.locator('#playAgainBtn').click();
    await expect(page.getByRole('heading', { name: '斜撑让货架不再变形' })).toBeVisible();
    await expect(page.locator('#recordCount')).toHaveText('0/3');
  });
});
