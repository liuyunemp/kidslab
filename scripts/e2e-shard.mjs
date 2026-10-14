#!/usr/bin/env node
/**
 * E2E 分片运行器：把 796 次用例分发到多个独立 Playwright 进程。
 *
 * 为什么需要它：`npm run test:e2e` 是单进程跑完全部用例（398 test × 2 project），
 * 一次全量要反复冷启动大量 Chromium。分片把工作切给多个进程并行完成。
 *
 * 为什么不能简单把 workers 调高：本项目含大量 three.js/WebGL 课件，软件渲染下
 * 并发过高会争抢 GPU/CPU 与端口资源而直接中止（见 playwright.config.js 注释）。
 * 因此这里显式约束 **shards × workers 的总并发**，默认不超过本机可承受的 8。
 *
 * 用法：
 *   node scripts/e2e-shard.mjs                 # 自动选分片数，跑全部 project
 *   node scripts/e2e-shard.mjs --shards=4      # 指定分片数
 *   node scripts/e2e-shard.mjs --workers=1     # 每个分片内的 worker 数
 *   node scripts/e2e-shard.mjs --project=desktop
 *   node scripts/e2e-shard.mjs --fast          # 只跑快层，跳过重型 WebGL 课件
 *   node scripts/e2e-shard.mjs -- <额外参数>   # 透传给 playwright test
 */
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLAUDE_CLI = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');

/** 与 smoke.spec.js 的 HEAVY_WEBGL_COURSES 对应：软件渲染下初始化极慢。 */
const HEAVY_COURSES = [
  'plant-lab', 'magic-cube', 'huarong-dao', 'venn-port', 'optics-lab',
  'solar-explorer', 'welcome', 'statistics-sampling-lab', 'ice-maker-lab',
  'density-detective-lab', 'ph-lab',
];

/** 单个 Chromium 实例在软件渲染下约需 2 个逻辑核才不互相拖累。 */
const SAFE_TOTAL_CONCURRENCY = Math.max(1, Math.min(8, Math.floor(cpus().length / 2)));

function parseArgs(argv) {
  const opts = { passthrough: [], shards: null, workers: null, project: null, fast: false };
  let passthroughMode = false;
  for (const arg of argv) {
    if (passthroughMode) { opts.passthrough.push(arg); continue; }
    if (arg === '--') { passthroughMode = true; continue; }
    if (arg === '--fast') { opts.fast = true; continue; }
    const match = /^--(shards|workers|project)=(.+)$/.exec(arg);
    if (!match) { opts.passthrough.push(arg); continue; }
    const [, key, value] = match;
    if (key === 'project') opts.project = value;
    else {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`--${key} 必须是正整数，收到: ${value}`);
      }
      opts[key] = parsed;
    }
  }
  return opts;
}

function resolveConcurrency({ shards, workers }) {
  if (shards && workers) return { shards, workers };
  if (shards) return { shards, workers: Math.max(1, Math.floor(SAFE_TOTAL_CONCURRENCY / shards)) };
  if (workers) return { shards: Math.max(1, Math.floor(SAFE_TOTAL_CONCURRENCY / workers)), workers };
  // 两者都未指定：按安全总并发切分片，每分片 1 个 worker。
  return { shards: SAFE_TOTAL_CONCURRENCY, workers: 1 };
}

const opts = parseArgs(process.argv.slice(2));
const { shards, workers } = resolveConcurrency(opts);
const totalConcurrency = shards * workers;

if (totalConcurrency > SAFE_TOTAL_CONCURRENCY) {
  console.warn(
    `⚠ 并发总量 ${shards}×${workers}=${totalConcurrency} 超过本机安全值 ${SAFE_TOTAL_CONCURRENCY}；`
    + ' WebGL 课件可能因资源争抢而超时，必要时降到该值以内。',
  );
}

console.log(`▶ E2E 分片: ${shards} 片 × ${workers} worker = ${totalConcurrency} 并发`
  + `（${cpus().length} 逻辑核，安全上限 ${SAFE_TOTAL_CONCURRENCY}）`);

/**
 * 每片独立进程运行，独立 --output 目录，避免多进程互相清理对方的 test-results/。
 * 这正是"7810 个文件"那类清理风暴的来源，分片后各写各的。
 */
function runShard(index) {
  return new Promise((resolve) => {
    const args = [
      CLAUDE_CLI, 'test',
      `--shard=${index}/${shards}`,
      `--workers=${workers}`,
      `--output=test-results-shard-${index}`,
      ...(opts.project ? [`--project=${opts.project}`] : []),
      ...(opts.fast ? ['--grep-invert', HEAVY_COURSES.map((id) => `\\b${id}\\b`).join('|')] : []),
      ...opts.passthrough,
    ];
    console.log(`  [分片 ${index}] $ node ${args.slice(1).join(' ')}`);
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      stdio: 'inherit', // 沙箱下必须 inherit：管道捕获子进程输出会被拒绝 (EPERM)
    });
    child.on('error', (error) => {
      console.error(`  [分片 ${index}] 启动失败: ${error.message}`);
      resolve({ index, code: 1 });
    });
    child.on('exit', (code, signal) => resolve({ index, code: code ?? (signal ? 1 : 0) }));
  });
}

const started = Date.now();
const results = await Promise.all(
  Array.from({ length: shards }, (_, i) => runShard(i + 1)),
);
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

const failed = results.filter((result) => result.code !== 0);
console.log(`\n▶ E2E 分片完成: ${shards - failed.length}/${shards} 片通过，用时 ${elapsed}s`);
if (failed.length) {
  console.error(`  失败分片: ${failed.map((result) => result.index).join(', ')}`);
  console.error(`  产物: ${failed.map((result) => `test-results-shard-${result.index}`).join(', ')}`);
  process.exit(1);
}
