// Pure state transitions. This authoring source is copied into every English course.
const clone = value => JSON.parse(JSON.stringify(value));
const kinds = new Set(['color','fruit','animal','number','body','school']);
export function initialState(course) {
  if (!kinds.has(course.kind) || !course.items?.length) throw new TypeError('Unknown English activity');
  // The school bag is a container, so start on something the child can pick up.
  const first = course.items.find(item => item.id !== 'bag') ?? course.items[0];
  return { version: 1, courseId: course.id, selected: first.id, target: 0, paints: [null,null,null], placed: [], visited: [], count: 0, completed: false, revision: 0, presented: -1, history: [] };
}
export const currentWord = (course,state) => course.items.find(item=>item.id===state.selected) || course.items[0];
export const sentenceFor = (course,state) => currentWord(course,state).sentence;
export function progress(course,state) {
  return course.kind==='color' ? state.paints.filter(Boolean).length : course.kind==='number' ? state.count : course.kind==='body' ? state.visited.length : state.placed.length;
}
export function canPresent(course,state) { return progress(course,state)>=(course.kind==='number'?1:3); }
function frame(state) { const {history,...rest}=state; return clone(rest); }
export function reduce(course,state,action) {
  const reject = error => ({state,changed:false,error});
  if (!action || typeof action!=='object') return reject('invalid');
  if (action.type==='reset') return {state:{...initialState(course),completed:state.completed},changed:true};
  if (action.type==='undo') {
    if (!state.history.length) return reject('nothing');
    return {state:{...clone(state.history.at(-1)),completed:state.completed,history:state.history.slice(0,-1)},changed:true};
  }
  const next=clone(state), item=course.items.find(w=>w.id===action.id);
  let mutation=false, actedWord=null, completedNow=false;
  switch(action.type) {
    case 'select':
      if (!item) return reject('invalid');
      next.selected=item.id; actedWord=item.id;
      break;
    case 'target':
      if (course.kind!=='color'||!Number.isInteger(action.index)||action.index<0||action.index>2) return reject('invalid');
      next.target=action.index;
      break;
    case 'paint':
      if(course.kind!=='color'||!Number.isInteger(action.index)||action.index<0||action.index>2||!item) return reject('invalid');
      if(next.paints[action.index]===item.id) return reject('same');
      next.selected=item.id;next.target=action.index;next.paints[action.index]=item.id;mutation=true;actedWord=item.id;
      // Move the brush to the next blank toy so a second tap keeps making progress.
      next.target=[0,1,2].find(index=>!next.paints[index]) ?? action.index;
      break;
    case 'place':
      if(!['fruit','animal','school'].includes(course.kind)||!item) return reject('invalid');
      if(course.kind==='school'&&item.id==='bag') return reject('bag');
      if(next.placed.length>=3) return reject('full');
      next.placed.push(item.id);next.selected=item.id;mutation=true;actedWord=item.id;
      // Pick the next thing that is still on the shelf, so taps never repeat one item forever.
      next.selected=course.items.find(word=>!next.placed.includes(word.id)&&!(course.kind==='school'&&word.id==='bag'))?.id ?? item.id;
      break;
    case 'add':
      if(course.kind!=='number') return reject('invalid');
      if(next.count>=10) return reject('full');
      next.count++;next.selected=course.items[next.count-1].id;mutation=true;actedWord=next.selected;
      break;
    case 'remove':
      if(course.kind==='number') {
        if(next.count===0)return reject('empty');
        next.count--;next.selected=course.items[Math.max(0,next.count-1)].id;
      } else if(['fruit','animal','school'].includes(course.kind)) {
        if(!next.placed.length)return reject('empty');
        next.placed.pop();
      } else return reject('invalid');
      mutation=true;
      break;
    case 'body':
      if(course.kind!=='body'||!item)return reject('invalid');
      next.selected=item.id; if(!next.visited.includes(item.id))next.visited.push(item.id);
      mutation=true;actedWord=item.id;
      break;
    case 'present':
      if(!canPresent(course,state))return reject('hint');
      // Commit the boundary before animation; double clicks cannot count twice.
      if(state.presented===state.revision)return reject('same');
      next.presented=next.revision;completedNow=!next.completed;next.completed=true;
      break;
    default: return reject('invalid');
  }
  if(mutation){next.history=[...state.history,frame(state)].slice(-40);next.revision++;}
  return {state:next,changed:true,actedWord,completedNow,presented:action.type==='present',mutation};
}
function validFrame(course,value) {
  const ids=new Set(course.items.map(w=>w.id));
  return value&&value.version===1&&value.courseId===course.id&&ids.has(value.selected)
    &&Number.isInteger(value.target)&&value.target>=0&&value.target<=2
    &&Array.isArray(value.paints)&&value.paints.length===3&&value.paints.every(v=>v===null||ids.has(v))
    &&Array.isArray(value.placed)&&value.placed.length<=3&&value.placed.every(v=>ids.has(v)&&!(course.kind==='school'&&v==='bag'))
    &&Array.isArray(value.visited)&&value.visited.length<=course.items.length&&new Set(value.visited).size===value.visited.length&&value.visited.every(v=>ids.has(v))
    &&Number.isInteger(value.count)&&value.count>=0&&value.count<=10&&typeof value.completed==='boolean'
    &&Number.isSafeInteger(value.revision)&&value.revision>=0&&Number.isSafeInteger(value.presented)&&value.presented>=-1&&value.presented<=value.revision;
}
export function serialize(state) { return clone(state); }
export function restore(course,value) {
  try {
    const parsed=typeof value==='string'?JSON.parse(value):value;
    if(!validFrame(course,parsed)||!Array.isArray(parsed.history)||parsed.history.length>40||!parsed.history.every(f=>validFrame(course,f)))return initialState(course);
    // Copy only known properties. Saved data never becomes executable or HTML.
    const clean = source => Object.fromEntries(Object.keys(initialState(course)).filter(k=>k!=='history').map(k=>[k,clone(source[k])]));
    return {...clean(parsed),history:parsed.history.map(clean)};
  } catch { return initialState(course); }
}
