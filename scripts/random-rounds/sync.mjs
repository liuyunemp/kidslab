import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {courses as g1Courses} from '../g1-games/data.mjs';

export const ids = ['g1b-character-lab','g1b-writing-workshop','g1b-word-world','g1b-dictionary-house','g1b-sentence-studio','g1b-poetry-theater','g1b-story-studio','g1b-speaking-stage','g1-flat-shapes','g1-compare-bridge','g1-addition-depot','g1-subtraction-depot','g1-mixed-relay','g1b-column-workshop','g1b-quantity-theater','hundred-metro','change-vending'];
const root = fileURLToPath(new URL('../../', import.meta.url));
export const mathIds=['fraction-lab','clock-town','carry-factory','orchard-orders','grid-tower','balance-circus','rolling-park','alien-farm','combo-closet','crystal-cave'];
export const parameterIds=['function-grapher','statistics-sampling-lab'];
export const geometryIds=['triangle-lab','tangram-theater','hamster-fence'];
export const taskIds=['square-root-lab','potion-ratio','updown-world','zoom-ten','data-studio','fraction-beats','shape-tailor','sale-detective','drone-post','number-fireflies','lantern-lane','voxel-studio'];
export const legacyIds=g1Courses.map(c=>c.id);
export const patternIds=['pattern-caterpillar'];
export const aquariumIds=['volume-aquarium'];
export const symmetryIds=['inkblot-monsters'];
export const schedulingIds=['pancake-boss'];
export const pigeonIds=['bet-party'];
export const probabilityIds=['carnival-truth'];
export const pirateIds=['pirate-scales'];
export const huarongIds=['huarong-dao'];
export const twistIds=['magic-cube','pyramid-cube'];
export const coloringIds=['four-color-kingdom'];
export const laserIds=['laser-mirrors'];
export const detectiveIds=['detective-board'];
export const truthIds=['truth-island'];
export const bridgeIds=['ice-bridges'];
export const ferryIds=['ferry-tales'];
export const foldIds=['punch-origami'];
export const stoneIds=['fox-stones'];
export const vennIds=['venn-port'];
export const sudokuIds=['sudoku-zoo'];
export const hanoiIds=['hanoi-tower'];
export const icecreamIds=['icecream-geometry'];
export const golfIds=['angle-golf'];
export const shadowIds=['shadow-theater'];
export async function syncRandomTools() {
  for (const id of [...ids,...mathIds,...parameterIds,...geometryIds,...legacyIds,...taskIds,...patternIds,...aquariumIds,...symmetryIds,...schedulingIds,...pigeonIds,...probabilityIds,...shadowIds,...golfIds,...icecreamIds,...hanoiIds,...sudokuIds,...vennIds,...stoneIds,...foldIds,...ferryIds,...bridgeIds,...truthIds,...detectiveIds,...laserIds,...coloringIds,...pirateIds,...huarongIds,...twistIds]) {
    for (const [source, target] of [['core.js','random-core.js'],['browser.js','random-rounds.js'],['explorations.js','random-explorations.js'],['worker.js','random-worker.js'],['worker-client.js','random-worker-client.js']]) {
      await writeFile(path.join(root,'src',id,target),await readFile(new URL(source,import.meta.url)));
    }
    if(mathIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('math.js',import.meta.url)));
    if(parameterIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('parameters.js',import.meta.url)));
    if(geometryIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('geometry.js',import.meta.url)));
    if(taskIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('number-tasks.js',import.meta.url)));
    if(patternIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),(await readFile(new URL('patterns.js',import.meta.url),'utf8')).replace("'./core.js'","'./random-core.js'"));
    if(aquariumIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('aquarium.js',import.meta.url)));
    if(symmetryIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('symmetry.js',import.meta.url)));
    if(schedulingIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('scheduling.js',import.meta.url)));
    if(pigeonIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('pigeons.js',import.meta.url)));
    if(probabilityIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('probability.js',import.meta.url)));
    if(twistIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('twisters.js',import.meta.url)));
    if(pirateIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('pirates.js',import.meta.url)));
    if(huarongIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),(await readFile(new URL('huarong.js',import.meta.url),'utf8')).replace('../../src/huarong-dao/puzzle.js','./puzzle.js'));
    if(coloringIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('coloring.js',import.meta.url)));
    if(laserIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('laser.js',import.meta.url)));
    if(detectiveIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('detective.js',import.meta.url)));
    if(truthIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('truth.js',import.meta.url)));
    if(bridgeIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('bridges.js',import.meta.url)));
    if(ferryIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('ferry.js',import.meta.url)));
    if(foldIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('origami.js',import.meta.url)));
    if(stoneIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('stones.js',import.meta.url)));
    if(vennIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('venn.js',import.meta.url)));
    if(sudokuIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('sudoku.js',import.meta.url)));
    if(hanoiIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('hanoi.js',import.meta.url)));
    if(icecreamIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('icecream.js',import.meta.url)));
    if(golfIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('golf.js',import.meta.url)));
    if(shadowIds.includes(id))await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('shadows.js',import.meta.url)));
    if(legacyIds.includes(id)){
      await writeFile(path.join(root,'src',id,'random-model.js'),await readFile(new URL('g1.js',import.meta.url)));
      await writeFile(path.join(root,'src',id,'engine.js'),await readFile(new URL('../g1-games/engine.js',import.meta.url)));
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await syncRandomTools();
