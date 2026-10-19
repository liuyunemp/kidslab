import {test,expect} from '@playwright/test';
test('volume-aquarium: all guests, displacement, conversions, composite volume and round recovery',async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('/courseware/volume-aquarium/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.volume-aquarium.seed-987'));return s.levels[s.active];});
  const progress=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.volume-aquarium')));
  const selectObject=async i=>{if(await page.locator('#objectSelect').isVisible())await page.locator('#objectSelect').selectOption(String(i));else await page.locator(`[data-object="${i}"]`).click();};
  for(let i=0;i<6;i++){
    const a=(await saved()).instance;let solution;
    for(let l=1;l<=6;l++)for(let w=1;w<=6;w++)for(let h=1;h<=6;h++)if(l*w*h===a.need&&(a.pref==='flat'?h<=2&&l>=w:a.pref==='tall'?h>=Math.max(l,w):true))solution=[l,w,h];
    expect(solution).toBeTruthy();await page.evaluate(v=>['len','wid','hei'].forEach((id,i)=>{const el=document.getElementById(id);el.value=v[i];el.dispatchEvent(new Event('input',{bubbles:true}));}),solution);
    await page.locator('#confirmTank').click();expect((await saved()).play.solved).toBe(true);const p=await progress();await page.locator('#confirmTank').click();expect(await progress()).toEqual(p);
    await page.reload();expect((await saved()).play.dims).toEqual(solution);await page.locator('#nextCustomer').click();
  }
  await page.locator('[data-mode="displace"]').click();
  for(let i=0;i<5;i++){
    await selectObject(i);const a=(await saved()).instance;
    await page.locator('#dropObject').click();await page.reload();expect((await saved()).play.state.beaker).toBe(1);await expect(page.locator('#measureReadout')).toContainText(String(a.volume));
  }
  await page.locator('[data-mode="pump"]').click();
  for(let i=0;i<3;i++){
    const a=(await saved()).instance,answer=a.unit==='toL'?a.ml/1000:a.unit==='sum'?a.liters*1000+a.ml:a.ml;
    await page.locator(`[data-pump="${answer}"]`).click();expect((await saved()).play.solved).toBe(true);await page.reload();expect((await saved()).play.solved).toBe(true);await page.locator('#nextPump').click();
  }
  await page.locator('[data-mode="bonus"]').click();const a=(await saved()).instance;await page.locator('#solveL').click();await expect(page.locator('#bonusFormula')).toContainText(`= ${a.width*(a.left*a.low+a.right*a.high)} cm³`);
  const p=await progress();const old=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(old.instance);expect((await saved()).play.state.lSolved).toBe(false);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(old.fingerprint);
    if(action==='classic')expect((await saved()).instance.left).toBe(4);
    expect(await progress()).toEqual(p);
  }
  await page.locator('[data-mode="displace"]').click();await page.locator('#dropObject').click();await selectObject(1);const current=await saved();await page.waitForTimeout(1200);expect((await saved()).play.state.beaker).toBe(current.play.state.beaker);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);expect(errors).toEqual([]);
});
