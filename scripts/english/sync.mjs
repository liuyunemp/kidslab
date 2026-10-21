import { cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { courses, UI, factsFor } from './courses.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = ['index.html', 'style.css', 'engine.js', 'english-model.js', 'scene.js', 'objects.js', 'vocabulary-objects.js', 'audio.js'];
const check = process.argv.includes('--check');
let count = 0;
for (const course of courses) {
  const dir = path.join(root, 'src', course.id);
  if (!check) {
    await mkdir(dir, { recursive: true });
    await cp(path.join(root, 'docs/courseware-template'), dir, { recursive: true, force: false });
    // Exact known template files, never a recursive deletion.
    for (const name of ['README.md', 'lab-model.js']) await rm(path.join(dir, name), { force: true });
  }
  const { kind, items, targets, invitation, action, finish, hint, ...meta } = course;
  const generated = new Map([
    ['course.json', JSON.stringify(meta, null, 2) + '\n'],
    ['content.js', `export const course = ${JSON.stringify(course, null, 2)};\nexport const UI = ${JSON.stringify(UI, null, 2)};\n`],
    ['main.js', "import { startEnglish } from './engine.js';\nimport { course, UI } from './content.js';\nimport { manifest } from './speech-manifest.js';\nstartEnglish(course, UI, manifest);\n"],
    ['facts.md', factsFor(course)],
  ]);
  for (const file of files) {
    let source = await readFile(new URL(file, import.meta.url), 'utf8');
    if (file === 'index.html') {
      source = source.replaceAll('__TITLE__', course.title.zh).replaceAll('__ICON__', course.icon);
    }
    generated.set(file, source);
  }
  for (const [file, source] of generated) {
    const expected = source.replaceAll('\r\n', '\n');
    if (check) {
      const actual = (await readFile(path.join(dir, file), 'utf8')).replaceAll('\r\n', '\n');
      if (actual !== expected) throw new Error(`${course.id}/${file}: run npm run english:sync`);
    } else {
      await writeFile(path.join(dir, file), expected);
    }
  }
  count += 1;
}
console.log(`${check ? 'Checked' : 'Synced'} ${count} independent English courses.`);
