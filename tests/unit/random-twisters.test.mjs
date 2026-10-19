import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {twistBase,twistTask,validTwist,twistIdentity,twistPath,twistSolved,twistIsSolved,twistInverse,validTwistPlay,applyTwist} from '../../scripts/random-rounds/twisters.js';
import {solveLBL} from '../../src/magic-cube/solver.js';
// Independent Rodrigues rotation at integer right angles, independent permutation replay.
function reference(base,moves){
 const s=twistSolved(base.kind,base.size);
 for(const m of moves)for(let turn=0;turn<m.turns;turn++){
  if(base.kind==='pyramid'){
   s.tipOri[m.vertex]=(s.tipOri[m.vertex]+1)%3;
   if(m.layer){s.cenOri[m.vertex]=(s.cenOri[m.vertex]+1)%3;const cycles=[[0,1,2],[0,3,4],[1,3,5],[2,4,5]],cycle=cycles[m.vertex],old=[...s.edgePerm];for(let i=0;i<3;i++)s.edgePerm[cycle[(i+1)%3]]=old[cycle[i]];}
  }else{
   const a=[0,0,0];a[m.axis]=1;const rotate=v=>[a[1]*v[2]-a[2]*v[1]+a[0]*v[m.axis],a[2]*v[0]-a[0]*v[2]+a[1]*v[m.axis],a[0]*v[1]-a[1]*v[0]+a[2]*v[m.axis]];
   for(const p of s)if(p.c[m.axis]===m.coord){p.c=rotate(p.c);p.st.forEach(t=>t.n=rotate(t.n));}
  }
 }return JSON.parse(JSON.stringify(s));
}
for(const kind of ['cube','pyramid'])for(const size of kind==='cube'?[2,3,4]:[0])for(const diff of [0,1,2])test(`${kind} ${size}/${diff}: 100 independent legal, reversible instances`,()=>{
 const base=twistBase(kind,size,diff);
 for(let seed=0;seed<100;seed++){
  const a=twistTask(base,random(seed));assert.ok(validTwist(a,base));assert.deepEqual(a,twistTask(base,random(seed)));assert.deepEqual(JSON.parse(JSON.stringify(a.start)),reference(base,a.moves));
  assert.ok(twistIsSolved(reference(base,[...a.moves,...a.moves.slice().reverse().map(m=>twistInverse(m,base))]),base));
 }
});
test('twist identity ignores spelling of routes and whole-cube orientation, deduplicates content',()=>{
 const base=twistBase('cube',2,0);let recent=[];
 for(let round=0;round<20;round++){
  const r=generateRound({seed:987,round,levelId:'2-0',recent,generate:({rng})=>twistTask(base,rng),validate:a=>validTwist(a,base),identify:twistIdentity});
  assert.ok(!recent.includes(r.fingerprint));recent=remember(recent,r.fingerprint);
 }
 const a=twistTask(base,random(55)),b=structuredClone(a);
 for(const coord of [-1,1])applyTwist(b.start,{axis:0,coord,turns:1},base);
 assert.deepEqual(twistIdentity(a),twistIdentity(b));
});
test('invalid state, illegal layers, saved corruption and bounded fallback',()=>{
 const base=twistBase('cube',3,0),a=twistTask(base,random(0));
 assert.throws(()=>twistPath(base,[{axis:0,coord:1,turns:1}]));assert.equal(validTwist({...a,start:[]},base),false);
 const play={history:a.moves,userStack:[],state:a.start,moves:0,hints:0,seconds:0,phase:'playing'};assert.ok(validTwistPlay(play,base));assert.equal(validTwistPlay({...play,state:[]},base),false);
 assert.deepEqual(generateRound({seed:1,levelId:'3-0',generate:()=>null,validate:a=>validTwist(a,base),fallback:()=>base}).instance,base);
});
test('cube formula solver route agrees with current model on easy 2x2 and 3x3',()=>{
 for(const size of [2,3]){const base=twistBase('cube',size,0),a=twistTask(base,random(456));const path=solveLBL(a.start,size);assert.ok(path);assert.ok(twistIsSolved(twistPath(base,path,a.start),base));}
});
