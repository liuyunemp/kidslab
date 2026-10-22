import test from 'node:test';
import assert from 'node:assert/strict';
import { courses } from '../../scripts/adventure/catalog.mjs';
import { createSession, perform, restore, selectLevel, snapshot, undo } from '../../scripts/adventure/session.js';

/** Actions no level should accept; models must reject them without throwing. */
const ILLEGAL = [
  null,
  undefined,
  {},
  { type: 'nonsense' },
  { type: 'step', amount: NaN },
  { type: 'point', point: 999 },
  { type: 'signal', train: 999 },
  { type: 'move', dir: 'diagonal' },
  { type: 'rule', key: 'depth', value: NaN },
];

function random(seed) {
  let x = (seed >>> 0) || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

function assertFinite(value, label, seen = new Set()) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `${label} must stay finite, got ${value}`);
    return;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) assertFinite(child, `${label}.${key}`, seen);
}

function collectActions(items, out) {
  for (const item of items ?? []) {
    if (item?.action) out.push(item.action);
    if (Array.isArray(item?.options)) collectActions(item.options, out);
  }
  return out;
}

/**
 * Courses expose actions in three different places: panel controls (sometimes
 * nested under `options`), 3D stage objects (light-chain-house puts `action` on
 * each lamp), and fixed run buttons that only `solve` knows about.
 */
function legalActions(model, session) {
  const found = [];
  collectActions(model.controls(session.level, session.state), found);
  collectActions(model.view(session.level, session.state).objects, found);
  try { found.push(...model.solve(session.level, session.state)); } catch { /* solve is best effort mid-level */ }
  const seen = new Set();
  return found.filter((action) => {
    const key = JSON.stringify(action);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Play forward until `index` is legitimately unlocked, as a child would. */
function unlockedAt(model, index) {
  let session = createSession(model);
  while (session.index < index) {
    for (const action of model.solve(session.level)) {
      const result = perform(model, session, action);
      assert.equal(result.ok, true, `${model.id ?? ''}: solve action rejected (${result.reason})`);
      session = result.session;
    }
    session = selectLevel(model, session, session.index + 1, 7);
  }
  return session;
}

test('nine adventure models survive random and invalid actions without NaN or lost snapshots', async () => {
  for (const { id } of courses) {
    const model = await import(`../../src/${id}/${id}-model.js`);
    for (const index of [0, 4, 8]) {
      let session = unlockedAt(model, index);
      const roll = random(index * 31 + 5);
      for (let step = 0; step < 120; step += 1) {
        const legal = legalActions(model, session);
        if (!legal.length) {
          // No control left is only legal once the level is actually complete.
          assert.equal(model.won(session.level, session.state), true, `${id}#${index}: stuck with no actions and not won`);
          break;
        }
        const pool = step % 5 === 0 ? ILLEGAL : legal;
        const action = pool[Math.floor(roll() * pool.length)];
        const before = JSON.stringify(session.state);
        const result = perform(model, session, action);
        assert.equal(JSON.stringify(session.state), before, `${id}#${index}: actions must not mutate session state`);
        if (result.ok) session = result.session;
        assertFinite(session.state, `${id}#${index}.step${step}`);
        if (step % 20 === 0) {
          const saved = restore(model, snapshot(session));
          assert.equal(saved.index, session.index, `${id}#${index}: snapshot keeps the level`);
          assert.deepEqual(saved.state, session.state, `${id}#${index}: snapshot round trip at step ${step}`);
          assert.deepEqual(saved.actions, session.actions, `${id}#${index}: action log round trip`);
        }
        if (step % 30 === 29 && session.actions.length > 1) {
          const undone = undo(model, session);
          assert.equal(undone.actions.length, session.actions.length - 1, `${id}#${index}: undo drops one action`);
          assertFinite(undone.state, `${id}#${index}.undo${step}`);
        }
      }
    }
  }
});
