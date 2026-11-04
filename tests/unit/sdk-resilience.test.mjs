import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const sdk = await readFile(new URL('../../scripts/sdk/core.js', import.meta.url), 'utf8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

/* 极简 DOM 桩：只实现 core.js 用到的接口，跑真实源码而不是复制一份逻辑。 */
function makeNode(tag) {
  const node = {
    tagName: String(tag || 'div').toUpperCase(),
    children: [], style: {}, dataset: {}, attributes: {}, listeners: {},
    className: '', textContent: '', id: '', hidden: false, isConnected: false,
    append(...items) { for (const item of items) this.appendChild(item); },
    appendChild(child) {
      child.parentNode = this; child.isConnected = true; this.children.push(child); return child;
    },
    remove() {
      this.isConnected = false;
      if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name]; },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    querySelector() { return makeNode('button'); },
    querySelectorAll() { return []; },
    focus() {},
  };
  return node;
}

function browser({ failWrites = false, canvas = false, storage = new Map() } = {}) {
  const dom = { failWrites };
  const head = makeNode('head');
  const body = makeNode('body');
  const canvasNode = canvas ? makeNode('canvas') : null;
  const document = {
    head, body, hidden: false, readyState: 'loading',
    documentElement: makeNode('html'),
    listeners: {},
    createElement: makeNode,
    getElementById(id) {
      for (const scope of [head, body]) {
        const found = scope.children.find(child => child.id === id);
        if (found) return found;
      }
      return null;
    },
    querySelector(selector) { return selector === 'canvas' ? canvasNode : null; },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    emit(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event); },
  };
  const winListeners = {};
  const win = {
    listeners: winListeners,
    addEventListener(type, fn) { (winListeners[type] ||= []).push(fn); },
    dispatchEvent() {},
    emit(type, event = {}) { for (const fn of winListeners[type] || []) fn(event); },
  };
  const history = {
    pushed: [], backCalls: 0, replaced: [],
    pushState(state, title, url) { this.pushed.push({ state, url }); },
    replaceState(state, title, url) { this.replaced.push({ state, url }); },
    back() { this.backCalls++; },
  };
  const location = { pathname: '/courseware/demo/', href: 'https://kidslab.test/courseware/demo/', reloads: 0,
    reload() { this.reloads++; } };
  const context = {
    window: win, document, location, history,
    navigator: { language: 'zh-CN' },
    matchMedia: () => ({ matches: false }),
    localStorage: {
      getItem: key => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => {
        if (dom.failWrites) throw new Error('QuotaExceededError');
        storage.set(key, String(value));
      },
      removeItem: key => storage.delete(key),
    },
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    AbortController,
    fetch: () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) }),
    setTimeout: (fn, ms) => { const timer = setTimeout(fn, ms); timer.unref?.(); return timer; },
    clearTimeout,
    addEventListener: (type, fn) => win.addEventListener(type, fn),
    dispatchEvent: () => {},
  };
  vm.runInNewContext(sdk, context);
  return {
    cool: win.cool, document, win, history, location, storage,
    setFailWrites(value) { dom.failWrites = value; },
  };
}

const record = (browser, id = 'demo') => {
  const raw = browser.storage.get(`kidslab.progress.${id}`);
  return raw ? JSON.parse(raw) : null;
};

test('进度合并：完成状态粘滞、完成时间只写一次、阶段可继续前进', () => {
  const b = browser();
  b.cool.stage('探索');
  const played = record(b);
  assert.equal(played.status, 'played');
  assert.equal(played.version, 2);
  assert.equal(played.stage, '探索');
  assert.equal(played.completedAt, 0);

  b.cool.complete();
  const done = record(b);
  assert.equal(done.status, 'completed');
  assert.ok(done.completedAt > 0);
  const firstCompletedAt = done.completedAt;

  b.cool.stage('第二关');
  const again = record(b);
  assert.equal(again.status, 'completed');
  assert.equal(again.completedAt, firstCompletedAt);
  assert.equal(again.stage, '第二关');
  assert.equal(again.lastStage, '第二关');
});

test('写入失败不丢记录：内存保留并在下次落盘机会重试', () => {
  const b = browser({ failWrites: true });
  assert.doesNotThrow(() => b.cool.stage('探索'));
  assert.equal(record(b), null);
  assert.equal(b.cool.progress.get().status, 'played');
  assert.ok(b.document.body.children.some(child => child.className === 'kg-toast'), '应提示一次保存失败');

  b.setFailWrites(false);
  b.document.hidden = true;
  b.document.emit('visibilitychange');
  assert.equal(record(b).stage, '探索');
});

test('诊断缓冲：同签名合并计数、上限 20 条、可清空', () => {
  const b = browser();
  b.cool.diag.log('error', 'boom');
  b.cool.diag.log('error', 'boom');
  let list = b.cool.diag.read();
  assert.equal(list.length, 1);
  assert.equal(list[0].count, 2);

  for (let i = 0; i < 30; i++) b.cool.diag.log(`type-${i}`, 'detail');
  list = b.cool.diag.read();
  assert.ok(list.length <= 20);
  assert.equal(list.at(-1).type, 'type-29');

  b.cool.diag.clear();
  assert.equal(b.cool.diag.read().length, 0);
});

test('未捕获异常给出恢复层；资源加载失败不打扰孩子', () => {
  const b = browser();
  /* 资源（img/script）加载失败的 error 事件没有 message，不应弹恢复层 */
  b.win.emit('error', { target: { tagName: 'IMG' } });
  assert.equal(b.document.body.children.some(child => child.className === 'kg-layer'), false);

  b.win.emit('error', { message: 'TypeError: x is undefined' });
  const layer = b.document.body.children.find(child => child.className === 'kg-layer');
  assert.ok(layer, '启动期异常应显示恢复层');
  assert.equal(layer.attributes.role, 'alertdialog');
  assert.equal(b.cool.diag.read().at(-1).type, 'error');
});

test('WebGL 上下文丢失显示恢复层，恢复后自动收起', () => {
  const b = browser({ canvas: true });
  let prevented = 0;
  b.document.emit('webglcontextlost', { preventDefault: () => { prevented++; } });
  assert.equal(prevented, 1, '必须 preventDefault 才能让浏览器恢复上下文');
  assert.ok(b.document.body.children.some(child => child.className === 'kg-layer'));
  assert.equal(b.cool.diag.read().at(-1).type, 'webgl-lost');

  b.document.emit('webglcontextrestored');
  assert.equal(b.document.body.children.some(child => child.className === 'kg-layer'), false);
  assert.ok(b.document.body.children.some(child => child.className === 'kg-toast'));
});

test('返回手势：第一次拦下并提示，1.8s 内第二次放行', () => {
  const b = browser();
  assert.equal(b.history.pushed.length, 1, '进入课件先压一条哨兵记录');

  b.win.emit('popstate');
  assert.equal(b.history.pushed.length, 2);
  assert.equal(b.history.backCalls, 0);
  assert.ok(b.document.body.children.some(child => child.className === 'kg-toast'));

  b.win.emit('popstate');
  assert.equal(b.history.backCalls, 1, '第二次返回应真的离开');

  b.win.emit('popstate');
  assert.equal(b.history.backCalls, 1, '放行后不再重复拦截');
});

test('首屏骨架不拦点击，玩法脚本就绪后自动移除', async () => {
  const b = browser();
  const skeleton = b.document.body.children.find(child => child.className === 'kg-skeleton');
  assert.ok(skeleton);
  assert.equal(skeleton.attributes['aria-hidden'], 'true');
  b.document.emit('DOMContentLoaded');
  await pause(700);
  assert.equal(skeleton.isConnected, false);
});
