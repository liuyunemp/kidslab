import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
test('angle-golf: constructed paths, failed shot, refresh during animation, retry and new same-difficulty hole',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/angle-golf/?seed=987');const saved=()=>roundRecord(page,'angle-golf');
  for(let i=0;i<3;i++){
    const a=(await saved()).instance,[p,q]=a.path,answer=Math.round(Math.atan2(p.y-q.y,q.x-p.x)*180/Math.PI);
    await page.locator('#angleInput').fill(String(answer+10));await page.locator('#shootBtn').click();await expect(page.locator('#shootBtn')).toBeEnabled();expect((await saved()).play.holeWon).toBe(false);
    await page.locator('#angleInput').fill(String(answer));await page.locator('#shootBtn').click();await page.reload();expect((await saved()).play.holeWon).toBe(true);
    if(i<2)await page.locator('#shootBtn').click();
  }
  await expect(page.locator('#completeModal')).toBeVisible();const old=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.holeWon).toBe(false);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);
    if(action==='classic')expect((await saved()).instance.answer).toBe(60);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.angle-golf')).completed)).toEqual([0,1,2]);
  await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);expect(errors).toEqual([]);
});
