import { test, expect } from '@playwright/test';

const catches = [2, 2, 3, 3, 3, 3, 4, 4];

function inside(point, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || 1) + a.x) hit = !hit;
  }
  return hit;
}

function polygonFor(points) {
  const pad = points.length === 1 ? 34 : 28;
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
    const poly = polygonFor(selected);
    if (selected.every((fly) => inside(fly, poly)) && flies.every((fly) => selected.includes(fly) || !inside(fly, poly))) return poly;
  }
  return null;
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
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 9));
    for (let step = 1; step <= steps; step++) await page.mouse.move(a.x + (b.x - a.x) * step / steps, a.y + (b.y - a.y) * step / steps);
  }
  await page.mouse.up();
}

test('数字萤火虫：实际圈选点亮八关，错误与重载可恢复', async ({ page }) => {
  test.setTimeout(180000);
  await page.addInitScript(() => localStorage.setItem('kidslab.lang', 'zh'));
  await page.goto('/courseware/number-fireflies/?e2e=1&seed=987');
  const saved=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kidslab.random.v1.number-fireflies.seed-987'));return s.levels[s.active];});
  await page.locator('#startBtn').click();
  for (let level = 0; level < 8; level++) {
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
        const before = await page.evaluate(() => window.__fireflySnapshot());
        const polygon = findLasso(before, target);
        if (!polygon) { await page.waitForTimeout(100); continue; }
        await drawLasso(page, before, polygon);
        const after = await page.evaluate(() => window.__fireflySnapshot());
        caught = after.progress === catchIndex + 1;
        if (!caught) await page.waitForTimeout(80);
      }
      expect(caught, `第 ${level + 1} 关第 ${catchIndex + 1} 次圈选`).toBe(true);
    }
    await expect(page.locator('#win')).toBeVisible();
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
  const last=await saved();
  for(const action of ['retry','new','classic']){
    await page.locator('.random-round-menu summary').click();await page.locator(`[data-round-action="${action}"]`).click();await page.waitForLoadState();
    if(action==='retry'){expect((await saved()).instance).toEqual(last.instance);expect((await saved()).play.progress).toBe(0);}
    if(action==='new')expect((await saved()).fingerprint).not.toBe(last.fingerprint);
    if(action==='classic')expect((await saved()).mode).toBe('classic');
  }
});
