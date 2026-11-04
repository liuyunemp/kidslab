import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* 门禁：每个课件都必须把「玩过 / 完成」写进本机记录，否则主站的徽章与「最近探索」
   永远漏记。历史上 16 款老课件就是漏在这里，所以用测试守住，而不是靠人工记得。 */

const root = fileURLToPath(new URL('../../', import.meta.url));
const srcDir = path.join(root, 'src');

/* 完全没有学习进度语义的课件：`welcome` 是首页门面，不是课件。 */
const WITHOUT_PROGRESS = new Set(['welcome']);

/* 纯自由观测、没有「完整成功闭环」的课件：只要求上报阶段，不强行造一个通关点。
   新增课件若确实没有通关边界，必须在这里显式登记并写明理由。 */
const WITHOUT_COMPLETE = new Set([
  'fraction-lab',      // 分数↔小数↔百分数自由观察，无目标与胜负
  'function-grapher',  // 函数图像参数观察器，无目标与胜负
]);

function courseIds() {
  return readdirSync(srcDir).filter((name) => {
    const dir = path.join(srcDir, name);
    return statSync(dir).isDirectory() && existsSync(path.join(dir, 'course.json'));
  }).sort();
}

function runtimeSources(id) {
  const dir = path.join(srcDir, id);
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (!/\.(js|html)$/i.test(entry)) continue;
    if (entry === 'offline.json') continue;
    files.push(readFileSync(path.join(dir, entry), 'utf8'));
  }
  return files.join('\n');
}

const STAGE = /cool\s*\??\.\s*stage\s*\??\.?\s*\(/;
const COMPLETE = /cool\s*\??\.\s*complete\s*\??\.?\s*\(/;

test('每个课件都上报阶段，并在真实通关处上报完成', () => {
  const missingStage = [];
  const missingComplete = [];
  for (const id of courseIds()) {
    if (WITHOUT_PROGRESS.has(id)) continue;
    const source = runtimeSources(id);
    if (!STAGE.test(source)) missingStage.push(id);
    if (!COMPLETE.test(source) && !WITHOUT_COMPLETE.has(id)) missingComplete.push(id);
  }
  assert.deepEqual(missingStage, [], `这些课件没有上报阶段（cool.stage），主站会显示「漏记」：\n${missingStage.join(', ')}`);
  assert.deepEqual(missingComplete, [], `这些课件没有上报完成（cool.complete）：\n${missingComplete.join(', ')}`);
});

test('完成上报不能出现在脚本顶层，避免一进页面就记为已完成', () => {
  const suspicious = [];
  for (const id of courseIds()) {
    if (WITHOUT_PROGRESS.has(id)) continue;
    const dir = path.join(srcDir, id);
    for (const entry of readdirSync(dir)) {
      if (!/\.[cm]?js$/i.test(entry)) continue;
      const lines = readFileSync(path.join(dir, entry), 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        if (!/cool\s*\??\.\s*complete\s*\??\.?\s*\(/.test(line)) return;
        /* 顶层语句没有缩进；被函数/条件包起来的一定有缩进，
           或以「function / 事件回调」的单行写法出现在同一行。 */
        if (/^\S/.test(line) && !/function|=>|addEventListener/.test(line)) {
          suspicious.push(`${id}/${entry}:${index + 1}`);
        }
      });
    }
  }
  assert.deepEqual(suspicious, [], `完成上报疑似位于脚本顶层，会一进页面就记为已完成：\n${suspicious.join('\n')}`);
});
