import {test,expect} from '@playwright/test';
test('pancake-boss: legal open solutions, clock arithmetic, resume and persistent completion',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/pancake-boss/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.pancake-boss.seed-987'));return s.levels[s.active];});
  for(let i=0;i<3;i++){
    const a=(await saved()).instance,solution=i===0?['B2','A2','B1','A1']:['C2','B1','C1','A1','A2','B2'];
    for(let j=0;j<solution.length;j++){await page.locator(`[data-token="${solution[j]}"]`).click();await page.locator(`[data-cell="${j}"]`).click();if(j===1){await page.reload();expect((await saved()).play.schedule.slice(0,2)).toEqual(solution.slice(0,2));}}
    if(i===2){await page.locator('#soyBtn').click();const end=a.start+Math.max(a.soy,a.rounds*a.minutes),clock=`${Math.floor(end/60)}:${String(end%60).padStart(2,'0')}`;await page.locator(`input[value="${clock}"]`).check();}
    await page.locator('#checkBtn').click();expect((await saved()).play.done).toBe(true);if(i<2)await page.locator('#nextBtn').click();
  }
  await page.reload();await expect(page.locator('#completeModal')).toBeVisible();const old=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.done).toBe(false);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);
    if(action==='classic')expect((await saved()).instance.minutes).toBe(3);
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.pancake-boss')).completed)).toEqual([0,1,2]);
  }
  expect(errors).toEqual([]);
});
