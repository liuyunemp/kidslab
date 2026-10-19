import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {golfTask,validGolf,golfGate,golfIdentity,golfText} from '../../scripts/random-rounds/golf.js';
const source=await readFile('src/angle-golf/main.js','utf8');
const bases=Function(`return ${source.match(/const CLASSIC_HOLES = (\[[\s\S]*?\n  \]);/)[1]}`)();
for(const [level,base] of bases.entries())test(`golf ${level}: 1000 instances preserve angle, gates, reflection count, bounds and recent-content exclusion`,()=>{
  assert(validGolf(base,base));let recent=[];
  for(let seed=0;seed<1000;seed++){
    const r=generateRound({seed,levelId:String(level),round:seed,recent,generate:({rng})=>golfTask(base,rng),validate:a=>validGolf(a,base),identify:golfIdentity,fallback:()=>base});
    const a=r.instance;assert(!recent.includes(r.fingerprint));recent=remember(recent,r.fingerprint);assert(validGolf(a,base));
    const points=a.path;assert.equal(Math.round(Math.atan2(points[0].y-points[1].y,points[1].x-points[0].x)*180/Math.PI),a.answer);
    if(level===2){for(let i=1;i<4;i++){const p=points[i],inSlope=(p.y-points[i-1].y)/(p.x-points[i-1].x),outSlope=(points[i+1].y-p.y)/(points[i+1].x-p.x);assert(Math.abs(inSlope+outSlope)<1e-9);}assert.equal(points.length-2,3);}
    if(level===1){const [p,q]=golfGate(a);assert(Math.abs((p.x+q.x)/2-(a.tee.x+a.cup.x)/2)<1e-9);assert(Math.abs((p.x-q.x)*(a.cup.x-a.tee.x)+(p.y-q.y)*(a.cup.y-a.tee.y))<1e-8);}
    assert.deepEqual(golfTask(base,random(seed)),golfTask(base,random(seed)));assert(!validGolf({...a,answer:NaN},base));
    if(level===2)assert(golfText('bankSuccess',a,'en').includes(`${90-a.answer}°`));
  }
});
