import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateRound,remember} from '../../scripts/random-rounds/core.js';
import {foldTask,foldFamily,validFold,foldIdentity,foldHoles,foldReflect} from '../../scripts/random-rounds/origami.js';
const text=await readFile('src/punch-origami/main.js','utf8'),bases=Function(`return ${text.match(/const CLASSIC_LEVELS = (\[[\s\S]*?\n  \]);/)[1]}`)();
for(const [i,base] of bases.entries())test(`origami ${i}: 1000 bounded mirrored patterns and complete finite family cycling`,()=>{
  const family=foldFamily(base),limit=family.length;assert.equal(limit,[8,4,2,1][i]);let recent=[];
  for(let round=0;round<1000;round++){
    const a=generateRound({seed:18,levelId:String(i),round,recent,generate:({rng})=>foldTask(base,rng),validate:a=>validFold(a,base),identify:foldIdentity,enumerate:()=>family,fallback:()=>base});
    if(limit>1)assert(!recent.slice(-(limit-1)).includes(a.fingerprint));recent=remember(recent,a.fingerprint);
    // Independent forward folding of all 16 cells: exactly those landing under the punch are pierced.
    const actual=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++){let x=c+.5,y=r+.5;for(const fold of base.folds){if(fold[0]==='v'){const axis=fold==='v50'?2:1;if(x>axis)x=2*axis-x;}else{const axis=fold==='h50'?2:1;if(y>axis)y=2*axis-y;}}if(x===a.instance.punch.c+.5&&y===a.instance.punch.r+.5)actual.push(`${c},${r}`);}
    assert.deepEqual(foldHoles(a.instance),actual.sort());
  }
});
test('origami rejects impossible punches and unknown folds',()=>{assert(!validFold({...bases[1],punch:{c:3,r:3}},bases[1]));assert.throws(()=>foldReflect({c:0,r:0},'bad'));});
