import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRound,remember} from '../../scripts/random-rounds/core.js';
import {coloringClassic,coloringTask,validColoring,coloringIdentity,polygonArea,shareBorder} from '../../scripts/random-rounds/coloring.js';
import {CLASSIC_MAPS} from '../../src/four-color-kingdom/classic-maps.js';
function intersection(p,q){
  let out=p;
  for(let i=0;i<q.length;i++){
    const a=q[i],b=q[(i+1)%q.length],signed=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),next=[];
    for(let j=0;j<out.length;j++){const x=out[j],y=out[(j+1)%out.length],dx=signed(x),dy=signed(y);if(dx>=0)next.push(x);if(dx*dy<0){const t=dx/(dx-dy);next.push([x[0]+t*(y[0]-x[0]),x[1]+t*(y[1]-x[1])]);}}
    out=next;
  }return out;
}
for(const [i,raw] of CLASSIC_MAPS.entries())test(`coloring ${i}: 100 planar maps, valid fixed-color solution, no overlap and meaningful graph history`,()=>{
  const base=coloringClassic(raw);assert.ok(validColoring(base,base));let recent=[];
  for(let seed=0;seed<100;seed++){
    const args={seed,levelId:base.id,generate:({rng})=>coloringTask(base,rng),validate:a=>validColoring(a,base),identify:coloringIdentity,fallback:()=>base,recent};
    const r=generateRound(args),a=r.instance;assert.deepEqual(r,generateRound(args));assert.equal(a.kind,'voronoi');assert.ok(validColoring(a,base));
    for(const region of a.regions){assert.ok(region.polygon.every(p=>p.every(n=>n>=8-1e-6&&n<=92+1e-6)));for(const n of region.neighbors)assert.notEqual(a.solution[n],a.solution[region.id]);}
    for(let j=0;j<a.regions.length;j++)for(let k=j+1;k<a.regions.length;k++)assert.ok(polygonArea(intersection(a.regions[j].polygon,a.regions[k].polygon))<1e-6);
    assert.ok(new Set(Object.values(a.solution)).size<=base.budget);assert.ok(Object.entries(a.fixed).every(([k,v])=>a.solution[k]===v));
    if(i>0)assert.ok(!recent.includes(r.fingerprint));recent=remember(recent,r.fingerprint);
  }
  assert.equal(validColoring({...base,solution:null},base),false);
});
test('only positive-length borders count; corner touches do not',()=>{
  const box=[[0,0],[1,0],[1,1],[0,1]];assert.equal(shareBorder(box,[[1,1],[2,1],[2,2],[1,2]]),false);assert.equal(shareBorder(box,[[1,0],[2,0],[2,1],[1,1]]),true);
});
