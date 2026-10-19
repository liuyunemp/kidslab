// The caller commits only the resolved record, leaving its previous game untouched.
export function runRoundWorker({payload,fallback,validate,signal,timeoutMs=2000,workerFactory=()=>new Worker(new URL('./random-worker.js',import.meta.url),{type:'module'})}){
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>2000)return Promise.reject(new RangeError('Invalid generation budget'));
  return new Promise((resolve,reject)=>{
    let worker,timer,settled=false;
    const finish=(record,error)=>{
      if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker?.terminate();
      if(error)reject(error);else resolve(record);
    };
    const abort=()=>finish(null,new Error('Generation cancelled'));
    const recover=()=>{
      if(settled)return;
      try{const record=fallback();if(!validate(record))throw new Error('Invalid fallback');finish(record);}
      catch(error){finish(null,error);}
    };
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    try{
      worker=workerFactory();
      worker.onmessage=({data})=>{try{if(data?.record&&validate(data.record))finish(data.record);else recover();}catch{recover();}};
      worker.onerror=event=>{event.preventDefault?.();recover();};
      timer=setTimeout(recover,timeoutMs);
      worker.postMessage(payload);
    }catch{recover();}
  });
}
