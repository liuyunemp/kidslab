import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
test('detective-board: all six current clue sets, witnesses and stories; replay and worker new game',async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/detective-board/?seed=987');await expect(page.locator('[data-select-clue="0"]')).toBeVisible();const saved=()=>roundRecord(page,'detective-board');
  for(let level=0;level<6;level++){
    const a=(await saved()).instance;await page.locator('#hintBtn').click();
    for(const [i,c] of a.clues.entries()){
      if(c.falseRule)continue;
      for(const r of c.rules.filter(r=>r.kind==='is'||r.kind==='not')){
        const cell=page.locator(`[data-person="${r.person}"][data-dim="${r.dimId}"][data-val="${r.val}"]`),mode=r.kind==='is'?'yes':'no';
        if((await cell.getAttribute('class')).split(' ').includes(mode))continue;
        await page.locator(`[data-select-clue="${i}"]`).click();await page.locator(`[data-mark-mode="${mode}"]`).click();await cell.click();
      }
    }
    await page.reload();await expect(page.locator('[data-select-clue="0"]')).toBeVisible();expect((await saved()).play.hintsLeft).toBe(2);
    if(a.liar){await page.locator(`[data-false="${(a.falseClue+1)%a.clues.length}"]`).click();expect((await saved()).play.won).toBe(false);await page.locator(`[data-false="${a.falseClue}"]`).click();}
    await expect(page.locator('#winModal')).toBeVisible();await expect(page.locator('#story')).toContainText(a.story[0][await page.locator('html').getAttribute('lang')==='en'?'en':'zh']);if(level<5){await page.locator('#nextBtn').click();await expect(page.locator(`.caseTab[data-case="${level+1}"]`)).toHaveClass(/\bon\b/);}
  }
  const old=await saved();for(const action of ['retry','new','classic']){await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);await expect(page.locator('[data-select-clue="0"]')).toBeVisible();const r=await saved();expect(r.play.won).toBe(false);expect(r.play.marks).toEqual({});if(action==='retry')expect(r.fingerprint).toBe(old.fingerprint);if(action==='new')expect(r.fingerprint).not.toBe(old.fingerprint);}
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.detective-board')).completed)).toEqual([0,1,2,3,4,5]);await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
