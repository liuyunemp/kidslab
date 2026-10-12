import { test, expect } from '@playwright/test';

const course = '/courseware/g1-math/';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kidslab.lang', 'zh'));
});

test('counting gives one reward even after repeated taps', async ({ page }) => {
  await page.goto(course);
  await expect(page.locator('#coach')).toHaveText('数一数，有几个苹果？');
  await page.locator('#options button[data-opt="5"]').evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.locator('#starCount')).toHaveText('1');
  await expect(page.locator('#coinCount')).toHaveText('5');
  await expect(page.locator('#options button[data-opt="5"]')).toBeDisabled();
});

test('wrong money choice stays retryable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kidslab.g1.done.g1-math', JSON.stringify(Array(27).fill(true)));
  });
  await page.goto(course);
  const options = page.locator('#options button');
  await expect(options).toHaveCount(3);
  expect(await options.evaluateAll((buttons) => buttons.map((button) => button.dataset.opt)))
    .toEqual(['200', '100', '150']);
  await page.getByRole('button', { name: '1元', exact: true }).click();
  await expect(page.locator('#starCount')).toHaveText('0');
  await page.getByRole('button', { name: '2元', exact: true }).click();
  await expect(page.locator('#starCount')).toHaveText('1');

});

test('tangram target draws a piece', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kidslab.g1.done.g1-math', JSON.stringify(Array(32).fill(true)));
  });
  await page.goto(course);
  await expect(page.locator('#stage .piece > *')).toHaveCount(1);
  await expect(page.locator('#stage circle')).toHaveCount(0);
});
