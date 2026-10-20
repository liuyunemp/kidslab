import {test,expect} from '@playwright/test';
import {captureSpeech,expectNarrationStarted} from './speech-helpers.js';

test('pattern-caterpillar: all repeating units, persistence, finite families and safe demonstrations',async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await captureSpeech(page);
  await page.goto('/courseware/pattern-caterpillar/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.pattern-caterpillar.seed-987'));return s.levels[s.active];});
  for(let level=0;level<11;level++){
    await page.evaluate(()=>{window.__speechEvents=[];});
    const a=(await saved()).instance;
    for(let i=0;i<a.bites;i++){
      const choices=await page.locator('[data-choice]').evaluateAll(es=>es.map(e=>JSON.parse(e.dataset.item)));
      const index=choices.findIndex(c=>JSON.stringify(c)===JSON.stringify(a.pattern[(i+4)%a.pattern.length]));
      expect(index).toBeGreaterThanOrEqual(0);await page.locator(`[data-choice="${index}"]`).click();
      if(i===1){await page.reload();expect((await saved()).play.bites).toBe(2);}
    }
    await expect(page.locator('#modal')).toBeVisible();await expectNarrationStarted(page,level===7);await page.locator('#modalBtn').click();
  }
  await page.locator('#thinkBtn').click();expect((await saved()).play.reverseSeq).toHaveLength(5);
  await page.reload();expect((await saved()).play.reverseSeq).toHaveLength(5);
  const old=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry')expect((await saved()).play.reverseSeq).toEqual(old.instance.initial);
    if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);
    if(action==='classic')expect((await saved()).play.reverseSeq).toEqual([]);
  }
  await page.locator('[data-level="0"]').click();const collected=await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.caterpillar.butterflies')).length);
  await page.locator('.random-round-menu summary').click();await page.locator('[data-round-action="retry"]').click();await page.waitForLoadState();
  await page.locator('#demoBtn').click();await page.locator('[data-level="3"]').click();await page.waitForTimeout(800);expect((await saved()).instance.key).toBe('l4');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.caterpillar.butterflies')).length)).toBe(collected);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);expect(errors).toEqual([]);
});
