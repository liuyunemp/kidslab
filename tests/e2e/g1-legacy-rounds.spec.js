import { test, expect } from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';

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
  await page.goto('/courseware/pattern-caterpillar/?seed=987');
  for (let level=0;level<8;level++) {
    const a=(await roundRecord(page,'pattern-caterpillar')).instance,{bites}=a;
    const choice=async bite=>{const choices=await page.locator('[data-choice]').evaluateAll(es=>es.map(e=>JSON.parse(e.dataset.item)));return choices.findIndex(c=>JSON.stringify(c)===JSON.stringify(a.pattern[(bite+4)%a.pattern.length]));};
    await expect(page.locator('#basicProgress')).toHaveText(`基础 ${level}/8`);
    await expect(page.locator('.levelchip.on')).toHaveAttribute('data-level', String(level));
    if (level === 0) {
      await page.locator('[data-choice="'+((await choice(0)+1)%3)+'"]').click();
      await expect(page.locator('#biteCount')).toHaveText('0/8');
    }
    for (let bite = 0; bite < bites; bite++) {
      await page.locator(`[data-choice="${await choice(bite)}"]`).click();
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
  await page.goto('/courseware/shadow-theater/?seed=987');
  await expect(page.locator('#levelBadge')).toHaveText('第 1/10 幕');
  for (let level = 0; level < 10; level++) {
    await expect(page.locator('#levelBadge')).toHaveText(`第 ${level + 1}/10 幕`);
    const a=(await roundRecord(page,'shadow-theater')).instance;
    if(a.kind==='reverse')await page.locator('[data-shape="'+a.answer+'"]').click();
    else{
      await page.locator('[data-shape="'+(a.block??'cube')+'"]').click();
      const rotation=(await roundRecord(page,'shadow-theater')).play.rotation,targetX=a.pose==='axis'?Math.PI/2:0;
      const c=page.locator('#scene'),box=await c.boundingBox(),x=box.x+box.width*.65,y=box.y+box.height*.5;
      await page.mouse.move(x,y);await page.mouse.down();const end={pointerId:1,clientX:x-rotation[1]/.012,clientY:y+(targetX-rotation[0])/.012};
      await c.dispatchEvent('pointermove',end);await c.dispatchEvent('pointermove',end);await page.mouse.up();await page.locator('#checkBtn').click();
    }
    // Stars count the acts solved so far, so each act adds exactly one.
    await expect(page.locator('#stars')).toHaveText(`⭐ ${level + 1}`);
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
