/** KidsLab SW template: complete versioned course snapshots; shell cache is independent. */
'use strict';
const VERSION = '__CACHE_VERSION__';
const SHELL_CACHE = `kidslab-shell-${VERSION}`;
const LEGACY_CACHE = 'kidslab-courseware';
const STATE_CACHE = 'kidslab-offline-state-v2';
const PRECACHE = __PRECACHE__;
const NETWORK_TIMEOUT_MS = 3500;
// Retire the v1 runtime cache only after a v2 snapshot exists for the same course, so a
// migrated child never loses offline play. Any v1 entry still serving a course we have not
// re-downloaded yet is retained.
const LEGACY_TEARDOWN_GRACE_MS = 60_000;
const jobs = new Map();
const clientSnapshots = new Map();
const scope = new URL(self.registration.scope);
const stateURL = (kind, id) => new URL(`__offline__/${kind}/${encodeURIComponent(id)}`, scope).href;
const courseBase = (id) => new URL(`courseware/${id}/`, scope).href;
const coursePrefix = (id) => `kidslab-course-v2-${encodeURIComponent(scope.pathname)}-${id}-`;
const digest = async (bytes) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
  .map((n) => n.toString(16).padStart(2, '0')).join('');

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('kidslab-shell-') && name !== SHELL_CACHE) await caches.delete(name);
    }
    await self.clients.claim();
    // Deferred: give in-flight v2 downloads a chance to publish before we judge the v1
    // cache superseded, and keep activate itself fast.
    setTimeout(() => { teardownLegacyCache(); }, LEGACY_TEARDOWN_GRACE_MS);
  })());
});

async function readState(kind, id) {
  try {
    const response = await (await caches.open(STATE_CACHE)).match(stateURL(kind, id));
    return response ? await response.json() : null;
  } catch { return null; }
}

/**
 * Drop v1 runtime-cache entries for courses already covered by a complete v2 snapshot.
 * Deleting the whole legacy cache blindly would break offline play for a course the child
 * has not revisited since the upgrade; every remaining entry is re-checked on each pass and
 * the cache is removed once its last superseded entry is gone.
 */
async function teardownLegacyCache() {
  let legacy;
  try {
    if (!(await caches.keys()).includes(LEGACY_CACHE)) return;
    legacy = await caches.open(LEGACY_CACHE);
  } catch { return; }
  try {
    for (const request of await legacy.keys()) {
      const url = new URL(request.url);
      if (!url.pathname.includes('/courseware/')) continue;
      const id = url.pathname.split('/courseware/')[1]?.split('/')[0];
      if (!id) continue;
      // Keep serving v1 bytes until the v2 snapshot for this course is actually complete.
      if (await readState('courses', decodeURIComponent(id))) await legacy.delete(request);
    }
    if ((await legacy.keys()).length === 0) await caches.delete(LEGACY_CACHE);
  } catch { /* Legacy cleanup is best-effort; it must never break offline play. */ }
}
async function writeState(kind, id, value) {
  await (await caches.open(STATE_CACHE)).put(stateURL(kind, id), new Response(JSON.stringify(value)));
}
async function notify() {
  for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage({ type: 'kidslab-offline-updated' });
}

function canonicalURL(request) {
  const url = new URL(typeof request === 'string' ? request : request.url);
  // Snapshot resources are static files; only the build's content-version query is removed.
  url.searchParams.delete('v');
  if (url.pathname.endsWith('/')) url.pathname += 'index.html';
  if (request.mode === 'navigate') url.search = '';
  return url.href;
}

async function completeSnapshot(id) {
  const record = await readState('courses', id);
  if (!record || typeof record.cache !== 'string' || !record.cache.startsWith(coursePrefix(id))) return null;
  const cache = await caches.open(record.cache);
  const marker = await cache.match(new URL('offline.json', courseBase(id)).href);
  if (!marker) return null;
  const manifest = await marker.json();
  if (manifest.id !== id || manifest.version !== record.version || !Array.isArray(manifest.assets)) return null;
  const keys = new Set((await cache.keys()).map((key) => key.url));
  if (!manifest.assets.every((asset) => keys.has(new URL(asset.path, courseBase(id)).href))) return null;
  return record;
}

async function validateManifest(id, manifest) {
  if (manifest.id !== id || !/^[a-f0-9]{64}$/.test(manifest.version) || !Array.isArray(manifest.assets)
      || !manifest.assets.length) throw new Error('Invalid offline manifest');
  const seen = new Set();
  for (const asset of manifest.assets) {
    if (typeof asset.path !== 'string' || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error('Invalid asset');
    const url = new URL(asset.path, courseBase(id));
    if (url.origin !== scope.origin || !url.href.startsWith(courseBase(id)) || url.search || url.hash
        || asset.path === 'offline.json' || seen.has(url.href)) throw new Error('Invalid asset path');
    seen.add(url.href);
  }
  if (!seen.has(new URL('index.html', courseBase(id)).href)
      || await digest(new TextEncoder().encode(JSON.stringify(manifest.assets))) !== manifest.version) {
    throw new Error('Invalid offline version');
  }
}

async function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(request, { signal: controller.signal, cache: 'no-store' }); }
  finally { clearTimeout(timer); }
}

async function cleanupSnapshots(id, current) {
  const retained = new Set([current]);
  for (const [clientId, binding] of clientSnapshots) {
    if (await self.clients.get(clientId)) retained.add(binding.cache);
    else clientSnapshots.delete(clientId);
  }
  const state = await caches.open(STATE_CACHE);
  for (const key of await state.keys()) {
    if (!new URL(key.url).pathname.startsWith(new URL('__offline__/clients/', scope).pathname)) continue;
    const binding = await (await state.match(key)).json();
    if (await self.clients.get(binding.clientId)) retained.add(binding.cache);
    else await state.delete(key);
  }
  for (const name of await caches.keys()) {
    if (name.startsWith(coursePrefix(id)) && !retained.has(name)) await caches.delete(name);
  }
}

/**
 * Retained course snapshots are the app's largest storage consumer (a three.js course is
 * ~1.5 MB, and a child can open every course). They are all re-downloadable from the
 * build's offline.json, so when the origin is close to its quota we drop the least recently
 * completed snapshots rather than letting a single QuotaExceededError silently disable
 * offline play for good. `keep` (the course being downloaded now) is never evicted, and
 * eviction stops as soon as a comfortable margin is free.
 */
const QUOTA_HEADROOM = 0.75;
async function evictSnapshotsUnderPressure(keep) {
  const storage = self.navigator?.storage;
  if (!storage?.estimate) return;
  let usage, quota;
  try { ({ usage, quota } = await storage.estimate()); } catch { return; }
  if (!quota || usage / quota < QUOTA_HEADROOM) return;
  const state = await caches.open(STATE_CACHE);
  const active = new Set();
  for (const binding of clientSnapshots.values()) active.add(binding.cache);
  const clientPrefix = new URL('__offline__/clients/', scope).pathname;
  const coursePrefixPath = new URL('__offline__/courses/', scope).pathname;
  for (const key of await state.keys()) {
    if (!new URL(key.url).pathname.startsWith(clientPrefix)) continue;
    try { active.add((await (await state.match(key)).json()).cache); }
    catch { /* Ignore unreadable bindings; cleanupSnapshots removes them. */ }
  }
  const records = [];
  for (const key of await state.keys()) {
    if (!new URL(key.url).pathname.startsWith(coursePrefixPath)) continue;
    try {
      const record = await (await state.match(key)).json();
      if (record?.id && !active.has(record.cache)) records.push(record);
    } catch { /* Unreadable record: leave its cache for cleanupSnapshots. */ }
  }
  records.sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
  for (const record of records) {
    if (record.id === keep) continue;
    try {
      await caches.delete(record.cache);
      await state.delete(stateURL('courses', record.id));
      clientSnapshots.delete(record.id);
    } catch { /* Keep going: the next candidate may still free enough space. */ }
    const next = await storage.estimate().catch(() => null);
    if (next?.quota && next.usage / next.quota < QUOTA_HEADROOM) break;
  }
  if (records.length) await notify();
}

async function downloadCourse(id) {
  let pendingCache = null;
  let published = false;
  try {
    const response = await fetchWithTimeout(new Request(new URL('offline.json', courseBase(id))), 15000);
    if (response.status !== 200) return;
    const manifest = await response.json();
    await validateManifest(id, manifest);
    const previous = await completeSnapshot(id);
    if (previous?.version === manifest.version) {
      await cleanupSnapshots(id, previous.cache);
      return;
    }
    pendingCache = coursePrefix(id) + manifest.version;
    // Free space before staging: a QuotaExceededError mid-download would otherwise leave the
    // old snapshot in place and the new one never published, with no way to recover.
    await evictSnapshotsUnderPressure(id);
    const cache = await caches.open(pendingCache);
    let cursor = 0;
    let failure;
    const worker = async () => {
      while (!failure && cursor < manifest.assets.length) {
        const asset = manifest.assets[cursor++];
        try {
          const url = new URL(asset.path, courseBase(id)).href;
          const result = await fetchWithTimeout(new Request(url), 15000);
          if (result.status !== 200 || result.type === 'opaque') throw new Error('Incomplete download');
          const bytes = await result.clone().arrayBuffer();
          if (await digest(bytes) !== asset.sha256) throw new Error('Asset changed during download');
          await cache.put(url, result);
        } catch (error) { failure = error; }
      }
    };
    // Wait for both workers before deleting a failed staging cache.
    await Promise.all([worker(), worker()]);
    if (failure) throw failure;
    await cache.put(new URL('offline.json', courseBase(id)).href, new Response(JSON.stringify(manifest)));
    await writeState('courses', id, { id, version: manifest.version, cache: pendingCache, completedAt: Date.now() });
    published = true;
    await notify();
    await cleanupSnapshots(id, pendingCache);
  } catch {
    // An incomplete download or quota failure never replaces the previous snapshot.
    if (pendingCache && !published) await caches.delete(pendingCache).catch(() => {});
  }
}
/**
 * A full course snapshot is ~40 KB for a 2D course and ~1.5 MB once three.js and BGM are
 * included. Fetching that in the background is worth it on a normal connection but hostile
 * on metered data, on a 2G/slow-2G link, or when the child explicitly asked to save data.
 * Skipping only defers offline availability: the next visit on a healthy connection
 * downloads normally, and online play is unaffected either way.
 */
function shouldDeferDownload() {
  const connection = self.navigator?.connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}

function prepareCourse(id) {
  if (shouldDeferDownload()) return Promise.resolve();
  if (!jobs.has(id)) jobs.set(id, downloadCourse(id).finally(() => jobs.delete(id)));
  return jobs.get(id);
}

async function rangeResponse(request, response) {
  const range = request.headers.get('range');
  if (!range || response.status !== 200) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  // Multiple/invalid ranges may legally be ignored with a complete 200 response.
  if (!match || (!match[1] && !match[2])) return response;
  const bytes = await response.arrayBuffer();
  const size = bytes.byteLength;
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  const headers = new Headers(response.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  headers.delete('Content-Encoding');
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

async function snapshotResponse(request, binding, checkVersion = false) {
  const cache = await caches.open(binding.cache);
  const requestedVersion = new URL(request.url).searchParams.get('v');
  if (checkVersion && requestedVersion) {
    const marker = await cache.match(new URL('offline.json', courseBase(binding.id)).href);
    if (!marker) return null;
    const manifest = await marker.json();
    const asset = manifest.assets.find((asset) => new URL(asset.path, courseBase(binding.id)).href === canonicalURL(request));
    if (asset?.fingerprint !== requestedVersion) return null;
  }
  const response = await cache.match(canonicalURL(request));
  return response ? rangeResponse(request, response) : null;
}
async function courseRequest(event, id) {
  const { request } = event;
  const navigation = request.mode === 'navigate';
  const clientId = navigation ? event.resultingClientId : event.clientId;
  if (!navigation && clientId) {
    const binding = clientSnapshots.get(clientId) || await readState('clients', clientId);
    if (binding?.id === id) {
      // A document replayed from a snapshot remains on that version even if connectivity returns.
      return await snapshotResponse(request, binding) || new Response('Offline resource unavailable', { status: 503 });
    }
  }
  let networkError, networkResponse;
  try {
    networkResponse = await fetchWithTimeout(request);
    if (networkResponse.status < 500) return networkResponse;
  } catch (error) { networkError = error; }
  const snapshot = await completeSnapshot(id);
  if (snapshot) {
    const cached = await snapshotResponse(request, snapshot, !navigation);
    if (cached) {
      if (navigation && clientId) {
        const binding = { ...snapshot, clientId };
        clientSnapshots.set(clientId, binding);
        try { await writeState('clients', clientId, binding); }
        catch { /* Gameplay remains available if metadata storage is full. */ }
      }
      return cached;
    }
  }
  // Older installations may have partial resources. Never advertise them as complete.
  const legacy = await (await caches.open(LEGACY_CACHE)).match(request);
  if (legacy) return rangeResponse(request, legacy);
  if (networkResponse) return networkResponse;
  throw networkError || new Error('Offline resource unavailable');
}

async function shellRequest(request, networkFirst) {
  const cache = await caches.open(SHELL_CACHE);
  if (!networkFirst) {
    const cached = await cache.match(request);
    if (cached) return rangeResponse(request, cached);
  }
  let response, error;
  try {
    response = await fetchWithTimeout(request);
    if (response.status < 500) {
      if (response.status === 200) await cache.put(request, response.clone()).catch(() => {});
      return response;
    }
  } catch (cause) { error = cause; }
  const cached = await cache.match(request) || (request.mode === 'navigate' && await cache.match(new URL('./', scope).href));
  if (cached) return rangeResponse(request, cached);
  if (response) return response;
  throw error || new Error('Network unavailable');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const rel = url.pathname.slice(scope.pathname.length);
  const match = /^courseware\/([a-z0-9-]+)\//.exec(rel);
  if (match) {
    const result = courseRequest(event, match[1]);
    event.respondWith(result);
    if (request.mode === 'navigate') {
      event.waitUntil(result.then((response) => response.status === 200 ? prepareCourse(match[1]) : undefined).catch(() => {}));
    }
    return;
  }
  event.respondWith(shellRequest(request, request.mode === 'navigate' || rel === 'courseware/index.json'));
});
