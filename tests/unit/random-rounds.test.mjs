import test from 'node:test';
import assert from 'node:assert/strict';
import { random, generateRound, fingerprint, remember } from '../../scripts/random-rounds/core.js';
import { courses, journey } from '../g1b-journeys.mjs';
import { activityRound, supportsRandom } from '../../src/g1b-character-lab/random-explorations.js';
import { initialState, current, reduce, serialize, restore, valueOf, moneyValue } from '../../src/g1b-character-lab/exploration-model.js';

test('seeded draws, canonical identity, bounds and atomic failed generation',()=>{
  assert.deepEqual(Array.from({length:20},random(0)),Array.from({length:20},random(0)));
  assert.equal(fingerprint({b:2,a:1}),fingerprint({a:1,b:2}));
  for(const seed of [-1,2**32,NaN,1.1])assert.throws(()=>random(seed));
  assert.throws(()=>random(0).int(3,2));assert.throws(()=>random(0).pick([]));
  let attempts=0;const before={instance:{a:1}};
  assert.throws(()=>generateRound({seed:1,levelId:'x',generate:()=>{attempts++;return null;},validate:()=>false,fallback:()=>null}));
  assert.equal(attempts,32);assert.deepEqual(before,{instance:{a:1}});
  const finite=generateRound({seed:1,levelId:'x',generate:({rng})=>rng.int(0,1),validate:Number.isInteger,recent:['0','1']});
  assert.equal(finite.instance,0);
  assert.deepEqual(remember(['0','1'],'0'),['1','0']);
});

for(const course of courses.filter(supportsRandom)){
  test(`${course.id}: 1000 generated rounds obey independent arithmetic and complete through real model actions`,()=>{
    const signatures=new Set();
    for(let seed=0;seed<1000;seed++){
      const index=seed%8,record=activityRound(course,index,seed),a=record.instance;
      signatures.add(record.fingerprint);
      assert.deepEqual(record,activityRound(course,index,seed));
      if(course.kind==='money'){
        assert.ok(a.price>0&&a.price<=a.budget&&a.budget<=10000);
      }else if(course.kind!=='shape'){
        assert.ok(Number.isInteger(a.a)&&a.a>=0&&a.a<=100);
        assert.ok(Number.isInteger(a.b)&&a.b>=0&&a.b<=100);
        if(['add','subtract','column','relay'].includes(course.kind)){
          const result=course.kind==='subtract'||a.op==='-'?a.a-a.b:a.a+a.b;
          assert.ok(result>=0&&result<=100);
          if(course.kind==='relay')assert.ok(result-a.c>=0);
        }
      }
      let s=initialState(course,{seed});s=reduce(course,s,{type:'select',index}).state;
      // Generate the interaction sequence independently from the current quantities.
      const actual=current(course,s);
      for(let action of journey(course,actual)){
        if(action.type==='shift'){const p=s.rooms[index].positions[action.index];action={type:'position',index:action.index,x:p.x+.5,z:p.z-.5};}
        const result=reduce(course,s,action);
        assert.equal(result.ok,true,`${course.id}/${seed}: ${JSON.stringify(action)} (${result.reason})`);
        s=result.state;
      }
      assert.ok(s.done.includes(a.id));
      if(course.kind==='money')assert.equal(moneyValue(s.rooms[index].wallet)+moneyValue(s.rooms[index].tray)+s.rooms[index].spent,a.budget);
      if(['add','subtract','column','relay'].includes(course.kind))assert.equal(valueOf(s.rooms[index]),(course.kind==='subtract'||a.op==='-'?a.a-a.b:a.a+a.b)-(course.kind==='relay'?a.c:0));
    }
    assert.ok(signatures.size>10,'content changes, not just a random seed');
  });
  test(`${course.id}: checkpoint, retry, new round, classic, old save and rejected action`,()=>{
    let s=initialState(course,{seed:98765});
    const first=current(course,s);
    s=reduce(course,s,{type:'newRound'}).state;
    const next=current(course,s);
    assert.deepEqual(restore(course,serialize(s)),s);
    assert.deepEqual(current(course,reduce(course,s,{type:'reset'}).state),next);
    const bad=reduce(course,s,{type:'unknown'});assert.equal(bad.state,s);
    s=reduce(course,s,{type:'classic'}).state;
    for(const k of ['a','b','c','budget','price'])assert.equal(current(course,s)[k],course.activities[0][k]);
    assert.deepEqual(restore(course,serialize(s)),s);
    const old=initialState(course);old.done=[course.activities[0].id];
    const migrated=restore(course,serialize(old),{seed:123});
    assert.deepEqual(migrated.done,old.done);
    assert.equal(migrated.random.records[0].mode,'classic');
    assert.deepEqual(restore(course,serialize(migrated)),migrated);
    assert.deepEqual(first,initialState(course,{seed:98765}).random.records[0].instance);
  });
}

test('arithmetic with a large candidate pool avoids the last ten actual problems',()=>{
  const c=courses.find(c=>c.id==='g1b-column-workshop');let previous=null;
  for(let i=0;i<50;i++){
    const next=activityRound(c,1,456,previous);
    assert.ok(!previous?.recent.includes(next.fingerprint));previous=next;
  }
});
