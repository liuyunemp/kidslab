import test from 'node:test';
import assert from 'node:assert/strict';
import {random as createRng,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {shadowTask,shadowFamily,shadowAxes,shadowScore,shadowSpeech,validShadow} from '../../scripts/random-rounds/shadows.js';
import {Euler,Vector3} from '../../src/shadow-theater/vendor/three.module.min.js';
const bases=[
  {kind:'make',block:'sphere',target:'circle',pose:'any'},
  {kind:'make',block:'cube',target:'square',pose:'front'},
  {kind:'make',block:'box',target:'rect',pose:'front'},
  {kind:'make',block:'cylinder',target:'circle',pose:'axis'},
  {kind:'make',block:'cylinder',target:'rect',pose:'side'},
  {kind:'make',block:'cone',target:'circle',pose:'axis'},
  {kind:'make',block:'cone',target:'tri',pose:'side'},
  {kind:'make',block:'prism',target:'tri',pose:'front'},
  {kind:'reverse',answer:'cylinder',cards:['circle','rect'],choices:['sphere','cylinder','cone']},
  {kind:'combo',blocks:['cube','cone'],target:'house'},
].map(b=>({...b,scale:1,initial:[.08,.05,0]}));
test('shadow instances: 1000 per lesson, equivalent geometry axes, legal solution and narration',()=>{
  for(const [i,base] of bases.entries())for(let seed=0;seed<1000;seed++){
    const a=shadowTask(base,createRng(seed));assert(validShadow(a,base));assert.deepEqual(a,shadowTask(base,createRng(seed)));
    const rotation=a.kind==='reverse'?a.initial:a.pose==='axis'?[Math.PI/2,0,0]:[0,0,0];
    assert(shadowScore(a,rotation,a.answer??a.block??'cube')>.999999);
    const axes=shadowAxes(a.initial),euler=new Euler(...a.initial);
    for(let k=0;k<3;k++){const vector=new Vector3(Number(k===0),Number(k===1),Number(k===2)).applyEuler(euler).toArray();vector.forEach((n,j)=>assert(Math.abs(n-axes[k][j])<1e-12));}
    for(const lang of ['zh','en'])assert(!shadowSpeech(a,lang).includes('undefined'));
    assert(!validShadow({...a,kind:'unknown'},base));
    if(i!==8)assert(!validShadow({...a,scale:NaN},base));
  }
});
test('shadow shapes accept alternate legal solids and symmetric poses; reject wrong shadows',()=>{
  assert.equal(shadowScore(bases[1],[Math.PI/2,0,0],'cube'),1);
  assert.equal(shadowScore(bases[1],[0,Math.PI/2,0],'box'),1);
  assert.equal(shadowScore(bases[3],[0,0,0],'sphere'),1);
  assert.equal(shadowScore(bases[3],[0,0,0],'cylinder'),0);
  assert.equal(shadowScore(bases[1],[0,0,0],'sphere'),0);
  assert.equal(shadowScore(bases[1],[NaN,0,0],'cube'),0);
});
test('reverse shadow finite family exhausts all three content pairs before cycling',()=>{
  let recent=[];
  for(let round=0;round<9;round++){
    const result=generateRound({seed:42,levelId:'8',round,recent,generate:({rng})=>shadowTask(bases[8],rng),validate:a=>validShadow(a,bases[8]),fallback:()=>bases[8],enumerate:()=>shadowFamily(bases[8])});
    assert(!recent.slice(-2).includes(result.fingerprint));recent=remember(recent,result.fingerprint);
  }
});
