import test from 'node:test';
import assert from 'node:assert/strict';
import {random} from '../../scripts/random-rounds/core.js';
import {laserTask,laserClassic,validLaser,laserTrace,validLaserMirrors} from '../../scripts/random-rounds/laser.js';
import {CLASSIC_ROOMS} from '../../src/laser-mirrors/classic-rooms.js';
function trace(a,mirrors){
  const queue=[[-1,a.source.y,1,0,'white']],seen=new Set(),hit=new Set();
  for(let i=0;i<queue.length;i++){
    let [x,y,dx,dy,c]=queue[i];for(let n=0;n<200;n++){
      x+=dx;y+=dy;if(x<0||x>7||y<0||y>5)break;const k=[x,y,dx,dy,c].join();if(seen.has(k))break;seen.add(k);
      const t=a.targets.findIndex(t=>t.x===x&&t.y===y);if(t>=0){if(a.targets[t].color==='white'||a.targets[t].color===c)hit.add(t);break;}
      const f=a.fixed.find(f=>f.x===x&&f.y===y);if(f?.type==='wall')break;if(f?.type==='filter'){if(c!=='white'&&c!==f.color)break;c=f.color;}
      if(f?.type==='splitter')queue.push([x,y,...(f.mirror==='/'?[-dy,-dx]:[dy,dx]),c]);
      const m=mirrors[`${x},${y}`];if(m)[dx,dy]=m==='/'?[-dy,-dx]:[dy,dx];
    }
  }return hit.size;
}
for(const [i,raw] of CLASSIC_ROOMS.entries())test(`laser ${i}: 100 legal optical routes, color filters and reproducibility`,()=>{
  const base=laserClassic(raw);assert.ok(validLaser(base,base));
  for(let seed=0;seed<100;seed++){
    const a=laserTask(base,random(seed));assert.deepEqual(a,laserTask(base,random(seed)));assert.ok(validLaser(a,base));assert.equal(trace(a,a.solution),a.targets.length);
    const r=laserTrace(a,a.solution);assert.equal(r.hits.size,a.targets.length);assert.ok(r.beams.every(b=>b.points.every(p=>p.x>=0&&p.x<=8&&p.y>=0&&p.y<=6)));
  }
  assert.equal(validLaser({...base,solution:{'9,9':'/'}},base),false);assert.equal(validLaserMirrors(base,{[`${base.targets[0].x},${base.targets[0].y}`]:'/'}),false);
});
test('white cannot skip a colored crystal filter and incompatible filters block',()=>{
  const a={limit:2,source:{y:1,color:'white'},targets:[{x:7,y:1,color:'red'}],fixed:[]};assert.equal(laserTrace(a,{}).hits.size,0);
  a.fixed=[{x:2,y:1,type:'filter',color:'red'}];assert.equal(laserTrace(a,{}).hits.size,1);
  a.fixed.push({x:3,y:1,type:'filter',color:'blue'});assert.equal(laserTrace(a,{}).hits.size,0);
});
