import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
function solve(a){const colors={...a.fixed},palette=['rose','sun','mint','sky'].slice(0,a.budget);function visit(i){if(i===a.regions.length)return true;const r=a.regions[i];for(const c of a.fixed[r.id]?[a.fixed[r.id]]:palette)if(r.neighbors.every(n=>colors[n]!==c)){colors[r.id]=c;if(visit(i+1))return true;}if(!a.fixed[r.id])delete colors[r.id];return false;}if(!visit(0))throw new Error('No map coloring');return colors;}
test('four-color-kingdom: four planar maps, all legal colorings, round save and fixed-region recovery',async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/four-color-kingdom/?seed=987');await expect(page.locator('[data-region]').first()).toBeVisible();const saved=()=>roundRecord(page,'four-color-kingdom');
  for(let i=0;i<4;i++){
    const a=(await saved()).instance,solution=solve(a);await page.locator('#checkBtn').click();expect((await saved()).play.done).toBe(false);
    for(const r of a.regions){if(a.fixed[r.id])continue;await page.locator(`[data-region="${r.id}"]`).press('Enter');await page.locator(`[data-color="${solution[r.id]}"]`).click();}
    await page.reload();await expect(page.locator('[data-region]').first()).toBeVisible();expect((await saved()).play.colors).toEqual(solution);await page.locator('#checkBtn').click();expect((await saved()).play.done).toBe(true);
    if(i<3){await page.locator('#nextBtn').click();await expect(page.locator('#missionNumber')).toHaveText(String(i+2).padStart(2,'0'));}
  }
  await expect(page.locator('#completeModal')).toBeVisible();const old=await saved();
  for(const action of ['retry','new','classic']){await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);await expect(page.locator('[data-region]').first()).toBeVisible();const r=await saved();expect(r.play.done).toBe(false);expect(r.play.colors).toEqual(r.instance.fixed);if(action==='retry')expect(r.fingerprint).toBe(old.fingerprint);if(action==='new')expect(r.fingerprint).not.toBe(old.fingerprint);if(action==='classic')expect(r.instance.kind).toBe('classic');}
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.four-color-kingdom')).completed)).toEqual([0,1,2,3]);await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
