import { test, expect } from '@playwright/test';
import { courses, journey } from '../g1b-journeys.mjs';
import { supportsRandom } from '../../src/g1b-character-lab/random-explorations.js';

for(const c of courses.filter(supportsRandom))test(`${c.id}: random default, a full loop, resume, retry, new and classic`,async({page})=>{
  test.setTimeout(90000);
  await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
  await page.goto(`/courseware/${c.id}/?seed=987`);
  const saved=()=>page.evaluate(id=>JSON.parse(localStorage.getItem(`kidslab.exploration-v2.${id}`)),c.id);
  await expect(page.locator('#stageReadout')).toHaveAttribute('data-round-mode','random');
  const first=(await saved()).instances[0];
  for(const action of journey(c,first)){
    let selector=`#controls [data-action="${action.type}"]`;
    for(const [key,value] of Object.entries(action))if(key!=='type')selector+=`[data-${key}="${value}"]`;
    await page.locator(selector).click();
  }
  await expect(page.locator('#progress')).toHaveText('1/8');
  const completed=await saved();await page.reload();expect(await saved()).toEqual(completed);
  await page.locator('#resetBtn').click();expect((await saved()).instances[0]).toEqual(first);
  await page.locator('#randomControls summary').click();await page.locator('#newRoundBtn').click();
  expect((await saved()).instances[0]).not.toEqual(first);await expect(page.locator('#progress')).toHaveText('1/8');
  await page.locator('#classicRoundBtn').click();await expect(page.locator('#stageReadout')).toHaveAttribute('data-round-mode','classic');
  const classic=(await saved()).instances[0];for(const k of ['a','b','c','budget','price'])expect(classic[k]).toEqual(c.activities[0][k]);
  await page.reload();expect((await saved()).instances[0]).toEqual(classic);
});

const generic=['fraction-lab','clock-town','carry-factory','orchard-orders','grid-tower','function-grapher','statistics-sampling-lab','balance-circus','rolling-park','triangle-lab','tangram-theater','hamster-fence','alien-farm','combo-closet','crystal-cave'];
for(const id of generic)test(`${id}: seeded content, playable loop and round controls`,async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
  await page.goto(`/courseware/${id}/?seed=987`);
  if(id==='statistics-sampling-lab'){
    const handle=page.locator('#panelHandle');if(await handle.getAttribute('aria-expanded')==='false')await handle.click();
  }
  const saved=()=>page.evaluate(id=>JSON.parse(localStorage.getItem(`kidslab.random.v1.${id}.seed-987`)),id);
  const openRoundMenu=async()=>{const menu=page.locator('.random-round-menu');if(await menu.count()&&await menu.getAttribute('open')===null)await menu.locator('summary').click();};
  await openRoundMenu();
  await expect(page.locator('[data-round-action=new]')).toBeVisible();
  if(await page.locator('.random-round-menu').count())await page.locator('.random-round-menu summary').click();
  const first=await saved(),entry=first.levels[first.active];
  if(id==='combo-closet'){
    const a=entry.instance;
    for(const h of a.hats)for(const top of a.tops){await page.locator(`[data-hat="${h}"]`).click();await page.locator(`[data-top="${top}"]`).click();}
    await expect(page.locator('#modal')).toBeVisible();
  }else if(id==='crystal-cave'){
    for(let i=0;i<3;i++){
      const choices=await page.locator('[data-factor]').evaluateAll(buttons=>buttons.map(b=>({i:b.dataset.factor,a:Number(b.dataset.a),b:Number(b.dataset.b)})));
      if(!choices.length)break;
      const n=Number(await page.locator('#selectedValue').textContent()),choice=choices.find(x=>x.a*x.b===n&&x.a>1&&x.b>1);expect(choice).toBeTruthy();
      await page.locator(`[data-factor="${choice.i}"]`).click();
    }
    await expect(page.locator('#nextBtn')).toBeVisible();
  }else if(id==='alien-farm'){
    const a=entry.instance.target;await page.locator('#mixRange').fill(String(a.legs-3*a.creatures));await page.locator('#checkTrialBtn').click();
    expect((await saved()).levels[first.active].play.completed).toContain(0);
  }else if(id==='rolling-park'){
    for(const radius of [42,60,82]){await page.locator('#radius').fill(String(radius));await page.locator('#autoRoll').click();await expect.poll(async()=>(await saved()).levels[first.active].play.records.length).toBe([42,60,82].indexOf(radius)+1);}
    await page.locator('#guessInput').fill('3.14');await page.locator('#guessBtn').click();expect((await saved()).levels[first.active].play.guessed).toBe(true);
  }else if(id==='triangle-lab'){
    await page.locator('#loadBtn').click();await page.locator('#braceBtn').click();await page.locator('#loadBtn').click();
    expect((await saved()).levels[first.active].play.stabilityDone).toBe(true);
  }else if(id==='tangram-theater'){
    for(let i=0;i<7;i++){
      await page.locator(`[data-piece="${i}"]`).click();
      const [x,y,rotation,flip]=entry.instance.targets[i];
      for(let k=0;k<((rotation-entry.instance.rotations[i]+360)%360)/45;k++)await page.locator('#rightBtn').click();
      if(flip===-1)await page.locator('#flipBtn').click();
      const canvas=page.locator('#stage'),b=await canvas.boundingBox(),p=(await saved()).levels[first.active].play.pieces[i];
      await page.mouse.move(b.x+p.x*b.width,b.y+p.y*b.height);await page.mouse.down();await page.mouse.move(b.x+x*b.width,b.y+y*b.height,{steps:12});await page.mouse.up();
      expect((await saved()).levels[first.active].play.pieces[i].placed).toBe(true);
    }
    await expect(page.locator('#modal')).toBeVisible();
  }else if(id==='hamster-fence'){
    const a=entry.instance,solutions=[];for(let w=1;w<=12;w++)for(let h=1;h<=8;h++)if(2*(w+h)===a.budget&&w*h>=a.goal)solutions.push({w,h});
    const s=solutions[0];for(const k of ['w','h'])for(let i=0;i<Math.abs(s[k]-a.start[k]);i++)await page.locator(`[data-act="${k}${s[k]>a.start[k]?'+':'-'}"]`).click();
    await page.locator('#openBtn').click();await expect(page.locator('#win')).toBeVisible();
  }else if(id==='function-grapher'){
    await page.locator('#sliders input').first().fill('1');await expect(page.locator('#eq')).toContainText('y =');
  }else if(id==='statistics-sampling-lab'){
    await page.locator('#drawBtn').click();await page.locator('#recordBtn').click();await page.locator('#censusBtn').click();
    expect((await saved()).levels[first.active].play.sample.ids.length).toBe(entry.instance.n);
  }else if(id==='balance-circus'){
    await page.locator('[data-operation="0"]').click();await page.locator('[data-operation="0"]').click();
    expect((await saved()).levels[first.active].play.solved).toBe(true);
  }else if(id==='fraction-lab'){
    await page.locator('[data-step="den"][data-d="1"]').click();
  }else if(id==='clock-town'){
    for(let i=entry.instance.start;i<entry.instance.target;i+=5)await page.locator('[data-step="5"]').click();
    await page.locator('#checkBtn').click();await expect(page.locator('#win')).toBeVisible();
  }else if(id==='carry-factory'){
    await page.locator('#actionBtn').click();
    for(let i=0;i<8;i++){
      const lever=page.locator('[data-lever][aria-disabled="false"]');if(!await lever.count())break;await lever.first().click();
    }
    await page.locator('#actionBtn').click();await expect(page.locator('#result')).toBeVisible();
  }else if(id==='orchard-orders'){
    const n=entry.instance.n;
    // The field is 12 columns by 8 rows, so the rectangle is chosen within that grid.
    const rows=Array.from({length:8},(_,i)=>8-i).find(r=>n%r===0&&n/r<=12),cols=n/rows;
    expect(rows,`order ${n} fits the field grid`).toBeTruthy();
    const startCell=page.locator('.cell[data-i="0"]'),endCell=page.locator(`.cell[data-i="${(rows-1)*12+cols-1}"]`);
    await expect(startCell).toBeVisible({timeout:20000});
    await startCell.scrollIntoViewIfNeeded();
    const a=await startCell.boundingBox(),b=await endCell.boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();
    await page.locator('#plantBtn').click();await page.locator('#waterBtn').click();await expect.poll(async()=>(await saved()).levels[first.active].play.stage).toBe('done');
  }else if(id==='grid-tower'){
    const a=entry.instance;
    for(let r=0;r<a.rows.length;r++)for(let c=0;c<a.columns.length;c++){
      await page.locator(`[data-zone="${r}-${c}"]`).click();await page.locator(`[data-answer="${a.rows[r]*a.columns[c]}"]`).click();
    }
    await page.locator(`[data-answer="${a.a*a.b}"]`).click();await expect(page.locator('#modal')).toBeVisible();
  }
  const played=await saved();await page.reload();expect((await saved()).levels[first.active].instance).toEqual(entry.instance);
  if(id==='statistics-sampling-lab'&&await page.locator('#panelHandle').getAttribute('aria-expanded')==='false')await page.locator('#panelHandle').click();
  expect((await saved()).levels[first.active].play).toEqual(played.levels[first.active].play);
  await openRoundMenu();await page.locator('[data-round-action=retry]').click();await page.waitForLoadState();
  if(id==='statistics-sampling-lab'&&await page.locator('#panelHandle').getAttribute('aria-expanded')==='false')await page.locator('#panelHandle').click();
  expect((await saved()).levels[first.active].instance).toEqual(entry.instance);
  await openRoundMenu();await page.locator('[data-round-action=new]').click();await page.waitForLoadState();
  if(id==='statistics-sampling-lab'&&await page.locator('#panelHandle').getAttribute('aria-expanded')==='false')await page.locator('#panelHandle').click();
  expect((await saved()).levels[first.active].fingerprint).not.toBe(entry.fingerprint);
  await openRoundMenu();await page.locator('[data-round-action=classic]').click();await page.waitForLoadState();
  expect((await saved()).levels[first.active].mode).toBe('classic');
  expect(errors).toEqual([]);
});
