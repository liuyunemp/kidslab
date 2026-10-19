import { test, expect } from '@playwright/test';
import {levelInstance} from './random-task-helpers.js';

// The blueprints are generated, so every label and answer is derived from the instance:
// `answers[product]` lists the choices for that product and always contains the product itself.
const blueprint = (page, index) => levelInstance(page, 'grid-tower', index);

async function solveZone(page, label, answer) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('button', { name: String(answer), exact: true }).click();
}

function wrongChoice(instance, product) {
  return instance.answers[product].find((value) => value !== product);
}

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    answerBottom: document.querySelector('#hintBtn').getBoundingClientRect().bottom,
  }));
  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.answerBottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
}

test.describe('grid tower area model', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.setItem('kidslab.sound.muted', 'true');
      localStorage.removeItem('kidslab.grid-tower');
      localStorage.removeItem('kidslab.progress.grid-tower');
    });
    await page.goto('/courseware/grid-tower/?seed=987');
  });

  test('recovers from a wrong partial product and completes all three blueprints', async ({ page }) => {
    // Warm-up tower: a wrong partial product earns a directional hint, the right one lights windows.
    const warmup = await blueprint(page, 0);
    const firstZone = warmup.columns[0] * warmup.rows[0];
    const firstLabel = `${warmup.columns[0]} × ${warmup.rows[0]} = ?`;
    await page.getByRole('button', { name: firstLabel, exact: true }).click();
    await page.getByRole('button', { name: String(wrongChoice(warmup, firstZone)), exact: true }).click();
    await expect(page.locator('#feedback')).toContainText(/数小了|数大了/);
    await page.getByRole('button', { name: String(firstZone), exact: true }).click();
    await expect(page.locator('.zone.is-built .windows i').first()).toBeVisible();
    const laterZone = warmup.columns.at(-1) * warmup.rows.at(-1);
    if (laterZone !== firstZone) {
      await solveZone(page, `${warmup.columns.at(-1)} × ${warmup.rows.at(-1)} = ?`, laterZone);
    }
    await page.getByRole('button', { name: String(warmup.a * warmup.b), exact: true }).click();
    await expect(page.getByRole('heading', { name: '第一栋楼封顶！' })).toBeVisible();
    await expect(page.locator('#modalXray')).toContainText('竖式 X 光');

    // Skyscraper: every zone plus the total.
    await page.getByRole('button', { name: '下一张施工图' }).click();
    const tower = await blueprint(page, 1);
    for (const column of tower.columns) {
      for (const row of tower.rows) {
        const product = column * row;
        await solveZone(page, `${column} × ${row} = ?`, product);
      }
    }
    await page.getByRole('button', { name: String(tower.a * tower.b), exact: true }).click();
    await expect(page.getByRole('heading', { name: '摩天楼全部亮灯！' })).toBeVisible();

    // Demolition: floor-by-floor subtraction, then guess the floor count.
    await page.getByRole('button', { name: '下一张施工图' }).click();
    const demolition = await blueprint(page, 2);
    const demolish = page.getByRole('button', { name: '🧨 拆一层', exact: true });
    await demolish.click();
    await expect(page.locator('#equation')).toContainText(`还剩 ${demolition.total - demolition.per} 间`);
    await demolish.click();
    await expect(page.locator('#equation')).toContainText(`还剩 ${demolition.total - 2 * demolition.per} 间`);
    const tooMany = demolition.answers.total.find((value) => value !== demolition.floors && value > demolition.floors);
    if (tooMany !== undefined) {
      await page.getByRole('button', { name: String(tooMany), exact: true }).click();
      await expect(page.locator('#feedback')).toContainText('太多了');
    }
    await page.getByRole('button', { name: String(demolition.floors), exact: true }).click();
    await expect(page.getByRole('heading', { name: '拆迁规划完成！' })).toBeVisible();
    await expect(page.locator('#equation')).toContainText(`${demolition.total} ÷ ${demolition.per} = ${demolition.floors}`);
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.grid-tower') || 'null')?.status)).toBe('completed');
  });

  test('keeps the core play area inside viewports and toggles sound', async ({ page }) => {
    await expect(page.locator('#tower')).toBeVisible();
    await expect(page.locator('#hintBtn')).toBeVisible();
    await expectFitsViewport(page);

    // A save written before random rounds recorded its own level; replaying it starts that
    // blueprint. The random store is cleared so the legacy level is the only source of truth.
    await page.addInitScript(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('kidslab.random.v1.')) localStorage.removeItem(key);
      }
      localStorage.setItem('kidslab.grid-tower', JSON.stringify({ level: 2, unlocked: 2 }));
    });
    await page.reload();
    await expect(page.locator('#demolishBtn')).toBeVisible();
    await expectFitsViewport(page);

    const sound = page.locator('#soundBtn');
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
  });
});
