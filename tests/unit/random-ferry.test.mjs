import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {ferryClassic,ferryTask,ferryFamily,ferryIdentity,validFerry,ferryMove,ferrySolution} from '../../scripts/random-rounds/ferry.js';
import {CLASSIC_LEVELS} from '../../src/ferry-tales/classic-levels.js';
for(const [i,b] of CLASSIC_LEVELS.entries())test(`ferry ${i}: 100 legal reachable instances, finite exhaustion and reproducibility`,()=>{
  const base=ferryClassic(b),family=ferryFamily(base);assert.equal(family.length,[2,4,5][i]);
  for(let seed=0;seed<100;seed++){
    const a=ferryTask(base,random(seed));assert.deepEqual(a,ferryTask(base,random(seed)));assert.ok(validFerry(a,base));
    let state=a.initial;
    for(const passenger of a.solution){
      const old=state;state=ferryMove(base,state,passenger);assert.ok(state);
      assert.equal(state.boatSide,1-old.boatSide);assert.ok(state.positions.filter((p,j)=>p!==old.positions[j]).length<=1);
      const absent=b.items.filter((_,j)=>state.positions[j]!==state.boatSide).map(x=>x.id);
      assert.ok(b.guard&&absent.includes(b.guard)||b.dangers.every(([x,y])=>!absent.includes(x)||!absent.includes(y)));
    }assert.ok(state.positions.every(p=>p===1));assert.equal(ferrySolution(base,a.initial).length,a.solution.length);
  }
  let recent=[];for(let n=0;n<family.length*3;n++){
    const a=generateRound({seed:12,levelId:String(i),round:n,generate:({rng})=>ferryTask(base,rng),validate:a=>validFerry(a,base),identify:ferryIdentity,enumerate:()=>family,recent});
    if(n<family.length)assert.ok(!recent.includes(a.fingerprint));else assert.equal(a.fingerprint,recent[0]);recent=remember(recent,a.fingerprint);
  }
  assert.equal(ferryMove(base,base.initial,'unknown'),null);assert.equal(ferrySolution(base,{boatSide:4,positions:[]}),null);assert.equal(validFerry({...base,solution:[]},base),false);
});
