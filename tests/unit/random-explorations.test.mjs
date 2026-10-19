import test from 'node:test';
import assert from 'node:assert/strict';
// The shared source keeps copy-local imports, so the published course copy is the loadable one.
import {activityRound,classicActivity,generateActivity,supportsRandom,validActivity,activityIdentity} from '../../src/g1-addition-depot/random-explorations.js';
import {random} from '../../scripts/random-rounds/core.js';
import {courses} from '../g1b-journeys.mjs';

// One representative activity per supported kind. Regression here protects every
// g1 exploration course, which all share this generator through random-explorations.js.
const ACTIVITIES=[
 {id:'add',kind:'add',op:'+',a:23,b:19},
 {id:'add-zero',kind:'add',op:'+',a:7,b:5},
 {id:'add-hundred',kind:'add',op:'+',a:58,b:42},
 {id:'subtract',kind:'subtract',op:'-',a:42,b:17},
 {id:'subtract-ones',kind:'subtract',op:'-',a:50,b:4},
 {id:'relay',kind:'relay',op:'+',a:26,b:8,c:5},
 {id:'column',kind:'column',op:'+',a:36,b:27},
 {id:'compare',kind:'compare',relation:'compare',a:45,b:32},
 {id:'compare-equal',kind:'compare',relation:'compare',a:70,b:70},
 {id:'quantity-compare',kind:'quantity',relation:'compare',a:12,b:8},
 {id:'quantity-increase',kind:'quantity',relation:'increase',a:9,b:7},
 {id:'quantity-decrease',kind:'quantity',relation:'decrease',a:15,b:6},
 {id:'quantity-part',kind:'quantity',relation:'part',a:10,b:6},
 {id:'count',kind:'count',a:34,b:0},
 {id:'money',kind:'money',budget:500,price:120},
 {id:'money-fixed',kind:'money',budget:800,price:200},
 {id:'money-exchange',kind:'money',budget:100,price:100,exchangeOnly:true,exchangeCoin:100},
 {id:'shape',kind:'shape',pieces:[{id:'a'},{id:'b'},{id:'c'}]}
];
const courseFor=activity=>({category:'math',kind:activity.kind,activities:[activity]});
const include=(activity,extra={})=>({...activity,...extra});

test('supported kinds cover the exploration generator; unsupported courses stay out',()=>{
  for(const a of ACTIVITIES)assert.equal(supportsRandom(courseFor(a)),true,a.id);
  for(const course of [{category:'math',kind:'unknown'},{category:'logic',kind:'add'},{category:'physics',kind:'column'}])assert.equal(supportsRandom(course),false,JSON.stringify(course));
});

test('every declared activity accepts its own classic form and rejects malformed candidates',()=>{
  for(const a of ACTIVITIES){
    const course=courseFor(a);
    assert.equal(validActivity(course,a,classicActivity(a)),true,a.id);
    assert.equal(validActivity(course,a,null),false,a.id);
    assert.equal(validActivity(course,a,{...a,id:a.id+'x'}),false,a.id);
    // Money and shape rounds do not read a/b, so only their own fields are probed here.
    if(a.kind!=='money'&&a.kind!=='shape')assert.equal(validActivity(course,a,{...a,a:NaN}),false,a.id);
  }
  const shape=courseFor(ACTIVITIES.find(a=>a.kind==='shape'));
  assert.equal(validActivity(shape,shape.activities[0],{...shape.activities[0],initialPositions:[{x:-3.6,z:1.8}]}),false,'shape needs one position per piece');
  const money=courseFor(ACTIVITIES.find(a=>a.id==='money'));
  assert.equal(validActivity(money,money.activities[0],{...money.activities[0],price:0}),false,'price must be positive');
  assert.equal(validActivity(money,money.activities[0],{...money.activities[0],price:900}),false,'price cannot exceed budget');
  const relay=courseFor(ACTIVITIES.find(a=>a.kind==='relay'));
  assert.equal(validActivity(relay,relay.activities[0],{...relay.activities[0],a:60,b:40}),false,'relay result must stay within 100');
});

test('1000 generated instances per activity stay valid, reproducible and teach the same idea',()=>{
  for(const a of ACTIVITIES){
    const course=courseFor(a),seen=new Set();
    for(let seed=0;seed<1000;seed+=1){
      const one=generateActivity(course,a,random(seed)),two=generateActivity(course,a,random(seed));
      assert.equal(validActivity(course,a,one),true,`${a.id} seed ${seed}`);
      assert.deepEqual(one,two,`${a.id} seed ${seed} is deterministic`);
      seen.add(JSON.stringify(activityIdentity(one)));
      if(a.kind==='shape'){
        assert.equal(one.initialRotations.length,a.pieces.length);
        assert.deepEqual(one.initialPositions.map(p=>p.x),[a.pieces.map((_,i)=>-3.6+i*1.8)][0],'slots stay put so the prompt stays readable');
      }else if(a.kind==='money'){
        if(a.exchangeOnly)assert.equal(one.exchangeCoin,a.exchangeCoin);
        else{
          // The generator keeps the base price's granularity: whole yuan when the base is not a multiple of 10.
          const unit=a.price%10?1:a.price%100?10:100;
          assert.equal(one.budget%100,0,`${a.id} budget stays whole yuan`);
          assert.equal(one.price%unit,0,`${a.id} keeps price granularity ${unit}`);
          assert.ok(one.price>=1&&one.price<=one.budget,`${a.id} price stays payable`);
          assert.ok(one.budget>=a.budget/2&&one.budget<=Math.max(a.budget,100),`${a.id} budget stays near the original`);
        }
      }else{
        assert.equal(validActivity(course,a,one),true);
        if(a.kind==='compare')assert.equal(Math.sign(one.a-one.b),Math.sign(a.a-a.b),`${a.id} keeps the ordering`);
        if(a.kind==='quantity'&&a.relation==='compare')assert.equal(Math.sign(one.a-one.b),Math.sign(a.a-a.b));
      }
    }
    assert.ok(seen.size>=2,`${a.id} produces more than one instance`);
  }
});

test('arithmetic keeps regroup behaviour and the 0..100 range instead of drifting difficulty',()=>{
  const cases=[
    {activity:ACTIVITIES.find(a=>a.id==='add'),subtract:false},
    {activity:ACTIVITIES.find(a=>a.id==='add-zero'),subtract:false},
    {activity:ACTIVITIES.find(a=>a.id==='subtract'),subtract:true},
    {activity:ACTIVITIES.find(a=>a.id==='subtract-ones'),subtract:true},
    {activity:ACTIVITIES.find(a=>a.id==='column'),subtract:false}
  ];
  for(const {activity,subtract} of cases){
    const course=courseFor(activity);
    const regroup=(x,y)=>subtract?x%10<y%10:x%10+y%10>=10;
    for(let seed=0;seed<1000;seed+=1){
      const one=generateActivity(course,activity,random(seed)),value=subtract?one.a-one.b:one.a+one.b;
      assert.ok(value>=0&&value<=100,`${activity.id} seed ${seed} stays in range`);
      assert.equal(regroup(one.a,one.b),regroup(activity.a,activity.b),`${activity.id} seed ${seed} keeps the regrouping`);
    }
  }
  const relay=courseFor(ACTIVITIES.find(a=>a.kind==='relay'));
  for(let seed=0;seed<1000;seed+=1){
    const one=generateActivity(relay,relay.activities[0],random(seed));
    assert.ok(one.a+one.b-one.c>=0&&one.a+one.b-one.c<=100,`relay seed ${seed} keeps the final step legal`);
  }
});

test('every real math exploration activity generates valid, repeatable-looking instances',()=>{
  // Only the teaching anchors that must stay fixed are allowed a single instance.
  const singleInstance=new Set(['hundred-metro:count-8','hundred-metro:count-1','hundred-metro:count-3','hundred-metro:count-6']);
  let checked=0;
  for(const course of courses){
    if(!supportsRandom(course))continue;
    for(let index=0;index<course.activities.length;index+=1){
      const base=course.activities[index],seen=new Set(),label=`${course.id}:${base.id}`;
      for(let seed=0;seed<200;seed+=1){
        const round=activityRound(course,index,seed);
        assert.equal(validActivity(course,base,round.instance),true,`${label} seed ${seed}`);
        assert.equal(round.mode,'random',label);
        seen.add(round.fingerprint);
        checked+=1;
      }
      if(singleInstance.has(label))continue;
      assert.ok(seen.size>1,`${label} only ever produces ${seen.size} instance(s)`);
    }
  }
  assert.ok(checked>=1000,`sampled ${checked} real rounds`);
});

test('activityRound publishes a verified snapshot and rejects invalid input',()=>{
  const course=courseFor(ACTIVITIES.find(a=>a.id==='add'));
  const first=activityRound(course,0,7);
  assert.equal(first.mode,'random');
  assert.equal(validActivity(course,course.activities[0],first.instance),true);
  const again=activityRound(course,0,7);
  assert.equal(again.fingerprint,first.fingerprint,'same seed and ordinal reproduce the round');
  const later=activityRound(course,0,7,{round:first.round,recent:first.recent});
  assert.equal(later.round,1);
  assert.equal(later.recent.includes(first.fingerprint),true,'recent memory records the previous question');
  const classic=activityRound(course,0,7,null,true);
  assert.equal(classic.mode,'classic');
  assert.deepEqual(classic.instance,classicActivity(course.activities[0]));
  assert.throws(()=>activityRound(course,9,7),/Invalid activity round/);
  assert.throws(()=>activityRound(course,0,Number.NaN),/Invalid activity round/);
  assert.throws(()=>activityRound(courseFor({id:'x',kind:'unsupported'}),0,7),/Invalid activity round/);
});
