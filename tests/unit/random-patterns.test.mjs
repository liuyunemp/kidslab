import test from 'node:test';
import assert from 'node:assert/strict';
import {random,fingerprint,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {CATERPILLAR_LEVELS,patternTask,patternFamily,validPattern,patternIdentity,inferPattern,patternSpeech} from '../../scripts/random-rounds/patterns.js';

test('patterns: 1000 samples per lesson preserve periods, legal responses and reproducibility',()=>{
  for(const base of CATERPILLAR_LEVELS){
    for(let seed=0;seed<1000;seed++){
      const a=patternTask(base,random(seed));assert.ok(validPattern(a,base));assert.deepEqual(a,patternTask(base,random(seed)));
      assert.equal(validPattern({...a,bites:99},base),false);
      if(a.kind==='reverse')assert.ok(inferPattern(a.initial));
      else for(let i=0;i<a.bites;i++)assert.deepEqual(a.pattern[(i+4)%a.pattern.length],a.pattern[(i+4+a.pattern.length)%a.pattern.length]);
      const seq=a.kind==='reverse'?a.initial:Array.from({length:4},(_,i)=>a.pattern[i%a.pattern.length]);
      for(const lang of ['zh','en'])assert.ok(patternSpeech(a,seq,lang).length>10);
    }
    const family=patternFamily(base);let recent=[];
    for(let round=0;round<family.length*2;round++){
      const a=generateRound({seed:987,levelId:base.key,round,recent,enumerate:()=>family,validate:a=>validPattern(a,base),identify:patternIdentity});
      if(round<family.length)assert.ok(!recent.includes(a.fingerprint));
      recent=remember(recent,a.fingerprint);
    }
    assert.ok(family.length<=10);
  }
  const ab=CATERPILLAR_LEVELS[0];assert.equal(patternFamily(ab).length,1);
  assert.equal(fingerprint(patternIdentity(ab)),fingerprint(patternIdentity({...ab,pattern:[{color:'blue'},{color:'green'}]})));
  assert.equal(inferPattern([{count:1},{count:2},{count:3},{count:1}]),0);
});
