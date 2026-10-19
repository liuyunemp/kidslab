import { test, expect } from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    controls: [...document.querySelectorAll('button:not([hidden]), a:not([hidden]), input:not([hidden])')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          font: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      })
      .filter(({ width, height }) => width > 0 && height > 0),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
    lessonFont: Number.parseFloat(getComputedStyle(document.querySelector('#lessonText')).fontSize),
    containers: ['.farm', '.console'].map((selector) => {
      const element = document.querySelector(selector);
      return { selector, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight };
    }),
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.controls.filter(({ width }) => width < 44)).toEqual([]);
  expect(layout.controls.filter(({ height }) => height < 44)).toEqual([]);
  expect(Math.min(...layout.controls.map(({ font }) => font))).toBeGreaterThanOrEqual(16);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.lessonFont).toBeGreaterThanOrEqual(16);
  expect(layout.containers.filter(({ clientHeight, scrollHeight }) => scrollHeight > clientHeight + 1)).toEqual([]);
}

async function setRange(page, value) {
  await page.locator('#mixRange').evaluate((range, nextValue) => {
    range.value = String(nextValue);
    range.dispatchEvent(new Event('input', { bubbles: true }));
    range.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

const saved=page=>roundRecord(page,'alien-farm');
async function finishNight(page,index){
 const a=(await saved(page)).instance.target;
 if(index===0){const quad=a.legs-3*a.creatures;await setRange(page,quad);await page.locator('#checkTrialBtn').click();await expect(page.locator('#status')).toContainText(String(quad));}
 if(index===1){await page.locator('#assumeBtn').click();await expect(page.locator('#assumptionFormula')).toContainText(String(a.creatures*3));await page.locator('#exchangeBtn').click();}
 if(index===2){
  const quad=(3*a.eyes-a.legs)/2,tri=a.eyes-2*quad;
  for(const [species,want] of [['tri',tri],['quad',quad]]){
   const before=Number(await page.locator(species==='tri'?'#sensorTriCount':'#sensorQuadCount').textContent());
   for(let n=0;n<Math.abs(want-before);n++)await page.locator('[data-species="'+species+'"][data-delta="'+(want>before?'1':'-1')+'"]').click();
  }
  await expect(page.locator('#eyeCount')).toHaveText(String(a.eyes));await expect(page.locator('#legCount')).toHaveText(String(a.legs));await page.locator('#checkSensorsBtn').click();
 }else await page.locator('#nextBtn').click();
}
test.describe('alien farm',()=>{
 test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem('kidslab.lang'))localStorage.setItem('kidslab.lang','zh');if(!localStorage.getItem('kidslab.theme'))localStorage.setItem('kidslab.theme','light');});await page.goto('/courseware/alien-farm/?seed=987');});
 test('recovers from sensor mismatches and completes all generated night shifts',async({page})=>{
  const a=(await saved(page)).instance.target;await page.locator('#checkTrialBtn').click();await expect(page.locator('#status')).toContainText(String(a.creatures*3));
  for(let n=0;n<3;n++){if(n===2){await page.locator('#checkSensorsBtn').click();await expect(page.locator('#status')).toContainText('28');}await finishNight(page,n);}
  await expect(page.locator('#completeModal')).toBeVisible();await expect(page.locator('.course')).toHaveJSProperty('inert',true);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.progress.alien-farm')).status)).toBe('completed');
 });
 test('retains assumptions and preferences through reload at target viewports',async({page})=>{
  await page.locator('#soundBtn').click();await page.locator('#themeBtn').click();await finishNight(page,0);await page.locator('#assumeBtn').click();
  const before=await saved(page);await page.locator('#langBtn').click();await expectFitsViewport(page);await page.reload();
  expect((await saved(page)).play).toEqual(before.play);await expect(page.locator('#assumptionFormula')).toContainText(String(before.instance.target.creatures*3));await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expectFitsViewport(page);
 });
 test('restores completed night and starts new content without losing achievement',async({page})=>{
  for(let n=0;n<3;n++)await finishNight(page,n);await page.reload();await expect(page.locator('#completeModal')).toBeVisible();
  await page.locator('#playAgainBtn').click();await expect(page.locator('#mixRange')).toHaveValue('0');
  const a=(await saved(page)).instance.target;await expect(page.locator('#legCount')).toHaveText(String(a.creatures*3));
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.progress.alien-farm')).status)).toBe('completed');
 });
});
