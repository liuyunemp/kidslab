import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,expectedZone} from '../../src/venn-port/model.js';
import {generateRound,remember} from '../../scripts/random-rounds/core.js';
import {vennTask,vennFamily,vennIdentity,validVenn} from '../../scripts/random-rounds/venn.js';
for(const base of LEVELS)test(`Venn ${base.id}: 1000 tasks cover all zones, faithful visible attributes, finite family exhaustion`,()=>{
  assert(validVenn(base,base));let recent=[];
  for(let round=0;round<1000;round++){
    const a=generateRound({seed:14,levelId:base.id,round,recent,generate:({rng})=>vennTask(base,rng),validate:a=>validVenn(a,base),identify:vennIdentity,enumerate:()=>vennFamily(base),fallback:()=>base});
    assert(!recent.slice(-3).includes(a.fingerprint));recent=remember(recent,a.fingerprint);
    const zones=a.instance.ships.map(s=>expectedZone(a.instance,s));assert.equal(new Set(zones).size,4);
    for(const s of a.instance.ships){const [l,r]=a.instance.rules;assert.equal(expectedZone(a.instance,s),s[l]?s[r]?'both':'left':s[r]?'right':'neither');}
  }
});
test('Venn does not count ship order or decorative colors as a new task',()=>{
  const a=vennFamily(LEVELS[0])[0],b=structuredClone(a);b.ships.reverse();b.ships[0].hull='#ffffff';assert.deepEqual(vennIdentity(a),vennIdentity(b));
});
