import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export async function validateSpeechAssets(dir) {
  const entry = await readFile(path.join(dir,'main.js'),'utf8').catch(() => '');
  if (!entry.includes('speech-manifest.js')) return;
  const source = await readFile(path.join(dir,'speech-manifest.js'),'utf8');
  const manifest = JSON.parse(source.replace(/^export const manifest = /,'').replace(/;\s*$/,''));
  if (manifest.version !== 1) throw new Error('Unsupported speech manifest');
  const checked = new Map();
  for (const lang of ['zh','en']) {
    const entries = manifest.entries?.[lang];
    if (!entries || !Object.keys(entries).length) throw new Error(`Missing ${lang} narration`);
    for (const [text, clip] of Object.entries(entries)) {
      if (!text.trim() || !/^\.\/audio\/speech\/[a-f0-9]{64}\.mp3$/.test(clip.path)) throw new Error('Invalid speech clip');
      let bytes = checked.get(clip.path);
      if (!bytes) { bytes = await readFile(path.join(dir,clip.path)); checked.set(clip.path,bytes); }
      if (bytes.length !== clip.bytes || createHash('sha256').update(bytes).digest('hex') !== clip.sha256) throw new Error(`Speech recording hash mismatch: ${clip.path}`);
    }
  }
}
