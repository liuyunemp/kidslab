import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
test('venn-port: generated attributes, all missions, paused demo resume and retained awards',async({page})=>{
  test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/');await page.evaluate(()=>localStorage.setItem('kidslab.venn-port.guided','1'));await page.goto('/courseware/venn-port/?seed=987');const saved=()=>roundRecord(page,'venn-port');
  // The deck is a WebGL scene; under parallel workers it can take a while to become interactive.
  await expect(page.locator('#zoneGrid [data-zone]').first()).toBeVisible({timeout:60000});
  for(let level=0;level<4;level++){
    const a=(await saved()).instance;
    for(let i=0;i<5;i++){
      const ship=a.ships[i],[l,r]=a.rules,zone=ship[l]?ship[r]?'both':'left':ship[r]?'right':'neither';
      if(i===0){await page.locator(`#zoneGrid [data-zone="${zone==='left'?'right':'left'}"]`).click();await expect(page.locator('#hintBtn')).toBeEnabled();}
      await page.locator(`#zoneGrid [data-zone="${zone}"]`).click();
      if(i===1){await page.reload();expect((await saved()).play.shipIndex).toBe(2);}
      if(i<4)await expect(page.locator('#hintBtn')).toBeEnabled();
    }
    await expect(page.locator('#win')).toBeVisible();if(level<3)await page.locator('#winNextBtn').click();
  }
  const old=await saved();
  await page.locator('#winDemoBtn').click();
  await page.locator('#demoPlayBtn').click();
  // Let the demo advance one step so the resumable position is meaningful.
  await expect(page.locator('#demoBar')).toBeVisible({timeout:30000});
  await expect.poll(async()=>(await saved()).play.demoIndex,{timeout:30000}).toBeGreaterThan(0);
  const demo=(await saved()).play;
  await page.reload();
  await expect(page.locator('#demoBar')).toBeVisible({timeout:30000});
  expect((await saved()).play.demoIndex).toBe(demo.demoIndex);
  await page.locator('#demoExitBtn').click();
  await expect(page.locator('#win')).toBeVisible({timeout:30000});
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.shipIndex).toBe(0);}if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);if(action==='classic')expect((await saved()).mode).toBe('classic');
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.venn-port')).completed)).toEqual([0,1,2,3]);await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
