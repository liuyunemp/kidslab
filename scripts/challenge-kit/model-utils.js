import { random, copy } from './random-core.js';
export { random, copy };
export const dirs = { up:[0,-1],right:[1,0],down:[0,1],left:[-1,0] };
export const directionLabels = {up:['↑ 上','↑ Up'],right:['→ 右','→ Right'],down:['↓ 下','↓ Down'],left:['← 左','← Left']};
export const posKey = p => p[0]+','+p[1];
export const same = (a,b) => !!a && !!b && a[0]===b[0] && a[1]===b[1];
export const yes = (state,event='move') => ({ok:true,state,event});
export const no = (state,reason='blocked') => ({ok:false,state,reason});
export function levelIndex(i){if(!Number.isInteger(i)||i<0||i>8)throw new RangeError('Invalid level');}
export function button(id,zh,en,action,extra={}) {return {id,label:[zh,en],action,...extra};}
export function arrows(){return Object.keys(dirs).map(d=>({id:d,label:directionLabels[d],action:{type:'move',dir:d}}));}
export function path(from,to,w,h,blocked=[]){
  const walls=new Set(blocked.map(posKey)),seen=new Set([posKey(from)]),q=[[from,[]]];
  for(let n=0;n<q.length;n++){const [p,route]=q[n];if(same(p,to))return route;
    for(const [dir,[dx,dy]] of Object.entries(dirs)){const a=[p[0]+dx,p[1]+dy],k=posKey(a);
      if(a[0]<0||a[1]<0||a[0]>=w||a[1]>=h||walls.has(k)||seen.has(k))continue;
      seen.add(k);q.push([a,[...route,{type:'move',dir}]]);
    }
  }return null;
}
export function play(model,level,actions,state=model.initial(level)){
  let current=copy(state);
  for(const action of actions){const r=model.apply(level,current,action);if(!r.ok)return {ok:false,state:current,reason:r.reason};current=r.state;}
  return {ok:true,state:current,won:model.won(level,current)};
}
export function programHint(state,programs){
  for(let actor=0;actor<programs.length;actor++){
    const current=state.programs[actor],target=programs[actor];
    const wrong=current.findIndex((x,i)=>x!==target[i]);
    if(wrong>=0||current.length>target.length)return {type:'remove',actor,index:current.length-1};
    if(current.length<target.length)return {type:'append',actor,op:target[current.length]};
  }return {type:state.running?'step':'run'};
}
export function programActions(programs){return programs.flatMap((p,actor)=>p.map(op=>({type:'append',actor,op}))).concat({type:'run'});}
export function editProgram(state,action,allowed){
  if(!['append','remove','clear'].includes(action?.type))return null;
  const actor=action.actor??0;
  if(state.running||!Number.isInteger(actor)||!state.programs[actor])return no(state,'stop-first');
  const s=copy(state),p=s.programs[actor];
  if(action.type==='append'){if(!allowed.includes(action.op)||p.length>=64)return no(state,'program-limit');p.push(action.op);}
  if(action.type==='remove'){if(!Number.isInteger(action.index)||action.index<0||action.index>=p.length)return no(state,'invalid');p.splice(action.index,1);}
  if(action.type==='clear')s.programs[actor]=[];
  s.finished=false;s.error=null;return yes(s,'edit');
}
export function gridObjects(w,h,blocked=[]){
  const walls=new Set(blocked.map(posKey)),objects=[];
  for(let z=0;z<h;z++)for(let x=0;x<w;x++)objects.push({id:'tile-'+x+'-'+z,type:walls.has(x+','+z)?'wall':'tile',x,z});
  return objects;
}
