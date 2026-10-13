import { test, expect } from '@playwright/test';

const patterns = [
  { sequence: [0, 1], bites: 8 },
  { sequence: [0, 1], bites: 8 },
  { sequence: [0, 1, 2], bites: 9 },
  { sequence: [0, 1, 1], bites: 9 },
  { sequence: [0, 1], bites: 8 },
  { sequence: [0, 0, 1], bites: 9 },
  { sequence: [0, 1, 0, 2], bites: 8 },
  { sequence: [0, 0, 1], bites: 9 },
];

async function status(page, id) {
  return page.evaluate((courseId) => JSON.parse(localStorage.getItem(`kidslab.progress.${courseId}`) || 'null')?.status, id);
}

test('规律毛毛虫：八种规律各喂满一幕，错误与重载不跳关', async ({ page }) => {
  test.setTimeout(180000);
  await page.addInitScript(() => localStorage.setItem('kidslab.lang', 'zh'));
  await page.goto('/courseware/pattern-caterpillar/');
  for (const [level, { sequence, bites }] of patterns.entries()) {
    await expect(page.locator('#basicProgress')).toHaveText(`基础 ${level}/8`);
    await expect(page.locator('.levelchip.on')).toHaveAttribute('data-level', String(level));
    if (level === 0) {
      await page.locator('[data-choice="2"]').click();
      await expect(page.locator('#biteCount')).toHaveText('0/8');
    }
    for (let bite = 0; bite < bites; bite++) {
      await page.locator(`[data-choice="${sequence[(bite + 4) % sequence.length]}"]`).click();
      await expect(page.locator('#biteCount')).toHaveText(`${bite + 1}/${bites}`);
    }
    await expect(page.locator('#modal')).toBeVisible();
    await expect(page.locator('#basicProgress')).toHaveText(`基础 ${level + 1}/8`);
    if (level < 7) expect(await status(page, 'pattern-caterpillar')).not.toBe('completed');
    if (level === 7) break;
    await page.locator('#modalBtn').click();
    if (level === 2) {
      await page.reload();
      await expect(page.locator('.levelchip.on')).toHaveAttribute('data-level', '3');
      await expect(page.locator('#basicProgress')).toHaveText('基础 3/8');
    }
  }
  expect(await status(page, 'pattern-caterpillar')).toBe('completed');
});

test('立体影子剧场：十幕实际演出后才结课', async ({ page }) => {
  test.setTimeout(180000);
  await page.addInitScript(() => localStorage.setItem('kidslab.lang', 'zh'));
  await page.goto('/courseware/shadow-theater/');
  await expect(page.locator('#levelBadge')).toHaveText('第 1/10 幕');
  await page.locator('.shape-btn').filter({ hasText: '正方体' }).click();
  await page.locator('#checkBtn').click();
  await expect(page.locator('#stars')).toBeEmpty();
  await page.locator('.shape-btn').filter({ hasText: '球' }).click();

  for (let level = 0; level < 10; level++) {
    await expect(page.locator('#levelBadge')).toHaveText(`第 ${level + 1}/10 幕`);
    if ([3, 5].includes(level)) {
      const box = await page.locator('#scene').boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + 125, { steps: 20 });
      await page.mouse.up();
    }
    if (await page.locator('#magic').isVisible()) await page.locator('#closeMagic').click();
    if (level === 8) await page.locator('.shape-btn').filter({ hasText: '圆柱' }).click();
    else await page.locator('#checkBtn').click();
    await expect(page.locator('#stars')).toHaveText('⭐'.repeat(level + 1));
    if (level < 9) expect(await status(page, 'shadow-theater')).not.toBe('completed');
    if (level === 9) break;
    if (await page.locator('#magic').isVisible()) await page.locator('#closeMagic').click();
    await page.locator('#nextBtn').click();
    if (level === 2) {
      await page.reload();
      await expect(page.locator('#levelBadge')).toHaveText('第 4/10 幕');
    }
  }
  expect(await status(page, 'shadow-theater')).toBe('completed');
});
