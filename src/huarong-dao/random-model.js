import {PIECES,applyMove,isSolved,stateKey,validateState} from './puzzle.js';

export function huarongPath(start,path){
  if(!Array.isArray(start)||start.length!==20||!validateState(start)||!Array.isArray(path)||path.length>10000)return null;
  let state=[...start];for(const move of path){
    if(!move||!Number.isInteger(move.piece)||!Number.isInteger(move.dx)||!Number.isInteger(move.dy))return null;
    state=applyMove(state,move);if(!state)return null;
  }return state;
}
export function validHuarong(a,b){
  if(!a||a.id!==b.id||!Array.isArray(a.solution)||a.solution.length<(b.id==='practice'?6:100)||a.solution.length>b.solution.length)return false;
  const end=huarongPath(a.start,a.solution);return !!end&&isSolved(end);
}
export function huarongTask(base,rng){
  const offset=rng.int(0,base.id==='practice'?6:16),flip=rng.int(0,1);
  const start=huarongPath(base.start,base.solution.slice(0,offset));
  const solution=base.solution.slice(offset).map(m=>({...m}));
  if(flip){for(let p=0;p<10;p++)start[p*2]=4-PIECES[p].w-start[p*2];for(const m of solution)m.dx=-m.dx;}
  return {id:base.id,start,solution};
}
export const huarongIdentity=a=>({id:a.id,layout:stateKey(a.start)});
export function huarongFamily(base){
  const all=[];for(let n=0;n<=6;n++)for(let flip=0;flip<2;flip++){
    let call=0;all.push(huarongTask(base,{int:()=>call++===0?n:flip}));
  }return all;
}
