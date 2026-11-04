import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {courses,journey} from '../g1b-journeys.mjs';
import {initialState,reduce,restore,serialize,mergeSaved,valueOf,moneyValue,columnValues,validTrace,sentenceFor,speechText} from '../../src/g1b-character-lab/exploration-model.js';
test('存档损坏或跨版本时保留已完成发现，不再整档清零',()=>{
  const c=courses.find(c=>c.kind==='character');
  const done=[c.activities[0].id,c.activities[3].id];
  const salvage=restore(c,{version:2,courseId:c.id,done,log:[{type:'not-an-action'}]});
  assert.deepEqual(salvage.done,done);
  assert.equal(salvage.recovered,true);
  assert.deepEqual(restore(c,{version:9,courseId:c.id,done}).done,done);
  // 别的课件的存档仍然不认，不能把进度记错到本课
  assert.equal(restore(c,{version:2,courseId:'someone-else',done}).done.length,0);
});
test('多标签存档合并：done 求并集，采用较新的那份快照',()=>{
  const c=courses[0];
  const older={version:2,courseId:c.id,done:[c.activities[0].id],log:[],savedAt:1};
  const newer={version:2,courseId:c.id,done:[c.activities[1].id],log:[{type:'select',index:1}],savedAt:2};
  const merged=mergeSaved(c,older,newer);
  assert.deepEqual(new Set(merged.done),new Set([c.activities[0].id,c.activities[1].id]));
  assert.equal(merged.savedAt,2);
  assert.equal(merged.log.length,1);
  assert.equal(mergeSaved(c,null,newer),newer);
  assert.equal(mergeSaved(c,{...older,courseId:'someone-else'},newer),newer);
});
test('课件存档写入先合并再落盘，写失败留待下次重试',async()=>{
  const src=await readFile('src/g1b-character-lab/main.js','utf8');
  assert.match(src,/localStorage\.setItem\(key,JSON\.stringify\(mergeSaved\(course,stored,serialize\(state\)\)\)\)/);
  assert.match(src,/function flushSave/);
  assert.match(src,/addEventListener\('pagehide',flushSave\)/);
  // 不允许再出现绕过合并、失败即丢的旧写法
  assert.doesNotMatch(src,/localStorage\.setItem\(key,JSON\.stringify\(serialize\(state\)\)\)/);
});
test('a replayed exploration reports a fresh completion without duplicating saved achievements',()=>{
 const c=courses.find(c=>c.kind==='character');let s=initialState(c);
 const play=()=>{let last;for(const action of journey(c,c.activities[0])){last=reduce(c,s,action);s=last.state;}return last;};
 assert.equal(play().loopCompleted,true);assert.equal(s.done.length,1);
 s=restore(c,serialize(s));assert.equal(s.rooms[0].finished,true);
 const again=reduce(c,s,{type:'assemble',index:0});assert.equal(Boolean(again.loopCompleted),false);
 s=reduce(c,s,{type:'reset'}).state;s=restore(c,serialize(s));
 const second=play();assert.equal(second.loopCompleted,true);assert.equal(second.discovered,false);assert.equal(s.done.length,1);
});
for(const c of courses){
 test(`${c.id}: eight selectable discoveries, undo, reset, replay and independent save`,()=>{
  let s=initialState(c);assert.equal(new Set(c.activities.map(a=>a.id)).size,8);
  for(let i=7;i>=0;i--){s=reduce(c,s,{type:'select',index:i}).state;const a=c.activities[i];
   const rejected=reduce(c,s,{type:'not-an-action'});assert.equal(rejected.ok,false);assert.equal(rejected.state,s);
   for(let action of journey(c,a)){
    if(action.type==='shift'){const p=s.rooms[i].positions[action.index];action={type:'position',index:action.index,x:p.x+.5,z:p.z-1};}
    const before=structuredClone(s),r=reduce(c,s,action);assert.equal(r.ok,true,`${a.id}: ${JSON.stringify(action)} / ${r.reason}`);assert.deepEqual(s,before,'reducer does not mutate');s=r.state;
    const undo=reduce(c,s,{type:'undo'});assert.deepEqual(undo.state.rooms[i],before.rooms[i]);
    if(c.kind==='money')assert.equal(moneyValue(s.rooms[i].wallet)+moneyValue(s.rooms[i].tray)+s.rooms[i].spent,a.budget);
   }
   assert.equal(s.done.length,8-i,a.id);s=restore(c,JSON.parse(JSON.stringify(serialize(s))));assert.equal(s.done.length,8-i,'reload');
   s=reduce(c,s,{type:'reset'}).state;assert.equal(s.done.length,8-i,'reset never awards or removes discoveries');
  }
  assert.equal(reduce(c,s,{type:'select',index:8}).ok,false);
  /* 未知版本的旧存档不再整档丢弃：只信本课合法的已完成发现 */
  assert.deepEqual(new Set(restore(c,{version:1,done:s.done}).done),new Set(s.done));
  /* 日志中间出现非法动作时停在最后一个合法状态，已完成发现保留 */
  assert.deepEqual(new Set(restore(c,{...serialize(s),log:[{type:'operate'},null]}).done),new Set(s.done));
  let free=reduce(c,initialState(c),{type:'free',value:true}).state;
  for(const action of journey(c,c.activities[0])){if(action.type!=='shift')free=reduce(c,free,action).state;}
  assert.equal(free.done.length,0);
 });
 test(`${c.id}: local model is synchronized and prompt never reads computed output`,async()=>{
  assert.equal(await readFile(`src/${c.id}/exploration-model.js`,'utf8'),await readFile('src/g1b-character-lab/exploration-model.js','utf8'));
  const s=initialState(c);s.rooms[0].entry='SECRET';s.rooms[0].line=4;s.rooms[0].ones=987654;
  assert.doesNotMatch(speechText(c,s),/SECRET|987654/);
 });
}
test('0–100 arithmetic: regrouping identity, every legal pair, invalid rejection',()=>{
 for(let a=0;a<=100;a++)for(let b=0;b<=100;b++)for(const op of ['+','-']){
  const expected=op==='+'?a+b:a-b,values=columnValues(a,b,op);
  if(expected<0||expected>100){assert.equal(values,null);continue;}assert.equal(values.result,expected);assert.equal(values.tens*10+values.ones,a);
 }
 for(const bad of [-1,101,1.1,NaN,Infinity,'10'])assert.equal(columnValues(bad,1,'+'),null);
});
test('count exchanges conserve value and boundaries recover',()=>{
 const c=courses.find(c=>c.kind==='count');let s=reduce(c,initialState(c),{type:'free',value:true}).state;
 for(const n of [0,9,10,99,100]){
  s=reduce(c,s,{type:'setup',a:n,b:0}).state;
  if(n>=10){s=reduce(c,s,{type:'unbundle'}).state;assert.equal(valueOf(s.rooms[0]),n);s=reduce(c,s,{type:'bundle'}).state;assert.equal(valueOf(s.rooms[0]),n);}
  if(n===0||n===100)assert.equal(reduce(c,s,{type:'step',delta:n===0?-1:1}).ok,false);
 }
});
test('money invalid purchase is atomic; exchanging, refunding and buying conserve integer fen',()=>{
 const c=courses.find(c=>c.kind==='money');let s=reduce(c,initialState(c),{type:'select',index:2}).state;
 assert.equal(reduce(c,s,{type:'buy'}).ok,false);
 const coin=Number(Object.keys(s.rooms[2].wallet).find(v=>s.rooms[2].wallet[v]));
 const pay=reduce(c,s,{type:'coin',coin}).state;assert.deepEqual(reduce(c,pay,{type:'coin',coin,back:true}).state.rooms[2],s.rooms[2]);
 assert.equal(reduce(c,s,{type:'coin',coin:.1}).ok,false);
});
test('dictionary has real unique page indices, canonical syllables and case map',()=>{
 const c=courses.find(c=>c.kind==='dictionary');const es=c.activities[0].entries;
 assert.equal(new Set(es.map(e=>e.page)).size,es.length);assert.deepEqual(es.map(e=>e.page),es.map((_,i)=>i+1));
 for(const e of es)assert.equal(e.initial,e.syllable[0].toUpperCase());
 let s=initialState(c);assert.equal(reduce(c,s,{type:'entry',value:'母'}).ok,false);assert.equal(reduce(c,s,{type:'initial',value:'?'}).ok,false);
});
test('trace rejects wrong direction, short cuts and invalid points; permits slower paths',()=>{
 const path=[[20,20],[80,20],[80,80]],good=[[20,20],[50,20],[80,20],[80,50],[80,80]];
 assert.equal(validTrace(path,good),true);assert.equal(validTrace(path,good.toReversed()),false);assert.equal(validTrace(path,[[20,20],[50,50],[80,80]]),false);assert.equal(validTrace(path,[[NaN,20],[80,20],[80,80]]),false);
});
test('multiple sensible sentences and punctuation can play without a single answer key',()=>{
 const c=courses.find(c=>c.kind==='sentence'),a=c.activities[1];const outputs=new Set();
 for(const x of [0,1])for(const y of [0,1])for(const z of [0,1])outputs.add(sentenceFor(a,{slots:[x,y,z],punctuation:'。'}));assert.equal(outputs.size,8);
 assert.equal(sentenceFor(a,{slots:[0,0,0],punctuation:'？'}),'小公鸡在草地上玩耍吗？');
});
test('subtracting one at a time and removing a batch produce the same remainder',()=>{
 const c=courses.find(c=>c.kind==='subtract');let s=initialState(c);const a=c.activities[0];
 for(let i=0;i<a.b;i++){if(!s.rooms[0].ones)s=reduce(c,s,{type:'unbundle'}).state;s=reduce(c,s,{type:'takeOne'}).state;assert.equal(valueOf(s.rooms[0]),a.a-i-1);}
 assert.equal(s.done.length,1);assert.equal(reduce(c,s,{type:'takeOne'}).ok,false);
});
test('increase, decrease, comparison and part relationships have distinct actions',()=>{
 const c=courses.find(c=>c.kind==='quantity');
 for(let i=0;i<8;i++){let s=reduce(c,initialState(c),{type:'select',index:i}).state,a=c.activities[i];
  if(a.relation==='part'){s=reduce(c,s,{type:'transfer',delta:1}).state;assert.equal(s.rooms[i].a+s.rooms[i].b,a.a+a.b);}
  else if(a.relation==='compare'){s=reduce(c,s,{type:'step',side:'a',delta:1}).state;assert.equal(s.rooms[i].b,a.b);}
  else{s=reduce(c,s,{type:'operate'}).state;assert.equal(s.rooms[i].phase,1);assert.equal(reduce(c,s,{type:'operate'}).ok,false);}
 }
});
