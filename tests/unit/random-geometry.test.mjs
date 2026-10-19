import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {random} from '../../scripts/random-rounds/core.js';
import {triangleExperiment,validTriangleExperiment,validTriangle,tangram,validTangram,fence,validFence,fenceSolutions,fenceMetrics} from '../../scripts/random-rounds/geometry.js';
import {TARGETS,resolveSnap} from '../../src/tangram-theater/model.js';
import {rolling,validRolling,rollingSetup,validRollingSetup} from '../../scripts/random-rounds/math.js';
async function arrayFrom(id,name){const src=await readFile(`src/${id}/main.js`,'utf8');return vm.runInNewContext(src.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n  \\]);`))[1]);}
const triangles=await arrayFrom('triangle-lab','BASE_TRIANGLES'),sets=await arrayFrom('triangle-lab','BASE_STICK_SETS');
test('1000 triangle experiments preserve nondegeneracy and all three inequality cases',()=>{
  const bases=[{type:'frame',width:50,height:55},{type:'angles',triangles},{type:'sticks',sets}];
  for(const base of bases)for(let seed=0;seed<1000;seed++){
    const a=triangleExperiment(base,random(seed));assert.ok(validTriangleExperiment(a,base));assert.deepEqual(a,triangleExperiment(base,random(seed)));
    if(a.type==='angles')for(const [p,q,r] of a.triangles){
      const lengths=[Math.hypot(p.x-q.x,p.y-q.y),Math.hypot(q.x-r.x,q.y-r.y),Math.hypot(r.x-p.x,r.y-p.y)];
      const angles=lengths.map((v,i)=>{const b=lengths[(i+1)%3],c=lengths[(i+2)%3];return Math.acos((b*b+c*c-v*v)/(2*b*c));});
      assert.ok(Math.abs(angles.reduce((n,x)=>n+x)-Math.PI)<1e-10);
    }
    if(a.type==='sticks')for(const s of a.sets)assert.equal(s.canBuild,s.lengths.every((n,i)=>n<s.lengths[(i+1)%3]+s.lengths[(i+2)%3]));
  }
  assert.equal(validTriangle([{x:.2,y:.3},{x:.4,y:.3},{x:.6,y:.3}]),false);
});
test('100 tangrams per act preserve pair distances, reflection and a solution for each piece',()=>{
  for(const targets of TARGETS){
    const base={targets,mirror:1,dx:0,dy:0,rotations:Array(7).fill(0)};assert.ok(validTangram(base,base));
    for(let seed=0;seed<100;seed++){
      const a=tangram(base,random(seed));assert.ok(validTangram(a,base));assert.deepEqual(a,tangram(base,random(seed)));
      for(let i=0;i<7;i++){
        const [x,y,rotation,flip]=a.targets[i],p={x:x*700,y:y*450,rotation,flip};assert.ok(resolveSnap(p,p,35).ok);
        for(let j=i+1;j<7;j++)assert.ok(Math.abs(Math.hypot(x-a.targets[j][0],y-a.targets[j][1])-Math.hypot(targets[i][0]-targets[j][0],targets[i][1]-targets[j][1]))<1e-8);
      }
    }
  }
});
const fences=await arrayFrom('hamster-fence','BASE_LEVELS');
test('1000 fences per level have a reachable construction verified by cell boundaries',()=>{
  for(const base of fences){assert.ok(validFence(base,base));for(let seed=0;seed<1000;seed++){
    const a=fence(base,random(seed));assert.ok(validFence(a,base));const s=fenceSolutions(a)[0],cells=new Set();
    for(let x=0;x<s.w;x++)for(let y=0;y<s.h;y++)cells.add(`${x},${y}`);
    if(a.kind==='l')for(let x=s.w;x<s.w+s.ew;x++)for(let y=s.h-s.eh;y<s.h;y++)cells.add(`${x},${y}`);
    let perimeter=0;for(const cell of cells){const [x,y]=cell.split(',').map(Number);for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]])if(!cells.has(`${x+dx},${y+dy}`)&&!(a.kind==='wall'&&y===0&&dy===-1))perimeter++;}
    assert.deepEqual(fenceMetrics(s,a.kind),{area:cells.size,perimeter});
    assert.ok(a.kind==='reverse'?cells.size===a.area&&perimeter<=a.goalPerimeter:cells.size>=a.goal&&perimeter===a.budget);
  }}
});
const wheels=await arrayFrom('rolling-park','BASE_QUESTIONS');
test('1000 wheels per question use positive dimensions and unique reverse choices',()=>{
  for(const base of wheels)for(let seed=0;seed<1000;seed++){
    const a=rolling(base,random(seed));assert.ok(validRolling(a));assert.deepEqual(a,rolling(base,random(seed)));
    if(a.type==='reverse')assert.equal(a.choices.filter(d=>Math.abs(Math.PI*d*a.laps-a.dist)<.051).length,1);
    assert.ok(validRollingSetup(rollingSetup({},random(seed))));
  }
});
