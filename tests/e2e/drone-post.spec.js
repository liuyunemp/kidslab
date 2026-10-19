import { test, expect } from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    controls: [...document.querySelectorAll('button:not([hidden]), a:not([hidden])')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent.trim(),
          width: rect.width,
          height: rect.height,
          font: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      })
      .filter(({ width, height }) => width > 0 && height > 0),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
    lessonFont: Number.parseFloat(getComputedStyle(document.querySelector('#lessonText')).fontSize),
    canvasHeight: document.querySelector('#mapCanvas').getBoundingClientRect().height,
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.controls.filter(({ width, height }) => width < 44 || height < 44)).toEqual([]);
  expect(layout.controls.filter(({ font, text }) => font < 14 && text)).toEqual([]);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.lessonFont).toBeGreaterThanOrEqual(16);
  expect(layout.canvasHeight).toBeGreaterThanOrEqual(98);
}

const saved=page=>roundRecord(page,'drone-post');
async function coordinate(page,x,y){for(const [axis,want] of [['x',x],['y',y]]){const cur=Number(await page.locator('#'+axis+'Value').textContent());for(let n=0;n<Math.abs(want-cur);n++)await page.locator('[data-axis="'+axis+'"][data-delta="'+(want>cur?1:-1)+'"]').click();}}
function pathToPoints(points){const search=(p,used=[])=>{if(used.length===6)return used;for(let i=0;i<points.length;i++){const q=points[i];if(!used.includes(i)&&(p[0]===q[0]||p[1]===q[1])){const found=search(q,[...used,i]);if(found)return found;}}};return search([0,0]);}
async function delivery(page,index,errors=false){
 const a=(await saved(page)).instance;
 if(index<2){
  if(errors){await page.locator('#dispatchBtn').click();expect((await saved(page)).play.solved).toBe(false);}
  await coordinate(page,a.target[0]-a.wind[0],a.target[1]-a.wind[1]);
 }else{
  const answer=a.options.findIndex(v=>v[0]*v[1]===a.km*1000);
  if(errors){await page.locator('[data-route="'+((answer+1)%a.options.length)+'"]').click();await page.locator('#dispatchBtn').click();expect((await saved(page)).play.solved).toBe(false);}
  await page.locator('[data-route="'+answer+'"]').click();await page.locator('#dispatchBtn').click();
  if(errors){const wrong=a.points.findIndex(p=>p[0]!==0&&p[1]!==0);await page.locator('[data-waypoint="'+wrong+'"]').click();await expect(page.locator('#status')).toContainText('斜穿');}
  const path=pathToPoints(a.points);expect(path).toHaveLength(6);for(const n of path)await page.locator('[data-waypoint="'+n+'"]').click();
 }
 await page.locator('#dispatchBtn').click();await expect(page.locator('#nextBtn')).toBeVisible();await page.locator('#nextBtn').click();
}
test.describe('drone post office',()=>{
 test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>{localStorage.clear();localStorage.setItem('kidslab.lang','zh');localStorage.setItem('kidslab.theme','light');sessionStorage.setItem('kidslab.starmap',JSON.stringify({open:true}));});await page.goto('/courseware/drone-post/?seed=987');});
 test('recovers from invalid coordinates, scale and diagonal route before completing deliveries',async({page})=>{
  for(let i=0;i<3;i++)await delivery(page,i,true);await expect(page.locator('#finale')).toBeVisible();await expect(page.locator('#course')).toHaveJSProperty('inert',true);await expect(page.locator('.kidslab-starmap-back')).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.progress.drone-post')).status)).toBe('completed');
 });
 test('persists entered coordinates and preferences at each target viewport',async({page})=>{
  await delivery(page,0);await coordinate(page,2,3);const before=(await saved(page)).play;
  await page.locator('#soundBtn').click();await page.locator('#themeBtn').click();await page.locator('#langBtn').click();await expectFitsViewport(page);await page.reload();
  expect((await saved(page)).play).toEqual(before);await expect(page.locator('#xValue')).toHaveText('2');await expect(page.locator('#yValue')).toHaveText('3');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expectFitsViewport(page);
  await delivery(page,1);await delivery(page,2);
 });
 test('completed delivery reloads and new shift preserves achievement',async({page})=>{
  for(let i=0;i<3;i++)await delivery(page,i);await page.reload();await expect(page.locator('#finale')).toBeVisible();await page.locator('#playAgainBtn').click();await expect(page.locator('#xValue')).toHaveText('0');await expect(page.locator('#yValue')).toHaveText('0');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kidslab.progress.drone-post')).status)).toBe('completed');
 });
});
