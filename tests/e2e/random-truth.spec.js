import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
test('truth-island: consistent badges, OR evidence and either treasure road, resume and retry',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/truth-island/?seed=987');const saved=()=>roundRecord(page,'truth-island');
  let a=(await saved()).instance;
  const solutions=[true,false].map(mia=>({mia,noah:!mia})).filter(roles=>a.claims.every((c,i)=>(c.kind==='same'?false:c.kind==='different'?true:roles[c.person]===c.truth)===roles[i?'noah':'mia']));expect(solutions.length).toBe(1);
  for(const person of ['mia','noah'])await page.locator(`[data-person="${person}"][data-role="${solutions[0][person]?'truth':'liar'}"]`).click();await page.reload();await page.locator('#checkBtn').click();await page.locator('#nextBtn').click();
  a=(await saved()).instance;expect(a.gateOpen===a.gateClaim).toBe(false);await page.locator(`[data-road="${a.road==='left'?'right':'left'}"]`).click();expect((await saved()).play.solved).toBe(false);await page.locator(`[data-road="${a.road}"]`).click();await page.locator('#nextBtn').click();
  await page.locator('[data-question="0"]').click();expect((await saved()).play.magicAsked).toBe(false);await page.locator('[data-question="2"]').click();await page.reload();expect((await saved()).play.magicAsked).toBe(true);await page.locator('#langBtn').click();await page.locator('#themeBtn').click();
  a=(await saved()).instance;await expect(page.locator('.point-arrow').first()).toHaveText(a.road==='left'?'➜':'⬅');await page.locator(`[data-final-road="${a.road}"]`).click();await expect(page.locator('#modal')).toBeVisible();const old=await saved();
  for(const action of ['retry','new','classic']){await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);const r=await saved();expect(r.play.solved).toBe(false);expect(r.play.magicAsked).toBe(false);if(action==='retry')expect(r.fingerprint).toBe(old.fingerprint);if(action==='new')expect(r.fingerprint).not.toBe(old.fingerprint);if(action==='classic')expect(r.instance.road).toBe('left');}
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.truth-island')).completed)).toEqual([0,1,2]);expect(errors).toEqual([]);
});
