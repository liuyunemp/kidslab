import {test,expect} from '@playwright/test';
test('bet-party: restricted factual categories, current demonstration, refresh, retry and new round',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/bet-party/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.bet-party.seed-987'));return s.levels[s.active];});
  for(let i=0;i<4;i++){
    const a=(await saved()).instance;
    if(i===0){for(let j=0;j<=a.drawers;j++){await page.locator('#inviteBtn').click();await page.locator(`[data-drawer="${j%a.drawers}"]`).click();if(j===2){await page.reload();expect((await saved()).play.play.total).toBe(3);}}}
    else{
      await page.locator('#inputPigeons').fill(String(a.drawers*(a.need-1)+1));await page.locator('#openBetBtn').click();await page.reload();
      await expect.poll(async()=>(await saved()).play.play.phase).toBe('won');
    }
    if(i<3)await page.locator('#nextBtn').click();
  }
  await expect(page.locator('#completeModal')).toBeVisible();const old=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.play.total).toBe(0);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);
    if(action==='classic')expect((await saved()).instance.drawers).toBe(26);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.bet-party')).cleared)).toEqual([true,true,true,true]);expect(errors).toEqual([]);
});
