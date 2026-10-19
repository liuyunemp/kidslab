import {test,expect} from '@playwright/test';

test('voxel-studio: independent projection choices, actual building and shared-puzzle resume',async({page})=>{
  test.setTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/courseware/voxel-studio/?seed=987&e2e=1');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.voxel-studio.seed-987'));return s.levels[s.active];});
  for(const cam of ['front','top','side']){
    const cells=(await saved()).instance.cells;
    const grid=Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>cells.some(([x,y,z])=>cam==='front'?x===c&&y===3-r:cam==='top'?x===c&&z===r:z===c&&y===3-r)));
    await page.locator(`[data-cam="${cam}"]`).click();
    const choices=await page.locator('.option').evaluateAll(es=>es.map(e=>JSON.parse(e.dataset.grid)));
    expect(new Set(choices.map(g=>JSON.stringify(g))).size).toBe(4);
    await page.locator('.option').nth(choices.findIndex(g=>JSON.stringify(g)===JSON.stringify(grid))).click();
  }
  await page.locator('#modeBtn').click();
  const target=(await saved()).instance.cells.slice().sort((a,b)=>a[2]-b[2]||b[0]-a[0]||a[1]-b[1]);
  for(const [x,y,z]of target){
    const p=await page.evaluate(([x,y,z])=>window.__voxelPoint(x,y,z),[x,y,z]);await page.mouse.click(p.x,p.y);
  }
  expect((await saved()).play.answered).toEqual({front:true,top:true,side:true});
  await page.reload();expect((await saved()).play.answered.front).toBe(true);
  const last=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry')expect((await saved()).instance).toEqual(last.instance);
    if(action==='new')expect((await saved()).fingerprint).not.toBe(last.fingerprint);
    if(action==='classic')expect((await saved()).mode).toBe('classic');
  }
  await page.locator('#freeBtn').click();const free=await saved();await page.reload();expect((await saved()).play.cells).toEqual(free.play.cells);
  await page.locator('#codeInput').fill('3');await page.locator('#loadCode').click();await page.reload();expect((await saved()).instance.shared).toBe(true);expect((await saved()).play.cells).toEqual([]);
  expect(errors).toEqual([]);
});

test('lantern-lane: five endpoint rules from random instances, retry and badge retention',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/courseware/lantern-lane/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.lantern-lane.seed-987'));return s.levels[s.active];});
  for(let i=0;i<5;i++){
    const a=(await saved()).instance,answer=a.mode==='cut'?a.length-1:a.mode==='stairs'?a.endFloor-a.startFloor:a.length/a.gap+(a.mode==='both'?1:a.mode==='neither'?-1:0);
    const guess=(await saved()).play.guess;for(let n=0;n<Math.abs(answer-guess);n++)await page.locator(answer>guess?'#plusBtn':'#minusBtn').click();
    await page.locator('#placeBtn').click();const played=await saved();await page.reload();expect((await saved()).play).toEqual(played.play);await page.locator('#nextBtn').click();
  }
  await expect(page.locator('#finale')).toBeVisible();const last=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry')expect((await saved()).instance).toEqual(last.instance);
    if(action==='new')expect((await saved()).fingerprint).not.toBe(last.fingerprint);
    if(action==='classic')expect((await saved()).instance.startFloor).toBe(3);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.lantern-lane')).completed)).toBe(true);expect(errors).toEqual([]);
});

test('drone-post: random commands, independent scaled route and six legal waypoints',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/courseware/drone-post/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.drone-post.seed-987'));return s.levels[s.active];});
  for(let i=0;i<3;i++){
    const a=(await saved()).instance;
    if(i<2){
      for(let axis=0;axis<2;axis++)for(let n=0;n<a.target[axis]-a.wind[axis];n++)await page.locator(`[data-axis="${axis?'y':'x'}"][data-delta="1"]`).click();
    }else{
      const route=a.options.findIndex(v=>v[0]*v[1]===a.km*1000);await page.locator(`[data-route="${route}"]`).click();await page.locator('#dispatchBtn').click();
      const search=(p,used=[])=>{if(used.length===6)return used;for(let k=0;k<a.points.length;k++){const q=a.points[k];if(!used.includes(k)&&(p[0]===q[0]||p[1]===q[1])){const found=search(q,[...used,k]);if(found)return found;}}};
      const path=search([0,0]);expect(path).toHaveLength(6);for(const k of path)await page.locator(`[data-waypoint="${k}"]`).click();
    }
    const played=await saved();await page.reload();expect((await saved()).play).toEqual(played.play);
    await page.locator('#dispatchBtn').click();await page.locator('#nextBtn').click();
  }
  await expect(page.locator('#finale')).toBeVisible();const last=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry')expect((await saved()).instance).toEqual(last.instance);
    if(action==='new')expect((await saved()).fingerprint).not.toBe(last.fingerprint);
    if(action==='classic')expect((await saved()).instance.km).toBe(3);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.drone-post')).completed)).toBe(true);expect(errors).toEqual([]);
});

test('sale-detective: three generated price comparisons, snapshots and sticky badge',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/courseware/sale-detective/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.sale-detective.seed-987'));return s.levels[s.active];});
  for(let i=0;i<3;i++){
    const a=(await saved()).instance,v=a.kind==='raise'?0:a.kind==='pair'?1:a.price-a.reduction<a.price*3/4?0:a.price-a.reduction===a.price*3/4?1:2;
    await page.locator('[data-evidence="0"]').click();await page.locator(`[data-verdict="${v}"]`).click();
    const played=await saved();await page.reload();expect((await saved()).play).toEqual(played.play);
    await page.locator('#checkBtn').click();await page.locator('#nextBtn').click();
  }
  await expect(page.locator('#finale')).toBeVisible();const last=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry')expect((await saved()).instance).toEqual(last.instance);
    if(action==='new')expect((await saved()).fingerprint).not.toBe(last.fingerprint);
    if(action==='classic')expect((await saved()).instance.price).toBe(36000);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.sale-detective')).completed)).toBe(true);expect(errors).toEqual([]);
});

test('shape-tailor: all generated areas, interrupted motion, refresh, retry and progress retention',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/courseware/shape-tailor/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.shape-tailor.seed-987'));return s.levels[s.active];});
  for(let i=0;i<3;i++){
    const a=(await saved()).instance,answer=(a.kind==='trapezoid'?a.base+a.top:a.base)*a.height/(a.kind==='parallelogram'?1:2);
    await page.locator('#cutBtn').click();await page.locator('#slideBtn').click();
    if(i===0){await page.locator('.random-round-menu summary').click();await page.locator('[data-round-action="retry"]').click();await page.waitForLoadState();expect((await saved()).play.phase).toBe('ready');await page.locator('#cutBtn').click();await page.locator('#slideBtn').click();}
    await expect(page.locator('#quoteBtn')).toBeVisible();
    const current=Number(await page.locator('#guessValue').textContent());
    for(let n=0;n<Math.abs(answer-current);n++)await page.locator(answer>current?'#plusBtn':'#minusBtn').click();
    await page.locator('#quoteBtn').click();const played=await saved();
    await page.reload();expect((await saved()).play).toEqual(played.play);await page.locator('#nextBtn').click();
  }
  await expect(page.locator('#finale')).toBeVisible();const last=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(last.instance);expect((await saved()).play.phase).toBe('ready');}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(last.fingerprint);
    if(action==='classic')expect((await saved()).instance.answer).toBe(32);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.shape-tailor')).completed)).toBe(true);expect(errors).toEqual([]);
});

test('fraction-beats: open fill, equal durations, generated sequence and round persistence',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/courseware/fraction-beats/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.fraction-beats.seed-987'));return s.levels[s.active];});
  for(let i=0;i<3;i++){
    const a=(await saved()).instance;
    if(i===0){const n=8-a.initial.reduce((x,y)=>x+y,0);for(let j=0;j<n;j++)await page.locator('[data-units="1"]').click();}
    if(i===1)for(let j=0;j<a.target/a.unit;j++)await page.locator(`[data-units="${a.unit}"]`).click();
    if(i===2){for(const n of a.sequence)await page.locator(`[data-units="${n}"]`).click();await page.locator('#playBtn').click();}
    const before=await saved();await page.reload();expect((await saved()).play).toEqual(before.play);
    await page.locator('#checkBtn').click();expect((await saved()).play.done).toBe(true);
    if(i<2){await page.reload();await page.locator('#nextBtn').click();}
  }
  const last=await saved();await expect(page.locator('#completeModal')).toBeVisible();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(last.instance);expect((await saved()).play.beats).toEqual([]);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(last.fingerprint);
    if(action==='classic')expect((await saved()).instance.sequence).toEqual([2,1,1,4]);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.fraction-beats')).completed)).toEqual([0,1,2]);expect(errors).toEqual([]);
});

for(const id of ['square-root-lab','potion-ratio','updown-world'])test(`${id}: every seeded task, refresh, retry, new round and classic`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
  await page.goto(`/courseware/${id}/?seed=987`);
  const saved=()=>page.evaluate(id=>JSON.parse(localStorage.getItem(`kidslab.random.v1.${id}.seed-987`)),id);
  const current=async()=>{const s=await saved();return s.levels[s.active];};
  if(id==='square-root-lab'){
    await page.locator('#areaInput').fill('81');await page.locator('#calculateBtn').click();
    await page.reload();expect((await current()).play.currentArea).toBe(81);
    await page.locator('#challengeTab').click();
  }
  const count=id==='square-root-lab'?5:3;
  for(let i=0;i<count;i++){
    const a=(await current()).instance;
    if(id==='square-root-lab'){
      const answer=a.values.findIndex(v=>a.kind==='tile'?v*v===a.area:a.kind==='bounds'?v[0]**2<a.area&&a.area<v[1]**2:a.kind==='simplify'?v[0]**2*v[1]===a.area:a.kind==='decimal'?v===Math.round(Math.sqrt(a.area)*100):v===a.area);
      await page.locator(`[data-choice="${answer}"]`).click();
    }else if(id==='potion-ratio'){
      const answer=a.options.findIndex(v=>v.reduce((x,y)=>x+y,0)===a.total&&v.every((n,k)=>n*a.shares[0]===v[0]*a.shares[k]));
      await page.locator(`[data-option="${answer}"]`).click();await page.locator('#checkBtn').click();
    }else{
      if(a.mode==='move'){for(let n=a.start;n<a.target;n++)await page.locator('[data-step="1"]').click();}
      else{const answer=a.options.findIndex(n=>n===(a.skin==='temperature'?Math.max(...a.options):a.start-(a.start-a.target)));await page.locator(`[data-answer="${answer}"]`).click();}
      await page.locator('#checkBtn').click();
    }
    const played=await current();await page.reload();expect((await current()).instance).toEqual(a);expect((await current()).play).toEqual(played.play);
    await page.locator('#langBtn').click();await page.locator('#langBtn').click();
    const next=page.locator(id==='square-root-lab'?'#nextChallenge':'#nextBtn');await expect(next).toBeVisible();
    if(i<count-1)await next.click();
  }
  const last=await current();
  const action=async name=>{const menu=page.locator('.random-round-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await page.locator(`[data-round-action="${name}"]`).click();await page.waitForLoadState();};
  await action('retry');expect((await current()).instance).toEqual(last.instance);
  await action('new');expect((await current()).fingerprint).not.toBe(last.fingerprint);
  await action('classic');expect((await current()).mode).toBe('classic');
  expect(errors).toEqual([]);
});

test('zoom-ten: random start, all unit conversions, refresh and same-level new round',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
  await page.goto('/courseware/zoom-ten/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.zoom-ten.seed-987'));return s.levels[s.active];});
  await page.locator('#challengeBtn').click();
  for(let i=0;i<4;i++){
    const before=await saved(),a=before.instance,answer=String(a.hundredths*a.scale/100);
    await page.locator(`#challengeChoices [data-v="${answer}"]`).click();
    const played=await saved();await page.reload();expect((await saved()).play).toEqual(played.play);
    if(i<3)await page.locator('#challengeBtn').click();
  }
  const before=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry')expect((await saved()).instance).toEqual(before.instance);
    if(action==='new')expect((await saved()).fingerprint).not.toBe(before.fingerprint);
    if(action==='classic')expect((await saved()).instance.hundredths).toBe(1);
  }
});

test('local generation worker returns deterministic validated instances',async({page})=>{
  await page.goto('/courseware/potion-ratio/?seed=987');
  const result=await page.evaluate(async()=>{
    const {createRounds}=await import('/courseware/potion-ratio/random-rounds.js');
    const {ratioTask,validRatio,ratioIdentity}=await import('/courseware/potion-ratio/random-model.js');
    const rounds=createRounds('worker-contract'),base={kind:'mix',shares:[3,2],total:15,options:[[8,7],[9,6],[10,5]],correct:1};
    const first=await rounds.defineAsync('mix',base,ratioTask,validRatio,ratioIdentity,{generator:'ratioTask',validator:'validRatio',identity:'ratioIdentity',enumerator:'ratioFamily'});
    const second=await rounds.nextAsync('mix');return {first,second,record:rounds.record('mix')};
  });
  expect(result.first.total).not.toBe(result.second.total);
  expect(result.second.options.filter(v=>v[0]+v[1]===result.second.total&&v[0]*2===v[1]*3)).toHaveLength(1);
  expect(result.record.round).toBe(1);
});

test('data-studio: seeded tally, all chart types, maximum/total/mean, progress and new episode',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
  await page.goto('/courseware/data-studio/?seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.data-studio.seed-987'));return s.levels[s.active];});
  const first=await saved();
  for(let i=0;i<first.instance.votes.length;i++){
    await page.locator(`[data-song="${first.instance.votes[i]}"]`).click();
    if(i===2){await page.reload();expect((await saved()).play.voteIndex).toBe(3);}
  }
  await page.locator('#nextBtn').click();
  for(const type of ['bar','line','pie'])await page.locator(`[data-chart="${type}"]`).click();
  await page.locator('#nextBtn').click();
  const a=(await saved()).instance;
  const total=a.counts.reduce((x,y)=>x+y,0),highest=a.ids[a.counts.indexOf(Math.max(...a.counts))];
  for(const answer of [highest,total,total/4])await page.locator(`[data-answer="${answer}"]`).click();
  await expect(page.locator('#completeModal')).toBeVisible();
  const last=await saved();await page.reload();expect((await saved()).play).toEqual(last.play);
  const action=async name=>{await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${name}"]`).click();await page.waitForLoadState();};
  await action('retry');expect((await saved()).instance).toEqual(last.instance);
  await action('new');expect((await saved()).fingerprint).not.toBe(last.fingerprint);
  await action('classic');expect((await saved()).instance.counts).toEqual([8,6,4,2]);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.data-studio')).completed)).toEqual([0,1,2]);
});
