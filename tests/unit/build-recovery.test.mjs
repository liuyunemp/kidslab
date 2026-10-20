import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { buildProject } from '../../scripts/build.mjs';
import { publishArtifacts, removeBuildWorkspace } from '../../scripts/build-workspace.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'kidslab-build-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('kidslab-build-test-'));
    await rm(root, { recursive: true, force: true });
  });
  async function put(name, value) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), value);
  }
  await put('package.json', '{}');
  await put('src/taxonomy.json', '{"tags":{}}');
  await put('scripts/facts-legacy.json', '[]');
  await put('src/demo/course.json', JSON.stringify({ id: 'demo', title: { zh: '示例', en: 'Demo' }, description: { zh: '示例', en: 'Demo' }, category: 'science', levels: ['primary'], tags: [], icon: '🔬' }));
  await put('src/demo/facts.md', '# demo 知识断言\r\n\r\n## 适用范围\r\n- 示例。\r\n\r\n## 知识断言\r\n- [F1] 示例。[S1]\r\n\r\n## 来源\r\n- [S1] 示例来源。\r\n');
  await put('src/demo/index.html', '<html><head><script type="module" src="main.js"></script></head><body>Demo</body></html>\r\n');
  await put('src/demo/main.js', 'export const demo = 1;\r\n');
  await put('src/demo/data.json', '{"value":1}\r\n');
  await put('src/demo/audio.ogg', Buffer.from([0, 13, 10, 255, 42]));
  await put('index.html', '<html><link href="assets/css/app.css"><script src="assets/js/app.js"></script><script src="assets/js/starmap.js"></script></html>\r\n');
  for (const name of ['assets/css/app.css', 'assets/js/app.js', 'assets/js/starmap.js', 'assets/fonts/baloo2-latin.woff2', 'assets/logo.svg', 'assets/favicon.svg', 'manifest.webmanifest', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png', ...['orbital-library', 'star-confirm', 'atlas-warp'].flatMap((name) => ['ogg', 'm4a'].map((ext) => `assets/audio/starmap/${name}.${ext}`))]) await put(name, 'fixture');
  for (const name of ['scripts/sdk/core.js', 'scripts/sw.js']) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await cp(new URL(`../../${name}`, import.meta.url), path.join(root, name));
  }
  const build = (options) => buildProject({ rootDir: root, log: () => {}, ...options });
  await build();
  return { root, put, build };
}

async function outputBytes(root) {
  const result = {};
  async function walk(rel) {
    for (const item of await readdir(path.join(root, rel), { withFileTypes: true })) {
      const name = path.join(rel, item.name);
      if (item.isDirectory()) await walk(name);
      else result[name] = (await readFile(path.join(root, name))).toString('base64');
    }
  }
  await walk('courseware');
  for (const name of ['index.html', 'sw.js']) result[name] = (await readFile(path.join(root, name))).toString('base64');
  return result;
}

test('missing narration audio fails before publication and preserves previous snapshots',async t=>{
  const {root,put,build}=await fixture(t);
  const before=await outputBytes(root);
  await put('src/demo/main.js',"import {manifest} from './speech-manifest.js';\n");
  const clip={path:`./audio/speech/${'a'.repeat(64)}.mp3`,sha256:'b'.repeat(64),bytes:100};
  await put('src/demo/speech-manifest.js',`export const manifest = ${JSON.stringify({version:1,entries:{zh:{'你好':clip},en:{Hello:clip}}})};\n`);
  await assert.rejects(build(),/speech|ENOENT/);
  assert.deepEqual(await outputBytes(root),before);
});

for (const kind of ['invalid JSON', 'missing metadata', 'missing entry', 'compression']) {
  test(`build preserves all previous outputs after ${kind} failure and can recover`, async (t) => {
    const { root, put, build } = await fixture(t);
    const before = await outputBytes(root);
    const name = kind === 'compression' ? 'src/demo/main.js' : kind === 'missing entry' ? 'src/demo/index.html' : 'src/demo/course.json';
    const original = await readFile(path.join(root, name));
    if (kind.startsWith('missing')) await rm(path.join(root, name));
    else await put(name, kind === 'compression' ? 'export const = ;' : '{');
    await assert.rejects(build());
    assert.deepEqual(await outputBytes(root), before);
    await put(name, original);
    assert.equal((await build()).courses, 1);
    assert.equal((await readdir(root)).filter((name) => name.startsWith('.kidslab-build-')).length, 0);
  });
}

test('failed publication rolls back every replaced artifact, then a normal build succeeds', async (t) => {
  const { root, put, build } = await fixture(t);
  const before = await outputBytes(root);
  await put('src/demo/main.js', 'export const demo = 2;');
  await assert.rejects(build({ publish: (r, w) => publishArtifacts(r, w, {
    renameFile: (from, to) => {
      if (from === path.join(w, 'staged', 'sw.js')) throw Object.assign(new Error('injected publish failure'), { code: 'EIO' });
      return rename(from, to);
    },
  }) }), /injected publish failure/);
  assert.deepEqual(await outputBytes(root), before);
  await build();
  assert.notDeepEqual(await outputBytes(root), before);
});

test('rollback failure preserves backup and reports its location', async (t) => {
  const { root, build } = await fixture(t);
  let preserved;
  await assert.rejects(build({ publish: (r, w) => {
    preserved = w;
    return publishArtifacts(r, w, { renameFile: (from, to) => {
      if (from === path.join(w, 'staged', 'sw.js') || from === path.join(w, 'backup', 'sw.js')) throw new Error('injected');
      return rename(from, to);
    } });
  } }), (error) => error.preserveWorkspace && error.message.includes(preserved));
  assert.ok((await readFile(path.join(preserved, 'backup', 'sw.js'))).length);
  await assert.rejects(removeBuildWorkspace(root, root), /拒绝/);
});

test('offline checksums describe actual LF output while binary bytes are unchanged', async (t) => {
  const { root, put, build } = await fixture(t);
  const readManifest = async () => JSON.parse(await readFile(path.join(root, 'courseware/demo/offline.json'), 'utf8'));
  const first = await readManifest();
  for (const asset of first.assets) {
    const bytes = await readFile(path.join(root, 'courseware/demo', asset.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    if (asset.fingerprint) assert.equal(createHash('md5').update(bytes).digest('hex').slice(0, 8), asset.fingerprint);
    if (/\.(js|html|json)$/.test(asset.path)) assert.equal(bytes.toString().includes('\r'), false);
  }
  assert.deepEqual(await readFile(path.join(root, 'courseware/demo/audio.ogg')), Buffer.from([0, 13, 10, 255, 42]));
  await put('src/demo/main.js', 'export const demo = 1;\n');
  await put('src/demo/data.json', '{"value":1}\n');
  await build();
  assert.equal((await readManifest()).version, first.version);
});
