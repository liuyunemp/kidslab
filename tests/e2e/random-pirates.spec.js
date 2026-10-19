import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
const hard=[[[5,7,8,9],[6,10,11,12]],[[2,3,4,6],[5,7,11,12]],[[1,4,7,11],[2,5,8,10]]];
test('pirate-scales: all four cargos, independent weighing deductions, kind choice and atomic reload',async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/pirate-scales/?seed=987');const saved=()=>roundRecord(page,'pirate-scales');
  for(let i=0;i<4;i++){
    const a=(await saved()).instance;let possible=Array.from({length:a.coins},(_,i)=>(a.unknownBias?['light','heavy']:['light']).map(kind=>({id:i+1,kind}))).flat(),n=0;
    await page.locator('#hintBtn').click();await page.locator('#weighBtn').click();expect((await saved()).play.log).toEqual([]);
    while(possible.length>1){
      const size=Math.ceil(possible.length/3),[left,right]=a.unknownBias?hard[n]:[possible.slice(0,size).map(p=>p.id),possible.slice(size,size*2).map(p=>p.id)];
      for(const [selector,ids] of [['#targetLeft',left],['#targetRight',right]]){await page.locator(selector).click();for(const id of ids)await page.locator(`[data-coin="${id}"]`).click();}
      await page.locator('#weighBtn').click();await page.reload();const log=(await saved()).play.log;expect(log.length).toBe(++n);const outcome=log.at(-1).outcome;
      possible=possible.filter(p=>{const difference=(left.includes(p.id)?1:right.includes(p.id)?-1:0)*(p.kind==='light'?-1:1);return (difference===0?'balance':difference>0?'left':'right')===outcome;});
    }
    expect(possible.length).toBe(1);const answer=possible[0];
    if(a.unknownBias){await page.locator(`[data-bias="${answer.kind==='light'?'heavy':'light'}"]`).click();await page.locator('#accuseBtn').click();await page.locator(`[data-coin="${answer.id}"]`).click();expect((await saved()).play.won).toBe(false);await page.locator(`[data-bias="${answer.kind}"]`).click();}
    else await page.locator('#accuseBtn').click();
    await page.locator(`[data-coin="${answer.id}"]`).click();expect((await saved()).play.won).toBe(true);if(i<3)await page.locator('#nextBtn').click();
  }
  await expect(page.locator('#completeModal')).toBeVisible();const old=await saved();for(const action of ['retry','new','classic']){await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);const r=await saved();expect(r.play.log).toEqual([]);expect(r.play.won).toBe(false);if(action==='retry')expect(r.fingerprint).toBe(old.fingerprint);if(action==='new')expect(r.fingerprint).not.toBe(old.fingerprint);if(action==='classic')expect(r.instance.fakeId).toBe(1);}
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.pirate-scales')).completed)).toEqual([0,1,2,3]);await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
