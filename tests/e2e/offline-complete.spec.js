import { test, expect } from '@playwright/test';
import { createOfflineServer } from './helpers/offline-server.mjs';

async function record(page, id) {
  return page.evaluate(async (id) => {
    const cache = await caches.open('kidslab-offline-state-v2');
    const response = await cache.match(new URL(`/__offline__/courses/${id}`, location.origin).href);
    return response ? response.json() : null;
  }, id);
}
async function install(page, origin) {
  await page.goto(origin);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
}

test('partial download has no badge; retry saves lazy resources and media for offline use', async ({ page }) => {
  const server = await createOfflineServer();
  try {
    await install(page, server.origin);
    server.state.failAsset = 'lazy.json';
    await page.goto(`${server.origin}/courseware/${server.id}/index.html`);
    await expect(page.locator('#version')).toHaveText('version-1');
    await expect.poll(() => server.state.failedDownloads).toBeGreaterThan(0);
    await expect.poll(async () => page.evaluate(async () => (await caches.keys()).some((name) => name.startsWith('kidslab-course-v2-')))).toBe(false);
    expect(await record(page, server.id)).toBeNull();
    await page.goto(server.origin);
    await expect(page.locator('.card__offline')).toHaveCount(0);
    server.state.failAsset = '';
    await page.goto(`${server.origin}/courseware/${server.id}/index.html`);
    await expect.poll(() => record(page, server.id)).not.toBeNull();
    await page.goto(server.origin);
    await expect(page.locator('.card__offline')).toBeVisible();
    server.state.status = 503;
    await page.goto(`${server.origin}/courseware/${server.id}/index.html`);
    await expect(page.locator('#version')).toHaveText('version-1');
    await page.locator('#read').click();
    await expect(page.locator('#result')).toHaveText('saved-1');
    const media = await page.evaluate(async () => {
      const response = await fetch('audio.ogg', { headers: { Range: 'bytes=0-4' } });
      return { status: response.status, text: await response.text() };
    });
    expect(media).toEqual({ status: 206, text: 'audio' });
  } finally { await server.close(); }
});

test('failed update retains complete version and same-name audio refreshes after retry', async ({ page }) => {
  const server = await createOfflineServer();
  try {
    await install(page, server.origin);
    await page.goto(`${server.origin}/courseware/${server.id}/index.html`);
    await expect.poll(() => record(page, server.id)).not.toBeNull();
    const first = await record(page, server.id);
    server.state.revision = 2;
    server.state.failAsset = 'lazy.json';
    await page.reload();
    await expect(page.locator('#version')).toHaveText('version-2');
    await expect.poll(() => server.state.failedDownloads).toBeGreaterThan(0);
    await expect.poll(async () => (await record(page, server.id))?.version).toBe(first.version);
    server.state.status = 503;
    await page.reload();
    await expect(page.locator('#version')).toHaveText('version-1');
    server.state.status = 200;
    server.state.failAsset = '';
    await page.reload();
    await expect.poll(async () => (await record(page, server.id))?.version).not.toBe(first.version);
    server.state.status = 503;
    await page.reload();
    await expect(page.locator('#version')).toHaveText('version-2');
    expect(await page.evaluate(async () => (await fetch('audio.ogg')).text())).toBe('audio-2');
  } finally { await server.close(); }
});

test('a waiting SW activates after pages close and preserves complete course snapshots', async ({ page, context }) => {
  const server = await createOfflineServer();
  let next;
  try {
    await install(page, server.origin);
    await page.goto(`${server.origin}/courseware/${server.id}/index.html`);
    await expect.poll(() => record(page, server.id)).not.toBeNull();
    const first = await record(page, server.id);
    server.state.swVersion = 2;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting))).toBe(true);
    await page.close();
    next = await context.newPage();
    await next.goto(server.origin);
    await expect.poll(() => next.evaluate(async () => (await caches.keys()).includes('kidslab-shell-fixture-1'))).toBe(false);
    expect((await record(next, server.id)).version).toBe(first.version);
    server.state.status = 503;
    await next.goto(`${server.origin}/courseware/${server.id}/index.html`);
    await expect(next.locator('#version')).toHaveText('version-1');
    await next.locator('#read').click();
    await expect(next.locator('#result')).toHaveText('saved-1');
  } finally { await next?.close(); await server.close(); }
});
