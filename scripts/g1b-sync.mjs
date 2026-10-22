// Copy the reviewed source shell into standalone directories. Content and metadata stay local.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import {retryFileOperation} from './build-workspace.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
export const ids = ["g1b-character-lab","g1b-writing-workshop","g1b-word-world","g1b-dictionary-house","g1b-sentence-studio","g1b-poetry-theater","g1b-story-studio","g1b-speaking-stage","g1-flat-shapes","hundred-metro","g1-compare-bridge","g1-addition-depot","g1-subtraction-depot","g1b-column-workshop","g1b-quantity-theater","change-vending","g1-mixed-relay"];
export const shared = ['index.html','main.js','style.css','scene.js','audio.js','exploration-model.js','random-core.js','random-rounds.js','random-explorations.js','random-worker.js','random-worker-client.js','narration.js','speech-model.js'];
const source = path.join(root,'src','g1b-character-lab');

/**
 * `check: true` only reads: every shared shell file must stay byte-identical to
 * the reviewed copy in `src/g1b-character-lab`. Without this, a one-off edit to
 * any of the 17 standalone copies is silently wiped by the next `random:sync`.
 */
export async function sync({check=false}={}) {
  const problems=[];
  for (const id of ids) {
    const dir = path.join(root,'src',id);
    if(!check) await mkdir(dir,{recursive:true});
    for (const file of shared) if (id !== 'g1b-character-lab') {
      if(check){
        const expected=await readFile(path.join(source,file));
        const actual=await readFile(path.join(dir,file)).catch(()=>null);
        if(!actual||!actual.equals(expected)) problems.push(`${id}/${file}`);
      }else{
        const content=await readFile(path.join(source,file));
        await retryFileOperation(()=>writeFile(path.join(dir,file),content));
      }
    }
    if(!check){
      await cp(path.join(root,'docs','courseware-template','vendor'),path.join(dir,'vendor'),{recursive:true});
      await cp(path.join(root,'docs','courseware-template','audio'),path.join(dir,'audio'),{recursive:true});
    }
  }
  if(problems.length) throw new Error(`共享壳副本与 src/g1b-character-lab 不一致，运行 npm run random:sync：\n${problems.join('\n')}`);
  console.log(`${check?'Checked':'Synced'} ${ids.length} self-contained Grade 1 exploration shells. Course content was ${check?'verified':'not changed'}.`);
  return ids.length;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await sync({check:process.argv.includes('--check')});
