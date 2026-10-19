import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
test('huarong: current-board hints, demo restores play, reload, retry and new layout',async({page})=>{
  test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{localStorage.setItem('kidslab.huarong-dao.guided','1');localStorage.setItem('kidslab.huarong-dao.music','0');});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/courseware/huarong-dao/?seed=987');await page.locator('[data-level="practice"]').click();await expect(page.locator('[data-level="practice"]')).toHaveClass(/is-on/);
  const saved=()=>roundRecord(page,'huarong-dao'),a=await saved();
  async function hint(){await page.locator('#hintBtn').click();const button=page.locator('#movePad button.is-hint:not(:disabled)');await expect(button).toHaveCount(1);await button.click();await expect.poll(()=>page.evaluate(()=>!document.querySelector('#undoBtn').disabled||!document.querySelector('#win').hidden)).toBe(true);}
  await hint();const moved=(await saved()).play.state;await page.reload();await expect(page.locator('#moveValue')).toHaveText('1');expect((await saved()).play.state).toEqual(moved);
  await page.locator('#demoBtn').click();await expect(page.locator('#demoBar')).toBeVisible();await page.locator('#demoExitBtn').click();expect((await saved()).play.state).toEqual(moved);
  for(let n=1;n<a.instance.solution.length;n++)await hint();await expect(page.locator('#win')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('kidslab.huarong-dao.completed.practice'))).toBe('1');
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);await expect(page.locator('#moveValue')).toHaveText('0');
    const r=await saved();if(action==='retry')expect(r.instance).toEqual(a.instance);if(action==='new')expect(r.fingerprint).not.toBe(a.fingerprint);if(action==='classic')expect(r.instance.solution.length).toBe(12);
  }
  await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
