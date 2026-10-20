import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
test('icecream-geometry: four solids, three measurements, six orders and independent round persistence',async({page})=>{
  test.setTimeout(150000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/icecream-geometry/?seed=987');const saved=()=>roundRecord(page,'icecream-geometry');
  for(let i=0;i<4;i++){await page.locator(`[data-shape="${i}"]`).click();await page.locator('#spinBtn').click();await expect.poll(async()=>(await saved()).play.formed).toBe(true);}
  await page.locator('[data-station="triple"]').click();
  for(let size=0;size<3;size++){
    await page.locator(`[data-size="${size}"]`).click();
    for(let pour=0;pour<3;pour++){
      await page.locator('#fillCone').click();await expect(page.locator('#pourCone')).toBeEnabled({timeout:30000});await page.locator('#pourCone').click();
      if(size===0&&pour===0){await page.reload();expect((await saved()).play.scoops).toBe(1);}
      if(pour<2)await expect(page.locator('#fillCone')).toBeEnabled({timeout:30000});
    }
    await expect.poll(async()=>(await saved()).play.records.length).toBe(size+1);
  }
  await page.locator('#guessInput').fill('3');await page.locator('#guessBtn').click();expect((await saved()).play.guessed).toBe(true);
  await page.locator('[data-station="shop"]').click();
  for(let i=0;i<6;i++){
    const a=(await saved()).instance,cv=a.cone[0]**2*a.cone[1],yv=3*a.cyl[0]**2*a.cyl[1],answer=cv===yv?'equal':cv>yv?'cone':'cyl';
    await page.locator(`[data-answer="${answer==='cyl'?'cone':'cyl'}"]`).click();expect((await saved()).play.answered).toBe(false);
    await page.locator(`[data-answer="${answer}"]`).click();await page.reload();expect((await saved()).play.answered).toBe(true);
    if(i<5)await page.locator('#nextOrder').click();
  }
  const old=await saved();for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.answered).toBe(false);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);
    if(action==='classic')expect((await saved()).instance.cone).toEqual([2,15]);
  }
  await page.locator('[data-station="triple"]').click();expect((await saved()).play.records).toHaveLength(3);await page.locator('#resetTriple').click();await page.locator('#fillCone').click();await page.locator('#langBtn').click();await page.locator('#themeBtn').click();
  await expect(page.locator('#pourCone')).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.icecream-geometry')).orders.length)).toBe(6);expect(errors).toEqual([]);
});
