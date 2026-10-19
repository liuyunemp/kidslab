import {test,expect} from '@playwright/test';
test('inkblot-monsters: random reflection and impostor with persistent achievements and original-round retry',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/inkblot-monsters/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.inkblot-monsters.seed-987'));return s.levels[s.active];});
  await page.locator('#splashBtn').click({clickCount:3});const splats=(await saved()).play.splats;await page.reload();expect((await saved()).play.splats).toEqual(splats);await page.locator('#foldBtn').click();await page.locator('#foldBtn').click();
  const a=(await saved()).instance;
  for(let i=0;i<3;i++){const r=a.rounds[i],choice=a.options.findIndex(d=>450+d===900-(450-r.distance));await page.locator(`[data-choice="${choice}"]`).click();}
  await expect(page.locator('#detectivePanel')).toBeVisible();const d=(await saved()).instance;await page.locator(`[data-suspect="${d.impostor}"]`).click();await page.reload();await expect(page.locator('#completeModal')).toBeVisible();
  const old=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.detectiveSolved).toBe(false);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);
    if(action==='classic')expect((await saved()).instance.impostor).toBe(1);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.inkblot-monsters')).completed)).toEqual([0,1,2]);expect(errors).toEqual([]);
});
