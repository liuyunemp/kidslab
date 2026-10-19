import {test,expect} from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';
function solve(a){const g=[...a.puzzle],n=a.size,h=n===9?3:2,w=n/h;function fill(){const i=g.indexOf(0);if(i<0)return true;const r=Math.floor(i/n),c=i%n;for(let v=1;v<=n;v++){if(Array.from({length:n},(_,k)=>g[r*n+k]===v||g[k*n+c]===v).some(Boolean))continue;let seen=false;for(let y=r-r%h;y<r-r%h+h;y++)for(let x=c-c%w;x<c-c%w+w;x++)if(g[y*n+x]===v)seen=true;if(seen)continue;g[i]=v;if(fill())return true;g[i]=0;}return false;}if(!fill())throw Error('No solution');return g;}
test('sudoku-zoo: five unique Worker puzzles, hint commit, resume and migrated stars',async({page})=>{
  test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/sudoku-zoo/?seed=987');await expect(page.locator('#board .cell')).toHaveCount(16);const saved=()=>roundRecord(page,'sudoku-zoo');
  for(let level=0;level<5;level++){
    const a=(await saved()).instance,answer=solve(a);if(level===0){await page.locator('#hintBtn').click();const current=(await saved()).play;expect(current.grid.filter(Boolean).length).toBe(a.puzzle.filter(Boolean).length+1);await page.reload();await expect(page.locator('#board .cell')).toHaveCount(16);expect((await saved()).play.grid).toEqual(current.grid);}
    const current=(await saved()).play;for(let i=0;i<answer.length;i++)if(!current.grid[i]){await page.keyboard.press('0');await page.locator(`[data-i="${i}"]`).click();await page.keyboard.press(String(answer[i]));}
    await expect(page.locator('#winBox')).toBeVisible();
    if(level<4){await page.locator('#winNextBtn').click();await expect(page.locator('#winBox')).toBeHidden();await expect.poll(async()=>(await saved()).levelId).toBe(`l${level+2}`);}
  }
  const old=await saved();for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await Promise.all([page.waitForEvent('load'),page.locator(`[data-round-action="${action}"]`).click()]);await expect(page.locator('#board .cell')).toHaveCount(81);
    if(action==='retry')expect((await saved()).instance).toEqual(old.instance);if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);if(action==='classic')expect((await saved()).mode).toBe('classic');
  }
  expect(Object.keys(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.sudokuzoo')).stars))).toHaveLength(5);
  await page.locator('#langBtn').click();await page.locator('#themeBtn').click();expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);expect(errors).toEqual([]);
});
