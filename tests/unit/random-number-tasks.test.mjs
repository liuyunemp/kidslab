import test from 'node:test';
import assert from 'node:assert/strict';
import {random} from '../../scripts/random-rounds/core.js';
import {rootTask,rootQuestion,validRoot,ratioTask,validRatio,signedTask,validSigned} from '../../scripts/random-rounds/number-tasks.js';
import {zoomTask,zoomFamily,validZoom,zoomQuestion} from '../../scripts/random-rounds/number-tasks.js';
import {studioTask,validStudio} from '../../scripts/random-rounds/number-tasks.js';
import {beatTask,beatFamily,validBeat,beatSolved} from '../../scripts/random-rounds/number-tasks.js';
import {tailorTask,tailorFamily,validTailor,tailorShape,tailorPiece} from '../../scripts/random-rounds/number-tasks.js';
import {saleTask,saleFamily,validSale,salePrices,saleCopy} from '../../scripts/random-rounds/number-tasks.js';
import {droneTask,validDrone,dronePath} from '../../scripts/random-rounds/number-tasks.js';
import {fireflyTask,validFirefly,fireflyGroups,fireflySpeech} from '../../scripts/random-rounds/number-tasks.js';
import {lanternTask,lanternFamily,validLantern} from '../../scripts/random-rounds/number-tasks.js';
import {voxelTask,validVoxel,validVoxels,voxelViews} from '../../scripts/random-rounds/number-tasks.js';

test('voxel: 1000 grounded sculptures per complexity preserve block count, height and exact projections',()=>{
  for(const base of [{kind:'predict',cells:[[0,0,0],[0,1,0],[1,0,0],[1,0,1]]},{kind:'build',cells:[[0,0,0],[0,1,0],[0,2,0],[1,0,0],[2,0,0],[1,0,1]]},{kind:'free',cells:[]}]){
    for(let i=0;i<1000;i++){
      const a=voxelTask(base,random(i));assert.ok(validVoxel(a,base));assert.deepEqual(a,voxelTask(base,random(i)));
      const keys=new Set(a.cells.map(p=>p.join()));for(const [x,y,z]of a.cells){assert.ok([x,y,z].every(n=>n>=0&&n<4));if(y)assert.ok(keys.has([x,y-1,z].join()));}
      const views=voxelViews(a.cells);for(let k=0;k<3;k++)for(let n=0;n<16;n++)assert.equal(views[k][n],a.cells.some(([x,y,z])=>k===0?x===n%4&&y===3-Math.floor(n/4):k===1?x===n%4&&z===Math.floor(n/4):z===n%4&&y===3-Math.floor(n/4)));
      assert.equal(validVoxel({...a,cells:[...a.cells,a.cells[0]]},base),false);
    }
  }
  assert.equal(validVoxels([[0,1,0]]),false);assert.equal(validVoxels([[4,0,0]]),false);
});

test('lantern: 1000 instances of each endpoint rule match explicit placement counts',()=>{
  for(const mode of ['both','neither','ring','cut','stairs']){
    const base={id:mode,skin:mode,mode,min:1,max:20};
    for(let i=0;i<1000;i++){
      const a=lanternTask(base,random(i));assert.ok(validLantern(a,base));assert.deepEqual(a,lanternTask(base,random(i)));
      const count=mode==='cut'?Array.from({length:a.length-1}).length:mode==='stairs'?Array.from({length:a.endFloor-a.startFloor}).length:Array.from({length:a.length/a.gap+1},(_,n)=>n).filter(n=>mode==='both'||mode==='neither'?mode==='both'||n>0&&n<a.intervals:n<a.intervals).length;
      assert.equal(a.answer,count);assert.equal(validLantern({...a,answer:a.answer+1},base),false);
    }
    assert.ok(lanternFamily(base).length<=32);
  }
});

test('fireflies: 1000 samples per numeric range have enough disjoint legal sums',()=>{
  for(const base of [{type:'add',target:5,lights:2,nums:Array(7)},{type:'add',target:10,lights:4,nums:Array(10)},{type:'add',target:12,lights:3,nums:Array(9)},{type:'add',target:20,lights:3,nums:Array(10)},{type:'sub',start:12,result:8,lights:3,nums:Array(8)},{type:'rain',target:10,lights:4,need:4,seconds:32,nums:Array(12)}]){
    for(let i=0;i<1000;i++){
      const a=fireflyTask(base,random(i));assert.ok(validFirefly(a,base));assert.deepEqual(a,fireflyTask(base,random(i)));
      const goal=a.type==='sub'?a.start-a.result:a.target,groups=fireflyGroups(a.nums,goal,a.lights);let used=0;
      for(const mask of groups){assert.equal(mask&used,0);used|=mask;assert.equal(a.nums.reduce((s,n,j)=>s+(mask&(1<<j)?n:0),0),goal);}
      assert.equal(validFirefly({...a,nums:a.nums.map(()=>0)},base),false);
      assert.ok(fireflySpeech(a,'zh').includes('圈'));assert.ok(fireflySpeech(a,'en').includes('Circle'));
      if(a.type==='sub')assert.ok(!fireflySpeech(a,'zh').includes(`多余的 ${goal}`));
    }
  }
});

test('drone: 1000 tasks per lesson, attainable commands, unique scale match and legal six-leg witness',()=>{
  for(const kind of ['locate','wind','route']){
    const base={kind,wind:[0,0]};
    for(let i=0;i<1000;i++){
      const a=droneTask(base,random(i));assert.ok(validDrone(a,base));assert.deepEqual(a,droneTask(base,random(i)));
      if(kind==='route'){
        assert.equal(a.options.filter(v=>v[0]*v[1]===a.km*1000).length,1);
        const path=[[0,0],...a.points.slice(0,6)];for(let j=1;j<path.length;j++)assert.ok(path[j][0]===path[j-1][0]||path[j][1]===path[j-1][1]);
        assert.equal(dronePath(a,[0,0]),false);assert.equal(dronePath(a,[1]),false);
        assert.equal(validDrone({...a,options:[a.options[a.correct],a.options[a.correct],a.options[a.correct]]},base),false);
      }else for(let j=0;j<2;j++)assert.ok(a.target[j]-a.wind[j]>=0&&a.target[j]-a.wind[j]<=9);
    }
  }
});

test('sales: 1000 integer-cent cases per lesson with coherent receipts and all comparison outcomes',()=>{
  for(const [kind,verdict] of [['raise',0],['pair',1],['compare',2]]){
    const base={kind,price:kind==='compare'?36000:8000,threshold:30000,reduction:8000,evidence:0,verdict},outcomes=new Set();
    for(let i=0;i<1000;i++){
      const a=saleTask(base,random(i));assert.ok(validSale(a,base));assert.deepEqual(a,saleTask(base,random(i)));
      const [x,y]=salePrices(a);assert.ok(Number.isInteger(x)&&Number.isInteger(y));
      if(kind==='raise')assert.equal(x,y);
      if(kind==='pair')assert.equal(x*4,y*3);
      if(kind==='compare'){assert.equal(x,a.price-a.reduction);assert.equal(y*4,a.price*3);assert.equal(a.verdict,x<y?0:x===y?1:2);outcomes.add(a.verdict);}
      for(const lang of ['zh','en']){const c=saleCopy({evidence:[['','a'],['','b'],['','c']]},a,lang);assert.equal(c.results[0],String(x/100));assert.equal(c.results[1],String(y/100));assert.ok(c.hintText.includes(String(a.price/100))||kind==='pair');}
      assert.equal(validSale({...a,price:NaN},base),false);
    }
    if(kind==='compare')assert.equal(outcomes.size,3);
    assert.ok(saleFamily(base).length<=32);
  }
});

test('tailor: 1000 samples per shape preserve areas, rigid pieces, final union and integer answers',()=>{
  const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-a.y*b.x;},0)/2);
  for(const kind of ['parallelogram','triangle','trapezoid']){
    const base={id:kind,kind,min:kind==='triangle'?8:10,max:kind==='triangle'?60:kind==='trapezoid'?70:80};
    for(let i=0;i<1000;i++){
      const a=tailorTask(base,random(i));assert.ok(validTailor(a,base));assert.deepEqual(a,tailorTask(base,random(i)));
      const g=tailorShape(a),close=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
      close(area(g.body),a.answer);close(area(g.remain)+area(g.piece),area(g.rect));
      close(area(g.rect),a.answer*(kind==='triangle'?2:1));
      const final=tailorPiece(g,1);final.forEach((p,j)=>{close(p.x,g.target[j].x);close(p.y,g.target[j].y);});
      close(area(tailorPiece(g,.37)),area(g.piece));
      assert.equal(validTailor({...a,answer:a.answer+1},base),false);
    }
    assert.equal(tailorFamily(base).length,12);
  }
});

test('fraction rhythms: 1000 samples of each family, legal open completions and exact sequences',()=>{
  for(const kind of ['fill','equal','sequence']){
    const base={kind},seen=new Set();
    for(let i=0;i<1000;i++){
      const a=beatTask(base,random(i));assert.ok(validBeat(a,base));assert.deepEqual(a,beatTask(base,random(i)));seen.add(JSON.stringify(a));
      const solution=kind==='fill'?[...a.initial,...Array(8-a.initial.reduce((x,y)=>x+y,0)).fill(1)]:kind==='equal'?Array(a.target/a.unit).fill(a.unit):a.sequence;
      assert.ok(beatSolved(a,solution));assert.equal(beatSolved(a,[...solution,1]),false);assert.equal(beatSolved(a,[NaN]),false);
      if(kind==='fill'){assert.ok(beatSolved(a,[4,4]));assert.ok(beatSolved(a,[2,2,2,2]));}
    }
    assert.equal(seen.size,beatFamily(base).length);
  }
  assert.equal(validBeat({kind:'fill',initial:[8]},{kind:'fill'}),false);
});

test('square roots: 1000 samples per kind with independent numeric answers and both languages',()=>{
  for(const kind of ['tile','bounds','simplify','decimal','reverse','explore']){
    const base={kind};const seen=new Set();
    for(let i=0;i<1000;i++){
      const a=rootTask(base,random(i));assert.deepEqual(a,rootTask(base,random(i)));assert.ok(validRoot(a,base));seen.add(a.area);
      if(kind==='explore')continue;
      const v=a.values[a.answer];
      if(kind==='tile')assert.equal(v**2,a.area);
      if(kind==='bounds')assert.ok(v[0]<Math.sqrt(a.area)&&Math.sqrt(a.area)<v[1]&&v[1]-v[0]===1);
      if(kind==='simplify'){assert.equal(v[0]**2*v[1],a.area);for(let d=2;d*d<=v[1];d++)assert.notEqual(v[1]%(d*d),0);}
      if(kind==='decimal')assert.equal((v/100).toFixed(2),Math.sqrt(a.area).toFixed(2));
      if(kind==='reverse')assert.equal(v,a.area);
      for(const lang of ['zh','en']){const q=rootQuestion(a,lang);assert.ok(q.prompt);assert.equal(new Set(q.choices).size,3);}
      assert.equal(validRoot({...a,answer:(a.answer+1)%3},base),false);
    }
    assert.ok(seen.size>=5);
  }
});
test('ratio: 1000 samples per kind, exactly one slip satisfies total and all cross products',()=>{
  for(const kind of ['mix','scale','coins']){
    const base={kind,shares:kind==='coins'?[2,3,5]:[3,2]};
    for(let i=0;i<1000;i++){
      const a=ratioTask(base,random(i));assert.ok(validRatio(a,base));assert.deepEqual(a,ratioTask(base,random(i)));
      const valid=a.options.filter(v=>v.reduce((x,y)=>x+y,0)===a.total&&v.every((n,k)=>n*a.shares[0]===v[0]*a.shares[k]));
      assert.equal(valid.length,1);assert.deepEqual(valid[0],a.options[a.correct]);assert.equal(validRatio({...a,total:0},base),false);
    }
  }
});
test('signed numbers: 1000 samples preserve crossing zero, negative comparison and debt',()=>{
  for(const base of [{mode:'move',skin:'world',min:-10,max:10},{mode:'answer',skin:'temperature',min:-10,max:10},{mode:'answer',skin:'ledger',min:-10,max:10}]){
    for(let i=0;i<1000;i++){
      const a=signedTask(base,random(i));assert.ok(validSigned(a,base));assert.deepEqual(a,signedTask(base,random(i)));
      if(a.skin==='world')assert.ok(a.start<0&&a.target>0&&a.target-a.start<=12);
      if(a.skin==='temperature')assert.equal(Math.max(...a.options),a.target);
      if(a.skin==='ledger'){const spending=a.start-a.target;assert.ok(spending>a.start);assert.equal(a.options[a.correct],a.start-spending);}
      assert.equal(validSigned({...a,target:NaN},base),false);
    }
  }
});
test('unit conversions: 1000 samples per scale use exact integer hundredths',()=>{
  for(const base of [{kind:'integer',from:'km',to:'m',scale:1000,hundredths:300},{kind:'integer',from:'m',to:'cm',scale:100,hundredths:300},{kind:'integer',from:'m',to:'mm',scale:1000,hundredths:300},{kind:'decimal',from:'m',to:'cm',scale:100,hundredths:1}]){
    const seen=new Set();
    for(let i=0;i<1000;i++){
      const a=zoomTask(base,random(i)),q=zoomQuestion(a);assert.ok(validZoom(a,base));assert.deepEqual(a,zoomTask(base,random(i)));
      assert.equal(Number(q[1])*100,a.hundredths*a.scale);assert.equal(new Set(q[2]).size,3);seen.add(a.hundredths);
    }
    assert.equal(seen.size,zoomFamily(base).length);
  }
});
test('studio: 1000 datasets have a unique maximum, exact mean and matching ballot multiset',()=>{
  const base={ids:['rocket','bubble','moon','paws']};
  const seen=new Set();
  for(let i=0;i<1000;i++){
    const a=studioTask(base,random(i));assert.ok(validStudio(a,base));assert.deepEqual(a,studioTask(base,random(i)));
    const counts=base.ids.map(id=>a.votes.filter(v=>v===id).length);assert.deepEqual(counts,a.counts);
    assert.equal(counts.filter(n=>n===Math.max(...counts)).length,1);assert.equal(a.votes.length%4,0);seen.add(counts.join(','));
    assert.equal(validStudio({...a,votes:a.votes.slice(1)},base),false);
  }
  assert.ok(seen.size>10);
});
