import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {PIRATE_BASES,pirateTask,pirateFamily,pirateIdentity,validPirate,pirateOutcome,pirateCandidates,pirateHint,validPans,HARD_WEIGHS} from '../../scripts/random-rounds/pirates.js';
for(const [i,base] of PIRATE_BASES.entries())test(`pirates ${i}: 1000 recoverable instances and bounded identifying weighings`,()=>{
  for(let seed=0;seed<1000;seed++){
    const a=pirateTask(base,random(seed));assert.deepEqual(a,pirateTask(base,random(seed)));assert.ok(validPirate(a,base));const log=[];
    while(pirateCandidates(a,log).length>1){const p=pirateHint(a,pirateCandidates(a,log));assert.ok(validPans(a,p.left,p.right));const weight=id=>id===a.fakeId?(a.fakeKind==='light'?99:101):100,l=p.left.reduce((s,id)=>s+weight(id),0),r=p.right.reduce((s,id)=>s+weight(id),0),outcome=l===r?'balance':l>r?'left':'right';assert.equal(pirateOutcome(p.left,p.right,{id:a.fakeId,kind:a.fakeKind}),outcome);log.push({...p,outcome});assert.ok(log.length<=Math.min(a.maxWeigh,i===2||i===3?3:2));}
    assert.deepEqual(pirateCandidates(a,log),[{id:a.fakeId,kind:a.fakeKind}]);
  }
  const family=pirateFamily(base);let recent=[];for(let round=0;round<35;round++){
    const r=generateRound({seed:31,levelId:base.id,round,enumerate:()=>family,validate:a=>validPirate(a,base),identify:pirateIdentity,recent});if(family.length>10||round<family.length)assert.ok(!recent.includes(r.fingerprint));else assert.equal(recent[0],r.fingerprint);recent=remember(recent,r.fingerprint);
  }
  assert.throws(()=>pirateCandidates(base,[{left:[1],right:[1],outcome:'balance'}]));assert.equal(validPirate({...base,fakeId:0},base),false);
});
test('the twelve-coin matrix distinguishes all 24 coin/bias combinations independently',()=>{
  const signatures=new Set();for(let id=1;id<=12;id++)for(const sign of [-1,1]){
    const code=HARD_WEIGHS.map(p=>Math.sign((p.left.includes(id)?1:p.right.includes(id)?-1:0)*sign)).join(',');assert.ok(!signatures.has(code));signatures.add(code);
  }assert.equal(signatures.size,24);for(const p of HARD_WEIGHS){assert.equal(p.left.length,4);assert.equal(p.right.length,4);}
});
