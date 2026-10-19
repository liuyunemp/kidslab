export const HARD_WEIGHS=[{left:[5,7,8,9],right:[6,10,11,12]},{left:[2,3,4,6],right:[5,7,11,12]},{left:[1,4,7,11],right:[2,5,8,10]}];
export const PIRATE_BASES=[{id:'nine-free',coins:9,maxWeigh:6,unknownBias:false,strict:false,icon:'⅓'},{id:'nine-two',coins:9,maxWeigh:2,unknownBias:false,strict:true,icon:'2×'},{id:'twentyseven',coins:27,maxWeigh:3,unknownBias:false,strict:true,icon:'27'},{id:'twelve-hard',coins:12,maxWeigh:3,unknownBias:true,strict:true,icon:'±'}].map(a=>({...a,fakeId:1,fakeKind:'light'}));
export function pirateFamily(base){return Array.from({length:base.coins},(_,i)=>(base.unknownBias?['light','heavy']:['light']).map(fakeKind=>({...base,fakeId:i+1,fakeKind}))).flat();}
export function pirateTask(base,rng){return rng.pick(pirateFamily(base));}
export function pirateIdentity(a){return {fakeId:a.fakeId,fakeKind:a.fakeKind};}
export function validPirate(a,base){return Boolean(a&&a.id===base.id&&a.coins===base.coins&&a.maxWeigh===base.maxWeigh&&a.unknownBias===base.unknownBias&&a.strict===base.strict&&Number.isInteger(a.fakeId)&&a.fakeId>=1&&a.fakeId<=a.coins&&(a.fakeKind==='light'||a.unknownBias&&a.fakeKind==='heavy'));}
export function pirateOutcome(left,right,hyp){const delta=(left.includes(hyp.id)?1:right.includes(hyp.id)?-1:0)*(hyp.kind==='light'?-1:1);return delta>0?'left':delta<0?'right':'balance';}
export function validPans(a,left,right){return Array.isArray(left)&&Array.isArray(right)&&left.length===right.length&&left.length>0&&new Set([...left,...right]).size===left.length+right.length&&[...left,...right].every(id=>Number.isInteger(id)&&id>=1&&id<=a.coins);}
export function pirateCandidates(a,log=[]){
  if(!Array.isArray(log)||log.length>a.maxWeigh)throw new RangeError('Invalid weighing log');
  let possible=pirateFamily(a).map(p=>({id:p.fakeId,kind:p.fakeKind}));
  for(const e of log){if(!e||!validPans(a,e.left,e.right)||e.outcome!==pirateOutcome(e.left,e.right,{id:a.fakeId,kind:a.fakeKind}))throw new RangeError('Invalid weighing result');possible=possible.filter(h=>pirateOutcome(e.left,e.right,h)===e.outcome);}
  return possible;
}
export function pirateHint(a,possible){
  if(possible.length<2)return null;
  if(!a.unknownBias){const ids=[...new Set(possible.map(p=>p.id))],size=Math.ceil(ids.length/3);return {left:ids.slice(0,size),right:ids.slice(size,size*2)};}
  return HARD_WEIGHS.map(p=>({...p,score:Math.max(...['left','right','balance'].map(o=>possible.filter(h=>pirateOutcome(p.left,p.right,h)===o).length))})).sort((a,b)=>a.score-b.score)[0];
}
