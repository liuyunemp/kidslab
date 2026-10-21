import {test,expect} from '@playwright/test';
import {courses} from '../../scripts/english/courses.mjs';
const snapshot=page=>page.evaluate(()=>window.__englishState());
async function load(page,id,seed=17){await page.addInitScript(()=>{if(!localStorage.getItem('kidslab.lang'))localStorage.setItem('kidslab.lang','zh');if(!localStorage.getItem('kidslab.theme'))localStorage.setItem('kidslab.theme','light');});await page.goto(`/courseware/${id}/?e2e&seed=${seed}`);await expect.poll(()=>page.evaluate(()=>Boolean(window.__englishState))).toBe(true);}
async function next(page){await page.locator('#nextBtn').click();}
async function reachQuestion(page){for(let i=0;i<4&&(await snapshot(page)).phase==='learn';i++)await next(page);await expect.poll(async()=>{const s=await snapshot(page);return s.question?.started;}).toBe(true);}
async function fit(page){
  const result=await page.evaluate(()=>({x:document.documentElement.scrollWidth>innerWidth+1,y:document.documentElement.scrollHeight>innerHeight+1,buttons:[...document.querySelectorAll('.bar .pill,.choice,#controls button')].filter(n=>n.getBoundingClientRect().width).map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,size:parseFloat(getComputedStyle(n).fontSize)};}),w:innerWidth,h:innerHeight,frame:window.__englishFrame()}));
  expect(result.x||result.y).toBe(false);for(const b of result.buttons){expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(result.w);expect(b.top).toBeGreaterThanOrEqual(0);expect(b.bottom).toBeLessThanOrEqual(result.h);expect(b.height).toBeGreaterThanOrEqual(44);expect(b.size).toBeGreaterThanOrEqual(16);}
  expect(result.frame.canvas.w).toBe(result.w);expect(result.frame.canvas.h).toBe(result.h);expect(result.frame.free.h).toBeGreaterThan(100);
}
for(const course of courses){
  test(`${course.id}: four levels, mistakes, review and a fresh random batch`,async({page})=>{
    test.setTimeout(180000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));await load(page,course.id);
    const batch=(await snapshot(page)).batch;await fit(page);await reachQuestion(page);await fit(page);
    let s=await snapshot(page);const wrong=s.question.options.find(id=>id!==s.question.target);
    await page.locator(`[data-choice="${wrong}"]`).click();await expect(page.locator('#hearts')).toHaveText('♥♥♡');
    const qid=s.question.id;await page.locator(`[data-choice="${s.question.target}"]`).click();await expect(page.locator('#coach')).toHaveText('找对啦！');
    expect((await snapshot(page)).question.id).toBe(qid);
    let visits=new Set();
    for(let i=0;i<110;i++){
      s=await snapshot(page);if(s.phase==='roundDone')break;
      if(s.phase==='answer'){
        if(!s.question.started){await expect.poll(async()=>(await snapshot(page)).question.started).toBe(true);s=await snapshot(page);}
        if(!visits.has(s.level)){
          visits.add(s.level);await fit(page);
          if(s.question.mode==='listen')await expect(page.locator('#prompt')).not.toContainText(course.items.find(w=>w.id===s.question.target).en);
          if(s.question.mode==='picture'){await expect(page.locator('#hearBtn')).toHaveCount(0);await expect(page.locator('#prompt')).not.toContainText(course.items.find(w=>w.id===s.question.target).en);}
        }
        await page.locator(`[data-choice="${s.question.target}"]`).click();
      }else await next(page);
    }
    s=await snapshot(page);expect(s.phase).toBe('roundDone');expect(s.completed).toBe(true);expect(Object.keys(s.records)).toHaveLength(8);expect(s.review).toEqual([]);
    await fit(page);await next(page);const fresh=await snapshot(page);expect(fresh.round).toBe(2);expect(fresh.batch).not.toEqual(batch);expect(fresh.batch.filter(id=>!batch.includes(id)).length).toBe(Math.min(7,course.items.length-8));expect(errors).toEqual([]);
  });
  test(`${course.id}: complete word bank renders, preferences and phone controls`,async({page},info)=>{
    test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await load(page,course.id);
    const visuals=await page.evaluate(()=>window.__englishVisuals());expect(visuals).toHaveLength(course.items.length);for(const v of visuals){expect(v.src).toMatch(/^data:image\/png;base64,/);expect(v.src.length).toBeGreaterThan(1000);}
    await page.locator('#themeBtn').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.locator('#langBtn').click();await expect(page.locator('html')).toHaveAttribute('lang',/^en/);await fit(page);
    await page.locator('#panelHandle').click();await expect(page.locator('#musicBtn')).toBeVisible();await page.locator('#musicBtn').click();await expect(page.locator('#musicBtn')).toHaveAttribute('aria-pressed','false');await page.locator('#panelHandle').click();
    await page.reload();await expect(page.locator('#pauseCover')).toBeVisible();await page.locator('#resumeBtn').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await fit(page);
    await page.screenshot({path:info.outputPath('lesson.png')});
    // A review contact sheet is a test artifact, never an extra production route.
    await page.evaluate(visuals=>{document.body.replaceChildren();document.body.style.cssText='overflow:auto;background:#fff8e9;color:#302b42;padding:12px';const gallery=document.createElement('div');gallery.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:10px';for(const v of visuals){const card=document.createElement('div');const img=document.createElement('img');img.src=v.src;img.style.cssText='width:100%;display:block';const label=document.createElement('b');label.textContent=v.en;card.append(img,label);gallery.append(card);}document.body.append(gallery);},visuals);
    await page.screenshot({path:info.outputPath('word-bank.png'),fullPage:true});expect(errors).toEqual([]);
  });
}

test('English countdown, failure retry, refresh and audio fallback recover without granting hearts',async({page})=>{
  test.setTimeout(90000);await page.clock.install();await load(page,'english-fruit-picnic');await reachQuestion(page);
  await page.evaluate(()=>window.cool.speech.stop());await page.clock.fastForward(5000);const before=await snapshot(page);expect(before.remainingMs).toBeLessThanOrEqual(15200);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  const paused=await snapshot(page);await page.clock.fastForward(30000);expect((await snapshot(page)).remainingMs).toBe(paused.remainingMs);await expect(page.locator('#pauseCover')).toBeVisible();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.reload();await expect(page.locator('#pauseCover')).toBeVisible();let saved=await snapshot(page);expect(saved.question.options).toEqual(before.question.options);expect(saved.lives).toBe(before.lives);expect(saved.remainingMs).toBeLessThanOrEqual(before.remainingMs+250);
  await page.locator('#resumeBtn').click();await expect.poll(async()=>(await snapshot(page)).question.started).toBe(true);
  await page.locator('#soundBtn').click();await expect(page.locator('#fallbackBtn')).toBeVisible();saved=await snapshot(page);await page.clock.fastForward(25000);expect((await snapshot(page)).remainingMs).toBe(saved.remainingMs);
  await page.locator('#fallbackBtn').click();expect((await snapshot(page)).question.mode).toBe('read');
  for(let i=0;i<3;i++){
    await page.clock.fastForward(21000);
    if(i<2){await next(page);await expect(page.locator('#fallbackBtn')).toBeVisible();await page.locator('#fallbackBtn').click();}
  }
  await expect(page.locator('#retryBtn')).toBeVisible();const failed=await snapshot(page);expect(failed.lives).toBe(0);await page.locator('#retryBtn').click();const retry=await snapshot(page);expect(retry.batch).toEqual(failed.batch);expect(retry.lives).toBe(3);expect(retry.level).toBe(failed.level);
});

test('English recording failure pauses the clock and retry or written fallback can continue',async({page})=>{
  await page.route('**/audio/speech/*.mp3',route=>route.fulfill({status:503,body:''}));await load(page,'english-animal-park');for(let i=0;i<4;i++)await next(page);
  await expect(page.locator('#notice')).toContainText('声音还没准备好');let s=await snapshot(page);expect(s.remainingMs).toBe(20000);expect(s.lives).toBe(3);
  await page.unroute('**/audio/speech/*.mp3');await page.locator('#hearBtn').click();await expect.poll(async()=>(await snapshot(page)).question.started).toBe(true);s=await snapshot(page);await page.locator(`[data-choice="${s.question.target}"]`).click();await expect(page.locator('#coach')).toHaveText('找对啦！');
});

test('English words play from a complete offline snapshot',async({page,context})=>{
  test.setTimeout(90000);
  await page.addInitScript(()=>{localStorage.setItem('kidslab.lang','zh');window.__wordAudio=[];window.addEventListener('speechplayback',e=>window.__wordAudio.push(e.detail));});
  await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await load(page,'english-fruit-picnic');
  await expect.poll(()=>page.evaluate(async()=>{const cache=await caches.open('kidslab-offline-state-v2');return Boolean(await cache.match(new URL('/__offline__/courses/english-fruit-picnic',location.origin).href));}),{timeout:40000}).toBe(true);
  await context.setOffline(true);await page.reload();await expect(page.locator('#resumeBtn')).toBeVisible();await page.locator('#resumeBtn').click();await page.locator('#hearBtn').click();
  await expect.poll(()=>page.evaluate(()=>window.__wordAudio.some(e=>e.state==='started'&&e.lang==='en-US'))).toBe(true);
  await reachQuestion(page);const s=await snapshot(page);await page.locator(`[data-choice="${s.question.target}"]`).click();await expect(page.locator('#coach')).toHaveText('找对啦！');
});
