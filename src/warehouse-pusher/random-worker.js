import * as model from './model.js';
import {verifiedLevel} from './session.js';
import {fingerprint,seedFrom} from './model-utils.js';
import {generateRound} from './random-core.js';
self.onmessage=({data})=>{
  try{
    if(data.type==='hint'){self.postMessage({record:{action:model.hint(data.level,data.state)}});return;}
    const generated=generateRound({seed:data.seed,levelId:String(data.index),recent:data.recent,generate:({rng})=>{const seed=rng.int(0,0xffffffff);return {seed,level:verifiedLevel(model,data.index,seed)};},validate:r=>Number.isInteger(r.seed)&&r.level.index===data.index,identify:r=>r.level,fallback:()=>({seed:0,level:verifiedLevel(model,data.index,0)})});
    self.postMessage({record:generated.instance});
  }catch{self.postMessage({error:true});}
};
