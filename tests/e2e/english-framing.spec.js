import { test, expect } from '@playwright/test';

const ids = [
  'english-color-studio', 'english-fruit-picnic', 'english-animal-park',
  'english-number-train', 'english-body-show', 'english-school-bag',
];

/* The English stages frame themselves from the panel-free area: `fit` keeps the shelf inside
   the visible width, `fitH` stops a standing figure from being cut off. `?e2e` exposes a
   read-only probe so the check is numeric instead of "looks about right". */
for (const id of ids) {
  test(`${id}: stage fills the panel-free area without being cropped`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

    await page.goto(`/courseware/${id}/?e2e`);
    await expect(page.locator('#scene')).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(window.__englishFrame?.())), { timeout: 15000 }).toBe(true);
    await page.waitForTimeout(400);

    const snapshot = await page.evaluate(() => {
      const rect = (node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, w: box.width, h: box.height };
      };
      const panel = rect(document.getElementById('panel'));
      const canvas = document.getElementById('scene');
      return {
        frame: window.__englishFrame(),
        panel,
        canvas: { w: canvas.clientWidth, h: canvas.clientHeight },
        overflowX: document.documentElement.scrollWidth > innerWidth + 1,
        overflowY: document.documentElement.scrollHeight > innerHeight + 2,
        pills: [...document.querySelectorAll('.bar .pill')]
          .filter((node) => node.getBoundingClientRect().width > 0)
          .map((node) => {
            const box = node.getBoundingClientRect();
            return { id: node.id || 'back', right: box.right, height: box.height };
          }),
      };
    });

    expect(errors, `console/page errors in ${id}`).toEqual([]);
    expect(snapshot.overflowX || snapshot.overflowY, `${id} must not scroll`).toBe(false);
    expect(snapshot.canvas.w).toBeGreaterThan(300);
    expect(snapshot.canvas.h).toBeGreaterThan(300);
    for (const pill of snapshot.pills) {
      expect(pill.right, `${id}/${pill.id} leaks past the viewport`).toBeLessThanOrEqual(snapshot.canvas.w + 1);
      expect(pill.height, `${id}/${pill.id} is too small to tap`).toBeGreaterThanOrEqual(44);
    }

    const { frame } = snapshot;
    expect(frame, `${id} exposes no framing probe`).not.toBeNull();
    const wide = testInfo.project.name === 'desktop';

    if (wide) {
      // Wide screens must keep the hand-tuned radius view: `fit`/`fitH` are not allowed to
      // creep the camera, or every approved desktop composition would drift.
      expect(frame.distance).toBeCloseTo(frame.view.radius, 2);
      expect(frame.content.w).toBeGreaterThan(120);
    } else {
      const widthRatio = frame.content.w / frame.free.w;
      const heightRatio = frame.content.h / frame.free.h;
      // A standing figure is narrow and tall, a shelf is wide and low: judge the axis the
      // stage actually fills, otherwise body-show would be called "too small" forever.
      expect(Math.max(widthRatio, heightRatio), `${id} stage is too small on a phone`).toBeGreaterThan(0.55);
      expect(widthRatio, `${id} stage is cropped on a phone`).toBeLessThanOrEqual(1);
      expect(heightRatio, `${id} stage is squashed on a phone`).toBeLessThanOrEqual(1);
      expect(frame.content.x, `${id} stage runs off the left edge`).toBeGreaterThanOrEqual(-1);
      expect(frame.content.x + frame.content.w, `${id} stage runs off the right edge`)
        .toBeLessThanOrEqual(snapshot.canvas.w + 1);
      expect(frame.content.y + frame.content.h, `${id} stage hides under the panel`)
        .toBeLessThanOrEqual(snapshot.panel.y + 1);
    }
  });
}

test('english stages keep their drop targets reachable after the framing change', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/courseware/english-fruit-picnic/?e2e');
  await expect.poll(() => page.evaluate(() => Boolean(window.__englishScreens?.()))).toBe(true);

  const screens = await page.evaluate(() => window.__englishScreens());
  expect(screens.picks.length).toBeGreaterThan(0);
  expect(screens.zones.length).toBeGreaterThan(0);

  const from = screens.picks[0];
  const to = screens.zones[0];
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();

  await expect(page.locator('#progressVal')).toHaveText('1/3');
  expect(errors).toEqual([]);
});
