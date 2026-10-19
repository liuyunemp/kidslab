import { test, expect } from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';

// The silhouette is generated, so the target position comes from the stored instance.
const targetsFor = async page => (await roundRecord(page, 'tangram-theater')).instance.targets;

async function placeActWithHints(page, count = 7) {
  const hint = page.getByRole('button', { name: '灯笼提示：帮我放一块' });
  for (let piece = 0; piece < count; piece += 1) await hint.click();
}

async function dragFirstPieceHome(page, { to = { x: 0.35, y: 0.45 }, rotate = 3 } = {}) {
  // A rejected drag snaps the piece back to the shelf over a short animation, so wait for the
  // shelf to be settled before grabbing it again.
  await expect(page.locator('#stage')).toHaveAttribute('data-armed-target', '-1');
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: '大三角一' }).click();
  if (rotate) await page.getByRole('button', { name: '向左转' }).click({ clickCount: rotate });
  const box = await page.locator('#stage').boundingBox();
  const start = {
    x: box.x + box.width * 0.12 + Math.min(box.width, box.height) * 0.035,
    y: box.y + box.height * 0.84,
  };
  const target = { x: box.x + box.width * to.x, y: box.y + box.height * to.y };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
}
async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    theaterBottom: document.querySelector('.game-shell').getBoundingClientRect().bottom,
    canvasHeight: document.querySelector('#stage').getBoundingClientRect().height,
    hintBottom: document.querySelector('#hintBtn').getBoundingClientRect().bottom,
    controlHeights: [...document.querySelectorAll('.control')].map((control) =>
      control.getBoundingClientRect().height),
    barButtons: ['#soundBtn', '#themeBtn', '#langBtn'].map((selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    }),
  }));
  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.theaterBottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.canvasHeight).toBeGreaterThan(200);
  expect(layout.hintBottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(Math.min(...layout.controlHeights)).toBeGreaterThanOrEqual(44);
  // 375px 下每个顶栏按钮都必须真的能点到，不能漏到视口外。
  for (const button of layout.barButtons) {
    expect(button.left).toBeGreaterThanOrEqual(0);
    expect(button.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
  }
}

test.describe('tangram shadow play', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.tangram-theater');
      localStorage.removeItem('kidslab.progress.tangram-theater');
      localStorage.removeItem('kidslab.tangram-theater.audio.muted');
    });
    await page.goto('/courseware/tangram-theater/?seed=987');
  });

  test('misplaced pieces explain what is wrong instead of snapping back silently', async ({ page }) => {
    await expect(page.locator('#pieceShelf .piece-button')).toHaveCount(7);
    await page.getByRole('option', { name: '大三角一' }).click();

    // 点空白舞台不该把木片瞬移过去，也不该改变进度。
    const before = await page.locator('#stage').evaluate((stage) => stage.dataset.focusedTarget);
    await page.locator('#stage').click({ position: { x: 18, y: 18 } });
    await expect(page.locator('#progressCount')).toHaveText('0/7');
    await expect(page.locator('#stage')).toHaveAttribute('data-focused-target', before);

    // 拖到离目标很远的地方：插回后台，并说明"再靠近一些"。
    const [tx, ty] = (await targetsFor(page))[0];
    await dragFirstPieceHome(page, { to: { x: 0.9, y: 0.2 }, rotate: 0 });
    await expect(page.locator('#progressCount')).toHaveText('0/7');
    await expect(page.locator('#feedback')).toContainText('再靠近一些');

    // 位置对、角度错：提示要指出是方向问题，而不是笼统的"没对上"。
    await page.getByRole('option', { name: '大三角一' }).click();
    // Try the rotations at the correct spot; a wrong angle must be answered with a direction
    // hint, and one of the eight rotations must settle the piece.
    let placed = false;
    for (let turns = 0; turns <= 7 && !placed; turns += 1) {
      await dragFirstPieceHome(page, { to: { x: tx, y: ty }, rotate: turns });
      const feedback = await page.locator('#feedback').textContent();
      if (/稳稳归位/.test(feedback)) placed = true;
      else expect(feedback).toMatch(/转一转|再靠近一些/);
    }
    expect(placed, 'one of the eight rotations must settle the piece').toBe(true);
    await expect(page.locator('#progressCount')).toHaveText('1/7');
  });

  test('selecting a piece spotlights its own shadow, and dragging arms it', async ({ page }) => {
    await expect(page.locator('#stage')).toHaveAttribute('data-focused-target', '0');
    await page.getByRole('option', { name: '正方形' }).click();
    await expect(page.locator('#stage')).toHaveAttribute('data-focused-target', '5');

    // 拖进吸附半径时剪影进入"就绪"态；离开后又退出。
    await page.getByRole('option', { name: '大三角一' }).click();
    const box = await page.locator('#stage').boundingBox();
    const [x, y] = (await targetsFor(page))[0];
    const target = { x: box.x + box.width * x, y: box.y + box.height * y };
    await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.84);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2, { steps: 6 });
    await expect(page.locator('#stage')).toHaveAttribute('data-armed-target', '-1');
    await page.mouse.move(target.x, target.y, { steps: 6 });
    await expect(page.locator('#stage')).toHaveAttribute('data-armed-target', '0');
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2, { steps: 6 });
    await expect(page.locator('#stage')).toHaveAttribute('data-armed-target', '-1');
    await page.mouse.up();
  });

  test('completes all eight acts using the lantern hint', async ({ page }) => {
    // The lantern hint places one piece per press, so an act needs all seven pieces.
    await placeActWithHints(page, 7);
    await expect(page.getByRole('heading', { name: '桥架起来了！' })).toBeVisible();
    await page.getByRole('button', { name: '下一幕 →' }).click();

    await placeActWithHints(page);
    await expect(page.getByRole('heading', { name: '狐狸抖抖尾巴，活了！' })).toBeVisible();
    await page.getByRole('button', { name: '下一幕 →' }).click();

    await placeActWithHints(page);
    await expect(page.locator('#modal')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kidslab.progress.tangram-theater') || 'null')?.status)).not.toBe('completed');
    for (let act = 4; act <= 8; act++) {
      await page.getByRole('button', { name: '下一幕 →' }).click();
      await placeActWithHints(page);
      await expect(page.locator('#modal')).toBeVisible();
      if (act < 8) expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kidslab.progress.tangram-theater') || 'null')?.status)).not.toBe('completed');
    }
    await expect(page.getByRole('heading', { name: '八幕皮影戏圆满收官！' })).toBeVisible();
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.tangram-theater') || 'null')?.status)).toBe('completed');
  });

  test('keeps the stage readable across theme, language, and viewport sizes', async ({ page }) => {
    await expect(page.locator('#stage')).toBeVisible();
    await expectFitsViewport(page);

    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: 'Tangram Shadow Play' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Act 1 · Bridge' })).toBeVisible();
    await expect(page.locator('#feedback')).toContainText('Every piece has its own shadow');

    // 静音开关可见可访问，且点击后立即反映在 aria-pressed 与图标上。
    const sound = page.locator('#soundBtn');
    await expect(sound).toBeVisible();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await expect(sound).toHaveAttribute('aria-label', /./);
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await expect(sound).toHaveText('🔇');
    expect(await sound.evaluate((button) => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);

    await expectFitsViewport(page);
  });
});
