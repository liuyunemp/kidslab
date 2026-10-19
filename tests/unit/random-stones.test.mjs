import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRound,remember} from '../../scripts/random-rounds/core.js';
import {stoneTask,stoneFamily,validStones,stonePit,stoneTake,validStonePlay} from '../../scripts/random-rounds/stones.js';
const bases=[{id:'classic',max:3,misere:false,setup:false,chooser:false,initial:9},{id:'max4',max:4,misere:false,setup:false,chooser:false,initial:17},{id:'misere',max:3,misere:true,setup:false,chooser:false,initial:17},{id:'chooser',max:3,misere:false,setup:false,chooser:true,initial:17},{id:'setup',max:3,misere:false,setup:true,chooser:false,initial:17}];
for(const base of bases)test(`stones ${base.id}: 1000 finite instances, preserved rules and independent game-tree analysis`,()=>{
  let recent=[];const family=stoneFamily(base),window=Math.min(10,family.length-1),winning=[base.misere];
  for(let n=1;n<=29;n++)winning[n]=Array.from({length:Math.min(n,base.max)},(_,i)=>!winning[n-i-1]).some(Boolean);
  for(let n=1;n<=29;n++){assert.equal(!stonePit(n,base),winning[n]);const take=stoneTake(n,base);assert(take>=1&&take<=Math.min(n,base.max));if(winning[n])assert(!winning[n-take]);}
  for(let round=0;round<1000;round++){
    const a=generateRound({seed:4,levelId:base.id,round,recent,generate:({rng})=>stoneTask(base,rng),validate:a=>validStones(a,base),enumerate:()=>family,fallback:()=>base});assert(!recent.slice(-window).includes(a.fingerprint));recent=remember(recent,a.fingerprint);
  }
});
test('stones reject corrupted move history and invalid input',()=>{
  const a=bases[0];assert(!validStones({...a,initial:NaN},a));assert.equal(stoneTake(-1,a),0);
  assert(!validStonePlay({initial:9,stones:3,turn:'fox',over:false,history:[{who:'start',take:0,left:9},{who:'human',take:6,left:3}]},a));
  assert(validStonePlay({initial:9,stones:6,turn:'fox',over:false,history:[{who:'start',take:0,left:9},{who:'human',take:3,left:6}]},a));
});
