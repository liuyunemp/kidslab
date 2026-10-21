import { test, expect } from '@playwright/test';
import { ids, legacyIds, explorationIds } from '../../scripts/speech/catalog.mjs';
import { captureSpeech, expectNarrationStarted } from './speech-helpers.js';

function readSelector(id) {
  if (legacyIds.includes(id)) return 'button.prompt[data-speak]';
  // English courses keep "listen how to play" in the collapsible panel.
  if(id.startsWith('english-')) return '#hintBtn';
  if (explorationIds.includes(id)) return '#coach';
  if(id==='pattern-caterpillar') return '#readPattern';
  return id==='number-fireflies' ? '[aria-label="朗读任务"], [aria-label="Read task"]' : '[aria-label="朗读引导"], [aria-label="Read instructions"]';
}
for (const id of ids) test(`${id}: local narration starts and ends without system speech`,async({page})=>{
  test.setTimeout(60000);
  await captureSpeech(page);
  await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
  await page.goto(`/courseware/${id}/?seed=987`);
  const read=page.locator(readSelector(id));
  // The panel starts collapsed on a phone, so reveal the hint button before reading it.
  if(!await read.isVisible())await page.locator('#panelHandle').click();
  await read.click();
  await expectNarrationStarted(page);
  await expect.poll(()=>page.evaluate(()=>window.__speechEvents.some(e=>e.state==='ended')),{timeout:30000}).toBe(true);
  const loaded=await page.evaluate(()=>window.__speechEvents.find(e=>e.state==='loading'));
  expect(loaded.text.trim().length).toBeGreaterThan(0);expect(loaded.lang).toBe('zh-CN');
  const language=page.locator(legacyIds.includes(id)?'#languageBtn':'#langBtn');await language.click();
  await page.evaluate(()=>{window.__speechEvents=[];});await read.click();await expectNarrationStarted(page);
  expect(await page.evaluate(()=>window.__speechEvents.find(e=>e.state==='started').lang)).toBe('en-US');
  await page.evaluate(()=>window.cool.speech.stop());
});

test('failed recording download is visible, retry works, rapid clicks and mute cancel old narration',async({page})=>{
  await captureSpeech(page);await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
  await page.route('**/audio/speech/*.mp3',route=>route.fulfill({status:503,body:''}));
  await page.goto('/courseware/g1-word-post/');await page.locator('button.prompt').click();
  await expect(page.locator('#feedback')).toContainText('暂时没能播放');
  expect(await page.evaluate(()=>window.__speechEvents.some(e=>e.state==='started'))).toBe(false);
  await page.unroute('**/audio/speech/*.mp3');await page.evaluate(()=>{window.__speechEvents=[];});
  await page.locator('button.prompt').dblclick();await expectNarrationStarted(page);
  await page.locator('#speechBtn').click();
  expect(await page.evaluate(()=>window.__speechEvents.at(-1).state)).toBe('cancelled');
  await page.reload();await expect(page.locator('#speechBtn')).toHaveAttribute('aria-pressed','false');
});

test('a complete offline snapshot can play guidance and praise without system speech',async({page,context})=>{
  test.setTimeout(90000);await captureSpeech(page);
  await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
  await page.goto('/courseware/g1b-character-lab/');
  await expect.poll(()=>page.evaluate(async()=>{const c=await caches.open('kidslab-offline-state-v2');return Boolean(await c.match(new URL('/__offline__/courses/g1b-character-lab',location.origin).href));}),{timeout:30000}).toBe(true);
  await context.setOffline(true);await page.reload();await page.locator('#coach').click();await expectNarrationStarted(page);
  await page.evaluate(()=>{window.cool.speech.stop();window.__speechEvents=[];});
  await page.locator('[data-action=assemble][data-index="0"]').click();await page.locator('[data-action=assemble][data-index="1"]').click();
  await expectNarrationStarted(page);expect(await page.evaluate(()=>window.__speechEvents.find(e=>e.state==='started').text)).toMatch(/完成|did it|finished|practice/);
  await page.locator('#resetBtn').click();await page.evaluate(()=>{window.__speechEvents=[];});
  await page.locator('[data-action=assemble][data-index="0"]').click();
  await page.locator('[data-action=assemble][data-index="0"]').click();
  await expectNarrationStarted(page);
  expect(await page.evaluate(()=>window.__speechEvents.find(e=>e.state==='started').text)).toMatch(/没关系|加油|别着急|No rush|Keep going|Take your time/);
});

test('changing language or restarting cancels a pending sentence before it can start',async({page})=>{
  await captureSpeech(page);await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
  const pending=[];
  await page.route('**/audio/speech/*.mp3',route=>{pending.push(route);});
  await page.goto('/courseware/number-fireflies/');
  const read=page.locator('[aria-label="朗读任务"], [aria-label="Read task"]');
  for(const control of ['#langBtn','#retryBtn']){
    await page.evaluate(()=>{window.__speechEvents=[];});await read.click();
    await expect.poll(()=>pending.length).toBeGreaterThan(0);
    await page.locator(control).click();
    expect(await page.evaluate(()=>window.__speechEvents.at(-1).state)).toBe('cancelled');
    for(const route of pending.splice(0))await route.fulfill({status:200,body:'late response'}).catch(()=>{});
    expect(await page.evaluate(()=>window.__speechEvents.some(e=>e.state==='started'))).toBe(false);
  }
  await page.unroute('**/audio/speech/*.mp3');await read.click();await expectNarrationStarted(page);
});
