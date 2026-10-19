import { test, expect } from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';

async function tapItem(page, name) {
  await page.getByRole('button', { name, exact: true }).click();
}

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    hintBottom: document.querySelector('#hintBtn').getBoundingClientRect().bottom,
  }));
  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.hintBottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
}

test.describe('combo closet multiplication principle', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.setItem('kidslab.sound.muted', 'true');
      localStorage.removeItem('kidslab.combo-closet');
      localStorage.removeItem('kidslab.progress.combo-closet');
    });
    await page.goto('/courseware/combo-closet/?seed=987');
    // The closet publishes its generated round after the page module runs; wait for the shelf
    // before any test reads the stored instance.
    await expect(page.locator('[data-hat]').first()).toBeVisible();
  });

  test('recovers from a duplicate and completes collecting and both stock orders', async ({ page }) => {
    test.slow();
    for(let level=0;level<2;level++){
      const a=(await roundRecord(page,'combo-closet')).instance;
      const hat=page.locator('[data-hat="'+a.hats[0]+'"]'),top=page.locator('[data-top="'+a.tops[0]+'"]');
      await hat.click();await top.click();await page.locator('[data-hat="'+a.hats[1]+'"]').click();await hat.click();await expect(page.locator('#feedback')).toContainText('已经上墙');
      for(const h of a.hats)for(const t of a.tops){if((await roundRecord(page,'combo-closet')).play.completed)break;await page.locator('[data-hat="'+h+'"]').click();await page.locator('[data-top="'+t+'"]').click();}
      await expect(page.locator('#modal')).toBeVisible();await page.getByRole('button',{name:'下一张造型单'}).click();
    }
    const a=(await roundRecord(page,'combo-closet')).instance;
    await page.getByRole('button',{name:'📦 提交进货单',exact:true}).click();await expect(page.locator('#feedback')).toContainText('还差');
    const hats=await page.locator('[data-hat-stock]').evaluateAll(es=>es.map(e=>Number(e.dataset.hatStock))),tops=await page.locator('[data-top-stock]').evaluateAll(es=>es.map(e=>Number(e.dataset.topStock)));
    const pairs=hats.flatMap(h=>tops.filter(t=>h*t===a.target).map(t=>[h,t]));expect(pairs.length).toBeGreaterThanOrEqual(2);
    for(let i=0;i<2;i++){
      const [h,t]=pairs[i];await page.locator('[data-hat-stock="'+h+'"]').click();await page.locator('[data-top-stock="'+t+'"]').click();await page.getByRole('button',{name:'📦 提交进货单',exact:true}).click();
      if(i===0){await page.getByRole('button',{name:'📦 提交进货单',exact:true}).click();await expect(page.locator('#feedback')).toContainText('已经盖过章');}
    }
    await expect(page.locator('#modal')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.progress.combo-closet')).status)).toBe('completed');
  });

  test('switches language, theme and sound while keeping the core play area in view', async ({ page }) => {
    await expect(page.locator('#comboTree')).toBeVisible();
    await expectFitsViewport(page);

    const sound = page.locator('#soundBtn');
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByText('Hat rack', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectFitsViewport(page);
  });
});
