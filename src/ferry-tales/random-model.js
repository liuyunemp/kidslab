export function ferrySafe(base,state){
  if(!state||![0,1].includes(state.boatSide)||!Array.isArray(state.positions)||state.positions.length!==base.items.length||state.positions.some(p=>p!==0&&p!==1))return false;
  const unattended=new Set(base.items.filter((_,i)=>state.positions[i]!==state.boatSide).map(a=>a.id));
  return base.guard&&unattended.has(base.guard)||!base.dangers.some(([a,b])=>unattended.has(a)&&unattended.has(b));
}
export function ferryMove(base,state,passenger){
  if(!ferrySafe(base,state))return null;
  const next={boatSide:1-state.boatSide,positions:[...state.positions]};
  if(passenger!==null){const i=base.items.findIndex(a=>a.id===passenger);if(i<0||state.positions[i]!==state.boatSide)return null;next.positions[i]=next.boatSide;}
  return ferrySafe(base,next)?next:null;
}
export function ferrySolution(base,start){
  if(!ferrySafe(base,start))return null;
  const key=s=>`${s.boatSide}:${s.positions.join('')}`,queue=[{state:start,path:[]}],seen=new Set([key(start)]);
  for(let i=0;i<queue.length;i++){
    const {state,path}=queue[i];if(state.positions.every(p=>p===1))return path;
    for(const id of [null,...base.items.map(a=>a.id)]){const next=ferryMove(base,state,id);if(!next||seen.has(key(next)))continue;seen.add(key(next));queue.push({state:next,path:[...path,id]});}
  }return null;
}
export function ferryClassic(base){const initial={boatSide:0,positions:base.items.map(()=>0)};return {...base,initial,solution:ferrySolution(base,initial)};}
export function ferryFamily(base){
  const min=Math.ceil(ferryClassic(base).solution.length/2),family=[];
  for(let code=0;code<2**base.items.length;code++){
    const initial={boatSide:0,positions:base.items.map((_,i)=>code>>i&1)},solution=ferrySolution(base,initial);
    if(solution&&solution.length>=min)family.push({...base,initial,solution});
  }return family;
}
export function ferryTask(base,rng){return rng.pick(ferryFamily(base));}
export function ferryIdentity(a){return a.initial;}
export function validFerry(a,base){
  if(!a||JSON.stringify(a.items)!==JSON.stringify(base.items)||JSON.stringify(a.dangers)!==JSON.stringify(base.dangers)||a.guard!==base.guard||!ferrySafe(base,a.initial)||!Array.isArray(a.solution)||!a.solution.length)return false;
  let state=a.initial;for(const move of a.solution){state=ferryMove(base,state,move);if(!state)return false;}
  return state.positions.every(p=>p===1)&&a.solution.length<=ferryClassic(base).solution.length;
}
