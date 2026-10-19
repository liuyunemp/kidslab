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
    missionFont: Number.parseFloat(getComputedStyle(document.querySelector('#missionText')).fontSize),
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.controls.filter(({ width }) => width < 44)).toEqual([]);
  expect(layout.controls.filter(({ height }) => height < 44)).toEqual([]);
  expect(Math.min(...layout.controls.map(({ font }) => font))).toBeGreaterThanOrEqual(14);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.missionFont).toBeGreaterThanOrEqual(16);
}

test.describe('fraction beat house', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.fraction-beats');
      localStorage.removeItem('kidslab.progress.fraction-beats');
      localStorage.removeItem('kidslab.sound.muted');
    });
    await page.goto('/courseware/fraction-beats/?seed=987');
  });

  test('recovers from an overfull bar and completes all three rhythm missions', async ({ page }) => {
    const saved=()=>roundRecord(page,'fraction-beats');
    for(let i=0;i<3;i++){
      const a=(await saved()).instance;
      if(i===0){
        for(let j=a.initial.reduce((s,n)=>s+n,0);j<8;j++)await page.locator('[data-units="1"]').click();
        await page.locator('[data-units="1"]').click();await expect(page.locator('#status')).toContainText('放不下');await expect(page.locator('#fractionTotal')).toHaveText('1');
        await page.locator('#undoBtn').click();await page.locator('[data-units="1"]').click();
      }else if(i===1){
        await page.locator('#checkBtn').click();expect((await saved()).play.done).toBe(false);
        for(let j=0;j<a.target/a.unit;j++)await page.locator('[data-units="'+a.unit+'"]').click();
      }else{for(const n of a.sequence)await page.locator('[data-units="'+n+'"]').click();await page.locator('#playBtn').click();}
      await page.locator('#checkBtn').click();expect((await saved()).play.done).toBe(true);if(i<2)await page.locator('#nextBtn').click();
    }
    await expect(page.locator('#completeModal')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.progress.fraction-beats')).status)).toBe('completed');
  });

  test('supports clearing, sound, language, theme, and target viewports', async ({ page }) => {
    await page.getByRole('button', { name: '加入四分之一拍' }).click();
    await page.locator('#clearBtn').click();
    await expect(page.locator('#fractionTotal')).toHaveText('0');

    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: 'Fill One Measure' })).toBeVisible();
    await expect(page.locator('#missionNav')).toHaveAttribute('aria-label', 'Missions');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');
    await expectFitsViewport(page);
  });

  test('keeps every mission readable inside both target viewports', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.fraction-beats', JSON.stringify({ unlocked: 2, completed: [0, 1] }));
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
