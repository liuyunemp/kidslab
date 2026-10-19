import {test,expect} from '@playwright/test';
test('classic integer-fen wallet: failed purchase, exchange, return, exact payment and change',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
 await page.goto('/courseware/change-vending/');await page.locator('#activitySelect').selectOption('2');
 await page.locator('#randomControls summary').click();await page.locator('#classicRoundBtn').click();
 const click=(type,coin)=>page.locator(`[data-action="${type}"]${coin?`[data-coin="${coin}"]`:''}`).click();
 await click('buy');await expect(page.locator('#progress')).toHaveText('0/8');
 await click('coin',100);await click('return',100);await expect(page.locator('#stageReadout')).toContainText('托盘 0 元');
 await click('exchange',100);await click('coin',100);for(let i=0;i<5;i++)await click('coin',10);
 await click('buy');await expect(page.locator('#progress')).toHaveText('1/8');await expect(page.locator('#stageReadout')).toContainText('手里 5 角');
 await page.locator('#resetBtn').click();await click('coin',100);await click('coin',100);await click('buy');await expect(page.locator('#stageReadout')).toContainText('手里 5 角');
 await expect(page.locator('#progress')).toHaveText('1/8');
});
test('jiao discovery requires exchanging a jiao; free budget can recover after insufficient funds',async({page})=>{
 await page.goto('/courseware/change-vending/');await page.locator('#activitySelect').selectOption('1');
 await page.locator('[data-action=exchange][data-coin="10"]').click();await expect(page.locator('#progress')).toHaveText('1/8');
 await page.locator('#freeBtn').click();await page.locator('#budget').fill('100');await page.locator('#price').fill('150');await page.locator('[data-action=budget]').click();
 await page.locator('[data-action=coin][data-coin="100"]').click();await page.locator('[data-action=buy]').click();await expect(page.locator('#progress')).toHaveText('1/8');
 await page.locator('#budget').fill('1000');await page.locator('[data-action=budget]').click();await page.locator('[data-action=coin][data-coin="1000"]').click();await page.locator('[data-action=buy]').click();await expect(page.locator('#progress')).toHaveText('1/8');
});
