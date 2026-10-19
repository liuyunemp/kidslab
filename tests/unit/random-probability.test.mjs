import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {carnivalTask,carnivalFamily,validCarnival,carnivalTrials,carnivalCopy} from '../../scripts/random-rounds/probability.js';
test('carnival: 1000 instances per case preserve honest inequalities and independent replacement trials',()=>{
  for(const base of [{kind:'dishonest',total:12},{kind:'honest',total:10},{kind:'design',total:12}]){
    let actual=0,expected=0;
    for(let seed=0;seed<1000;seed++){
      const a=carnivalTask(base,random(seed));assert.ok(validCarnival(a,base));assert.deepEqual(a,carnivalTask(base,random(seed)));
      if(a.kind==='honest')assert.equal(a.claimWins/a.total,a.wins/a.total);if(a.kind==='dishonest')assert.ok(a.claimWins/a.total>a.wins/a.total);
      const copy=carnivalCopy({},a,'en');if(a.kind!=='design')assert.equal(copy.expected,a.kind);
      const n=carnivalTrials(a.total,a.wins,random(seed)),rng=random(seed),independent=Array.from({length:1000},()=>Math.floor(rng()*a.total)).filter(i=>i<a.wins).length;assert.equal(n,independent);actual+=n;expected+=1000*a.wins/a.total;
    }
    assert.ok(Math.abs(actual-expected)<4000);
    const family=carnivalFamily(base);let recent=[];
    for(let round=0;round<Math.min(10,family.length);round++){const a=generateRound({seed:7,levelId:'case',round,recent,enumerate:()=>family,validate:a=>validCarnival(a,base)});assert.ok(!recent.includes(a.fingerprint));recent=remember(recent,a.fingerprint);}
  }
  assert.throws(()=>carnivalTrials(0,1,random(1)),RangeError);
});
