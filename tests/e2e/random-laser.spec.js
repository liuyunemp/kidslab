import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
function route(a){
  if(a.code==='L-01')return {[`${a.targets[0].x},${a.source.y}`]:a.targets[0].y<a.source.y?'/':'\\'};
  if(a.code==='L-02')return {[`1,${a.source.y}`]:'\\',[`1,${a.targets[0].y}`]:'\\'};
  const split=a.fixed.find(f=>f.type==='splitter');return {[`${a.targets[0].x},${a.source.y}`]:a.code==='L-03'?'\\':'/',[`${split.x},${a.targets[1].y}`]:a.code==='L-03'?'\\':'/'};
}
test('laser-mirrors: all four generated routes, instant firing snapshot and unchanged achievements on replay',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/laser-mirrors/?seed=987');const saved=()=>roundRecord(page,'laser-mirrors');
  for(let i=0;i<4;i++){
    const a=(await saved()).instance;await page.locator('#powerBtn').click();expect((await saved()).play.fired).toBe(false);await page.locator('#hintBtn').click();
    for(const [key,mirror] of Object.entries(route(a))){await page.locator(`[data-tool="${mirror==='/'?'slash':'backslash'}"]`).click();await page.locator(`[data-cell="${key}"]`).click();}
    await page.reload();expect(Object.fromEntries((await saved()).play.mirrors)).toEqual(route(a));await page.locator('#powerBtn').click();await page.reload();expect((await saved()).play.fired).toBe(true);
    if(i<3)await page.locator('#nextBtn').click();
  }
  await expect(page.locator('#completeModal')).toBeVisible();const old=await saved();for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);const r=await saved();expect(r.play.mirrors).toEqual([]);expect(r.play.fired).toBe(false);if(action==='retry')expect(r.fingerprint).toBe(old.fingerprint);if(action==='new')expect(r.fingerprint).not.toBe(old.fingerprint);if(action==='classic')expect(r.instance.source.y).toBe(2);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.laser-mirrors')).completed)).toEqual([0,1,2,3]);await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
