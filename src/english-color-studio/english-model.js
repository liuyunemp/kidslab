// Pure transitions: no DOM, clocks, storage or ambient random calls.
export const RULES = Object.freeze({ words:8, levels:4, hearts:3, milliseconds:20000 });
const clone = value => JSON.parse(JSON.stringify(value));
const modes = ['listen','read','picture'];
const unique = list => new Set(list).size === list.length;
const validSeed = seed => Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff;
function random(state) { let x=state.seed; x^=x<<13;x^=x>>>17;x^=x<<5;state.seed=x>>>0;return state.seed/4294967296; }
function shuffle(state,list) { const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(random(state)*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out; }
export function compatible(course,a,b) { return a!==b && !course.items.find(w=>w.id===a)?.excludes.includes(b) && !course.items.find(w=>w.id===b)?.excludes.includes(a); }
function drawBatch(course,state) {
  const ids=course.items.map(w=>w.id);
  const weak=shuffle(state,ids.filter(id=>state.records[id]?.weak)).slice(0,2);
  const fresh=shuffle(state,ids.filter(id=>!weak.includes(id)&&!state.records[id]?.practised));
  const old=shuffle(state,ids.filter(id=>!weak.includes(id)&&!fresh.includes(id))).sort((a,b)=>(state.records[a]?.lastRound??0)-(state.records[b]?.lastRound??0));
  return [...weak,...fresh,...old].slice(0,RULES.words);
}
function buildLevel(state) {
  state.lives=RULES.hearts;state.baseIndex=0;state.review=[];state.learnIndex=0;
  state.question=null;state.remainingMs=RULES.milliseconds;state.paused=false;state.result=null;
  state.introduced=state.level===0?0:8;state.phase=state.level===0?'learn':'answer';
  let order=state.level===0?[...shuffle(state,state.batch.slice(0,4)),...shuffle(state,state.batch.slice(4))]:shuffle(state,state.batch);
  const mixed=shuffle(state,Array.from({length:8},(_,i)=>modes[(i+state.round-1)%3]));
  state.order=order.map((target,i)=>({target,mode:state.level===3?mixed[i]:modes[state.level]}));
}
function finishRound(state) {
  for(const id of state.batch) state.records[id]={practised:true,lastRound:state.round,weak:state.roundMisses.includes(id)};
  state.completed=true;state.phase='roundDone';
}
function nextQuestion(course,state) {
  if(state.level===0 && state.baseIndex===4 && state.introduced===4) { state.phase='learn';state.learnIndex=4;return; }
  let entry,review=false;
  if(state.baseIndex<8) entry=state.order[state.baseIndex];
  else if(state.review.length) {entry=state.review[0];review=true;}
  else {if(state.level===3)finishRound(state);else state.phase='levelDone';return;}
  const count=[2,3,4,4][state.level];
  const eligible=state.batch.slice(0,state.introduced).filter(id=>compatible(course,entry.target,id));
  if(eligible.length<count-1) throw new RangeError('Not enough unambiguous choices');
  state.serial++;
  state.question={id:state.serial,target:entry.target,mode:entry.mode,originalMode:entry.mode,options:shuffle(state,[entry.target,...shuffle(state,eligible).slice(0,count-1)]),wrong:[],missed:false,review,started:entry.mode!=='listen',audioBlocked:false};
  state.remainingMs=RULES.milliseconds;state.phase='answer';state.result=null;
}
export function initialState(course,seed=1) {
  if(!course || !Array.isArray(course.items)||course.items.length<8||!unique(course.items.map(w=>w.id)))throw new TypeError('Invalid English word bank');
  if(!validSeed(seed))throw new TypeError('Invalid random seed');
  const state={version:2,courseId:course.id,seed,round:1,level:0,batch:[],records:{},roundMisses:[],completed:false,serial:0,attempt:0,fallbacks:0};
  state.batch=drawBatch(course,state);buildLevel(state);return state;
}
export const currentWord = (course,state) => course.items.find(w=>w.id===(state.phase==='learn'?state.batch[state.learnIndex]:state.question?.target)) ?? course.items.find(w=>w.id===state.batch[0]);
export const progress = (course,state) => state.baseIndex;
export const practisedCount = state => Object.values(state.records).filter(record=>record.practised).length;
export const sentenceFor = (course,state) => currentWord(course,state).sentence;
function miss(state) {
  const q=state.question;q.missed=true;
  if(!state.roundMisses.includes(q.target))state.roundMisses.push(q.target);
  if(!state.review.some(entry=>entry.target===q.target))state.review.push({target:q.target,mode:q.mode});
  state.lives--;
  if(state.lives===0)state.phase='failed';
}
function resolveQuestion(state,result) {
  const q=state.question;
  if(!q.review)state.baseIndex++;
  else {
    state.review=state.review.filter(entry=>entry.target!==q.target);
    if(q.missed)state.review.push({target:q.target,mode:q.mode});
  }
  state.phase='feedback';state.result=result;
}
export function reduce(course,state,action) {
  const reject=error=>({state,changed:false,error});
  if(!action||typeof action!=='object')return reject('invalid');
  const next=clone(state), q=next.question;
  if(action.type==='pause') {if(state.paused)return reject('same');next.paused=true;return {state:next,changed:true};}
  if(action.type==='resume') {if(!state.paused)return reject('invalid');next.paused=false;return {state:next,changed:true};}
  if(state.paused)return reject('paused');
  switch(action.type) {
    case 'learn-next':
      if(state.phase!=='learn')return reject('invalid');
      next.learnIndex++;next.introduced=Math.max(next.introduced,next.learnIndex);
      if(next.learnIndex===4||next.learnIndex===8)nextQuestion(course,next);
      break;
    case 'answer':
      if(state.phase!=='answer'||action.questionId!==q.id||!q.started||q.audioBlocked||!q.options.includes(action.id)||q.wrong.includes(action.id))return reject('invalid');
      if(action.id===q.target)resolveQuestion(next,'correct');
      else {q.wrong.push(action.id);miss(next);next.result='wrong';}
      break;
    case 'tick':
      if(state.phase!=='answer'||!q.started||q.audioBlocked||action.questionId!==q.id||!Number.isFinite(action.elapsedMs)||action.elapsedMs<=0)return reject('invalid');
      next.remainingMs=Math.max(0,next.remainingMs-action.elapsedMs);
      if(next.remainingMs===0) {miss(next);next.result='timeout';if(next.lives>0)resolveQuestion(next,'timeout');}
      break;
    case 'audio-start':
      if(state.phase!=='answer'||q.mode!=='listen'||action.questionId!==q.id)return reject('invalid');
      q.started=true;q.audioBlocked=false;break;
    case 'audio-error':
      if(state.phase!=='answer'||q.mode!=='listen'||action.questionId!==q.id)return reject('invalid');
      q.audioBlocked=true;break;
    case 'fallback':
      if(state.phase!=='answer'||q.mode!=='listen')return reject('invalid');
      q.mode='read';q.started=true;q.audioBlocked=false;next.fallbacks++;break;
    case 'next':
      if(state.phase==='feedback')nextQuestion(course,next);
      else if(state.phase==='levelDone'){next.level++;buildLevel(next);nextQuestion(course,next);}
      else return reject('invalid');
      break;
    case 'retry':
      if(state.phase!=='failed')return reject('invalid');
      next.attempt++;buildLevel(next);if(next.level>0)nextQuestion(course,next);break;
    case 'new-round':
      if(state.phase!=='roundDone')return reject('invalid');
      next.round++;next.level=0;next.attempt=0;next.roundMisses=[];next.fallbacks=0;
      next.batch=drawBatch(course,next);buildLevel(next);break;
    default:return reject('invalid');
  }
  return {state:next,changed:true,completedNow:!state.completed&&next.completed};
}
export const serialize = state => clone(state);
export function restore(course,value,seed=1) {
  const fallback=()=>initialState(course,seed);
  try {
    const s=typeof value==='string'?JSON.parse(value):value;
    const ids=new Set(course.items.map(w=>w.id));
    const list=(v,max=8)=>Array.isArray(v)&&v.length<=max&&unique(v)&&v.every(id=>ids.has(id));
    const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
    if(!s||s.version!==2||s.courseId!==course.id||!validSeed(s.seed)||!integer(s.round,1,1e7)||!integer(s.level,0,3)||!list(s.batch)||s.batch.length!==8||!integer(s.lives,0,3)||!integer(s.serial,0,1e9)||!integer(s.attempt,0,1e7)||!integer(s.fallbacks,0,1e7)||!integer(s.baseIndex,0,8)||!integer(s.introduced,0,8)||!integer(s.learnIndex,0,8)||!Number.isFinite(s.remainingMs)||s.remainingMs<0||s.remainingMs>20000||typeof s.paused!=='boolean'||typeof s.completed!=='boolean'||!['learn','answer','feedback','failed','levelDone','roundDone'].includes(s.phase)||!list(s.roundMisses)||!s.roundMisses.every(id=>s.batch.includes(id)))return fallback();
    const entry=e=>e&&s.batch.includes(e.target)&&modes.includes(e.mode);
    if(!Array.isArray(s.order)||s.order.length!==8||!unique(s.order.map(e=>e.target))||!s.order.every(entry)||!Array.isArray(s.review)||s.review.length>8||!unique(s.review.map(e=>e.target))||!s.review.every(entry))return fallback();
    if(!s.records||Array.isArray(s.records)||typeof s.records!=='object'||Object.entries(s.records).some(([id,r])=>!ids.has(id)||!r||r.practised!==true||typeof r.weak!=='boolean'||!integer(r.lastRound,1,s.round)))return fallback();
    if(![null,'wrong','correct','timeout'].includes(s.result))return fallback();
    const q=s.question;
    if(q) {
      if(!integer(q.id,1,s.serial)||!s.batch.includes(q.target)||!modes.includes(q.mode)||!modes.includes(q.originalMode)||!list(q.options,4)||q.options.length!==[2,3,4,4][s.level]||!q.options.includes(q.target)||!q.options.every(id=>s.batch.slice(0,s.introduced).includes(id))||!q.options.every(id=>id===q.target||compatible(course,q.target,id))||!list(q.wrong,3)||!q.wrong.every(id=>q.options.includes(id)&&id!==q.target)||['missed','review','started','audioBlocked'].some(k=>typeof q[k]!=='boolean'))return fallback();
    }
    if(['answer','feedback','failed'].includes(s.phase)&&!q)return fallback();
    if(s.phase==='answer'&&(s.lives===0||s.remainingMs===0))return fallback();
    if(s.phase==='failed'&&s.lives!==0)return fallback();
    if(s.phase==='learn'&&(s.level!==0||s.learnIndex>=8||s.learnIndex<s.introduced))return fallback();
    if(s.phase==='roundDone'&&(!s.completed||s.level!==3||s.baseIndex!==8||s.review.length))return fallback();
    if(s.phase==='levelDone'&&(s.level===3||s.baseIndex!==8||s.review.length))return fallback();
    // Only persisted model fields cross the storage boundary.
    return Object.fromEntries(Object.keys(fallback()).map(k=>[k,clone(s[k])]));
  } catch {return fallback();}
}
