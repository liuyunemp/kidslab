import test from 'node:test';
import assert from 'node:assert/strict';
import {random} from '../../scripts/random-rounds/core.js';
import {inkTask,validInk,inkDetails,inkVerdict} from '../../scripts/random-rounds/symmetry.js';
test('ink: 1000 instances per mode preserve canvas bounds, reflection distances and one asymmetric monster',()=>{
  for(const kind of ['hatch','mirror','detective'])for(let seed=0;seed<1000;seed++){
    const a=inkTask({kind},random(seed));assert.ok(validInk(a,{kind}));assert.deepEqual(a,inkTask({kind},random(seed)));
    if(kind==='hatch')for(const p of a.positions)assert.ok(p.x>80&&p.x<445&&p.y>55&&p.y<415);
    if(kind==='mirror')for(const r of a.rounds){const left=450-r.distance;assert.equal(a.options.filter(d=>450+d===900-left).length,1);assert.equal(450+a.options[r.correct],900-left);}
    if(kind==='detective'){
      const wrong=[];for(let i=0;i<3;i++){const details=inkDetails(a,i),pairs=new Set(details.map(p=>p.join()));if(details.some(([x,y,k])=>!pairs.has([-x,y,k].join())))wrong.push(i);}
      assert.deepEqual(wrong,[a.impostor]);assert.ok(inkVerdict(a,'zh').includes(String(a.impostor+1)));assert.ok(inkVerdict(a,'en').includes(a.spot.x<0?'left':'right'));
      assert.equal(validInk({...a,spot:{x:0,y:0}},{kind}),false);
    }
  }
});
