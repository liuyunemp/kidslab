import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {random} from '../../scripts/random-rounds/core.js';
import {arithmetic,validArithmetic,clock,validClock,orchard,validOrchard,grid,validGrid,fraction,validFraction} from '../../scripts/random-rounds/math.js';
import {balance,validBalance,validBalanceState} from '../../scripts/random-rounds/math.js';
import {alien,validAlien} from '../../scripts/random-rounds/math.js';
const configs=[['carry-factory','ROUNDS',arithmetic,validArithmetic],['clock-town','ORDERS',clock,validClock],['orchard-orders','ORDERS',orchard,validOrchard],['grid-tower','LEVELS',grid,validGrid],['balance-circus','LEVELS',balance,validBalance],['alien-farm','MISSIONS',alien,validAlien]];
for(const [id,name,make,valid] of configs){
 const text=await readFile(`src/${id}/main.js`,'utf8');
 const bases=vm.runInNewContext(text.match(new RegExp(`const BASE_${name} = (\\[[\\s\\S]*?\\n  \\]);`))[1]);
 test(`${id}: 1000 samples per level stay valid, reproducible and varied`,()=>{
  for(const base of bases){
   assert.equal(valid(base,base),true,'classic example');const seen=new Set();
   for(let seed=0;seed<1000;seed++){
    const a=make(base,random(seed));assert.equal(valid(a,base),true,JSON.stringify(a));seen.add(JSON.stringify(a));
    assert.deepEqual(a,make(base,random(seed)));
    if(id==='grid-tower'&&!a.division)assert.equal(a.columns.flatMap(x=>a.rows.map(y=>x*y)).reduce((n,v)=>n+v),a.a*a.b);
    if(id==='orchard-orders'&&a.odd)assert.equal(a.example[0]*a.example[1]-a.n,1);
    if(id==='alien-farm'){
      let count=0;for(let x=0;x<=20;x++)for(let y=0;y<=20;y++)if(3*x+4*y===a.target.legs&&(a.target.creatures===null?x+2*y===a.target.eyes:x+y===a.target.creatures))count++;
      assert.equal(count,1);
    }
    if(id==='balance-circus'){
      const state={left:{...a.left},right:{...a.right},steps:[],solved:false};
      for(let i=0;i<6&&!state.solved;i++){
        const op=a.operations.find(op=>op.type==='x'?state.right.x>0:op.type==='constant'?state.left.c>0:state.left.x>1);
        assert.ok(op);
        const amount=op.type==='x'?1:op.amount==='left'?state.left.c:op.amount;
        for(const side of [state.left,state.right]){
          if(op.type==='divide'){side.x/=amount;side.c/=amount;}else side[op.type==='x'?'x':'c']-=amount;
        }
        state.steps.push({type:op.type,amount});state.solved=state.left.x===1&&state.left.c===0&&state.right.x===0;
        assert.ok(validBalanceState(state,a));
      }
      assert.equal(state.right.c,a.answer);assert.ok(state.solved);
      assert.equal(validBalanceState({...state,right:{x:0,c:a.answer+1}},a),false);
    }
   }
   assert.ok(seen.size>1);
  }
 });
}
test('fraction samples have a nonzero denominator and numerator within the whole',()=>{
 for(let i=0;i<1000;i++){const a=fraction({},random(i));assert.ok(validFraction(a));assert.ok(a.num/a.den>0&&a.num/a.den<=1);}
});

import {closet,closetFamily,closetIdentity,validCloset,validClosetPlay,crystal,validCrystal,factorOptions,validFactorPlay,orchardSplitWitness} from '../../scripts/random-rounds/math.js';
import {generateRound,remember} from '../../scripts/random-rounds/core.js';
test('closet: 1000 rounds per level, complete products and finite family exhaustion',()=>{
  const bases=[{mode:'collect',hats:['straw','beret'],tops:['star','rainbow']},{mode:'collect',hats:['party','top','cloud'],tops:['flower','dot']},{mode:'stock',target:12,ordersNeeded:2}];
  for(const base of bases){
    let history=[];const size=closetFamily(base).length;
    for(let i=0;i<1000;i++){
      const r=generateRound({seed:5,levelId:base.mode,round:i,recent:history,generate:({rng})=>closet(base,rng),validate:a=>validCloset(a,base),identify:closetIdentity,enumerate:()=>closetFamily(base)});
      if(i<size)assert.ok(!history.includes(r.fingerprint));
      history=remember(history,r.fingerprint);
      const a=r.instance,p={stockHats:2,stockTops:2,wornHat:null,wornTop:null,discovered:[],foundOrders:[],completed:true};
      if(a.mode==='collect')p.discovered=a.hats.flatMap(h=>a.tops.map(t=>`${h}:${t}`));
      else{for(let h=2;h<=6;h++)for(let t=2;t<=6;t++)if(h*t===a.target)p.foundOrders.push({hats:h,tops:t});p.foundOrders=p.foundOrders.slice(0,2);assert.equal(p.foundOrders.length,2);}
      assert.ok(validClosetPlay(p,a));
    }
  }
});
test('crystal: 1000 samples, factor trees and resonance membership independently checked',()=>{
  for(const base of [{kind:'first',target:12},{kind:'second',target:18},{kind:'wall',numbers:[10,12,14,15,18,21,22,24,27,30]}]){
    assert.ok(validCrystal(base,base));
    for(let seed=0;seed<1000;seed++){
      const a=crystal(base,random(seed));assert.deepEqual(a,crystal(base,random(seed)));assert.ok(validCrystal(a,base));
      if(a.kind==='wall'){assert.equal(a.numbers.filter(n=>Number.isInteger(n/3)).length,7);continue;}
      const s={leaves:[a.target],history:[],solved:false};
      for(let i=0;i<3;i++){
        const index=s.leaves.findIndex(n=>Array.from({length:n-2},(_,i)=>i+2).some(d=>n%d===0));
        if(index<0)break;
        const from=s.leaves[index],pair=factorOptions(from).find(([x,y])=>x>1&&y>1&&x*y===from);assert.ok(pair);
        s.history.push({from,pair});s.leaves.splice(index,1,...pair);
      }
      s.solved=true;assert.equal(s.leaves.reduce((p,n)=>p*n,1),a.target);assert.ok(validFactorPlay(s,a.target));
      assert.equal(validFactorPlay({...s,leaves:[a.target+1]},a.target),false);
    }
  }
});
test('split orchard: 1000 orders fit two disjoint rectangles avoiding every rock',()=>{
  const stones=new Set([18,19,30,31,42,43]);
  for(let i=0;i<1000;i++){
    const a=orchard({split:true,n:36},random(i)),rects=orchardSplitWitness(a.n),used=new Set();
    assert.equal(rects.length,2);
    for(const r of rects)for(let y=r.r0;y<=r.r1;y++)for(let x=r.c0;x<=r.c1;x++){
      assert.ok(x>=0&&x<12&&y>=0&&y<8);const index=y*12+x;assert.ok(!stones.has(index)&&!used.has(index));used.add(index);
    }
    assert.equal(used.size,a.n);
  }
});
