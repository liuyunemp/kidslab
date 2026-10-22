import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../../scripts/english/english-model.js';
import {courses, UI} from '../../scripts/english/courses.mjs';

// Exercise the real engine with a controlled clock and device adapters, without
// launching a browser or depending on audio/WebGL timing.
const source = (await readFile(new URL('../../scripts/english/engine.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace('export function startEnglish', 'function startEnglish');
function harness({listening = false} = {}) {
  const course = courses[0], key = `kidslab.english.${course.id}.state`;
  let saved = model.initialState(course, 1);
  while (saved.phase === 'learn') saved = model.reduce(course, saved, {type: 'learn-next'}).state;
  if (!listening) saved = model.reduce(course, saved, {type: 'fallback'}).state;
  let now = 0, interval;
  const events = {}, nodes = new Map(), voices = [];
  const storage = new Map([[key, JSON.stringify(saved)]]);
  class Element {
    constructor() {
      this.handlers = {}; this.style = {}; this.dataset = {}; this.children = [];
      this.classList = {toggle() {}, add() {}};
    }
    set id(value) { nodes.set(value, this); }
    addEventListener(type, fn) { this.handlers[type] = fn; }
    setAttribute() {}
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
  }
  const document = {
    documentElement: {lang: 'zh', dataset: {theme: 'light'}}, hidden: false,
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); },
    createElement() { return new Element(); },
    addEventListener(name, fn) { events[name] = fn; },
  };
  const sandbox = vm.createContext({
    ...model, document, window: {cool: {stage() {}, track() {}, complete() {}, preferences: {},
      speech: {enabled: true, subscribe() {}}, bindI18n() {}}},
    location: {search: '?seed=1'}, URLSearchParams, performance: {now: () => now},
    localStorage: {getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v)},
    setInterval(fn) { interval = fn; return 1; }, clearInterval() {},
    addEventListener(name, fn) { events[name] = fn; },
    createAudio() { return {setMuted() {}, unlock: async () => {}, duck() {}, restore() {},
      musicOn: true, sfxOn: true, error() {}, success() {}, present() {}}; },
    createNarration() { return {reset() {}, say(text, callbacks) { voices.push(callbacks); return {}; }}; },
    createEnglishStage() { return {thumbnail: () => '', update() {}, applyTheme() {}, dispose() {}}; },
  });
  vm.runInContext(`${source}\nglobalThis.start = startEnglish;`, sandbox);
  const app = sandbox.start(course, UI, {});
  const click = id => nodes.get(id).handlers.click();
  click('resumeBtn');
  return {app, document, voices, nodes, click, events,
    at(time, tick = false) { now = time; if (tick) interval(); },
    saved: () => JSON.parse(storage.get(key)),
  };
}

test('theme and language redraws do not forgive elapsed answer time', () => {
  const h = harness();
  for (let i = 1; i <= 50; i++) {
    h.at(i * 100, i % 2 === 0);
    h.events[i % 2 ? 'themechange' : 'langchange']();
  }
  assert.equal(h.app.state.remainingMs, 15000);
  assert.equal(h.saved().remainingMs, 15000);
  h.at(20000, true);
  assert.equal(h.app.state.phase, 'feedback');
  assert.equal(h.app.state.lives, 2);
  h.events.themechange(); h.at(20200, true);
  assert.equal(h.app.state.lives, 2, 'a timeout is applied only once');
});

test('waiting for audio is untimed, while replaying audio never resets the countdown', () => {
  const h = harness({listening: true});
  h.at(1300, true);
  assert.equal(h.app.state.remainingMs, 20000);
  h.at(1500); h.voices.at(-1).onStart();
  h.at(1700, true);
  assert.equal(h.app.state.remainingMs, 19800, 'do not charge the 200ms before audio started');
  h.at(1750); h.click('hearBtn');
  h.at(1800); h.voices.at(-1).onStart();
  h.at(2000, true);
  assert.equal(h.app.state.remainingMs, 19500);
});

test('settings pause settles the partial tick and resume excludes paused time', () => {
  const h = harness();
  h.at(175); h.click('panelHandle');
  assert.equal(h.app.state.remainingMs, 19825);
  h.at(5000, true);
  assert.equal(h.app.state.remainingMs, 19825);
  h.at(5500); h.click('panelHandle');
  h.at(5700, true);
  assert.equal(h.app.state.remainingMs, 19625);
});

test('hiding or leaving settles the last partial tick and keeps background time paused', () => {
  const h = harness();
  h.at(185); h.document.hidden = true; h.events.visibilitychange();
  assert.equal(h.saved().remainingMs, 19815);
  h.at(5000, true); h.document.hidden = false; h.events.visibilitychange();
  h.at(8000); h.click('resumeBtn'); h.at(8200, true);
  assert.equal(h.app.state.remainingMs, 19615);
  h.at(8255); h.events.pagehide();
  assert.equal(h.saved().remainingMs, 19560);
});

test('a cancelled listening callback cannot start another question or grant time', () => {
  const h = harness({listening: true}), stale = h.voices.at(-1);
  h.at(100); h.click('fallbackBtn');
  h.at(350); stale.onStart();
  h.at(600, true);
  assert.equal(h.app.state.question.mode, 'read');
  assert.equal(h.app.state.remainingMs, 19500);
});
