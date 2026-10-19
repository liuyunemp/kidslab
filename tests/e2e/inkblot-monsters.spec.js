import { test, expect } from '@playwright/test';

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    interactive: [...document.querySelectorAll('button:not([hidden]), a:not([hidden]), canvas:not([hidden])')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: `${element.tagName.toLowerCase()}#${element.id}.${element.className}`,
          width: rect.width,
          height: rect.height,
          font: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      })
      .filter(({ width, height }) => width > 0 && height > 0),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
    missionFont: Number.parseFloat(getComputedStyle(document.querySelector('#missionText')).fontSize),
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.interactive.filter(({ width }) => width < 44)).toEqual([]);
  expect(layout.interactive.filter(({ height }) => height < 44)).toEqual([]);
  expect(Math.min(...layout.interactive.filter(({ font }) => font > 0).map(({ font }) => font))).toBeGreaterThanOrEqual(14);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.missionFont).toBeGreaterThanOrEqual(16);
}

test.describe('inkblot monsters', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.inkblot-monsters');
      localStorage.removeItem('kidslab.progress.inkblot-monsters');
      localStorage.removeItem('kidslab.sound.muted');
    });
    await page.goto('/courseware/inkblot-monsters/?seed=987');
  });

  test('recovers from mistakes and completes all three symmetry missions', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '甩墨再对折' })).toBeVisible();

    await page.locator('#foldBtn').click();
    await expect(page.locator('#status')).toContainText('还差 3 团墨');

    await page.locator('#splashBtn').click({ clickCount: 3 });
    await expect(page.locator('#progressValue')).toHaveText('3/3');
    await page.locator('#foldBtn').click();
    await expect(page.locator('#status')).toContainText('两边完全重合');
    await expect(page.locator('#foldLabel')).toHaveText('下一关');
    await page.locator('#foldBtn').click();

    await expect(page.getByRole('heading', { name: '补回另一半' })).toBeVisible();
    const mirror=await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.random.v1.inkblot-monsters.seed-987')).levels['1'].instance);
    await page.locator(`[data-choice="${(mirror.rounds[0].correct+1)%3}"]`).click();
    const box=await page.locator('#inkCanvas').boundingBox(),scale=Math.min(box.width/900,box.height/460),ox=(box.width-900*scale)/2,oy=(box.height-460*scale)/2;
    const r=mirror.rounds[0];await page.mouse.click(box.x+ox+(450+r.distance)*scale,box.y+oy+r.y*scale);
    for(const r of mirror.rounds.slice(1))await page.locator(`[data-choice="${r.correct}"]`).click();

    // 第 2 关完成后应用会自动进入第 3 关。先等待这次状态转换结束，
    // 再验证导航回切，避免导航点击和 850ms 自动跳关定时器竞速。
    await expect(page.getByRole('heading', { name: '揪出冒牌怪' })).toBeVisible();
    await page.locator('#missionNav button').first().click();
    await expect(page.getByRole('heading', { name: '甩墨再对折' })).toBeVisible();
    await page.locator('#missionNav button').nth(2).click();
    await expect(page.getByRole('heading', { name: '揪出冒牌怪' })).toBeVisible();
    const detective=await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.random.v1.inkblot-monsters.seed-987')).levels['2'].instance);
    await page.locator(`[data-suspect="${(detective.impostor+1)%3}"]`).click();
    await page.locator(`[data-suspect="${detective.impostor}"]`).click();

    await expect(page.getByRole('heading', { name: '轴对称驯兽师！' })).toBeVisible();
    await expect(page.locator('#playAgainBtn')).toBeFocused();
    await expect(page.locator('.course')).toHaveJSProperty('inert', true);
    await expect(page.getByRole('button', { name: '三折彩蛋' })).toBeVisible();
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.inkblot-monsters') || 'null')?.status)).toBe('completed');

    await page.locator('#playAgainBtn').click();
    await expect(page.locator('#completeModal')).toBeHidden();
    await expect(page.locator('.course')).toHaveJSProperty('inert', false);
    await expect(page.locator('#splashBtn')).toBeFocused();
  });

  test('supports canvas input, hints, sound, language, and theme controls', async ({ page }) => {
    const canvas = page.locator('#inkCanvas');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.45);
    await expect(page.locator('#progressValue')).toHaveText('1/3');

    await page.locator('#hintBtn').click();
    await expect(page.locator('#status')).toContainText('虚线是对称轴');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');

    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: 'Splash, Then Fold' })).toBeVisible();
    await expect(page.locator('#status')).toContainText('dashed line is the symmetry axis');
    await expect(page.locator('#missionNav')).toHaveAttribute('aria-label', 'Lab missions');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');
    await expect(page.locator('[data-choice="0"]')).toHaveAttribute('aria-label', /Candidate A, \d+ drawing units/);
  });

  test('keeps every mission readable inside both target viewports', async ({ page }) => {
    await expectFitsViewport(page);
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.inkblot-monsters', JSON.stringify({ unlocked: 2, completed: [0, 1] }));
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
