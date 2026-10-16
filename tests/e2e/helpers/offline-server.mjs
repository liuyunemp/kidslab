import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

export async function createOfflineServer() {
  const state = { revision: 1, failAsset: '', status: 200, swVersion: 1, slowAsset: '', failedDownloads: 0 };
  const template = await readFile(path.join(root, 'scripts/sw.js'), 'utf8');
  const catalog = JSON.parse(await readFile(path.join(root, 'courseware/index.json'), 'utf8'));
  const id = 'offline-fixture';
  const fixture = { ...catalog.courses.find((c) => c.levels.includes('primary')), id, pinned: false, title: { zh: '离线实验', en: 'Offline lab' }, path: `courseware/${id}/index.html` };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://local');
      if (state.status !== 200) { res.writeHead(state.status).end('unavailable'); return; }
      if (url.pathname === '/sw.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
        res.end(template.replace('__CACHE_VERSION__', `fixture-${state.swVersion}`).replace('__PRECACHE__', JSON.stringify(['./', 'courseware/index.json'])));
        return;
      }
      if (url.pathname === '/courseware/index.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ...catalog, courses: [fixture] }));
        return;
      }
      const prefix = `/courseware/${id}/`;
      if (url.pathname.startsWith(prefix)) {
        const script = `document.querySelector('#version').textContent='version-${state.revision}';document.querySelector('#read').onclick=async()=>document.querySelector('#result').textContent=await(await fetch('lazy.json')).text();`;
        const files = new Map([
          ['index.html', `<html><head><meta name="viewport" content="width=device-width"><script defer src="main.js?v=${sha(script).slice(0, 8)}"></script></head><body><p id="version"></p><button id="read">Read</button><p id="result"></p></body></html>`],
          ['main.js', script], ['lazy.json', `saved-${state.revision}`], ['audio.ogg', `audio-${state.revision}`],
        ]);
        const assets = [...files].map(([path, bytes]) => ({ path, sha256: sha(bytes) })).sort((a, b) => a.path.localeCompare(b.path));
        files.set('offline.json', JSON.stringify({ id, version: sha(JSON.stringify(assets)), assets }));
        const name = url.pathname.slice(prefix.length);
        if (name === state.failAsset) { state.failedDownloads++; res.writeHead(503).end('injected'); return; }
        if (name === state.slowAsset) await new Promise((resolve) => setTimeout(resolve, 400));
        if (!files.has(name)) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'Content-Type': mime[path.extname(name)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(files.get(name));
        return;
      }
      const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const file = path.resolve(root, rel);
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(await readFile(file));
    } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { state, id, origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }) };
}
