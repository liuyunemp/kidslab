import test from 'node:test';
import assert from 'node:assert/strict';
import {random} from '../../scripts/random-rounds/core.js';
import {aquariumTask,validAquarium,aquariumQuestion,aquariumVolume} from '../../scripts/random-rounds/aquarium.js';
test('aquarium: 1000 tasks per kind, exact attainable volumes, conversions and disjoint composite solids',()=>{
  for(const base of [...['flat','tall','exact'].map(pref=>({kind:'build',pref})),{kind:'displace'},...['toL','toCm','sum'].map(unit=>({kind:'pump',unit})),{kind:'bonus'}]){
    for(let seed=0;seed<1000;seed++){
      const a=aquariumTask(base,random(seed));assert.ok(validAquarium(a,base));assert.deepEqual(a,aquariumTask(base,random(seed)));
      if(a.kind==='build'){
        let found=false;for(let l=1;l<=6;l++)for(let w=1;w<=6;w++)for(let h=1;h<=6;h++)if(l*w*h===a.need&&(a.pref==='flat'?h<=2&&l>=w:a.pref==='tall'?h>=Math.max(l,w):true))found=true;
        assert.ok(found);assert.equal(validAquarium({...a,need:47},base),false);
      }else if(a.kind==='pump'){
        const q=aquariumQuestion(a),expected=a.unit==='toL'?a.ml/1000:a.unit==='sum'?1000*a.liters+a.ml:a.ml;
        assert.equal(Number(q.answer),expected);assert.equal(new Set(q.opts).size,3);assert.equal(q.opts.filter(o=>Number(o)===expected).length,1);
      }else if(a.kind==='bonus'){
        const cubes=new Set();for(let x=0;x<a.left+a.right;x++)for(let y=0;y<(x<a.left?a.low:a.high);y++)for(let z=0;z<a.width;z++)cubes.add([x,y,z].join());assert.equal(cubes.size,aquariumVolume(a));
      }else assert.ok(a.volume>=120&&a.volume<=400&&a.volume%20===0);
    }
  }
});
