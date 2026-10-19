import {test,expect} from '@playwright/test';

// Courses that solve in a Worker publish their snapshot asynchronously, so a read can race
// the first generation. Poll until the requested level exists instead of reading once.
async function readRecord(page,id,level){
  const read=([id,level])=>{
    const seed=new URLSearchParams(location.search).get('seed');
    const raw=localStorage.getItem(`kidslab.random.v1.${id}${seed===null?'':`.seed-${seed}`}`);
    if(!raw)return null;
    let store;
    try{store=JSON.parse(raw);}catch{return null;}
    if(!store||!store.levels)return null;
    return level===null?(store.levels[store.active]??null):(store.levels[String(level)]??null);
  };
  let record=null;
  await expect.poll(async()=>{record=await page.evaluate(read,[id,level]);return record?1:0;},
    {message:`course ${id} never published a round snapshot`,timeout:30000}).toBe(1);
  return record;
}
export async function roundRecord(page,id){
  return readRecord(page,id,null);
}
// Reads one named level even when another level is currently active.
export async function levelRecord(page,id,level){
  return readRecord(page,id,level);
}
export async function levelInstance(page,id,level){
  return (await levelRecord(page,id,level)).instance;
}
// Advances one level through the course's own next control and waits for it to take effect.
// Courses regenerate the incoming level, so callers must read the instance *after* this resolves.
export async function advanceLevel(page,{next='#nextBtn',currentLabel=null}={}){
  const before=currentLabel?await page.locator(currentLabel).textContent():null;
  await page.locator(next).click();
  if(currentLabel)await expect(page.locator(currentLabel)).not.toHaveText(before);
  else await page.waitForTimeout(150);
}
export function independentAnswer(a){
  if(a.shares)return a.options.findIndex(v=>v.reduce((x,y)=>x+y,0)===a.total&&v.every((n,i)=>n*a.shares[0]===v[0]*a.shares[i]));
  if(a.skin==='temperature')return a.options.indexOf(Math.max(...a.options));
  if(a.skin==='ledger')return a.options.findIndex(n=>n<0);
  return a.values.findIndex(v=>{
    if(a.kind==='tile')return v*v===a.area;
    if(a.kind==='bounds')return v[0]**2<a.area&&a.area<v[1]**2;
    if(a.kind==='simplify'){if(v[0]**2*v[1]!==a.area)return false;for(let d=2;d*d<=v[1];d++)if(v[1]%(d*d)===0)return false;return true;}
    if(a.kind==='decimal')return (v/100).toFixed(2)===Math.sqrt(a.area).toFixed(2);
    return v===a.area;
  });
}
export async function solveNumberTask(page,id,{wrong=false}={}){
  const a=(await roundRecord(page,id)).instance;
  if(a.mode==='move'){
    if(!wrong){const value=Number((await page.locator('#currentValue').textContent()).replace('−','-'));for(let n=value;n<a.target;n++)await page.locator('[data-step="1"]').click();}
  }else{
    const choices=a.options??a.values,answer=independentAnswer(a),index=wrong?(answer+1)%choices.length:answer;
    await page.locator(`[data-${id==='potion-ratio'?'option':id==='updown-world'?'answer':'choice'}="${index}"]`).click();
  }
  if(id!=='square-root-lab')await page.locator('#checkBtn').click();
  return a;
}
export function numberJourneyCases(id,expectFitsViewport){
  test.beforeEach(async({page})=>{
    await page.goto('/');await page.evaluate(()=>{localStorage.clear();localStorage.setItem('kidslab.lang','zh');localStorage.setItem('kidslab.theme','light');});
    await page.goto(`/courseware/${id}/?seed=987`);
  });
  const finish=async page=>{for(let i=0;i<3;i++){await solveNumberTask(page,id);await page.locator('#nextBtn').click();}await expect(page.locator('#finale')).toBeVisible();};
  test('recovers from an invalid attempt on every generated task and completes the course',async({page})=>{
    for(let i=0;i<3;i++){
      const before=await roundRecord(page,id);await solveNumberTask(page,id,{wrong:true});
      await expect(page.locator(id==='potion-ratio'?'#brewery':'#shaft')).toHaveAttribute('data-result','wrong');
      expect((await roundRecord(page,id)).instance).toEqual(before.instance);
      await solveNumberTask(page,id);await expect(page.locator('#nextBtn')).toBeVisible();await page.locator('#nextBtn').click();
    }
    await expect(page.locator('#finale')).toBeVisible();await expect(page.locator('#course')).toHaveJSProperty('inert',true);
    expect(await page.evaluate(id=>JSON.parse(localStorage.getItem(`kidslab.progress.${id}`)).status,id)).toBe('completed');
  });
  test('persists generated progress, language, theme and sound at target viewport',async({page})=>{
    await page.locator('#soundBtn').click();await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed','true');
    await page.locator('#themeBtn').click();await solveNumberTask(page,id);await page.reload();
    const before=await roundRecord(page,id);await page.locator('#langBtn').click();
    expect((await roundRecord(page,id)).play).toEqual(before.play);await expectFitsViewport(page);
    await page.reload();expect((await roundRecord(page,id)).play).toEqual(before.play);
    await expect(page.locator('#nextBtn')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed','true');await expectFitsViewport(page);
  });
  test('completed course resumes and another voyage retains achievements',async({page})=>{
    const first=(await roundRecord(page,id)).instance;await finish(page);await page.reload();await expect(page.locator('#finale')).toBeVisible();
    await page.locator('#playAgainBtn').click();await expect(page.locator('#finale')).toBeHidden();
    expect((await roundRecord(page,id)).instance).not.toEqual(first);
    expect(await page.evaluate(id=>JSON.parse(localStorage.getItem(`kidslab.progress.${id}`)).status,id)).toBe('completed');
  });
}
