import test from 'node:test';
import assert from 'node:assert/strict';
import {runRoundWorker} from '../../scripts/random-rounds/worker-client.js';
import {generateRound} from '../../scripts/random-rounds/core.js';

test('generation budget stops candidates and uses a validated fallback',()=>{
  let clock=0,attempts=0;
  const record=generateRound({seed:0,levelId:'budget',generate:()=>{clock+=20;attempts++;return 2;},validate:Number.isInteger,now:()=>clock,budgetMs:10,fallback:()=>1});
  assert.equal(attempts,1);assert.equal(record.instance,1);
});
test('worker success, failure, timeout, cancellation, late response and unavailable Worker',async()=>{
  for(const mode of ['success','error','invalid','timeout','unavailable','cancel']){
    let terminated=0,recoveries=0,worker;
    const controller=new AbortController(),old={value:42};
    const pending=runRoundWorker({payload:{},timeoutMs:20,signal:controller.signal,
      workerFactory:()=>{
        if(mode==='unavailable')throw new Error('No worker');
        worker={terminate:()=>terminated++,postMessage:()=>queueMicrotask(()=>{
          if(mode==='success')worker.onmessage({data:{record:{value:3}}});
          if(mode==='error')worker.onerror({preventDefault(){}});
          if(mode==='invalid')worker.onmessage({data:{record:{value:NaN}}});
        })};return worker;
      },validate:a=>Number.isInteger(a.value),fallback:()=>{recoveries++;return {value:1};}});
    if(mode==='cancel'){controller.abort();await assert.rejects(pending);assert.equal(recoveries,0);}
    else{const next=await pending;assert.equal(next.value,mode==='success'?3:1);assert.deepEqual(old,{value:42});}
    assert.equal(terminated,mode==='unavailable'?0:1);
    const count=recoveries;worker?.onmessage({data:{error:'late'}});assert.equal(recoveries,count);
  }
  await assert.rejects(runRoundWorker({payload:{},workerFactory:()=>{throw new Error();},fallback:()=>null,validate:()=>false}));
});
