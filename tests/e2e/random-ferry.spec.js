import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
function solve(a,start){
  const queue=[{s:start,path:[]}],seen=new Set();
  for(const {s,path} of queue){
    if(s.positions.every(p=>p===1))return path;
    for(const id of [null,...a.items.map(x=>x.id)]){
      const n={boatSide:1-s.boatSide,positions:[...s.positions]},i=a.items.findIndex(x=>x.id===id);if(id!==null){if(s.positions[i]!==s.boatSide)continue;n.positions[i]=n.boatSide;}
      const unattended=a.items.filter((_,j)=>n.positions[j]!==n.boatSide).map(x=>x.id);if(!(a.guard&&unattended.includes(a.guard))&&a.dangers.some(([x,y])=>unattended.includes(x)&&unattended.includes(y)))continue;
      const k=JSON.stringify(n);if(seen.has(k))continue;seen.add(k);queue.push({s:n,path:[...path,id]});
    }
  }throw new Error('Unsolvable river');
}
test('ferry-tales: three current-state routes, sailing reload, retry and new content',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/ferry-tales/?seed=987');const saved=()=>roundRecord(page,'ferry-tales');
  for(let level=0;level<3;level++){
    const r=await saved(),path=solve(r.instance,r.play);await page.locator('#hintBtn').click();
    for(let i=0;i<path.length;i++){
      if(path[i])await page.locator(`[data-passenger="${path[i]}"]`).click();await page.locator('#sailBtn').click();
      if(i===0){await page.reload();expect((await saved()).play.trips).toBe(1);}
      else if(i<path.length-1)await expect(page.locator('#sailBtn')).toBeEnabled();
    }
    await expect(page.locator('#completeModal')).toBeVisible();if(level<2)await page.locator('#nextBtn').click();
  }
  const before=await saved();for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);const r=await saved();
    if(action==='retry')expect(r.fingerprint).toBe(before.fingerprint);if(action==='new')expect(r.fingerprint).not.toBe(before.fingerprint);if(action==='classic')expect(r.instance.initial.positions.every(p=>p===0)).toBe(true);expect(r.play.trips).toBe(0);
  }
  // An unsafe crossing is never checkpointed; refreshing during its rewind restores the safe state.
  await page.locator('[data-passenger="dog"]').click();await page.locator('#sailBtn').click();await page.reload();expect((await saved()).play.positions).toEqual([0,0,0,0]);expect((await saved()).play.trips).toBe(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.ferry-tales')).completed)).toEqual([0,1,2]);await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(errors).toEqual([]);
});
