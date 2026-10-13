import { test, expect } from '@playwright/test';

const metro = [[23, 67], [84, 31], [16, 52], [45, 79], [92, 38], [11, 99], [58, 14], [37, 82]];
const clock = [[380, 420], [445, 480], [700, 750], [875, 915], [1090, 1125], [1215, 1260], [340, 390], [545, 600]];

async function platformStatus(page, id) {
  return page.evaluate((courseId) => JSON.parse(localStorage.getItem(`kidslab.progress.${courseId}`) || 'null')?.status, id);
}

test('百数地铁：八条不同路线、越界恢复、重载续玩后结课', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kidslab.lang', 'zh');
  });
  await page.goto('/courseware/hundred-metro/');
  for (const [index, [start, target]] of metro.entries()) {
    await expect(page.locator('#levelText')).toHaveText(`${index + 1}/8`);
    if (index === 0) {
      await page.locator('[data-delta="-10"]').click();
      await page.locator('[data-delta="-10"]').click();
      await expect(page.locator('#currentText')).toHaveText('3');
      await expect(page.locator('[data-delta="-10"]')).toBeDisabled();
      await page.locator('#undoBtn').click();
      await page.locator('#undoBtn').click();
      await expect(page.locator('#currentText')).toHaveText(String(start));
    }
    const row = (n) => Math.floor((n - 1) / 10);
    const col = (n) => (n - 1) % 10;
    const rowDelta = row(target) - row(start);
    const colDelta = col(target) - col(start);
    for (let step = 0; step < Math.abs(rowDelta); step++) await page.locator(`[data-delta="${Math.sign(rowDelta) * 10}"]`).click();
    for (let step = 0; step < Math.abs(colDelta); step++) await page.locator(`[data-delta="${Math.sign(colDelta)}"]`).click();
    await expect(page.locator('#win')).toBeVisible();
    if (index < 7) expect(await platformStatus(page, 'hundred-metro')).not.toBe('completed');
    if (index === 7) break;
    await page.locator('#nextBtn').click();
    if (index === 2) {
      await page.reload();
      await expect(page.locator('#levelText')).toHaveText('4/8');
    }
  }
  expect(await platformStatus(page, 'hundred-metro')).toBe('completed');
});

test('时钟小镇：八张订单、错时恢复、重载续玩后结课', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kidslab.lang', 'zh');
  });
  await page.goto('/courseware/clock-town/');
  for (const [index, [start, target]] of clock.entries()) {
    await expect(page.locator('#levelText')).toHaveText(`${index + 1}/8`);
    if (index === 0) {
      await page.locator('#checkBtn').click();
      await expect(page.locator('#win')).toBeHidden();
      expect(await platformStatus(page, 'clock-town')).not.toBe('completed');
    }
    let delta = target - start;
    for (let step = 0; step < Math.floor(delta / 30); step++) await page.locator('[data-step="30"]').click();
    delta %= 30;
    for (let step = 0; step < delta / 5; step++) await page.locator('[data-step="5"]').click();
    await page.locator('#checkBtn').click();
    await expect(page.locator('#win')).toBeVisible();
    if (index < 7) expect(await platformStatus(page, 'clock-town')).not.toBe('completed');
    if (index === 7) break;
    await page.locator('#nextBtn').click();
    if (index === 2) {
      await page.reload();
      await expect(page.locator('#levelText')).toHaveText('4/8');
    }
  }
  expect(await platformStatus(page, 'clock-town')).toBe('completed');
});
