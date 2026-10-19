import {generateRound} from './random-core.js';

// Each course ships its own model beside this worker; no network services are used.
self.onmessage=async({data})=>{
  try{
    const model=await import('./random-model.js');
    const {base,generator,validator,identity,enumerator,request}=data;
    if(typeof model[generator]!=='function'||typeof model[validator]!=='function')throw new TypeError('Unknown generator');
    const record=generateRound({...request,
      generate:context=>model[generator](base,context.rng,context),
      validate:a=>model[validator](a,base),
      identify:identity?a=>model[identity](a):a=>a,
      enumerate:enumerator?()=>model[enumerator](base):undefined,
      fallback:()=>base,now:()=>performance.now(),budgetMs:1900});
    self.postMessage({record});
  }catch{self.postMessage({error:'generation-failed'});}
};
