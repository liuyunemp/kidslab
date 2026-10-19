import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ids,mathIds,parameterIds,geometryIds,legacyIds,taskIds,patternIds,aquariumIds,symmetryIds,schedulingIds,pigeonIds,probabilityIds,shadowIds,golfIds,icecreamIds,hanoiIds,sudokuIds,vennIds,stoneIds,foldIds,ferryIds,bridgeIds,truthIds,detectiveIds,laserIds,coloringIds,pirateIds,huarongIds,twistIds} from '../../scripts/random-rounds/sync.mjs';
test('random helpers and shared engine stay identical to their distributable source',async()=>{
  const all=[...ids,...mathIds,...parameterIds,...geometryIds,...legacyIds,...taskIds,...patternIds,...aquariumIds,...symmetryIds,...schedulingIds,...pigeonIds,...probabilityIds,...shadowIds,...golfIds,...icecreamIds,...hanoiIds,...sudokuIds,...vennIds,...stoneIds,...foldIds,...ferryIds,...bridgeIds,...truthIds,...detectiveIds,...laserIds,...coloringIds,...pirateIds,...huarongIds,...twistIds];
  for(const id of all){
    // Every shipped helper must stay byte-identical to its distributable source,
    // including the shared exploration generator used by all g1 exploration courses.
    for(const [source,target] of [['core.js','random-core.js'],['browser.js','random-rounds.js'],['explorations.js','random-explorations.js'],['worker.js','random-worker.js'],['worker-client.js','random-worker-client.js']]){
      assert.equal(await readFile(`src/${id}/${target}`,'utf8'),await readFile(`scripts/random-rounds/${source}`,'utf8'),`${id}/${target}`);
    }
    const model=mathIds.includes(id)?'math':parameterIds.includes(id)?'parameters':geometryIds.includes(id)?'geometry':legacyIds.includes(id)?'g1':taskIds.includes(id)?'number-tasks':null;
    if(model)assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile(`scripts/random-rounds/${model}.js`,'utf8'),`${id} model`);
    if(patternIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),(await readFile('scripts/random-rounds/patterns.js','utf8')).replace("'./core.js'","'./random-core.js'"));
    if(aquariumIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/aquarium.js','utf8'));
    if(symmetryIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/symmetry.js','utf8'));
    if(schedulingIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/scheduling.js','utf8'));
    if(pigeonIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/pigeons.js','utf8'));
    if(probabilityIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/probability.js','utf8'));
    if(golfIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/golf.js','utf8'));
    if(icecreamIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/icecream.js','utf8'));
    if(shadowIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/shadows.js','utf8'));
    if(hanoiIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/hanoi.js','utf8'));
    if(sudokuIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/sudoku.js','utf8'));
    if(vennIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/venn.js','utf8'));
    if(stoneIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/stones.js','utf8'));
    if(foldIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/origami.js','utf8'));
    if(ferryIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/ferry.js','utf8'));
    if(bridgeIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/bridges.js','utf8'));
    if(truthIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/truth.js','utf8'));
    if(detectiveIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/detective.js','utf8'));
    if(laserIds.includes(id))assert.equal(await readFile(`src/${id}/random-model.js`,'utf8'),await readFile('scripts/random-rounds/laser.js','utf8'));
    if(coloringIds.includes(id))assert.equal(await readFile('src/'+id+'/random-model.js','utf8'),await readFile('scripts/random-rounds/coloring.js','utf8'));
    if(pirateIds.includes(id))assert.equal(await readFile('src/'+id+'/random-model.js','utf8'),await readFile('scripts/random-rounds/pirates.js','utf8'));
    if(twistIds.includes(id))assert.equal(await readFile('src/'+id+'/random-model.js','utf8'),await readFile('scripts/random-rounds/twisters.js','utf8'));
    if(huarongIds.includes(id))assert.equal(await readFile('src/'+id+'/random-model.js','utf8'),(await readFile('scripts/random-rounds/huarong.js','utf8')).replace('../../src/huarong-dao/puzzle.js','./puzzle.js'));
    if(legacyIds.includes(id))assert.equal(await readFile(`src/${id}/engine.js`,'utf8'),await readFile('scripts/g1-games/engine.js','utf8'),`${id} engine`);
  }
});
