import { test, expect } from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    controls: [...document.querySelectorAll('button:not([hidden]), a:not([hidden])')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent.trim(),
          width: rect.width,
          height: rect.height,
          font: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      })
      .filter(({ width, height }) => width > 0 && height > 0),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
    canvasHeight: document.querySelector('#caveCanvas').getBoundingClientRect().height,
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.controls.filter(({ width, height }) => width < 44 || height < 44)).toEqual([]);
  expect(layout.controls.filter(({ font }) => font < 16)).toEqual([]);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.canvasHeight).toBeGreaterThanOrEqual(165);
}

async function splitAll(page){
  while(await page.locator('[data-factor]').count()){
    const n=Number(await page.locator('#selectedValue').textContent());
    const choices=await page.locator('[data-factor]').evaluateAll(items=>items.map(b=>({a:Number(b.dataset.a),b:Number(b.dataset.b)})));
    const pair=choices.find(p=>p.a>1&&p.b>1&&p.a*p.b===n);expect(pair).toBeTruthy();
    await page.locator(`[data-a="${pair.a}"][data-b="${pair.b}"]`).click();
  }
}
async function finish(page){
  for(let i=0;i<2;i++){await splitAll(page);await page.locator('#nextBtn').click();}
  const a=(await roundRecord(page,'crystal-cave')).instance;
  for(const n of a.numbers.filter(n=>n%3===0))await page.locator(`[data-number="${n}"]`).click();
  await page.locator('#checkWallBtn').click();await page.locator('#nextBtn').click();
}
test.describe('factor crystal cave',()=>{
  test.beforeEach(async({page})=>{
    await page.goto('/');await page.evaluate(()=>{localStorage.clear();localStorage.setItem('kidslab.lang','zh');localStorage.setItem('kidslab.theme','light');});
    await page.goto('/courseware/crystal-cave/?seed=987');
  });
  test('recovers from wrong factors and a wrong resonance stone, then completes every chamber',async({page})=>{
    const n=Number(await page.locator('#selectedValue').textContent());
    const choices=await page.locator('[data-factor]').evaluateAll(items=>items.map(b=>({a:Number(b.dataset.a),b:Number(b.dataset.b)})));
    const bad=choices.find(p=>p.a*p.b!==n);await page.locator(`[data-a="${bad.a}"][data-b="${bad.b}"]`).click();
    expect((await roundRecord(page,'crystal-cave')).play.factors[0].leaves).toEqual([n]);
    for(let i=0;i<2;i++){await splitAll(page);await page.locator('#nextBtn').click();}
    const a=(await roundRecord(page,'crystal-cave')).instance,badStone=a.numbers.find(n=>n%3);
    await page.locator('#forkBtn').click();await page.locator(`[data-number="${badStone}"]`).click();
    for(const n of a.numbers.filter(n=>n%3===0))await page.locator(`[data-number="${n}"]`).click();
    await page.locator('#checkWallBtn').click();await expect(page.locator(`[data-number="${badStone}"]`)).toHaveClass(/is-wrong/);
    await page.locator(`[data-number="${badStone}"]`).click();await page.locator('#checkWallBtn').click();await page.locator('#nextBtn').click();
    await expect(page.locator('#certificate')).toBeVisible();await expect(page.locator('#course')).toHaveJSProperty('inert',true);
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.progress.crystal-cave')).status)).toBe('completed');
  });
  test('partial factor tree survives preferences and refresh at target viewport',async({page})=>{
    const n=Number(await page.locator('#selectedValue').textContent());
    const pair=await page.locator('[data-factor]').evaluateAll((items,n)=>items.map(b=>({a:Number(b.dataset.a),b:Number(b.dataset.b)})).find(p=>p.a*p.b===n),n);
    await page.locator(`[data-a="${pair.a}"][data-b="${pair.b}"]`).click();
    await page.locator('#soundBtn').click();await page.locator('#themeBtn').click();await page.locator('#langBtn').click();
    const before=await roundRecord(page,'crystal-cave');await expectFitsViewport(page);await page.reload();
    expect((await roundRecord(page,'crystal-cave')).play).toEqual(before.play);
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expectFitsViewport(page);
  });
  test('completion resumes, replay preserves progress, and classic entrance restores textbook numbers',async({page})=>{
    await finish(page);await page.reload();await expect(page.locator('#certificate')).toBeVisible();
    await page.locator('#playAgainBtn').click();await expect(page.locator('#certificate')).toBeHidden();
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.progress.crystal-cave')).status)).toBe('completed');
    await page.locator('.random-round-menu summary').click();await page.locator('[data-round-action="classic"]').click();await page.waitForLoadState();
    expect((await roundRecord(page,'crystal-cave')).instance.target).toBe(12);
  });
});
