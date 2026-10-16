import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { findVendorCopies, syncVendor } from '../../scripts/vendor.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '../..');

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'kidslab-vendor-test-'));
  t.after(async () => {
    assert.ok(path.basename(root).startsWith('kidslab-vendor-test-'));
    await rm(root, { recursive: true, force: true });
  });
  async function put(name, value) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), value);
  }
  return { root, put };
}

test('every in-repo three.js copy matches the node_modules distribution', async () => {
  // 课件必须自包含、不走 CDN，所以每个用到 three 的课件都存一份副本。这份断言保证
  // 任何一份副本都不会悄悄落后于 node_modules——漂移只会在个别浏览器上表现为怪问题。
  const source = await readFile(path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.min.js'));
  const copies = await findVendorCopies(ROOT);
  assert.ok(copies.length > 0, '仓库里应当存在 vendor 副本');
  const drifted = [];
  for (const target of copies) {
    const bytes = await readFile(target);
    if (!bytes.equals(source)) drifted.push(path.relative(ROOT, target).replace(/\\/g, '/'));
  }
  assert.deepEqual(drifted, [], `以下副本与 node_modules 不一致，请运行 npm run vendor：\n${drifted.join('\n')}`);
});

test('sync copies the distribution to every vendor path and is idempotent', async (t) => {
  const { root, put } = await fixture(t);
  const payload = 'three-dist-bytes';
  await put(path.join('node_modules/three/build/three.module.min.js'), payload);
  await put(path.join('src/alpha/vendor/three.module.min.js'), 'stale');
  await put(path.join('src/beta/vendor/three.module.min.js'), payload);
  await put(path.join('docs/courseware-template/vendor/three.module.min.js'), 'stale');

  const copies = await findVendorCopies(root);
  assert.equal(copies.length, 3, '只应收集实际存在副本的目录');

  const first = await syncVendor({ root });
  assert.equal(first.total, 3);
  assert.equal(first.updated.length, 2, '只有漂移的两份会被重写');
  assert.equal(first.drifted.length, 0, '写入模式下不累积 drifted');

  // 第二次同步必须无变化，保证幂等（否则每次构建都会产生无意义 diff）。
  const second = await syncVendor({ root });
  assert.deepEqual(second.updated, []);

  for (const target of copies) {
    assert.equal(await readFile(target, 'utf8'), payload);
  }
});

test('check mode reports drift without touching the working tree', async (t) => {
  const { root, put } = await fixture(t);
  await put(path.join('node_modules/three/build/three.module.min.js'), 'current');
  await put(path.join('src/alpha/vendor/three.module.min.js'), 'stale');

  const result = await syncVendor({ root, write: false });
  assert.equal(result.drifted.length, 1);
  assert.deepEqual(result.updated, []);
  // 校验模式绝不能改文件：CI 里跑它必须是无副作用的。
  assert.equal(await readFile(path.join(root, 'src/alpha/vendor/three.module.min.js'), 'utf8'), 'stale');
});

test('a missing three distribution fails loudly instead of silently skipping', async (t) => {
  const { root, put } = await fixture(t);
  await put(path.join('src/alpha/vendor/three.module.min.js'), 'stale');
  await assert.rejects(() => syncVendor({ root }), /npm ci/);
});
