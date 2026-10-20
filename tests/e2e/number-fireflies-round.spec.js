import { test, expect } from '@playwright/test';
import { captureSpeech, expectNarrationStarted } from './speech-helpers.js';

const catches = [2, 2, 3, 3, 3, 3, 4, 4];

function inside(point, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || 1) + a.x) hit = !hit;
  }
  return hit;
}

function polygonFor(points, pad = 28) {
  const minX = Math.min(...points.map((p) => p.x)) - pad;
  const maxX = Math.max(...points.map((p) => p.x)) + pad;
  const minY = Math.min(...points.map((p) => p.y)) - pad;
  const maxY = Math.max(...points.map((p) => p.y)) + pad;
  return [{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }];
}

function findLasso(snapshot, target) {
  const flies = snapshot.fireflies;
  const eligible = flies.filter((fly) => fly.y > 35 && fly.y < snapshot.height - 35);
  const subsets = [];
  for (let mask = 1; mask < (1 << eligible.length); mask++) {
    const selected = eligible.filter((_, index) => mask & (1 << index));
    if (selected.reduce((sum, fly) => sum + fly.n, 0) === target) subsets.push({ selected });
  }
  subsets.sort((a, b) => a.selected.length - b.selected.length);
  for (const { selected } of subsets) {
    for (const pad of [28,16,8]) {
      const poly = polygonFor(selected,pad);
      if (selected.every((fly) => inside(fly, poly)) && flies.every((fly) => selected.includes(fly) || !inside(fly, poly))) return poly;
    }
    // A freehand lasso can have several lobes. Rectangles alone cannot isolate
    // diagonal combinations when another firefly sits between the targets.
    for(const radius of [12,8]){
      const hub={x:selected[0].x+radius,y:selected[0].y};
      const poly=[hub];
      for(const fly of selected){
        const ring=Array.from({length:8},(_,i)=>({x:fly.x+Math.cos(i*Math.PI/4)*radius,y:fly.y+Math.sin(i*Math.PI/4)*radius}));
        poly.push(...ring,ring[0],hub);
      }
      if(selected.every(fly=>inside(fly,poly))&&flies.every(fly=>selected.includes(fly)||!inside(fly,poly)))return poly;
    }
  }
  return null;
}

async function catchTarget(page,target) {
  const box=await page.locator('#stage').boundingBox();
  const anchor={x:box.x+8,y:box.y+8};
  // Press first: the game freezes moving fireflies throughout a captured drag.
  // Sampling before pointerdown made the old path stale on a busy test machine.
  await page.mouse.move(anchor.x,anchor.y);await page.mouse.down();
  const snapshot=await page.evaluate(()=>window.__fireflySnapshot());
  const polygon=findLasso(snapshot,target);
  if(!polygon){await page.mouse.up();return false;}
  const vertices=polygon.map(p=>({x:box.x+p.x*box.width/snapshot.width,y:box.y+p.y*box.height/snapshot.height}));
  // Retrace the entry segment so it adds no area to the lasso.
  const route=[anchor,...vertices,vertices[0],anchor];
  for(let i=1;i<route.length;i++){
    // Straight edges only need their midpoint and endpoint. Dense mouse events
    // slow Chromium input enough to exhaust the final rain level's real timer.
    const b=route[i];
    await page.mouse.move(b.x,b.y,{steps:2});
  }
  await page.mouse.up();
  return (await page.evaluate(()=>window.__fireflySnapshot())).progress===snapshot.progress+1;
}

async function drawLasso(page, snapshot, polygon) {
  const box = await page.locator('#stage').boundingBox();
  const map = (point) => ({ x: box.x + point.x * box.width / snapshot.width, y: box.y + point.y * box.height / snapshot.height });
  const vertices = polygon.map(map);
  const first = vertices[0];
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    await page.mouse.move(b.x,b.y,{steps:2});
  }
  await page.mouse.up();
}

test('数字萤火虫：实际圈选点亮八关，错误与重载可恢复', async ({ page }) => {
  test.setTimeout(180000);
  await captureSpeech(page);
  await page.addInitScript(() => localStorage.setItem('kidslab.lang', 'zh'));
  await page.goto('/courseware/number-fireflies/?e2e=1&seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.number-fireflies.seed-987'));return s.levels[s.active];});
  await page.locator('#startBtn').click();
  for (let level = 0; level < 8; level++) {
    await page.evaluate(()=>{window.__speechEvents=[];});
    await expect(page.locator('#levelText')).toHaveText(`${level + 1}/8`);
    const a=(await saved()).instance,target=a.type==='sub'?a.start-a.result:a.target;
    if (level === 0) {
      const state = await page.evaluate(() => window.__fireflySnapshot());
      await drawLasso(page, state, Array.from({ length: 16 }, (_, i) => ({ x: 30 + Math.cos(i * Math.PI / 8) * 12, y: 28 + Math.sin(i * Math.PI / 8) * 12 })));
      expect((await page.evaluate(() => window.__fireflySnapshot())).progress).toBe(0);
    }
    for (let catchIndex = 0; catchIndex < catches[level]; catchIndex++) {
      let caught = false;
      for (let attempt = 0; attempt < 50 && !caught; attempt++) {
        caught = await catchTarget(page,target);
        if (!caught) await page.waitForTimeout(80);
      }
      expect(caught, `第 ${level + 1} 关第 ${catchIndex + 1} 次圈选`).toBe(true);
    }
    await expect(page.locator('#win')).toBeVisible();
    await expectNarrationStarted(page,level===7);
    if (level < 7) {
      const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('kidslab.progress.number-fireflies') || 'null'));
      expect(progress?.status).not.toBe('completed');
      await page.locator('#nextBtn').click();
      if (level === 2) {
        await page.reload();
        await expect(page.locator('#levelText')).toHaveText('4/8');
        await page.locator('#startBtn').click();
      }
    }
  }
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('kidslab.progress.number-fireflies') || 'null'));
  expect(progress?.status).toBe('completed');
  await page.reload();await expect(page.locator('#win')).toBeVisible();
  expect(await page.evaluate(()=>window.__speechEvents)).toEqual([]);
  const last=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(last.instance);expect((await saved()).play.progress).toBe(0);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(last.fingerprint);
    if(action==='classic')expect((await saved()).mode).toBe('classic');
  }
});
