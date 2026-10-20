import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
import {captureSpeech,expectNarrationStarted} from './speech-helpers.js';
test('shadow-theater: ten generated scenes, real rotations, resume and retained achievement',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await captureSpeech(page);await page.goto('/courseware/shadow-theater/?seed=987');
  const saved=()=>roundRecord(page,'shadow-theater');
  await page.locator('[aria-label="Explore cone shadows"], [aria-label="看看圆锥的影子"]').click();await expect(page.locator('#magic')).toBeVisible();await page.locator('#closeMagic').click();
  for(let i=0;i<10;i++){
    await page.evaluate(()=>{window.__speechEvents=[];});
    const a=(await saved()).instance;
    if(a.kind==='reverse')await page.locator(`[data-shape="${a.answer}"]`).click();
    else{
      await page.locator(`[data-shape="${a.block??'cube'}"]`).click();
      const rotation=(await saved()).play.rotation,targetX=a.pose==='axis'?Math.PI/2:0;
      const c=page.locator('#scene'),box=await c.boundingBox(),x=box.x+box.width*.65,y=box.y+box.height*.5;
      await page.mouse.move(x,y);await page.mouse.down();
      const end={pointerId:1,clientX:x-rotation[1]/.012,clientY:y+(targetX-rotation[0])/.012};
      await c.dispatchEvent('pointermove',end);await c.dispatchEvent('pointermove',end);await page.mouse.up();
      await page.reload();expect((await saved()).play.rotation[0]).toBeCloseTo(targetX,3);
      await page.locator('#checkBtn').click();
    }
    await expect.poll(async()=>(await saved()).play.done).toBe(true);
    await expectNarrationStarted(page,i===9);
    if(i<9)await page.locator('#nextBtn').click();
  }
  const old=await saved();await page.reload();expect((await saved()).play.done).toBe(true);
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.done).toBe(false);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);
    if(action==='classic')expect((await saved()).instance.scale).toBe(1);
  }
  await page.locator('#langBtn').click();await page.locator('#themeBtn').click();
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  for(const id of ['checkBtn','resetBtn','nextBtn','langBtn','themeBtn']){const b=await page.locator(`#${id}`).boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(page.viewportSize().height);}
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.shadow-theater.round')).won.length)).toBe(10);expect(errors).toEqual([]);
});
