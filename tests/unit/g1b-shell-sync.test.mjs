import test from 'node:test';
import assert from 'node:assert/strict';
import { ids, shared, sync } from '../../scripts/g1b-sync.mjs';

test('17 grade-1 exploration shells stay identical to src/g1b-character-lab', async () => {
  // Throws with the exact drifting files; a one-off edit to any standalone
  // copy would otherwise be silently overwritten by the next random:sync.
  await sync({ check: true });
  assert.equal(ids.length, 17);
  assert.equal(new Set(ids).size, ids.length);
  for (const file of ['index.html', 'main.js', 'style.css', 'scene.js', 'audio.js', 'exploration-model.js']) {
    assert.ok(shared.includes(file), `${file} must be part of the shared shell`);
  }
});
