import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {huarongTask,validHuarong,huarongIdentity,huarongPath,huarongFamily} from '../../scripts/random-rounds/huarong.js';
import {CLASSIC_ROUNDS} from '../../src/huarong-dao/classic-rounds.js';
import {solvePuzzle,isSolved,validateState} from '../../src/huarong-dao/puzzle.js';
for(const base of Object.values(CLASSIC_ROUNDS))test(`huarong ${base.id}: 100 reachable layouts, exact unit-step difficulty`,()=>{
  for(let seed=0;seed<100;seed++){
    const a=huarongTask(base,random(seed));assert.deepEqual(a,huarongTask(base,random(seed)));assert.ok(validHuarong(a,base));assert.ok(validateState(a.start));
    assert.equal(solvePuzzle(a.start,{maxNodes:120000}).length,a.solution.length);assert.ok(isSolved(huarongPath(a.start,a.solution)));
  }
});
test('huarong recent content, finite practice, invalid moves and fallback',()=>{
  const base=CLASSIC_ROUNDS.practice;let recent=[];
  for(let round=0;round<35;round++){
    const r=generateRound({seed:23,levelId:'practice',round,recent,generate:({rng})=>huarongTask(base,rng),validate:a=>validHuarong(a,base),identify:huarongIdentity,enumerate:()=>huarongFamily(base)});
    assert.ok(!recent.includes(r.fingerprint));recent=remember(recent,r.fingerprint);
  }
  assert.equal(huarongPath(base.start,[{piece:20,dx:1,dy:0}]),null);
  assert.equal(validHuarong({...base,start:Array(20).fill(0)},base),false);
  assert.deepEqual(generateRound({seed:0,levelId:'practice',generate:()=>null,validate:a=>validHuarong(a,base),fallback:()=>base}).instance,base);
});
