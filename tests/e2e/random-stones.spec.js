import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
test('fox-stones: five rules, deterministic opponent, refresh mid-move and idempotent replay',async({page})=>{
  test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/fox-stones/?seed=987');const saved=()=>roundRecord(page,'fox-stones');if(await page.locator('#dismissRules').isVisible())await page.locator('#dismissRules').click();
  for(let mode=0;mode<5;mode++){
    if(mode>0){await page.locator('#closeReplay').click();await page.locator('#modeSummary').click();await page.locator(`[data-mode="${mode}"]`).click();}
    const a=(await saved()).instance,winning=[a.misere];for(let n=1;n<=29;n++)winning[n]=Array.from({length:Math.min(n,a.max)},(_,i)=>!winning[n-i-1]).some(Boolean);
    if(a.chooser)await page.locator(winning[a.initial]?'#humanFirst':'#foxFirst').click();
    for(let step=0;step<30;step++){
      await expect.poll(async()=>{const s=(await saved()).play;return s.over||s.turn!=='fox';}).toBe(true);
      const s=(await saved()).play;if(s.over)break;const take=Array.from({length:Math.min(s.stones,a.max)},(_,i)=>i+1).find(n=>!winning[s.stones-n])??1;
      await page.locator(`[data-take="${take}"]`).click();
      if(step===0){const committed=(await saved()).play.history;await page.reload();expect((await saved()).play.history.slice(0,committed.length)).toEqual(committed);}
    }
    await expect(page.locator('#replayModal')).toBeVisible();expect((await saved()).play.stones).toBe(0);
  }
  const old=await saved(),games=await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.foxstones')).games);
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.stones).toBe(old.instance.initial);}if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);if(action==='classic')expect((await saved()).instance.initial).toBe(17);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.foxstones')).games)).toBe(games);await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
