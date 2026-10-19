import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {pigeonTask,pigeonFamily,validPigeon,pigeonSure,pigeonCopy} from '../../scripts/random-rounds/pigeons.js';
test('pigeons: 1000 instances per lesson preserve category limits and tight worst-case bounds',()=>{
  for(const base of [{kind:'month',need:2},{kind:'sock',need:2},{kind:'month',need:3},{kind:'letter',need:2}]){
    for(let seed=0;seed<1000;seed++){
      const a=pigeonTask(base,random(seed));assert.ok(validPigeon(a,base));assert.deepEqual(a,pigeonTask(base,random(seed)));
      const counts=Array(a.drawers).fill(a.need-1);assert.equal(counts.reduce((a,b)=>a+b),pigeonSure(a)-1);
      for(let i=0;i<a.drawers;i++){counts[i]++;assert.ok(Math.max(...counts)>=a.need);counts[i]--;}
      assert.equal(a.categories.length,a.drawers);assert.ok(a.categories.every(n=>n<(a.kind==='month'?12:a.kind==='letter'?26:3)));
      if(a.kind==='month')assert.ok(pigeonCopy(a,'m0Text','en').includes('only'));
      assert.equal(validPigeon({...a,need:a.need+1},base),false);
    }
    const family=pigeonFamily(base);let recent=[];
    for(let round=0;round<family.length;round++){const a=generateRound({seed:7,levelId:'a',round,recent,enumerate:()=>family,validate:a=>validPigeon(a,base)});assert.ok(!recent.includes(a.fingerprint));recent=remember(recent,a.fingerprint);}
  }
});
