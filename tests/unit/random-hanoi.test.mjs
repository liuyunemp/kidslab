import test from 'node:test';
import assert from 'node:assert/strict';
import {random} from '../../scripts/random-rounds/core.js';
import {hanoiClassic,hanoiTask,hanoiSolution,hanoiMove,validHanoi,validHanoiState} from '../../scripts/random-rounds/hanoi.js';
function distances(n){
  const total=3**n,distance=new Int16Array(total).fill(-1),queue=[(total-1)/2,total-1];for(const code of queue)distance[code]=0;
  for(let head=0;head<queue.length;head++){
    const code=queue[head],top=[null,null,null];let digits=code;for(let d=0;d<n;d++){const p=digits%3;digits=Math.floor(digits/3);if(top[p]===null)top[p]=d;}
    for(let from=0;from<3;from++)for(let to=0;to<3;to++)if(from!==to&&top[from]!==null&&(top[to]===null||top[from]<top[to])){
      const next=code+(to-from)*3**top[from];if(distance[next]===-1){distance[next]=distance[code]+1;queue.push(next);}
    }
  }return distance;
}
for(let n=3;n<=8;n++)test(`Hanoi ${n}: 100 states match independent breadth-first optimal distance and legal path`,()=>{
  const base=hanoiClassic(n),lookup=distances(n);assert.equal(base.solution.length,2**n-1);
  for(let seed=0;seed<100;seed++){
    const a=hanoiTask(base,random(seed)),copy=a.pegs.map(p=>[...p]);assert(validHanoi(a,base));assert.deepEqual(a,hanoiTask(base,random(seed)));
    const code=a.pegs.reduce((sum,p,i)=>sum+p.reduce((v,d)=>v+i*3**(d-1),0),0);assert.equal(a.solution.length,lookup[code]);
    for(const [from,to] of a.solution){assert(hanoiMove(copy,from,to));assert(validHanoiState(copy,n));}
    assert(copy[1].length===n||copy[2].length===n);
  }
});
test('Hanoi invalid state and impossible move leave the board unchanged',()=>{
  assert.throws(()=>hanoiSolution([[3,1],[1],[]],3));const state=[[3,2],[1],[]],before=structuredClone(state);
  assert(!hanoiMove(state,0,1));assert(!hanoiMove(state,0,0));assert.deepEqual(state,before);
  assert(hanoiMove(state,1,2));assert(hanoiMove(state,0,1));assert(validHanoiState(state,3));
});
