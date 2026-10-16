import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
const source = (await readFile(new URL('../../scripts/sw.js', import.meta.url), 'utf8')).replace('__PRECACHE__', '[]');
const origin = 'https://kidslab.test/';
const base = `${origin}courseware/demo/`;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function harness() {
  const buckets = new Map(), handlers = {}, clients = new Map();
  const control = { offline: false, status: 200, failPath: '', tamper: '', quota: false, failState: false, count: 0, max: 0, fetches: 0, connection: undefined, estimate: null };
  let files, manifest;
  function version(value) {
    files = new Map([['index.html', `page-${value}`], ['main.js', `script-${value}`], ['audio.ogg', `audio-${value}`], ['lazy.json', `lazy-${value}`]]);
    const assets = [...files].map(([path, content]) => ({ path, sha256: sha(content) })).sort((a, b) => a.path.localeCompare(b.path));
    manifest = { id: 'demo', version: sha(JSON.stringify(assets)), assets };
  }
  version('old');
  const key = (request) => typeof request === 'string' ? request : request.url;
  const caches = {
    async keys() { return [...buckets.keys()]; },
    async delete(name) { return buckets.delete(name); },
    async open(name) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const entries = buckets.get(name);
      return {
        async put(request, response) {
          if (control.quota && name.startsWith('kidslab-course-v2-')) throw new Error('quota');
          if (control.failState && name === 'kidslab-offline-state-v2') throw new Error('quota state');
          assert.equal(response.status, 200, '206 must never enter the cache');
          entries.set(key(request), response.clone());
        },
        async match(request) { return entries.get(key(request))?.clone(); },
        async keys() { return [...entries.keys()].map((url) => new Request(url)); },
        async delete(request) { return entries.delete(key(request)); },
      };
    },
  };
  // `connection` is exposed through a getter so a test can change the effective network
  // mid-run; a captured value would freeze it at context-creation time.
  const network = {
    get connection() { return control.connection; },
    storage: { estimate: async () => control.estimate?.(control) },
  };
  const sandbox = vm.createContext({
    URL, Request, Response, Headers, AbortController, TextEncoder, crypto: webcrypto, setTimeout, clearTimeout, caches,
    navigator: network,
    self: { registration: { scope: origin }, addEventListener: (name, fn) => { handlers[name] = fn; },
      navigator: network,
      clients: { claim: async () => {}, get: async (id) => clients.get(id), matchAll: async () => [...clients.values()] } },
    fetch: async (request, { signal } = {}) => {
      control.fetches++;
      if (control.hang) return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }));
      if (control.offline) throw new Error('offline');
      const url = new URL(key(request));
      const name = url.pathname.slice('/courseware/demo/'.length);
      if (control.status !== 200) return new Response('server error', { status: control.status });
      if (name === 'offline.json') return new Response(JSON.stringify(manifest));
      control.count++; control.max = Math.max(control.max, control.count);
      await new Promise((resolve) => setTimeout(resolve, 2));
      control.count--;
      if (name === control.failPath) return new Response('partial', { status: 206 });
      if (!files.has(name)) return new Response('missing', { status: 404 });
      return new Response(name === control.tamper ? 'mismatch' : files.get(name));
    },
  });
  vm.runInContext(`${source}\nglobalThis.api = { prepareCourse, completeSnapshot, rangeResponse, courseRequest, cleanupSnapshots, teardownLegacyCache, evictSnapshotsUnderPressure, shouldDeferDownload };`, sandbox);
  const api = sandbox.api;
  async function request(file, { navigate = false, clientId = '', range } = {}) {
    const request = new Request(base + file, { headers: range ? { range } : {} });
    if (navigate) Object.defineProperty(request, 'mode', { value: 'navigate' });
    return api.courseRequest({ request, clientId: navigate ? '' : clientId, resultingClientId: navigate ? clientId : '' }, 'demo');
  }
  /** Seed a completed snapshot record for an arbitrary course id (for eviction tests). */
  async function seedCourse(id, { completedAt = 0 } = {}) {
    const cache = `kidslab-course-v2-${encodeURIComponent('/')}-${id}-v${completedAt}`;
    const bucket = await caches.open(cache);
    await bucket.put(`${origin}courseware/${id}/index.html`, new Response('<html></html>'));
    const state = await caches.open('kidslab-offline-state-v2');
    await state.put(`${origin}__offline__/courses/${id}`, new Response(JSON.stringify({ id, version: 'v', cache, completedAt })));
    return cache;
  }
  return { api, caches, buckets, control, clients, version, request, handlers, seedCourse };
}

test('only full verified downloads publish, deduplicate jobs, and limit concurrency to two', async () => {
  const h = harness();
  const first = h.api.prepareCourse('demo');
  assert.equal(h.api.prepareCourse('demo'), first);
  assert.equal(await h.api.completeSnapshot('demo'), null);
  await first;
  assert.ok(await h.api.completeSnapshot('demo'));
  assert.equal(h.control.max, 2);
  assert.equal(h.control.fetches, 5);
  h.control.offline = true;
  assert.equal(await (await h.request('index.html', { navigate: true })).text(), 'page-old');
  assert.equal(await (await h.request('lazy.json')).text(), 'lazy-old');
});

for (const failure of ['failPath', 'tamper', 'quota', 'failState']) {
  test(`failed update (${failure}) preserves previous snapshot and retries successfully`, async () => {
    const h = harness();
    await h.api.prepareCourse('demo');
    const previous = await h.api.completeSnapshot('demo');
    h.version('new');
    h.control[failure] = ['failPath', 'tamper'].includes(failure) ? 'main.js' : true;
    await h.api.prepareCourse('demo');
    assert.equal((await h.api.completeSnapshot('demo')).version, previous.version);
    assert.equal((await h.caches.keys()).filter((name) => name.startsWith('kidslab-course-v2-')).length, 1);
    h.control[failure] = false;
    await h.api.prepareCourse('demo');
    assert.notEqual((await h.api.completeSnapshot('demo')).version, previous.version);
    h.control.offline = true;
    assert.equal(await (await h.request('audio.ogg')).text(), 'audio-new');
  });
}

test('partial first visit is never advertised; missing cached resource invalidates completion', async () => {
  const h = harness();
  h.control.failPath = 'main.js';
  await h.api.prepareCourse('demo');
  assert.equal(await h.api.completeSnapshot('demo'), null);
  h.control.failPath = '';
  await h.api.prepareCourse('demo');
  const complete = await h.api.completeSnapshot('demo');
  await (await h.caches.open(complete.cache)).delete(base + 'main.js');
  assert.equal(await h.api.completeSnapshot('demo'), null);
  await h.api.prepareCourse('demo');
  assert.ok(await h.api.completeSnapshot('demo'));
});

test('503 falls back but 404 remains visible, and same-name audio updates online', async () => {
  const h = harness();
  await h.api.prepareCourse('demo');
  h.control.status = 503;
  assert.equal(await (await h.request('main.js')).text(), 'script-old');
  h.control.status = 404;
  assert.equal((await h.request('main.js')).status, 404);
  h.control.status = 200;
  h.version('new');
  assert.equal(await (await h.request('audio.ogg')).text(), 'audio-new');
});

test('an online document never substitutes an old script for a new content fingerprint', async () => {
  const h = harness();
  await h.api.prepareCourse('demo');
  h.control.status = 503;
  assert.equal((await h.request('main.js?v=new-version', { clientId: 'online' })).status, 503);
  h.control.status = 200;
  h.version('new');
  assert.equal(await (await h.request('main.js?v=new-version', { clientId: 'online' })).text(), 'script-new');
});

test('a stalled network request is aborted and falls back to the complete snapshot', async () => {
  const h = harness();
  await h.api.prepareCourse('demo');
  h.control.hang = true;
  assert.equal(await (await h.request('index.html', { navigate: true })).text(), 'page-old');
});

test('offline document pins its resource version across updates and worker reactivation', async () => {
  const h = harness();
  h.clients.set('child', { postMessage() {} });
  await h.api.prepareCourse('demo');
  h.control.offline = true;
  assert.equal(await (await h.request('index.html?lang=en', { navigate: true, clientId: 'child' })).text(), 'page-old');
  h.control.offline = false;
  h.version('new');
  await h.api.prepareCourse('demo');
  assert.equal(await (await h.request('main.js?v=anything', { clientId: 'child' })).text(), 'script-old');
  await h.caches.open('kidslab-shell-previous');
  let activated;
  h.handlers.activate({ waitUntil: (promise) => { activated = promise; } });
  await activated;
  assert.ok(await h.api.completeSnapshot('demo'));
  assert.equal((await h.caches.keys()).includes('kidslab-shell-previous'), false);
  assert.equal((await h.caches.keys()).filter((name) => name.startsWith('kidslab-course-v2-')).length, 2);
  h.clients.clear();
  await h.api.cleanupSnapshots('demo', (await h.api.completeSnapshot('demo')).cache);
  assert.equal((await h.caches.keys()).filter((name) => name.startsWith('kidslab-course-v2-')).length, 1);
});

test('cached full media serves byte, suffix, open-ended and unsatisfiable ranges', async () => {
  const h = harness();
  await h.api.prepareCourse('demo'); h.control.offline = true;
  for (const [range, text] of [['bytes=0-4', 'audio'], ['bytes=-3', 'old'], ['bytes=6-', 'old']]) {
    const response = await h.request('audio.ogg', { range });
    assert.equal(response.status, 206);
    assert.equal(await response.text(), text);
  }
  assert.equal((await h.request('audio.ogg', { range: 'bytes=100-' })).status, 416);
});

test('legacy partial cache remains a best-effort fallback without a complete record', async () => {
  const h = harness();
  await (await h.caches.open('kidslab-courseware')).put(base + 'index.html', new Response('legacy'));
  h.control.offline = true;
  assert.equal(await (await h.request('index.html', { navigate: true })).text(), 'legacy');
  assert.equal(await h.api.completeSnapshot('demo'), null);
});

test('legacy teardown keeps v1 bytes for courses without a v2 snapshot and drops the rest', async () => {
  const h = harness();
  const legacy = await h.caches.open('kidslab-courseware');
  await legacy.put(base + 'index.html', new Response('v1-demo'));
  await legacy.put(`${origin}courseware/other/index.html`, new Response('v1-other'));
  // A completed v2 snapshot exists for demo only; 'other' was never revisited after upgrade.
  await h.api.prepareCourse('demo');
  await h.api.teardownLegacyCache();
  assert.equal(await legacy.match(`${origin}courseware/other/index.html`).then((r) => r?.text()), 'v1-other',
    'a course with no v2 snapshot must keep serving its v1 bytes offline');
  assert.equal(await legacy.match(base + 'index.html'), undefined,
    'a superseded v1 entry must be dropped once its v2 snapshot is complete');
  // Once the last superseded entry is gone the whole legacy cache is removed.
  await legacy.delete(`${origin}courseware/other/index.html`);
  await h.api.teardownLegacyCache();
  assert.equal((await h.caches.keys()).includes('kidslab-courseware'), false);
});

test('storage pressure evicts the least recently completed snapshots but never the active one', async () => {
  const h = harness();
  await h.seedCourse('oldest', { completedAt: 100 });
  await h.seedCourse('middle', { completedAt: 200 });
  await h.seedCourse('newest', { completedAt: 300 });
  // Storage pressure must actually fall as snapshots are deleted, otherwise eviction would
  // keep going until nothing is left. Each estimate call reflects the caches still present.
  h.control.estimate = async () => {
    const courses = (await h.caches.keys()).filter((name) => name.startsWith('kidslab-course-v2-')).length;
    return { usage: courses * 300, quota: 1000 };
  };
  // 'middle' is the course being downloaded now and must survive regardless of age.
  await h.api.evictSnapshotsUnderPressure('middle');
  const names = await h.caches.keys();
  assert.equal(names.includes('kidslab-course-v2-%2F-oldest-v100'), false, 'the oldest snapshot is evicted first');
  assert.equal(names.includes('kidslab-course-v2-%2F-middle-v200'), true, 'the course being downloaded is never evicted');
  assert.equal(names.includes('kidslab-course-v2-%2F-newest-v300'), true, 'eviction stops once headroom is restored');
});

test('no eviction happens when storage is healthy', async () => {
  const h = harness();
  await h.seedCourse('keep', { completedAt: 100 });
  h.control.estimate = () => ({ usage: 100, quota: 1000 });
  await h.api.evictSnapshotsUnderPressure('demo');
  assert.equal((await h.caches.keys()).includes('kidslab-course-v2-%2F-keep-v100'), true);
});

test('background download is deferred on metered and 2G connections only', async () => {
  const h = harness();
  for (const connection of [{ saveData: true }, { effectiveType: '2g' }, { effectiveType: 'slow-2g' }]) {
    h.control.connection = connection;
    assert.equal(h.api.shouldDeferDownload(), true, `${JSON.stringify(connection)} must defer`);
  }
  for (const connection of [undefined, { saveData: false, effectiveType: '4g' }, { effectiveType: '3g' }]) {
    h.control.connection = connection;
    assert.equal(h.api.shouldDeferDownload(), false, `${JSON.stringify(connection)} must download`);
  }
  // Deferral must not throw or start a download, and online play stays unaffected.
  h.control.connection = { saveData: true };
  const before = h.control.fetches;
  await h.api.prepareCourse('demo');
  assert.equal(h.control.fetches, before, 'a deferred course must not fetch anything');
  assert.equal(await (await h.request('main.js')).text(), 'script-old');
});
