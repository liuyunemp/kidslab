import {copy,fingerprint,remember,replay} from './model-utils.js';
export const VERSION=1;
export function verifiedLevel(model,index,seed=0){const level=model.makeLevel(index,seed),end=replay(model,level,model.solve(level));if(!end||!model.won(level,end))throw new Error('Unsolvable generated level');return level;}
export function createSession(model,index=0,seed=0){const level=verifiedLevel(model,index,seed);return {version:VERSION,index,seed,level,state:model.initial(level),actions:[],rewarded:false,completed:Array(9).fill(false),recent:[fingerprint(level)],unlocked:1};}
export function perform(model,session,action){
  if(session.actions.length>=4096)return {ok:false,reason:'history-limit',session};
  const result=model.apply(session.level,session.state,action);if(!result.ok)return {...result,session};
  const next={...session,state:result.state,actions:[...session.actions,copy(action)],completed:[...session.completed]};
  const newlyWon=!session.rewarded&&model.won(next.level,next.state)&&!model.won(session.level,session.state);
  const courseCompleted=newlyWon&&next.index===8&&!session.completed[8];
  if(newlyWon){next.rewarded=true;next.completed[next.index]=true;next.unlocked=Math.min(9,Math.max(next.unlocked,next.index+2));}
  return {...result,session:next,newlyWon,courseCompleted};
}
export function undo(model,session){if(!session.actions.length)return session;const actions=session.actions.slice(0,-1),state=replay(model,session.level,actions);return {...session,actions,state};}
export function selectLevel(model,session,index,seed=0){if(!Number.isInteger(index)||index<0||index>=session.unlocked)return session;const level=verifiedLevel(model,index,seed);return {...session,index,seed,level,state:model.initial(level),actions:[],rewarded:false,recent:remember(session.recent,fingerprint(level))};}
export function snapshot(s){return JSON.stringify({version:VERSION,index:s.index,seed:s.seed,rewarded:s.rewarded,completed:s.completed,actions:s.actions,recent:s.recent});}
export function restore(model,text){
  try{const v=JSON.parse(text);if(v.version!==VERSION||!Array.isArray(v.completed)||v.completed.length!==9||v.completed.some(x=>typeof x!=='boolean')||!Number.isInteger(v.index)||v.index<0||v.index>8||!Number.isInteger(v.seed)||v.seed<0||v.seed>0xffffffff||!Array.isArray(v.actions)||v.actions.length>4096)throw Error('Invalid save');
    let unlocked=1;while(unlocked<9&&v.completed[unlocked-1])unlocked++;if(v.index>=unlocked)throw Error('Locked level');
    const base=createSession(model,v.index,v.seed),state=replay(model,base.level,v.actions);if(!state)throw Error('Invalid replay');
    return {...base,state,actions:v.actions,rewarded:v.rewarded===true||model.won(base.level,state),completed:v.completed,unlocked,recent:Array.isArray(v.recent)?v.recent.filter(x=>typeof x==='string'&&x.length<60000).slice(-10):base.recent};
  }catch{return createSession(model);}
}
