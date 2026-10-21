import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { catalog, ids } from '../../scripts/speech/catalog.mjs';
import { speechPlan } from '../../scripts/speech/model.js';
import { fireflySpeech } from '../../src/number-fireflies/random-model.js';
import { patternSpeech,CATERPILLAR_LEVELS,patternFamily } from '../../src/pattern-caterpillar/random-model.js';
import { shadowSpeech } from '../../src/shadow-theater/random-model.js';

test('all 37 catalogs, recording hashes and shared runtime copies are current',()=>{
  assert.equal(ids.length,37);
  execFileSync(process.execPath,['scripts/speech/generate.mjs','--check'],{stdio:'pipe'});
});
test('every fixed prompt and every dynamic token has matching bilingual recordings',async()=>{
  for(const [id,table] of await catalog()){
    const {manifest}=await import(`../../src/${id}/speech-manifest.js`);
    for(const lang of ['zh','en'])for(const text of table[lang])assert.equal(speechPlan(text,lang,manifest).text,text);
  }
  const fire=(await import('../../src/number-fireflies/speech-manifest.js')).manifest;
  for(const lang of ['zh','en'])for(let a=1;a<=20;a++)for(let b=0;b<=a;b++){
    const text=fireflySpeech({type:'sub',start:a,result:b},lang);
    const plan=speechPlan(text,lang,fire);assert.equal(plan.clips.filter(c=>/^\d+$/.test(c.text)).length,2);
    speechPlan(fireflySpeech({target:a},lang),lang,fire);
  }
  const pattern=(await import('../../src/pattern-caterpillar/speech-manifest.js')).manifest;
  for(const base of CATERPILLAR_LEVELS)for(const a of patternFamily(base))for(const lang of ['zh','en'])speechPlan(patternSpeech(a,a.pattern??a.initial,lang),lang,pattern);
  const shadow=(await import('../../src/shadow-theater/speech-manifest.js')).manifest;
  for(const lang of ['zh','en'])for(const target of ['circle','square','rect','tri','house'])speechPlan(shadowSpeech({target},lang),lang,shadow);
});
