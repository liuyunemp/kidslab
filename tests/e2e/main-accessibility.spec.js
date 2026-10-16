import { test, expect } from '@playwright/test';

test('main list remains readable and operable in both languages and themes', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#grid .card').first()).toBeVisible();
  const mobile = testInfo.project.name === 'mobile';
  for (const lang of ['zh', 'en']) {
    if (!(await page.locator('html').getAttribute('lang')).startsWith(lang)) await page.locator('#langBtn').click();
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#themeBtn').click();
      await expect(page.locator('#searchInput')).toHaveCSS('font-size', '16px');
      const metrics = await page.evaluate(() => {
        const selectors = ['#themeBtn', '#langBtn', '#menuBtn', '#gradeList button', '#searchInput', '.card__title'];
        return selectors.map((selector) => {
          const el = document.querySelector(selector), r = el.getBoundingClientRect();
          return { selector, width: Math.round(r.width * 1000) / 1000, height: Math.round(r.height * 1000) / 1000, font: parseFloat(getComputedStyle(el).fontSize) };
        });
      });
      for (const item of metrics.filter((item) => item.width)) {
        expect(item.font, item.selector).toBeGreaterThanOrEqual(16);
        if (!['#searchInput', '.card__title'].includes(item.selector)) {
          expect(item.width, item.selector).toBeGreaterThanOrEqual(44);
          expect(item.height, item.selector).toBeGreaterThanOrEqual(44);
        }
      }
      if (mobile) {
        expect(metrics.find((item) => item.selector === '#searchInput').width).toBeGreaterThan(230);
        await page.locator('#menuBtn').click();
        await expect(page.locator('#menuBtn')).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#sidebar .brand')).toBeFocused();
      }
      const undersized = await page.locator('#sidebar').evaluate((sidebar) => [...sidebar.querySelectorAll('button')]
        .filter((el) => el.getClientRects().length)
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width < 43.999 || r.height < 43.999; })
        .map((el) => el.textContent));
      expect(undersized).toEqual([]);
      if (mobile) {
        await page.keyboard.press('Escape');
        await expect(page.locator('#menuBtn')).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#menuBtn')).toBeFocused();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await expect(page.locator('#menuBtn')).toHaveAttribute('aria-label', 'Open menu');
});
