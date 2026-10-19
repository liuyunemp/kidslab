import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {icecreamTask,validIcecream,icecreamAnswer,icecreamRatio,icecreamOrders,validIcecreamPlay} from '../../scripts/random-rounds/icecream.js';
const bases=[{kind:'lathe',r:3,h:6},{kind:'triple',cups:[{key:'S',r:.85,h:2.15},{key:'M',r:1.1,h:2.7},{key:'L',r:1.35,h:3.25}],control:{r:.8,h:2}},...['equal','cyl','cone'].map(ans=>({kind:'shop',cone:[3,ans==='equal'?6:ans==='cone'?9:3],cyl:[3,2],ans}))];
for(const base of bases)test(`ice cream ${base.kind} ${base.ans??''}: 1000 legal instances; exact ratio and integer comparison`,()=>{
  for(let seed=0;seed<1000;seed++){
    const a=icecreamTask(base,random(seed));assert(validIcecream(a,base));assert.deepEqual(a,icecreamTask(base,random(seed)));
    if(a.kind==='triple')for(const c of a.cups){assert(Math.abs(icecreamRatio(c,c)*3-1)<1e-12);assert(icecreamRatio(a.control,c)*4<1);}
    if(a.kind==='shop'){const cone=a.cone[0]**2*a.cone[1]/3,cyl=a.cyl[0]**2*a.cyl[1];assert.equal(icecreamAnswer(a),cone===cyl?'equal':cone>cyl?'cone':'cyl');}
    assert(!validIcecream({...a,kind:'unknown'},base));
  }
});
test('ice cream finite orders avoid recent content; invalid operation snapshots are rejected',()=>{
  const base=bases[2];let recent=[];
  for(let round=0;round<60;round++){
    const r=generateRound({seed:0,levelId:'shop-0',round,recent,generate:({rng})=>icecreamTask(base,rng),validate:a=>validIcecream(a,base),enumerate:()=>icecreamOrders(base),fallback:()=>base});
    assert(!recent.includes(r.fingerprint));recent=remember(recent,r.fingerprint);
  }
  assert(!validIcecreamPlay({shape:0,r:NaN,h:2,phi:0},'lathe'));
  assert(!validIcecreamPlay({sizeIdx:0,scoops:-1,records:[]},'triple'));
  assert(!validIcecreamPlay({sizeIdx:0,scoops:3,records:[{key:'S',scoops:3},{key:'S',scoops:3}]},'triple'));
});
