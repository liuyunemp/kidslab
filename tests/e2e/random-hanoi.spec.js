import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
function solve(start,n){const queue=[[start,[]]],seen=new Set([JSON.stringify(start)]);for(let i=0;i<queue.length;i++){const [a,path]=queue[i];if(a[1].length===n||a[2].length===n)return path;for(let from=0;from<3;from++)for(let to=0;to<3;to++){if(from===to||!a[from].length||a[to].length&&a[from].at(-1)>a[to].at(-1))continue;const b=a.map(p=>[...p]);b[to].push(b[from].pop());const key=JSON.stringify(b);if(!seen.has(key)){seen.add(key);queue.push([b,[...path,[from,to]]]);}}}}
test('hanoi-tower: Worker instance, live-state demonstration, human completion and original retry',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/hanoi-tower/?seed=987');await expect(page.locator('#discPick button')).toHaveCount(6);const saved=()=>roundRecord(page,'hanoi-tower');
  const first=await saved(),path=solve(first.instance.pegs,4);expect(Number(await page.locator('#minMoves').textContent())).toBe(path.length);
  const [from,to]=path[0];await page.locator(`[data-peg="${from}"]`).click();await page.locator(`[data-peg="${to}"]`).click();const moved=(await saved()).play.pegs;await page.reload();await expect(page.locator('#discPick button')).toHaveCount(6);expect((await saved()).play.pegs).toEqual(moved);
  await page.locator('#solveBtn').click();await expect(page.locator('#winBox')).toBeVisible({timeout:20000});expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.hanoi-tower'))?.completed??[])).toEqual([]);
  await page.locator('.random-round-menu summary').click();await page.locator('[data-round-action="retry"]').click();await page.waitForLoadState();await expect(page.locator('#discPick button')).toHaveCount(6);expect((await saved()).instance).toEqual(first.instance);
  for(const [a,b] of path){await page.locator(`[data-peg="${a}"]`).click();await page.locator(`[data-peg="${b}"]`).click();}
  await expect(page.locator('#winBox')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.hanoi-tower')).completed)).toEqual([4]);
  for(const action of ['new','classic']){
    await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);await expect(page.locator('#discPick button')).toHaveCount(6);
    if(action==='new')expect((await saved()).fingerprint).not.toBe(first.fingerprint);
    else expect((await saved()).instance.pegs).toEqual([[4,3,2,1],[],[]]);
  }
  await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);expect(errors).toEqual([]);
});
