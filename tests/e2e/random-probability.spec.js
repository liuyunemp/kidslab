import {test,expect} from '@playwright/test';
test('carnival-truth: generated rational probabilities, repeat experiments, stale data and persistent awards',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/carnival-truth/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.carnival-truth.seed-987'));return s.levels[s.active];});
  for(let i=0;i<3;i++){
    const a=(await saved()).instance;
    if(i===2){const n=(await saved()).play.prizeSlots;for(let j=0;j<Math.abs(n-a.target);j++)await page.locator(n>a.target?'#minusBtn':'#plusBtn').click();}
    await page.locator('#trialBtn').click();await page.reload();const first=await saved();expect(first.play.trialWins).toBeGreaterThanOrEqual(0);expect(first.play.trialWins).toBeLessThanOrEqual(1000);
    await page.locator('#trialBtn').click();await expect.poll(async()=>(await saved()).play.feedback).toBe('trialReady');expect((await saved()).play.trialNo).toBe(2);
    if(i<2)await page.locator(`[data-verdict="${a.claimWins===a.wins?'honest':'dishonest'}"]`).click();
    else {await page.locator('#plusBtn').click();await page.locator('#checkBtn').click();expect((await saved()).play.solved).toBe(false);await page.locator('#minusBtn').click();}
    await page.locator('#checkBtn').click();expect((await saved()).play.solved).toBe(true);await page.locator('#nextBtn').click();
  }
  await expect(page.locator('#finale')).toBeVisible();const old=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.solved).toBe(false);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);
    if(action==='classic')expect((await saved()).instance.target).toBe(2);
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.carnival-truth')).completed)).toBe(true);
  }
  expect(errors).toEqual([]);
});
