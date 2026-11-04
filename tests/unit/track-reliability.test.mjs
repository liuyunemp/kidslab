import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../../scripts/track.js', import.meta.url), 'utf8'))
  .replace('__ANALYTICS_ENDPOINT__', 'https://track.test/')
  .replace('__COURSE_ID__', 'demo');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

/* 只实现 tracker 用到的浏览器接口：跑真实源码，不复制逻辑。 */
function tracker({ storage = new Map(), beaconOk = true, fetchOk = true } = {}) {
  const sent = [];
  const control = { beaconOk, fetchOk, hidden: false, now: 1_000_000 };
  const listeners = {};
  const blobText = (blob) => (blob && blob.parts ? blob.parts.join('') : '');
  const win = {
    cool: {},
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    dispatchEvent() {},
  };
  const document = {
    get hidden() { return control.hidden; },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
  };
  const context = {
    window: win,
    document,
    navigator: {
      language: 'zh-CN',
      sendBeacon(url, blob) {
        if (!control.beaconOk) return false;
        sent.push(blobText(blob));
        return true;
      },
    },
    localStorage: {
      getItem: key => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
    },
    matchMedia: () => ({ matches: false }),
    Blob: class { constructor(parts) { this.parts = parts; } },
    crypto: { randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    fetch: () => {
      if (!control.fetchOk) return Promise.reject(new Error('offline'));
      sent.push('fetch');
      return Promise.resolve({ ok: true });
    },
    Date: { now: () => control.now },
    setInterval: (fn, ms) => { const timer = setInterval(fn, ms); timer.unref?.(); return timer; },
    clearInterval,
    setTimeout: (fn, ms) => { const timer = setTimeout(fn, ms); timer.unref?.(); return timer; },
    clearTimeout,
    addEventListener: (type, fn) => win.addEventListener(type, fn),
  };
  vm.runInNewContext(source, context);
  const emit = (type) => { for (const fn of listeners[type] || []) fn({}); };
  const events = () => sent
    .filter(text => text.startsWith('{'))
    .flatMap(text => JSON.parse(text).e.map(event => event.n));
  return { control, sent, emit, events, cool: win.cool, storage };
}

test('5 秒内重复进入不算一次新的复玩', () => {
  const storage = new Map();
  const first = tracker({ storage });
  first.cool.stage('play');
  assert.deepEqual(first.events().slice(0, 1), ['enter']);

  const again = tracker({ storage });
  again.cool.stage('play');
  assert.equal(again.events().includes('enter'), false, '误触/立刻刷新不应计复玩');
  assert.equal(JSON.parse(storage.get('kidslab.visits')).demo, 1);

  // 100 秒后再进来：这是真的复玩，要记一次
  storage.set('kidslab.enter.demo', '900000');
  const next = tracker({ storage });
  assert.equal(JSON.parse(next.storage.get('kidslab.visits')).demo, 2);
  assert.deepEqual(next.events().slice(0, 1), ['enter']);
});

test('一个会话只在第一次切后台记 leave，之后按 beat 记时长', () => {
  const t = tracker();
  t.emit('visibilitychange');
  assert.equal(t.events().includes('leave'), false);

  t.control.hidden = true;
  t.control.now += 5000;
  t.emit('visibilitychange');
  t.control.hidden = false;
  t.control.now += 5000;
  t.emit('visibilitychange');
  t.control.hidden = true;
  t.emit('visibilitychange');

  const names = t.events();
  assert.equal(names.filter(name => name === 'leave').length, 1);
  assert.ok(names.filter(name => name === 'beat').length >= 1);
});

test('上报失败不丢事件：下一轮 flush 重试成功后才出队', async () => {
  const t = tracker({ beaconOk: false, fetchOk: false });
  t.cool.track('flip');
  t.cool.track('flip');
  t.control.hidden = true;
  t.emit('visibilitychange');           // 触发 flush，beacon 与 fetch 都失败
  await pause(0);
  assert.equal(t.events().length, 0);

  t.control.beaconOk = true;
  t.control.hidden = false;
  t.emit('visibilitychange');
  t.control.hidden = true;
  t.emit('visibilitychange');           // 下一次 flush 补发
  const names = t.events();
  assert.ok(names.includes('act:flip'), '重试成功后事件必须补上');
  assert.ok(names.includes('leave'));
});

test('自定义动作仍然合并计数，连点 30 次只占一行', () => {
  const t = tracker();
  for (let i = 0; i < 30; i++) t.cool.track('spin');
  t.control.hidden = true;
  t.emit('visibilitychange');
  const rows = t.sent
    .filter(text => text.startsWith('{'))
    .flatMap(text => JSON.parse(text).e)
    .filter(event => event.n === 'act:spin');
  assert.equal(rows.length, 1, '连点必须合并成一行');
  assert.equal(rows[0].k, 30);
  assert.equal(rows[0].streak, 30);
});
