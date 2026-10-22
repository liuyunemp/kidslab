import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { courses } from '../../scripts/english/courses.mjs';
import { expectedFiles, sharedFiles } from '../../scripts/english/sync.mjs';

const normalize = (text) => text.replaceAll('\r\n', '\n');

test('every English course stays identical to the scripts/english author sources', async () => {
  for (const course of courses) {
    const expected = await expectedFiles(course);
    // 4 generated files (course.json / content.js / main.js / facts.md) + 8 shared shells.
    assert.equal(expected.size, sharedFiles.length + 4, course.id);
    for (const [file, source] of expected) {
      const actual = await readFile(new URL(`../../src/${course.id}/${file}`, import.meta.url), 'utf8')
        .catch(() => null);
      assert.notEqual(actual, null, `${course.id}/${file}: missing, run npm run english:sync`);
      assert.equal(normalize(actual), normalize(source), `${course.id}/${file}: run npm run english:sync`);
    }
  }
});
