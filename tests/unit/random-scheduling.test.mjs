import test from 'node:test';
import assert from 'node:assert/strict';
import {random,generateRound,remember} from '../../scripts/random-rounds/core.js';
import {pancakeTask,pancakeFamily,validPancake,pancakeSchedule,pancakeChoices,pancakeEnd,minuteClock,pancakeCopy} from '../../scripts/random-rounds/scheduling.js';
test('pancakes: 1000 schedules per difficulty preserve optimal capacity, cross-hour clocks and parallel timing',()=>{
  for(const [index,pancakes]of [['A','B'],['A','B','C'],['A','B','C']].entries()){
    const base={pancakes,rounds:pancakes.length,minutes:3,parallel:index===2,start:472,soy:6,deadline:495};
    for(let seed=0;seed<1000;seed++){
      const a=pancakeTask(base,random(seed));assert.ok(validPancake(a,base));assert.deepEqual(a,pancakeTask(base,random(seed)));
      const legal=index===0?['A1','B1','A2','B2']:['A1','B1','A2','C1','B2','C2'];
      assert.ok(pancakeSchedule(a,legal));assert.equal(legal.length*a.minutes/2,a.rounds*a.minutes);assert.equal(pancakeSchedule(a,['A1','A2',...legal.slice(2)]),false);assert.equal(pancakeSchedule(a,Array(legal.length).fill('A1')),false);
      if(a.parallel){const end=pancakeEnd(a),clock=minuteClock(end).split(':').map(Number);assert.equal(clock[0]*60+clock[1],a.start+Math.max(a.soy,a.rounds*a.minutes));assert.notEqual(Math.floor(a.start/60),clock[0]);assert.equal(new Set(pancakeChoices(a)).size,3);assert.ok(pancakeCopy(a,'finalText','en').includes(minuteClock(end)));}
    }
    if(!base.parallel){let recent=[];for(let round=0;round<3;round++){const r=generateRound({seed:7,levelId:String(index),round,recent,enumerate:()=>pancakeFamily(base),validate:a=>validPancake(a,base)});assert.ok(!recent.includes(r.fingerprint));recent=remember(recent,r.fingerprint);}}
  }
});
