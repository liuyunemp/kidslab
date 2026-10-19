import test from 'node:test';
import assert from 'node:assert/strict';
import {GENERATOR_VERSION} from '../../scripts/random-rounds/core.js';
import {freshSeed,urlSeed,createRounds} from '../../src/alien-farm/random-rounds.js';
import {arithmetic,validArithmetic} from '../../src/alien-farm/random-model.js';

// Two 3-digit additions with distinct carry patterns, mirroring how courses declare bases.
const BASES=[
  {id:'0',a:147,b:238,op:'add'},
  {id:'1',a:368,b:457,op:'add'}
];
const store=new Map();
const keys=()=>[...store.keys()].filter(k=>k.startsWith('kidslab.random.v1.'));
const key=()=>keys()[keys().length-1];
// A distinct course id per case keeps one test's storage out of another's.
let courseId=0;
const define=(name,value)=>Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
const install=(search='')=>{
  define('location',{search,reload(){globalThis.location.reloaded=(globalThis.location.reloaded??0)+1;}});
  define('localStorage',{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)});
  define('crypto',{getRandomValues:a=>{a[0]=123456789;return a;}});
};
const uninstall=()=>{for(const name of ['location','localStorage','crypto'])delete globalThis[name];};
const open=(search='')=>{install(search);store.clear();return createRounds(`unit-${courseId++}`);};
const register=rounds=>rounds.prepare(BASES.map(b=>({...b})),arithmetic,validArithmetic,a=>a);

test('seed sources stay bounded and only accept explicit unsigned URLs',()=>{
  install();
  assert.equal(freshSeed(),123456789);
  delete globalThis.crypto;
  const fallback=freshSeed();
  assert.ok(Number.isInteger(fallback)&&fallback>=0&&fallback<=0xffffffff,'crypto failure still yields a usable seed');
  for(const [search,expected] of [['?seed=42',42],['?seed=0',0],['?seed=4294967295',4294967295]])
    assert.equal(urlSeed(search),expected,search);
  for(const bad of ['?seed=','?seed=-1','?seed=abc','?seed=1.5','?seed=99999999999','?seed=4294967296',''])
    assert.equal(urlSeed(bad),null,JSON.stringify(bad));
  uninstall();
});

test('an explicit URL seed pins the snapshot to an isolated storage key',()=>{
  install('');
  store.clear();
  // Storage is only written once a level is registered, so register before inspecting keys.
  const plain=createRounds('plain');
  register(plain);
  const plainKey=key();
  assert.ok(plainKey&&!plainKey.includes('.seed-'),'unseeded rounds use the plain key');
  globalThis.location.search='?seed=777';
  const pinned=createRounds('pinned');
  register(pinned);
  const pinnedKey=key();
  assert.ok(pinnedKey.endsWith('.seed-777'),'explicit seeds get an isolated key');
  assert.notEqual(pinnedKey,plainKey,'a pinned run never reuses the unseeded save');
  assert.equal(pinned.explicitSeed,777);
  assert.equal(plain.explicitSeed,null);
  uninstall();
});

test('prepare registers every level with a validated snapshot and a recorded round',()=>{
  const rounds=open('');
  const levels=register(rounds);
  assert.equal(levels.length,BASES.length);
  levels.forEach((instance,index)=>{
    assert.equal(validArithmetic(instance,BASES[index]),true,`level ${index}`);
    assert.equal(instance.a!==undefined&&instance.b!==undefined,true);
  });
  assert.equal(rounds.seed,123456789);
  assert.equal(rounds.hasSnapshot,true);
  const saved=JSON.parse(store.get(key()));
  assert.equal(saved.version,GENERATOR_VERSION);
  assert.equal(saved.seed,123456789);
  for(const base of BASES){
    assert.equal(saved.levels[base.id].mode,'random');
    assert.equal(saved.levels[base.id].round,0);
    assert.equal(saved.levels[base.id].recent.length,1,'the first question is remembered');
    assert.deepEqual(saved.levels[base.id].instance,levels[Number(base.id)]);
  }
  uninstall();
});

test('reopening the same storage replays the stored question instead of regenerating it',()=>{
  const rounds=open('');
  const first=register(rounds);
  const again=createRounds('unit').prepare(BASES.map(b=>({...b})),arithmetic,validArithmetic,a=>a);
  assert.deepEqual(again,first,'a reload continues the current round');
  uninstall();
});

test('a forged, stale or mismatched snapshot is replaced instead of trusted',()=>{
  const forged=[
    {version:GENERATOR_VERSION,seed:123456789,levels:{'0':{mode:'random',round:0,instance:{a:999,b:999,op:'add'},fingerprint:'x'}}},
    {version:GENERATOR_VERSION,seed:123456789,levels:{'0':{mode:'random',round:0,instance:{a:147,b:238,op:'add'},fingerprint:'not-the-fingerprint'}}},
    {version:GENERATOR_VERSION,seed:123456789,levels:{'0':{mode:'wrong-mode',round:0,instance:{a:147,b:238,op:'add'},fingerprint:'x'}}},
    {version:GENERATOR_VERSION,seed:123456789,levels:{'0':{mode:'random',round:-1,instance:{a:147,b:238,op:'add'},fingerprint:'x'}}},
    {version:GENERATOR_VERSION,seed:-5,levels:{}},
    {version:GENERATOR_VERSION-1,seed:123456789,levels:{}},
    {version:GENERATOR_VERSION,seed:123456789,levels:[]},
    {version:GENERATOR_VERSION,seed:123456789,levels:null}
  ];
  for(const broken of forged){
    // The storage key is derived from the course id, so it can be seeded before any level registers.
    install('');
    store.clear();
    const course=`unit-${courseId++}`;
    store.set(`kidslab.random.v1.${course}`,JSON.stringify(broken));
    const rounds=createRounds(course);
    const [instance]=register(rounds);
    assert.equal(validArithmetic(instance,BASES[0]),true,'a rejected snapshot still yields a legal question');
    const saved=JSON.parse(store.get(`kidslab.random.v1.${course}`));
    assert.equal(saved.version,GENERATOR_VERSION);
    assert.equal(saved.levels['0'].mode,'random');
    assert.equal(saved.levels['0'].round,0);
    assert.notEqual(saved.levels['0'].fingerprint,'not-the-fingerprint');
  }
  uninstall();
});

test('next advances to a new verified question and keeps the last ten for dedup',()=>{
  const rounds=open('');
  register(rounds);
  const seen=new Set([rounds.record(0).fingerprint]);
  for(let i=0;i<12;i+=1){
    const instance=rounds.next(0);
    assert.equal(validArithmetic(instance,BASES[0]),true,`next ${i}`);
    const record=rounds.record(0);
    assert.equal(seen.has(record.fingerprint),false,`next ${i} avoids the last ten`);
    seen.add(record.fingerprint);
    assert.ok(record.recent.length<=10,'the dedup window stays bounded');
    assert.equal(record.mode,'random');
  }
  uninstall();
});

test('classic restores the declared example and retry keeps the current question',()=>{
  const rounds=open('');
  register(rounds);
  const random=rounds.record(0).instance;
  const classic=rounds.next(0,true);
  assert.deepEqual(classic,BASES[0],'the classic entry restores the fixed example');
  assert.equal(rounds.record(0).mode,'classic');
  assert.deepEqual(rounds.record(0).instance,BASES[0]);
  // A retry only clears the play snapshot, so the question itself must not change.
  const again=rounds.next(0,true);
  assert.deepEqual(again,BASES[0]);
  assert.equal(rounds.record(0).play,null);
  assert.notDeepEqual(classic,random,'classic differs from the generated question');
  uninstall();
});

test('adopt records a legacy instance only when it validates',()=>{
  const rounds=open('');
  register(rounds);
  const legacy={a:147,b:238,op:'add'};
  rounds.adopt(0,legacy,{step:2});
  assert.deepEqual(rounds.record(0).instance,legacy);
  assert.deepEqual(rounds.record(0).play,{step:2});
  assert.equal(rounds.active,'0','adopting makes that round active');
  assert.throws(()=>rounds.adopt(0,{a:-1,b:1,op:'add'},null),/Invalid legacy instance/);
  uninstall();
});

test('unknown levels fail loudly and never publish a broken snapshot',()=>{
  const rounds=open('');
  register(rounds);
  const before=store.get(key());
  assert.throws(()=>rounds.next('missing'),/Unknown round/);
  assert.equal(store.get(key()),before,'a failed switch leaves the stored round untouched');
  uninstall();
});
