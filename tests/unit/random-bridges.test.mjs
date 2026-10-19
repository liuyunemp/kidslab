import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {bridgeTask,validBridges,bridgeRepair,bridgeFamily,bridgeIdentity} from '../../scripts/random-rounds/bridges.js';
import {BRIDGE_BASES} from '../../src/ice-bridges/classic-maps.js';
// Exhaustive independent trail search is tiny: at most eight bridge choices.
function trailExists(a){
  const edges=a.edges.filter(e=>!e.closed);
  function walk(at,used){if(used.size===edges.length)return true;return edges.some((e,i)=>!used.has(i)&&(e.a===at||e.b===at)&&walk(e.a===at?e.b:e.a,new Set([...used,i])));}
  return a.nodes.some(n=>walk(n.id,new Set()));
}
for(const [i,base] of BRIDGE_BASES.entries())test(`bridges ${i}: 100 generated maps preserve parity, connectivity and repair outcomes`,()=>{
  assert.ok(validBridges(base,base));
  for(let seed=0;seed<100;seed++){
    const a=bridgeTask(base,random(seed));assert.deepEqual(a,bridgeTask(base,random(seed)));assert.ok(validBridges(a,base));assert.equal(trailExists(a),i===1);
    if(i!==1)for(const c of ['double','close-one','add-one'])assert.equal(trailExists(bridgeRepair(a,c)),c!=='double');
    for(const n of a.nodes)assert.ok(n.x>=10&&n.x<=90&&n.y>=10&&n.y<=90);
  }
  assert.equal(validBridges({...base,edges:[]},base),false);assert.equal(validBridges({...base,edges:base.edges.map(e=>({...e,a:'bad'}))},base),false);
});
test('twelve meaningful labelled cycles avoid the most recent ten',()=>{
  const base=BRIDGE_BASES[1],family=bridgeFamily(base);assert.equal(family.length,12);let recent=[];
  for(let round=0;round<36;round++){const r=generateRound({seed:3,levelId:'1',round,enumerate:()=>family,validate:a=>validBridges(a,base),identify:bridgeIdentity,recent});assert.ok(!recent.includes(r.fingerprint));recent=remember(recent,r.fingerprint);}
});
