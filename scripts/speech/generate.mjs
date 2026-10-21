import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, cp, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { catalog, ids } from './catalog.mjs';
import { speechPlan } from './model.js';
import { syncNarration } from './sync.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const check = process.argv.includes('--check');
const hash = data => createHash('sha256').update(data).digest('hex');
export const voice = { zh: 'Microsoft Huihui Desktop', en: 'Microsoft Zira Desktop' };
const recipe = 'kidslab-speech-v1-mp3-48k-24000-mono';
const textHash = (text, lang) => hash(`${recipe}\n${voice[lang]}\n${text}`);
const exists = async file => { try { return (await stat(file)).isFile(); } catch { return false; } };
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true, stdio: 'inherit' });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command}: exit ${code}`)));
});

const courses = await catalog();
const model = await readFile(new URL('model.js', import.meta.url), 'utf8');
const narration = (await readFile(new URL('narration.js', import.meta.url), 'utf8')).replace("'./model.js'", "'./speech-model.js'");
const cache = path.join(root, '.speech-cache');
const requests = new Map();
for (const table of courses.values()) for (const lang of ['zh','en']) for (const text of table[lang]) {
  const id = textHash(text, lang); requests.set(id, { id, text, lang, voice: voice[lang] });
}
if (!check) {
  await mkdir(cache, { recursive: true });
  // Reuse checked-in clips too, so a fresh checkout does not re-record them.
  for (const id of ids) {
    const dir = path.join(root,'src',id,'audio','speech');
    for (const file of await readdir(dir).catch(() => [])) if (/^[a-f0-9]+\.mp3$/.test(file) && !await exists(path.join(cache,file))) await cp(path.join(dir,file),path.join(cache,file));
  }
  const missing = [];
  for (const row of requests.values()) if (!await exists(path.join(cache,`${row.id}.mp3`))) missing.push(row);
  if (missing.length) {
    if (process.platform !== 'win32') throw new Error('New voice assets require Windows System.Speech; normal builds use committed MP3 files.');
    const encoder = (await import('@ffmpeg-installer/ffmpeg')).default.path;
    const queue = path.join(cache,'queue.json');
    await writeFile(queue,JSON.stringify(missing),'utf8');
    console.log(`Recording ${missing.length} unique phrases with local Windows voices…`);
    await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts','speech','record.ps1'),'-Queue',queue,'-OutputDirectory',cache,'-Encoder',encoder]);
  }
}
let total = 0;
for (const [id, table] of courses) {
  const dir = path.join(root,'src',id);
  let old;
  try { old = JSON.parse((await readFile(path.join(dir,'speech-manifest.js'),'utf8')).replace(/^export const manifest = /,'').replace(/;\s*$/,'')); } catch {}
  const manifest = { version: 1, recipe, voices: voice, entries: { zh: {}, en: {} } };
  if (!check) await mkdir(path.join(dir,'audio','speech'),{recursive:true});
  for (const lang of ['zh','en']) for (const text of [...table[lang]].sort()) {
    const key = textHash(text, lang), relative = `./audio/speech/${key}.mp3`;
    const file = path.join(dir,relative);
    if (!check) {
      // Idempotent copy: an unchanged clip is left untouched so re-runs stay cheap
      // and never trigger a delete-then-copy on the destination.
      const source = await readFile(path.join(cache,`${key}.mp3`));
      const existing = await readFile(file).catch(() => null);
      if (!existing || !existing.equals(source)) await writeFile(file, source);
    }
    const bytes = await readFile(file).catch(() => { throw new Error(`${id}: missing recording for ${lang}: ${text}`); });
    if (bytes.length < 200 || !(bytes.subarray(0,3).toString() === 'ID3' || bytes[0] === 0xff)) throw new Error(`${id}: invalid MP3: ${text}`);
    manifest.entries[lang][text] = { path: relative, sha256: hash(bytes), bytes: bytes.length };
    total += bytes.length;
  }
  for (const lang of ['zh','en']) for (const text of table[lang]) speechPlan(text,lang,manifest);
  const encoded = `export const manifest = ${JSON.stringify(manifest,null,2)};\n`;
  if (check) {
    if (JSON.stringify(old) !== JSON.stringify(manifest)) throw new Error(`${id}: speech manifest is stale; run npm run speech:generate`);
    for (const [file, expected] of [['speech-model.js',model],['narration.js',narration]]) if (await readFile(path.join(dir,file),'utf8') !== expected) throw new Error(`${id}/${file}: shared source drift`);
  } else {
    await writeFile(path.join(dir,'speech-manifest.js'),encoded);
    await writeFile(path.join(dir,'speech-model.js'),model);
    await writeFile(path.join(dir,'narration.js'),narration);
  }
}
if (!check) await syncNarration();
console.log(`${check ? 'Checked' : 'Generated'} ${ids.length} courses, ${requests.size} unique phrases, ${(total/1024/1024).toFixed(2)} MiB of self-contained MP3 assets.`);
