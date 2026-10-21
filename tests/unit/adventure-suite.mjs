import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,perform,undo,restore,snapshot,selectLevel} from '../../scripts/adventure/session.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};
export function adventureSuite(id,model){
  test(`${id}: all nine baseline levels and 100 seeds per level have executable solutions`,()=>{
    for(let index=0;index<9;index++){const unique=new Set();for(let seed=0;seed<100;seed++){
      const l=model.makeLevel(index,seed);unique.add(JSON.stringify(l));assert.deepEqual(l,model.makeLevel(index,seed));let s=model.initial(l);assert.equal(model.won(l,s),false,`${index}/${seed} must start unfinished`);
      for(const action of model.solve(l)){const before=JSON.stringify(s),r=model.apply(l,freeze(s),action);assert.equal(r.ok,true,`${index}/${seed}: ${JSON.stringify(action)} ${r.reason}`);assert.equal(JSON.stringify(s),before);s=r.state;}
      assert.equal(model.won(l,s),true,`${index}/${seed}`);assert.ok(model.view(l,s).objects.length>0);
    }assert.ok(unique.size>1,`level ${index} must change more than color`);}
  });
  test(`${id}: invalid actions and invalid level indices are rejected without mutation`,()=>{
    const l=model.makeLevel(0),s=freeze(model.initial(l));for(const action of [null,{}, {type:'missing'}, {type:'move',dir:'diagonal'}, {type:'add',bot:NaN,command:'eval'}, {type:'rule',key:'depth',value:NaN}]){const r=model.apply(l,s,action);assert.equal(r.ok,false);assert.equal(r.state,s);}
    for(const index of [-1,9,NaN,1.5])assert.throws(()=>model.makeLevel(index));
  });
  test(`${id}: undo, retry, saved replay, unlock and final boundary survive recovery`,()=>{
    let session=createSession(model);assert.equal(selectLevel(model,session,1),session);
    for(let index=0;index<9;index++){
      if(index)session=selectLevel(model,session,index);
      const initial=JSON.stringify(session.state),actions=model.solve(session.level);const first=perform(model,session,actions[0]);assert.equal(first.ok,true);assert.deepEqual(undo(model,first.session).state,session.state);
      let awards=0;for(const action of actions){const r=perform(model,session,action);assert.equal(r.ok,true);session=r.session;awards+=Number(r.newlyWon);}
      assert.equal(awards,1);assert.ok(session.completed[index]);assert.equal(session.unlocked,Math.min(9,index+2));
      const repeated=perform(model,restore(model,snapshot(undo(model,session))),actions.at(-1));
      assert.equal(repeated.ok,true);assert.equal(repeated.newlyWon,false,'undo and reload cannot repeat a reward');
      assert.equal(repeated.courseCompleted,false);
      const saved=restore(model,snapshot(session));assert.deepEqual(saved.state,session.state);assert.equal(model.won(saved.level,saved.state),true);
      const retry=selectLevel(model,session,index,session.seed);assert.equal(JSON.stringify(retry.state),initial);assert.deepEqual(retry.completed,session.completed);
    }
    for(const raw of ['bad','null',JSON.stringify({...JSON.parse(snapshot(session)),seed:-1}),JSON.stringify({...JSON.parse(snapshot(session)),actions:[{type:'impossible'}]})]){const s=restore(model,raw);assert.equal(s.index,0);assert.equal(s.actions.length,0);assert.equal(model.won(s.level,s.state),false);}
  });
}
