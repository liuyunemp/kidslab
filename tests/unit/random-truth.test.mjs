import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {TRUTH_BASES,truthTask,validTruth,truthIdentity,truthFamily,truthCopy} from '../../scripts/random-rounds/truth.js';
for(const [level,base] of TRUTH_BASES.entries())test(`truth ${level}: 100 unique-solution instances and finite exhaustion`,()=>{
  assert.ok(validTruth(base,base));
  const family=truthFamily(base);assert.equal(family.length,[10,8,2][level]);
  for(let seed=0;seed<100;seed++){
    const a=truthTask(base,random(seed));assert.ok(validTruth(a,base));assert.deepEqual(a,truthTask(base,random(seed)));
    if(level===0){const solutions=[0,1].filter(mia=>a.claims.every((c,i)=>{
      const value=c.kind==='same'?false:c.kind==='different'?true:(c.person==='mia'?mia:1-mia)===Number(c.truth);return Number(value)===(i===0?mia:1-mia);
    }));assert.deepEqual(solutions,[Number(a.roles.mia)]);}
    if(level===1){for(const road of ['left','right']){
      const gatePart=a.gateOpen===a.gateClaim,or=road===a.road||gatePart;assert.equal(gatePart,false);assert.equal(or,road===a.road);
    }}
    if(level===2)for(const truth of [true,false]){const actual=a.road==='left'?0:1,otherSays=truth?1-actual:actual,answer=truth?otherSays:1-otherSays;assert.equal(answer,1-actual);}
    for(const lang of ['zh','en'])for(const key of level===0?['statements0','identityRight']:level===1?['statements1','moonFact','roadRight']:['magicAnswer','finalRight'])assert.ok(truthCopy(a,key,lang));
  }
  let recent=[];for(let round=0;round<family.length*3;round++){
    const r=generateRound({seed:2,levelId:String(level),round,enumerate:()=>family,validate:a=>validTruth(a,base),identify:truthIdentity,recent});
    if(round<family.length)assert.ok(!recent.includes(r.fingerprint));else assert.equal(r.fingerprint,recent[0]);recent=remember(recent,r.fingerprint);
  }
  assert.equal(validTruth({...base,level:9},base),false);
});
test('ambiguous badges and contradictory gate evidence are rejected',()=>{
  assert.equal(validTruth({...TRUTH_BASES[0],claims:[{kind:'role',person:'mia',truth:true},{kind:'role',person:'noah',truth:true}]},TRUTH_BASES[0]),false);
  assert.equal(validTruth({...TRUTH_BASES[1],gateClaim:false},TRUTH_BASES[1]),false);
});
