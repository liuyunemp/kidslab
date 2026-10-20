import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { speechPlan, feedbackText, shouldEncourage } from '../../scripts/speech/model.js';

const sdk = await readFile(new URL('../../scripts/sdk/core.js',import.meta.url),'utf8');
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
function browser({missingContext=false,fetcher,storage=new Map(),synth}={}) {
  const events=[],sources=[],requests=[],listeners={};
  let resumes=0;
  class Context {
    constructor(){this.state='suspended';this.currentTime=0;}
    resume(){resumes++;this.state='running';return Promise.resolve();}
    decodeAudioData(){return Promise.resolve({duration:.05});}
    createBufferSource(){const source={connect(){},disconnect(){},start(at){source.timer=setTimeout(()=>source.onended?.(),(at+.05)*1000);},stop(){clearTimeout(source.timer);}};sources.push(source);return source;}
  }
  const win={AudioContext:missingContext?undefined:Context,addEventListener:(n,fn)=>{listeners[n]=fn;},dispatchEvent:e=>events.push(e.detail)};
  if(synth){win.speechSynthesis=synth;win.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};}
  const document={hidden:false,documentElement:{style:{},dataset:{}},addEventListener:(n,fn)=>{listeners[n]=fn;}};
  const context={window:win,document,location:{pathname:'/courseware/demo/'},navigator:{language:'zh-CN'},matchMedia:()=>({matches:false}),localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},setTimeout,clearTimeout,AbortController,fetch:(url,options)=>{requests.push(url);return fetcher?fetcher(url,options):Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(1))});}};
  vm.runInNewContext(sdk,context);
  return {speech:win.cool.speech,cool:win.cool,events,sources,requests,storage,listeners,document,get resumes(){return resumes;}};
}
const plan={text:'你好',lang:'zh',clips:[{src:'./audio/speech/abc.mp3',pauseAfter:0}]};
test('local narration works without speechSynthesis, unlocks immediately, reports actual start and end',async()=>{
  const b=browser();let started=0,ended=0;
  b.speech.play(plan,{onStart:()=>started++,onEnd:()=>ended++});
  assert.equal(b.resumes,1);assert.equal(started,0);
  await pause(130);assert.equal(started,1);assert.equal(ended,1);
  assert.deepEqual(b.events.filter(e=>e.backend).map(e=>e.state),['loading','started','ended']);
});
test('new narration cancels pending download; the old request never starts',async()=>{
  let release;const b=browser({fetcher:()=>new Promise(resolve=>{release=resolve;})});
  let cancelled=0;b.speech.play(plan,{onCancel:()=>cancelled++});await pause(0);
  b.speech.stop();release({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(1))});
  await pause(100);assert.equal(cancelled,1);assert.equal(b.sources.length,0);
  assert.equal(b.events.some(e=>e.state==='started'),false);
});
test('muting stops a current clip, stays muted on reload, and can recover',async()=>{
  const b=browser();b.speech.play(plan);await pause(45);b.speech.setEnabled(false);
  assert.equal(b.events.at(-2).state,'cancelled');
  assert.equal(b.speech.play(plan),null);assert.equal(browser({storage:b.storage}).speech.enabled,false);
  b.speech.setEnabled(true);b.speech.play(plan);await pause(110);assert.equal(b.events.at(-1).state,'ended');
});
test('download failure and absent audio report errors without starting; retry succeeds',async()=>{
  let fail=true;const b=browser({fetcher:()=>Promise.resolve({ok:!fail,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(1))})});
  b.speech.play(plan);await pause(10);assert.equal(b.events.at(-1).reason,'audio-download');
  fail=false;b.speech.play(plan);await pause(110);assert.equal(b.events.at(-1).state,'ended');
  const absent=browser({missingContext:true});absent.speech.play(plan);await pause(10);assert.equal(absent.events.at(-1).reason,'audio-unavailable');
});
test('language change and page hiding cancel narration',async()=>{
  const b=browser();b.speech.play(plan);b.cool.preferences.setLang('en');await pause(100);
  assert.equal(b.events.some(e=>e.state==='started'),false);
  b.speech.play(plan);await pause(45);b.document.hidden=true;b.listeners.visibilitychange();
  assert.equal(b.events.at(-1).state,'cancelled');
});
test('planner rejects unrecorded text, keeps dynamic numbers, and chooses exact full phrases',()=>{
  const manifest={entries:{en:{'Start with':{path:'a'},'12':{path:'b'},'1':{path:'c'},'hello world':{path:'d'},hello:{path:'e'}}}};
  assert.deepEqual(speechPlan('Start with 12.','en-US',manifest).clips.map(c=>c.src),['a','b']);
  assert.equal(speechPlan('hello world','en',manifest).clips.length,1);
  assert.throws(()=>speechPlan('Start with 99','en',manifest),/Unrecorded/);
  assert.throws(()=>speechPlan('','en',manifest),/Empty/);
});
test('feedback rotates, describes completion truthfully and rate limits retries',()=>{
  assert.equal(new Set([0,1,2].map(n=>feedbackText('complete',n))).size,3);
  assert.doesNotMatch(feedbackText('complete'),/全对/);
  assert.equal(shouldEncourage({step:'a',at:1000},'a',5999),false);
  assert.equal(shouldEncourage({step:'a',at:1000},'a',6000),true);
  assert.equal(shouldEncourage({step:'a',at:1000},'b',1001),true);
});
test('legacy English locale selects English synchronously and reports synthesis errors',()=>{
  const calls=[];
  const b=browser({synth:{getVoices:()=>[{lang:'zh-CN'},{lang:'en-US'}],addEventListener(){},cancel(){},speak:u=>calls.push(u)}});
  let failure;
  b.speech.speak('Hello',{lang:'en-US',onError:reason=>{failure=reason;}});
  assert.equal(calls.length,1);assert.equal(calls[0].voice.lang,'en-US');assert.equal(calls[0].lang,'en-US');
  calls[0].onerror({error:'not-allowed'});assert.equal(failure,'not-allowed');
});
