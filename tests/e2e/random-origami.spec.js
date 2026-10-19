import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
test('punch-origami: current punch mirrors, partial unfold resume and finite final pattern',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/punch-origami/?seed=987');const saved=()=>roundRecord(page,'punch-origami');
  for(let level=0;level<4;level++){
    const a=(await saved()).instance;for(let r=0;r<4;r++)for(let c=0;c<4;c++){
      let x=c+.5,y=r+.5;for(const f of a.folds){if(f[0]==='v'){const axis=f==='v50'?2:1;if(x>axis)x=2*axis-x;}else{const axis=f==='h50'?2:1;if(y>axis)y=2*axis-y;}}
      if(x===a.punch.c+.5&&y===a.punch.r+.5)await page.locator(`[data-cell="${c},${r}"]`).click();
    }
    await page.reload();await page.locator('#checkBtn').click();await expect(page.locator('#unfoldSlider')).toBeVisible();
    await page.locator('#unfoldSlider').fill('50');await page.reload();expect((await saved()).play.unfoldProgress).toBe(50);await page.locator('#unfoldSlider').fill('100');
    if(level<3)await page.locator('#nextBtn').click();
  }
  await expect(page.locator('#completeModal')).toBeVisible();const old=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);
    // Four folds on the retained 4x4 grid have exactly one meaningful 16-hole pattern.
    expect((await saved()).fingerprint).toBe(old.fingerprint);expect((await saved()).play.selected).toEqual([]);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.punch-origami')).completed)).toEqual([0,1,2,3]);await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
