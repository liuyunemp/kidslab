#!/usr/bin/env node
/**
 * three.js vendor 同步 — 把 node_modules 里的 three 分发到每个自带 vendor 的课件。
 *
 * 背景：课件必须「完全独立、不走 CDN」，所以每个用到 three 的课件都在
 * src/<id>/vendor/three.module.min.js 存一份副本。历史上 npm run vendor 只更新
 * src/welcome/ 一份，其余 30 份靠手工 cp，极易漂移——某个课件悄悄用着旧版
 * three，只在特定浏览器上出问题。
 *
 * 用法：
 *   node scripts/vendor.mjs          # 同步全部副本（默认）
 *   node scripts/vendor.mjs --check  # 只校验，不写盘；有漂移则退出码 1（供 test:unit / CI 用）
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RELATIVE = path.join('vendor', 'three.module.min.js');
const SOURCE = path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.min.js');
const check = process.argv.includes('--check');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** 找出所有需要同步的副本（src/* 与 docs 模板各一份）。 */
export async function findVendorCopies(root = ROOT) {
  const copies = [];
  for (const group of ['src', 'docs']) {
    const base = path.join(root, group);
    let entries;
    try { entries = await readdir(base, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const target = path.join(base, entry.name, RELATIVE);
      try {
        await readFile(target);
        copies.push(target);
      } catch { /* 该目录没有 vendor 副本，跳过 */ }
    }
  }
  return copies.sort();
}

export async function syncVendor({ root = ROOT, write = true } = {}) {
  const source = path.join(root, 'node_modules', 'three', 'build', 'three.module.min.js');
  let bytes;
  try {
    bytes = await readFile(source);
  } catch {
    throw new Error(`找不到 three 发行文件，请先运行 npm ci：${path.relative(root, source)}`);
  }
  const expected = sha256(bytes);
  const copies = await findVendorCopies(root);
  const drifted = [];
  const updated = [];
  for (const target of copies) {
    const current = sha256(await readFile(target));
    if (current === expected) continue;
    if (write) {
      await writeFile(target, bytes);
      updated.push(target);
    } else {
      drifted.push(target);
    }
  }
  return { expected, total: copies.length, updated, drifted, copies };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = await syncVendor({ write: !check });
  const label = (file) => path.relative(ROOT, file).replace(/\\/g, '/');
  if (check) {
    if (result.drifted.length) {
      console.error(`✗ three.js vendor 副本与 node_modules 不一致（${result.drifted.length}/${result.total}）：`);
      for (const file of result.drifted) console.error(`    ${label(file)}`);
      console.error('  运行 `node scripts/vendor.mjs` 同步。');
      process.exit(1);
    }
    console.log(`✓ three.js vendor 副本一致（${result.total} 份，${result.expected.slice(0, 12)}）`);
  } else if (result.updated.length) {
    console.log(`✓ three.js 已同步 ${result.updated.length}/${result.total} 份副本（${result.expected.slice(0, 12)}）`);
    for (const file of result.updated) console.log(`    ${label(file)}`);
  } else {
    console.log(`✓ three.js vendor 副本已是最新（${result.total} 份，${result.expected.slice(0, 12)}）`);
  }
}
