import {test,expect} from '@playwright/test';
import {courses} from '../../scripts/adventure/catalog.mjs';

// All game actions use UI controls; models only derive the action sequence.
async function openPanel(page){if(await page.locator('#panelBtn').getAttribute('aria-expanded')==='false')await page.locator('#panelBtn').click();}
async function playPanel(page){await openPanel(page);await page.locator('[data-tab="play"]').click();}
async function clickAction(page,course,model,level,state,action){
  await playPanel(page);
  if(action.bot!==undefined&&level.active>1)await page.locator(`[data-bot="${action.bot}"]`).click();
  if(['rule','gear','flow','slope'].includes(action.type)){
    const selects=model.controls(level,state,action.bot||0).filter(c=>c.select);
    const at=selects.findIndex(c=>c.options.some(o=>JSON.stringify(o.action)===JSON.stringify(action))),option=selects[at].options.findIndex(o=>JSON.stringify(o.action)===JSON.stringify(action));
    // Numeric labels (e.g. 6 teeth) can collide with another option's value.
    const select=page.locator('#controls select').nth(at);
    await select.selectOption({value:String(option)});
    await expect(select).toHaveValue(String(option));return;
  }
  if(['dig','bank','pool','dredge'].includes(action.type)){
    await page.locator(`[data-tool="${action.type}"]`).click();if(await page.locator('#panelBtn').getAttribute('aria-expanded')==='true')await page.locator('#panelBtn').click();
    await page.locator(`button[data-action='${JSON.stringify({type:'tool',cell:action.cell})}']`).click();return;
  }
  if(action.type==='step'&&course.category==='programming'){await page.locator('#stepBtn').click();return;}
  if(action.type==='restart'){await page.locator('#stopBtn').click();return;}
  if(action.type==='retry'){await page.locator('#retryBtn').click();return;}
  if(action.type==='undo'){await page.locator('#undoBtn').click();return;}
  const buttons=page.locator(`button[data-action='${JSON.stringify(action)}']`);
  // Prefer the panel control when a projected scene control is also present.
  const panelButton=page.locator(`#panel button[data-action='${JSON.stringify(action)}']`);
  if(await panelButton.count())await panelButton.click();else await buttons.first().click();
}
for(const course of courses){
  test(`${course.id}: play all nine levels through controls, unlock and finish`,async({page})=>{
    test.setTimeout(300000);const model=await import(`../../src/${course.id}/${course.id}-model.js`),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`/courseware/${course.id}/`);await expect(page.locator('#levelTitle')).toContainText('1.');
    await openPanel(page);await page.locator('[data-tab="levels"]').click();await expect(page.locator('[data-level="1"]')).toBeDisabled();
    for(let index=0;index<9;index++){
      const level=model.makeLevel(index,0);let state=model.initial(level);
      for(const action of model.solve(level)){await clickAction(page,course,model,level,state,action);const r=model.apply(level,state,action);expect(r.ok).toBe(true);state=r.state;}
      await expect(page.locator('#success')).toBeVisible();await page.reload();await expect(page.locator('#success')).toBeVisible();
      if(index<8){await page.locator('#nextBtn').click();await expect(page.locator('#levelTitle')).toContainText(`${index+2}.`);}
    }
    await expect(page.locator('#successText')).toHaveText(/九关完成|All nine complete/);expect(errors).toEqual([]);
  });
  test(`${course.id}: unsuccessful operation, recovery, hints and persisted random puzzle`,async({page})=>{
    test.setTimeout(120000);const model=await import(`../../src/${course.id}/${course.id}-model.js`),l=model.makeLevel(0);let state=model.initial(l);
    await page.goto(`/courseware/${course.id}/`);await playPanel(page);
    if(course.id==='warehouse-pusher'){
      for(let i=0;i<8;i++)await clickAction(page,course,model,l,state,{type:'move',dir:'up'});await expect(page.locator('#coach')).toContainText(/挡住|blocked/);
    }else if(course.id==='light-chain-house'){
      const right=model.solve(l)[0].cell,cell=l.allowed.find(v=>v!==right);await clickAction(page,course,model,l,state,{type:'flip',cell});await expect(page.locator('#success')).toBeHidden();
    }else if(course.id==='stack-crane'){
      await clickAction(page,course,model,l,state,{type:'add',command:'stack-out'});await clickAction(page,course,model,l,state,{type:'step'});await expect(page.locator('#coach')).toContainText(/空|empty/);
    }else if(course.id==='recursive-forest'){
      await clickAction(page,course,model,l,state,{type:'rule',key:'stop',value:false});for(let i=0;i<7;i++)await clickAction(page,course,model,l,state,{type:'step'});await expect(page.locator('#coach')).toContainText(/6/);
    }else if(course.id==='pollination-garden'){
      await clickAction(page,course,model,l,state,{type:'visit'});await expect(page.locator('#coach')).toContainText(/花|flower/);
    }else if(course.id==='river-sandbox'){
      await clickAction(page,course,model,l,state,{type:'dredge',cell:0});await expect(page.locator('#coach')).toContainText(/没有淤沙|no deposit/);
    }else{await clickAction(page,course,model,l,state,{type:'step'});await expect(page.locator('#coach')).toContainText(/放行|green signal|没咬上|not meshing|指令走完|program has ended/);}
    await playPanel(page);await page.locator('#retryBtn').click();await expect(page.locator('#undoBtn')).toBeDisabled();
    for(const action of model.solve(l)){await clickAction(page,course,model,l,state,action);state=model.apply(l,state,action).state;}
    await expect(page.locator('#success')).toBeVisible();await playPanel(page);await page.locator('#retryBtn').click();
    await page.locator('#hintBtn').click();await expect(page.locator('#hintText')).not.toBeEmpty();await page.locator('#moreHintBtn').click();await page.locator('#moreHintBtn').click();await expect(page.locator('#demoBtn')).toBeVisible();await page.locator('#demoBtn').click();
    await playPanel(page);await page.locator('#retryBtn').click();await page.locator('[data-tab="levels"]').click();await page.locator('#newBtn').click();await expect(page.locator('#seedLabel')).not.toHaveText(/· 0$/);await page.locator('[data-tab="levels"]').click();
    const text=await page.locator('#seedLabel').textContent();await page.reload();await openPanel(page);await page.locator('[data-tab="levels"]').click();await expect(page.locator('#seedLabel')).toHaveText(text);
    await page.locator('#classicBtn').click();await page.locator('[data-tab="levels"]').click();await expect(page.locator('#seedLabel')).toContainText('· 0');
  });
  test(`${course.id}: first move survives audio failure and restores after reload`,async({page})=>{
    await page.addInitScript(()=>{window.AudioContext=class{constructor(){throw new Error('Unavailable audio');}};HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('Unavailable media'));});
    const model=await import(`../../src/${course.id}/${course.id}-model.js`),level=model.makeLevel(0),first=model.solve(level)[0];
    await page.goto(`/courseware/${course.id}/`);await expect(page.locator('#levelTitle')).toContainText('1.');
    await clickAction(page,course,model,level,model.initial(level),first);await playPanel(page);await expect(page.locator('#undoBtn')).toBeEnabled();
    await page.reload();await playPanel(page);await expect(page.locator('#undoBtn')).toBeEnabled();await page.locator('#undoBtn').click();await expect(page.locator('#undoBtn')).toBeDisabled();
    const size=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));expect(size.sw).toBeLessThanOrEqual(size.w);expect(size.sh).toBeLessThanOrEqual(size.h);
    for(const selector of ['#musicBtn','#soundBtn','#themeBtn','#langBtn']){const box=await page.locator(selector).boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(size.w);expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);await page.locator(selector).click();}
  });
}
