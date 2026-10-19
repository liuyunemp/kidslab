import { test, expect } from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';

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
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  // mobile may allow vertical scroll for this denser party UI
  if (layout.viewportWidth >= 800) {
    expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  }
  expect(layout.controls.filter(({ width }) => width < 44)).toEqual([]);
  expect(layout.controls.filter(({ height }) => height < 44)).toEqual([]);
  expect(Math.min(...layout.controls.map(({ font }) => font))).toBeGreaterThanOrEqual(16);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.lessonFont).toBeGreaterThanOrEqual(14);
}

test.describe('bet party', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.bet-party');
      localStorage.removeItem('kidslab.progress.bet-party');
      localStorage.removeItem('kidslab.sound.muted');
    });
    await page.goto('/courseware/bet-party/?seed=987');
    await expect.poll(() => page.evaluate(() => !!window.__BET_PARTY__)).toBe(true);
  });

  test('constructs worst-case months, recovers from wrong sock bet, then proves sure line', async ({ page }) => {
    const a=(await roundRecord(page,'bet-party')).instance;await expect(page.locator('#missionTitle')).toContainText(String(a.drawers));

    // Place one guest in each of 12 months
    for (let i = 0; i < a.drawers; i += 1) {
      await page.locator('#inviteBtn').click();
      await page.locator(`[data-drawer="${i}"]`).click();
      if (i === 0) {
        await expect(page.locator('#status')).toHaveText(/这个抽屉现在有 1 只/);
      }
    }
    await expect.poll(() => page.evaluate(() => window.__BET_PARTY__.getState().total)).toBe(a.drawers);
    await expect(page.locator('#status')).toContainText('各 1');

    // 13th forces collision
    await page.locator('#inviteBtn').click();
    await page.locator('[data-drawer="0"]').click();
    await expect.poll(() => page.evaluate(() => window.__BET_PARTY__.getState().phase)).toBe('won');
    await expect(page.locator('#status')).toContainText(/撞上|魔法时刻/);
    await expect(page.locator('#nextBtn')).toBeVisible();

    // Mission 2 socks: wrong bet recovers, right bet demos
    await page.locator('#nextBtn').click();
    await expect(page.locator('#missionTitle')).not.toBeEmpty();
    await expect(page.locator('#betForm')).toBeVisible();

    const b=(await roundRecord(page,'bet-party')).instance;await page.locator('#inputPigeons').fill(String(b.drawers*(b.need-1)));await page.locator('#openBetBtn').click();
    await expect(page.locator('#status')).toContainText('还不够稳');

    await page.locator('#inputPigeons').fill(String(b.drawers*(b.need-1)+1));await page.locator('#openBetBtn').click();
    await expect.poll(async () => page.evaluate(() => window.__BET_PARTY__.getState().busy)).toBe(false);
    await expect.poll(() => page.evaluate(() => window.__BET_PARTY__.getState().phase)).toBe('won');
    await expect.poll(() => page.evaluate(() => window.__BET_PARTY__.getState().total)).toBe(b.drawers*(b.need-1)+1);
    await expect(page.locator('#status')).toContainText(/最坏|稳赢|看/);
  });

  test('supports bilingual theme toggle and fits desktop/mobile viewports', async ({ page }) => {
    await expectFitsViewport(page);

    await page.locator('#langBtn').click();
    await expect(page.locator('#missionTitle')).toContainText(String((await roundRecord(page,'bet-party')).instance.drawers));
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.setViewportSize({ width: 375, height: 667 });
    await expectFitsViewport(page);
  });
});
