import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
for(const id of ['magic-cube','pyramid-cube'])test(`${id}: current instance, atomic hint reload, demo, retry and new round`,async({page})=>{
 test.setTimeout(150000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(id=>{localStorage.setItem(`kidslab.${id}.guided`,'1');},id);
 await page.goto(`/courseware/${id}/?seed=987`);await expect(page.locator('.random-round-menu summary')).toBeVisible();
 const guide=page.locator('#guideBtn');if(await guide.isVisible())await guide.click();
 if(await page.locator('#panelHandle').getAttribute('aria-expanded')==='false')await page.locator('#panelHandle').click();
 if(id==='magic-cube')await page.locator('[data-size="2"]').click();
 const saved=()=>roundRecord(page,id),a=await saved();expect(a.instance.moves.length).toBe(id==='magic-cube'?3:4);
 await page.locator('#hintBtn').click();await expect(page.locator('#moveVal')).toHaveText('1',{timeout:5000});const moved=(await saved()).play.state;
 await page.reload();await expect(page.locator('#moveVal')).toHaveText('1');expect((await saved()).play.state).toEqual(moved);
 if(await page.locator('#panelHandle').getAttribute('aria-expanded')==='false')await page.locator('#panelHandle').click();
 await page.locator('#solveBtn').click();await expect(page.locator('#win')).toBeVisible({timeout:70000});
 expect(await page.evaluate(id=>Object.keys(localStorage).filter(k=>k.startsWith(`kidslab.${id}.completed.`)),id)).toEqual([]);
 await page.locator('#winCloseBtn').click();expect((await saved()).play.state).toEqual(moved);
 // Hints continue along the model's current solution; no fixture answer is hard-coded.
 for(let n=0;n<120;n++){if(await page.locator('#win').isVisible())break;await page.locator('#hintBtn').click();await expect(page.locator('#hintBtn')).toBeEnabled({timeout:5000}).catch(async()=>{await expect(page.locator('#win')).toBeVisible();});}
 await expect(page.locator('#win')).toBeVisible();expect(await page.evaluate(id=>Object.keys(localStorage).filter(k=>k.startsWith(`kidslab.${id}.completed.`)).length,id)).toBe(1);
 for(const action of ['retry','new','classic']){
  await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);await expect(page.locator('.random-round-menu summary')).toBeVisible();const r=await saved();
  if(action==='retry')expect(r.instance).toEqual(a.instance);if(action==='new')expect(r.fingerprint).not.toBe(a.fingerprint);if(action==='classic')expect(r.instance.moves).toEqual([]);
 }
 await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
