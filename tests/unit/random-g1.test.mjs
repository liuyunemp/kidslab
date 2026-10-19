import test from 'node:test';
import assert from 'node:assert/strict';
import {courses} from '../../scripts/g1-games/data.mjs';
import {generateRound,remember,fingerprint} from '../../scripts/random-rounds/core.js';
import {g1Task,validG1Task,g1Identity,taskFamily} from '../../scripts/random-rounds/g1.js';
import {initialState,submit,speakText} from '../../scripts/g1-games/model.js';
for(const c of courses.filter(c=>['weight','sort'].includes(c.kind))){
  test(`${c.id}: 1000 tasks each stay in reviewed family, cycle without repetition, and complete`,()=>{
    for(const task of c.tasks){
      const base={kind:c.kind,task,pool:c.tasks};
      const family=taskFamily(base),size=new Set(family.map(a=>fingerprint(g1Identity(a)))).size;
      let recent=[];
      for(let i=0;i<1000;i++){
        const opts={seed:987,levelId:task.id,round:i,recent,generate:({rng})=>g1Task(base,rng),validate:a=>validG1Task(a,base),identify:g1Identity,enumerate:()=>taskFamily(base)};
        const record=generateRound(opts);assert.deepEqual(record,generateRound(opts));
        if(recent.length<Math.min(size,10))assert.ok(!recent.includes(record.fingerprint));
        if(size<=10&&recent.length===size)assert.equal(record.fingerprint,recent[0]);
        recent=remember(recent,record.fingerprint);
        const a=record.instance.task;
        assert.ok(c.kind==='sort'?a.baskets.filter(b=>b[0]===a.answer).length===1:a.answer===(a.leftMass===a.rightMass?'equal':a.leftMass>a.rightMass?'left':'right'));
      }
    }
    let s=initialState(c);for(const id of s.active){const t=c.tasks.find(t=>t.id===id);const result=submit(c,s,id,t.answer);assert.ok(result.accepted);s=result.state;}assert.equal(s.done.length,8);
    assert.equal(speakText({kind:c.kind,task:c.tasks[0],words:{weight:'哪边更重？',sort:'放到哪个筐？'}}).includes(c.tasks[0].answer),false);
  });
}
