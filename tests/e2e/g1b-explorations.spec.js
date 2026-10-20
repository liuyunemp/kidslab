import { test, expect } from '@playwright/test';
import { courses, journey } from '../g1b-journeys.mjs';
import * as THREE from 'three';
import { captureSpeech, expectNarrationStarted } from './speech-helpers.js';

async function perform(page,action){
 if(action.type==='trace'){
  const b=await page.locator('#trace').boundingBox();const points=action.points.map(([x,y])=>({x:b.x+x*b.width/100,y:b.y+y*b.height/100}));
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();for(const p of points.slice(1))await page.mouse.move(p.x,p.y);await page.mouse.up();return;
 }
 let selector=`#controls [data-action="${action.type}"]`;
 for(const [key,value] of Object.entries(action))if(key!=='type')selector+=`[data-${key}="${value}"]`;
 // count has a side field while other controls use the exact relevant attributes.
 await page.locator(selector).click();
}
for(const c of courses){
 test(`${c.id}: eight exploration loops, reload, bilingual themes and controls`,async({page},info)=>{
  test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await captureSpeech(page);
  await page.addInitScript(()=>{localStorage.setItem('kidslab.lang','zh');localStorage.setItem('kidslab.theme','light');});
  await page.goto(`/courseware/${c.id}/`);await expect(page.locator('#title')).not.toBeEmpty();await expect(page.locator('#nogl')).toBeHidden();
  await expect(page.locator('#progress')).toHaveText('0/8');
  for(let i=0;i<8;i++){
   await page.locator('#activitySelect').selectOption(String(i));
   await page.evaluate(()=>{window.__speechEvents=[];});
   const instance=await page.evaluate(({id,index})=>JSON.parse(localStorage.getItem(`kidslab.exploration-v2.${id}`)||'null')?.instances?.[index]??null,{id:c.id,index:i});
   for(const action of journey(c,instance??c.activities[i]))await perform(page,action);
   await expect(page.locator('#progress')).toHaveText(`${i+1}/8`);
   await expectNarrationStarted(page,i===7);
   if(i===3){await page.reload();await expect(page.locator('#progress')).toHaveText('4/8');}
  }
  expect(await page.evaluate(id=>JSON.parse(localStorage.getItem(`kidslab.progress.${id}`))?.status,c.id)).toBe('completed');
  await page.reload();await expect(page.locator('#progress')).toHaveText('8/8');
  expect(await page.evaluate(()=>window.__speechEvents)).toEqual([]);
  await page.locator('#resetBtn').click();await expect(page.locator('#progress')).toHaveText('8/8');
  await page.evaluate(()=>{window.__speechEvents=[];});
  const replayInstance=await page.evaluate(id=>JSON.parse(localStorage.getItem(`kidslab.exploration-v2.${id}`)||'null')?.instances?.[7]??null,c.id);
  for(const action of journey(c,replayInstance??c.activities[7]))await perform(page,action);
  await expectNarrationStarted(page,false);await expect(page.locator('#progress')).toHaveText('8/8');
  await page.locator('#langBtn').click();await expect(page.locator('#panelHandle')).toContainText('Exploration');
  await page.locator('#themeBtn').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const layout=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,buttons:[...document.querySelectorAll('.topbar button,.topbar a')].map(b=>{const r=b.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,height:r.height};}),canvas:{w:document.querySelector('canvas').clientWidth,h:document.querySelector('canvas').clientHeight}}));
  expect(layout.w).toBeLessThanOrEqual(info.project.use.viewport.width);expect(layout.h).toBeLessThanOrEqual(info.project.use.viewport.height);expect(layout.canvas).toEqual({w:info.project.use.viewport.width,h:info.project.use.viewport.height});
  for(const b of layout.buttons){expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(info.project.use.viewport.width);expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
  await page.locator('#muteBtn').click();await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed','true');await page.reload();await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed','true');
  expect(errors).toEqual([]);
 });
}
test('failed borrowing, rapid actions, reset during animation and saved legacy records recover',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('kidslab.lang','zh');if(!localStorage.getItem('test.seed')){localStorage.setItem('test.seed','1');localStorage.setItem('kidslab.g1-subtraction-depot','old-record');localStorage.setItem('kidslab.progress.g1-subtraction-depot',JSON.stringify({status:'completed',legacy:true}));localStorage.setItem('kidslab.exploration-v2.g1-subtraction-depot','{broken');}});
 await page.goto('/courseware/g1-subtraction-depot/');await expect(page.locator('#progress')).toHaveText('0/8');
 await page.locator('[data-action=operate]').click();await expect(page.locator('#feedback')).toContainText('拆开');
 await page.locator('[data-action=unbundle]').click();await page.locator('[data-action=operate]').dblclick();await expect(page.locator('#progress')).toHaveText('1/8');
 await page.locator('#resetBtn').click();await page.locator('#undoBtn').isDisabled();await expect(page.locator('#progress')).toHaveText('1/8');await page.reload();await expect(page.locator('#progress')).toHaveText('1/8');
 expect(await page.evaluate(()=>localStorage.getItem('kidslab.g1-subtraction-depot'))).toBe('old-record');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.progress.g1-subtraction-depot')).status)).toBe('completed');
});
test('storage/audio/speech failures do not block the first operation; WebGL fallback',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('disabled');};window.AudioContext=function(){throw new Error('no audio');};window.speechSynthesis=undefined;});
 await page.route('**/*.ogg',route=>route.abort());await page.goto('/courseware/g1b-character-lab/');await page.locator('[data-action=assemble][data-index="0"]').click();await expect(page.locator('.hanzi')).toHaveText('清');
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
 await page.reload();await expect(page.locator('#nogl')).toBeVisible();
});
test('writing pointer cancellation leaves no stroke; invalid trace can be rewritten',async({page})=>{
 await page.goto('/courseware/g1b-writing-workshop/');const svg=page.locator('#trace'),b=await svg.boundingBox();
 await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();await page.locator('#stageReadout').dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await expect(page.locator('.stroke.done')).toHaveCount(0);
 await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();await page.mouse.move(b.x+200,b.y+200);await page.mouse.up();await expect(page.locator('.stroke.done')).toHaveCount(0);
 const c=courses.find(c=>c.kind==='writing');await perform(page,journey(c,c.activities[0])[0]);await expect(page.locator('.stroke.done')).toHaveCount(1);await page.locator('#undoBtn').click();await expect(page.locator('.stroke.done')).toHaveCount(0);
});
test('shape pointer capture: cancel, out-of-table drop, valid drag and undo',async({page},info)=>{
 await page.goto('/courseware/g1-flat-shapes/');await expect(page.locator('#title')).not.toBeEmpty();
 const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.exploration-v2.g1-flat-shapes')).instances[0].initialPositions[0]);
 const {width:w,height:h}=info.project.use.viewport,vw=w<=760?12:18;
 const camera=new THREE.OrthographicCamera(-vw/2,vw/2,vw*h/w/2,-vw*h/w/2,.1,100);camera.position.set(0,10,13);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const point=new THREE.Vector3(first.x+(w<=760?0:-2.1),.35,first.z+(w<=760?-.5:0)).project(camera),x=(point.x+1)*w/2,y=(1-point.y)*h/2;
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.exploration-v2.g1-flat-shapes')||'null'));
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+25,y-20);await page.locator('#scene').dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();expect((await saved()).log).toEqual([]);await expect(page.locator("#scene")).toHaveAttribute("data-settled","true");
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(2,200);await page.mouse.up();expect((await saved()).log).toEqual([]);await expect(page.locator("#scene")).toHaveAttribute("data-settled","true");
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+55,y-30,{steps:8});await page.mouse.up();await expect.poll(async()=>(await saved())?.log.at(-1)?.type).toBe('position');
 await page.locator('#undoBtn').click();await expect(page.locator('#progress')).toHaveText('0/8');
});
test('separate music, effects and narration preferences survive reload',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));await page.goto('/courseware/g1b-character-lab/');await page.locator('#settingsBtn').click();
 for(const id of ['musicBtn','soundBtn','speechBtn']){await page.locator('#'+id).click();await expect(page.locator('#'+id)).toHaveAttribute('aria-pressed','false');}
 await page.reload();await page.locator('#settingsBtn').click();for(const id of ['musicBtn','soundBtn','speechBtn'])await expect(page.locator('#'+id)).toHaveAttribute('aria-pressed','false');
 await page.locator('#settingsBtn').click();await page.locator('#coach').click();await page.locator('[data-action=assemble][data-index="0"]').click();await expect(page.locator('.hanzi')).toHaveText('清');
});
test('all 17 complete snapshots reload offline with local scenes and content',async({page,context})=>{
 test.setTimeout(180000);await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
 for(const c of courses){await page.goto(`/courseware/${c.id}/index.html`);await expect.poll(()=>page.evaluate(async(id)=>{const cache=await caches.open('kidslab-offline-state-v2');return Boolean(await cache.match(new URL(`/__offline__/courses/${id}`,location.origin).href));},c.id),{timeout:15000}).toBe(true);}
 await context.setOffline(true);
 for(const c of courses){await page.goto(`/courseware/${c.id}/index.html`);await expect(page.locator('#title')).not.toBeEmpty();await expect(page.locator('#nogl')).toBeHidden();await page.locator('#activitySelect').selectOption('7');await expect(page.locator('#unitBadge')).toContainText('8/8');}
});
