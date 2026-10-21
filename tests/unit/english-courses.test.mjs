import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {courses,UI,factsFor} from '../../scripts/english/courses.mjs';
import {initialState,reduce,restore,serialize,compatible,practisedCount} from '../../scripts/english/english-model.js';
import {speechPlan} from '../../scripts/speech/model.js';
import {validateFactsDocument} from '../../scripts/facts.mjs';
const step=(c,s,a)=>{const r=reduce(c,s,a);assert.equal(r.changed,true,JSON.stringify(a));return r.state;};
function prepare(c,s){while(s.phase==='learn')s=step(c,s,{type:'learn-next'});if(s.phase==='answer'&&!s.question.started)s=step(c,s,{type:'audio-start',questionId:s.question.id});return s;}
function solve(c,s,end='roundDone'){
  for(let i=0;i<200&&s.phase!==end;i++){
    s=prepare(c,s);
    if(s.phase===end)break;
    s=step(c,s,s.phase==='answer'?{type:'answer',questionId:s.question.id,id:s.question.target}:{type:'next'});
  }
  assert.equal(s.phase,end);return s;
}
test('six expandable catalogs total 100 reviewed, illustrated vocabulary entries',()=>{
  assert.deepEqual(courses.map(c=>c.items.length),[11,16,20,21,16,16]);
  assert.equal(courses.reduce((n,c)=>n+c.items.length,0),100);
  for(const c of courses){assert.deepEqual(validateFactsDocument(c.id,factsFor(c)),[]);assert.equal(new Set(c.items.map(w=>w.id)).size,c.items.length);assert.equal(c.category,'english');assert.deepEqual(c.grades,['g1','g2','g3']);for(const w of c.items){assert.ok(w.visual&&w.audio&&w.zh&&w.sentence);assert.equal(w.audio,w.en);for(const other of w.excludes)assert.ok(c.items.find(v=>v.id===other)?.excludes.includes(w.id));}}
  const school=courses.find(c=>c.kind==='school');assert.equal(school.items.find(w=>w.id==='scissors').sentence,'I have a pair of scissors.');assert.equal(school.items.find(w=>w.id==='paper').sentence,'I have some paper.');
  assert.equal(courses.find(c=>c.kind==='number').items[0].value,0);
});
for(const c of courses){
  test(`${c.id}: seeded batches, questions and full bank coverage`,()=>{
    for(let seed=1;seed<=16;seed++){
      let s=initialState(c,seed);assert.deepEqual(s,initialState(c,seed));
      for(let round=0;round<4;round++){
        assert.equal(new Set(s.batch).size,8);const batch=[...s.batch];
        s=solve(c,s);assert.deepEqual(s.batch,batch);assert.equal(s.completed,true);
        const restored=restore(c,JSON.stringify(serialize(s)));assert.deepEqual(restored,s);
        if(round<3)s=step(c,s,{type:'new-round'});
      }
      assert.equal(practisedCount(s),c.items.length);
    }
  });
  test(`${c.id}: each level covers eight targets with unique non-overlapping answers`,()=>{
    let s=initialState(c,81);const seen=Array.from({length:4},()=>new Set()),kinds={listen:0,read:0,picture:0};
    while(s.phase!=='roundDone'){
      s=prepare(c,s);
      if(s.phase==='answer'){
        const q=s.question;seen[s.level].add(q.target);assert.equal(q.options.length,[2,3,4,4][s.level]);assert.equal(new Set(q.options).size,q.options.length);assert.equal(q.options.filter(id=>id===q.target).length,1);for(const id of q.options){assert.ok(s.batch.slice(0,s.introduced).includes(id));assert.ok(id===q.target||compatible(c,q.target,id));}if(s.level===3)kinds[q.mode]++;
        s=step(c,s,{type:'answer',questionId:q.id,id:q.target});
      }else if(s.phase!=='roundDone')s=step(c,s,{type:'next'});
    }
    assert.deepEqual(seen.map(x=>x.size),[8,8,8,8]);assert.deepEqual(Object.values(kinds).sort(),[2,3,3]);
  });
  test(`${c.id}: current words and each dynamic prompt have local MP3s`,async()=>{
    const {manifest}=await import(`../../src/${c.id}/speech-manifest.js`);
    for(const w of c.items){assert.equal(speechPlan(w.en,'en',manifest).text,w.en);assert.equal(speechPlan(w.sentence,'en',manifest).text,w.sentence);}
    for(const lang of ['zh','en'])speechPlan(c.hint[lang],lang,manifest);
    for(const file of ['english-model.js','engine.js','vocabulary-objects.js','scene.js','style.css'])assert.equal((await readFile(new URL(`../../src/${c.id}/${file}`,import.meta.url),'utf8')).replaceAll('\r\n','\n'),(await readFile(new URL(`../../scripts/english/${file}`,import.meta.url),'utf8')).replaceAll('\r\n','\n'));
    assert.equal((await readFile(new URL(`../../src/${c.id}/facts.md`,import.meta.url),'utf8')).replaceAll('\r\n','\n'),factsFor(c));
  });
}
const c=courses[1];
test('learning is untimed; listening waits for sound, then wrong answers retain the clock',()=>{
  let s=initialState(c,1);assert.equal(reduce(c,s,{type:'tick',elapsedMs:50000}).changed,false);
  while(s.phase==='learn')s=step(c,s,{type:'learn-next'});
  assert.equal(s.question.started,false);assert.equal(reduce(c,s,{type:'answer',id:s.question.target,questionId:s.question.id}).changed,false);
  assert.equal(reduce(c,s,{type:'tick',questionId:s.question.id,elapsedMs:20000}).changed,false);
  s=prepare(c,s);const q=s.question;
  s=step(c,s,{type:'tick',questionId:q.id,elapsedMs:3200});
  s=step(c,s,{type:'answer',questionId:q.id,id:q.options.find(id=>id!==q.target)});assert.equal(s.lives,2);assert.equal(s.remainingMs,16800);assert.equal(s.review.length,1);
  assert.equal(reduce(c,s,{type:'answer',questionId:q.id,id:s.question.wrong[0]}).changed,false);
  s=step(c,s,{type:'answer',questionId:q.id,id:q.target});assert.equal(s.phase,'feedback');assert.equal(s.baseIndex,1);
  assert.equal(reduce(c,s,{type:'answer',questionId:q.id,id:q.target}).changed,false);
  s=solve(c,s,'levelDone');assert.equal(s.review.length,0);assert.equal(s.lives,2);
});
test('three timeouts fail; retry keeps the batch and level, resets hearts and reorders',()=>{
  let s=prepare(c,initialState(c,7));const batch=[...s.batch],order=serialize(s.order);
  for(let i=0;i<3;i++){s=prepare(c,s);s=step(c,s,{type:'tick',questionId:s.question.id,elapsedMs:20001});if(i<2)s=step(c,s,{type:'next'});}
  assert.equal(s.phase,'failed');assert.equal(s.lives,0);assert.equal(s.roundMisses.length,3);
  s=step(c,s,{type:'retry'});assert.deepEqual(s.batch,batch);assert.equal(s.level,0);assert.equal(s.lives,3);assert.notDeepEqual(s.order,order);assert.equal(s.roundMisses.length,3);
});
test('audio failure, fallback, pauses, stale callbacks and reload never grant time or hearts',()=>{
  let s=prepare(c,initialState(c,19));const id=s.question.id;
  s=step(c,s,{type:'tick',questionId:id,elapsedMs:7000});s=step(c,s,{type:'audio-error',questionId:id});
  assert.equal(reduce(c,s,{type:'tick',questionId:id,elapsedMs:20000}).changed,false);
  s=step(c,s,{type:'fallback'});assert.equal(s.question.mode,'read');assert.equal(s.fallbacks,1);assert.equal(s.remainingMs,13000);
  s=step(c,s,{type:'pause'});assert.equal(reduce(c,s,{type:'answer',questionId:id,id:s.question.target}).changed,false);assert.deepEqual(restore(c,serialize(s)),s);
  s=step(c,s,{type:'resume'});assert.equal(s.remainingMs,13000);assert.equal(reduce(c,s,{type:'audio-start',questionId:id+1}).changed,false);
  s=step(c,s,{type:'answer',questionId:id,id:s.question.target});s=step(c,s,{type:'next'});assert.equal(reduce(c,s,{type:'tick',questionId:id,elapsedMs:20000}).changed,false);
});
test('a missed review answer stays queued and clean four-level replay clears cross-round weakness',()=>{
  let s=prepare(c,initialState(c,11));const target=s.question.target;
  s=step(c,s,{type:'answer',questionId:s.question.id,id:s.question.options.find(id=>id!==target)});s=solve(c,s);
  assert.equal(s.records[target].weak,true);const oldRound=s.round;s=step(c,s,{type:'new-round'});assert.ok(s.batch.includes(target));assert.ok(s.batch.filter(id=>!s.records[id]).length>=6);
  s=solve(c,s);assert.equal(s.records[target].weak,false);assert.equal(s.records[target].lastRound,oldRound+1);
});
test('invalid and legacy saves reset without carrying over free-play completion',()=>{
  const base=initialState(c,1);for(const raw of ['{',null,{version:1,completed:true},{...base,lives:99},{...base,seed:0},{...base,batch:Array(8).fill('apple')},{...base,records:{bad:{practised:true}}}])assert.deepEqual(restore(c,raw),base);
  let s=prepare(c,base);for(const a of [null,{type:'answer',id:'missing',questionId:s.question.id},{type:'tick',questionId:s.question.id,elapsedMs:-1},{type:'tick',questionId:s.question.id,elapsedMs:NaN},{type:'new-round'},{type:'retry'},{type:'paint'}])assert.equal(reduce(c,s,a).changed,false);
});
