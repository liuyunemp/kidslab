import { test, expect } from '@playwright/test';
import {levelInstance} from './random-task-helpers.js';

// The model solves each room as `"x,y": "/"|"\\"`; the grid uses the same coordinates.
const mirrorsFor = async (page, index) => {
  const { solution } = await levelInstance(page, 'laser-mirrors', index);
  return Object.entries(solution).map(([cell, mirror]) => ({
    cell,
    tool: mirror === '/' ? 'slash' : 'backslash',
  }));
};

async function placeMirrors(page, mirrors) {
  for (const mirror of mirrors) {
    await page.locator(`[data-tool="${mirror.tool}"]`).click();
    await page.locator(`[data-cell="${mirror.cell}"]`).click();
  }
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

test.describe('laser mirror house', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('laser-mirrors-test-ready')) {
        localStorage.removeItem('kidslab.laser-mirrors');
        sessionStorage.setItem('laser-mirrors-test-ready', 'true');
      }
      if (!localStorage.getItem('kidslab.lang')) localStorage.setItem('kidslab.lang', 'zh');
      if (!localStorage.getItem('kidslab.theme')) localStorage.setItem('kidslab.theme', 'light');
    });
    await page.goto('/courseware/laser-mirrors/?seed=987');
  });

  test('recovers from an unfinished route and lights every crystal', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '一面镜子，第一次转弯' })).toBeVisible();

    await page.locator('#powerBtn').click();
    await expect(page.locator('#status')).toContainText('还没有摆镜子');

    // A single mirror on the wrong cell leaves the beam short of the crystal.
    const room = await levelInstance(page, 'laser-mirrors', 0);
    const [wanted] = Object.keys(room.solution);
    const blocked = new Set([
      ...room.fixed.map((item) => `${item.x},${item.y}`),
      ...room.targets.map((item) => `${item.x},${item.y}`),
    ]);
    const wrongCell = Array.from({ length: 8 }, (_, x) => x)
      .flatMap((x) => Array.from({ length: 6 }, (_, y) => `${x},${y}`))
      .find((cell) => cell !== wanted && !blocked.has(cell));
    await page.locator('[data-tool="slash"]').click();
    await page.locator(`[data-cell="${wrongCell}"]`).click();
    await page.locator('#powerBtn').click();
    await expect(page.locator('#status')).toContainText('还没点亮');
    await page.locator('#clearBtn').click();

    for (let level = 0; level < 4; level += 1) {
      const mirrors = await mirrorsFor(page, level);
      // Room 4 splits the beam through a colour filter, so a legal-mirror placement can still
      // route the wrong colour into a crystal.
      if (level === 3) {
        const crossed = mirrors.map((mirror) => ({
          ...mirror,
          tool: mirror.tool === 'slash' ? 'backslash' : 'slash',
        }));
        await placeMirrors(page, crossed);
        await page.locator('#powerBtn').click();
        await expect(page.locator('#status')).toContainText(/颜色不匹配|还没点亮|全部点亮/);
        await page.locator('#clearBtn').click();
      }
      await placeMirrors(page, mirrors);
      await page.locator('#powerBtn').click();
      await expect(page.locator('#status')).toContainText('全部点亮');
      if (level < 3) await page.locator('#nextBtn').click();
    }

    await expect(page.getByRole('heading', { name: '全屋水晶依次亮起来了！' })).toBeVisible();
    await expect(page.locator('#playAgainBtn')).toBeFocused();
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.laser-mirrors') || 'null')?.status)).toBe('completed');
  });

  test('supports sound, language, theme, persistence, and required viewport', async ({ page }) => {
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: 'One Mirror, One First Turn' })).toBeVisible();
    await expect(page.locator('#gridBoard')).toHaveAttribute('aria-label', 'Mirror placement grid');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');
    await expectFitsViewport(page);

    await placeMirrors(page, await mirrorsFor(page, 0));
    await page.locator('#powerBtn').click();
    await expect(page.locator('#status')).toContainText('All crystals are glowing');
    await page.locator('#nextBtn').click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Two Turns Around the Wall' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
