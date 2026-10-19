// Finite families use reviewed object attributes, keeping color/shape criteria unambiguous.
export function taskFamily(base){
  const {task,pool,kind}=base;
  if(kind==='sort')return pool.filter(t=>t.criterion.zh===task.criterion.zh).map(t=>({...base,task:{...t,id:task.id}}));
  if(kind==='weight')return pool.filter(t=>(t.leftMass===t.rightMass)===(task.leftMass===task.rightMass)).flatMap(t=>[
    {...base,task:{...t,id:task.id}},
    {...base,task:{...t,id:task.id,leftEmoji:t.rightEmoji,rightEmoji:t.leftEmoji,leftMass:t.rightMass,rightMass:t.leftMass,answer:t.answer==='equal'?'equal':t.answer==='left'?'right':'left'}},
  ]);
  throw new RangeError('Unsupported task family');
}
export const g1Task=(base,rng)=>rng.pick(taskFamily(base));
export const g1Identity=a=>a.kind==='sort'?{item:a.task.item,criterion:a.task.criterion.zh}:{left:a.task.leftEmoji,right:a.task.rightEmoji,relation:Math.sign(a.task.leftMass-a.task.rightMass)};
export function validG1Task(value,base){
  if(!value?.task||value.task.id!==base.task.id||value.kind!==base.kind)return false;
  const a=value.task;
  if(base.kind==='weight'&&a.answer!==(a.leftMass===a.rightMass?'equal':a.leftMass>a.rightMass?'left':'right'))return false;
  return taskFamily(base).some(b=>JSON.stringify(b.task)===JSON.stringify(a));
}
