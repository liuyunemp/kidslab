import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {random} from '../../scripts/random-rounds/core.js';
import {parameterSet,validParameters,sampling,validSampling} from '../../scripts/random-rounds/parameters.js';
import {createLab,drawSample,runCensus,serializeLab,parseLab} from '../../src/statistics-sampling-lab/lab-model.js';
const source=await readFile('src/function-grapher/main.js','utf8');
const presets=vm.runInNewContext(`(${source.match(/const PRESETS = (\{[\s\S]*?\n  \});/)[1]})`);
test('function ranges: 1000 seeds per function, step, finite values and reproducibility',()=>{
  for(const preset of Object.values(presets)){
    const base={ranges:preset.params,values:Object.fromEntries(Object.entries(preset.params).map(([p,[,,,d]])=>[p,d]))};
    assert.ok(validParameters(base,base));const seen=new Set();
    for(let seed=0;seed<1000;seed++){
      const a=parameterSet(base,random(seed));assert.ok(validParameters(a,base));assert.deepEqual(a,parameterSet(base,random(seed)));seen.add(JSON.stringify(a.values));
      for(const x of [-9,-1,1,9])assert.ok(Number.isFinite(preset.fn(a.values,x)));
    }
    const possible=Object.values(base.ranges).reduce((n,[min,max,step])=>n*(Math.floor((max-min)/step)+1),1);
    assert.ok(seen.size>Math.min(900,possible*.9));assert.equal(validParameters({values:{a:Infinity}},base),false);
  }
});
test('sampling: 1000 reproducible experiments retain sample conditions, census and snapshots',()=>{
  for(let seed=0;seed<1000;seed++){
    const a=sampling({seed:42,n:40,method:'simple'},random(seed));assert.ok(validSampling(a));
    const experiment=createLab(a),draw=drawSample(experiment);assert.ok(draw.ok);
    assert.deepEqual(drawSample(createLab(a)),draw);
    assert.equal(draw.lab.sample.ids.length,a.n);assert.equal(new Set(draw.lab.sample.ids).size,a.n);
    assert.equal(runCensus(draw.lab).lab.census.mean,30);
    assert.deepEqual(parseLab(serializeLab(draw.lab)),draw.lab);
  }
});
