import { readFile, writeFile } from 'node:fs/promises';
import { ids, legacyIds, explorationIds } from './catalog.mjs';

export async function syncNarration() {
  const model = await readFile(new URL('model.js',import.meta.url),'utf8');
  const narrator = (await readFile(new URL('narration.js',import.meta.url),'utf8')).replace("'./model.js'","'./speech-model.js'");
  const engine = await readFile(new URL('../g1-games/engine.js',import.meta.url),'utf8');
  const gameModel = await readFile(new URL('../g1-games/model.js',import.meta.url),'utf8');
  for (const id of ids) {
    const dir = new URL(`../../src/${id}/`,import.meta.url);
    await writeFile(new URL('speech-model.js',dir),model);
    await writeFile(new URL('narration.js',dir),narrator);
    if (legacyIds.includes(id)) {
      await writeFile(new URL('engine.js',dir),engine);
      await writeFile(new URL('model.js',dir),gameModel);
      await writeFile(new URL('main.js',dir),"import { startGame } from './engine.js';\nimport { config } from './config.js';\nimport { manifest } from './speech-manifest.js';\nstartGame(config, manifest);\n");
    }
    if (explorationIds.includes(id) && id !== 'g1b-character-lab') {
      for (const file of ['main.js','audio.js','exploration-model.js']) await writeFile(new URL(file,dir),await readFile(new URL(`../../src/g1b-character-lab/${file}`,import.meta.url)));
    }
  }
}
