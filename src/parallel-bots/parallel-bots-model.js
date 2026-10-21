import {random,copy,yes,no,levelIndex,button,dirs,same,gridObjects,LIMITS} from './model-utils.js';
export const commandLabels={up:['↑ 前进','↑ North'],right:['→ 右行','→ East'],down:['↓ 后退','↓ South'],left:['← 左行','← West'],pick:['拿货','Pick up'],drop:['交货','Deliver'],wait:['等一步','Wait'],send:['发信号','Send signal'],receive:['等信号','Wait for signal'],handoff:['交给同伴','Hand to partner'],lock:['拿工具','Take tool'],unlock:['还工具','Return tool']};
export function makeLevel(index,seed=0){
  levelIndex(index);const rng=random(seed),waits=seed?rng.int(1,2):1,relay=index===5||index===8,tool=index>=6;
  let starts=index===1?[[0,1],[4,3]]:index===0?[[0,2],[4,4]]:relay?[[0,2],[3,2]]:[[0,2],[2,0]],goals=index===1?[[4,1],[0,3]]:index===0?[[4,2]]:relay?[[3,4]]:[[4,2],[2,4]];
  let programs;
  if(relay)programs=[['pick','right','right','handoff','send'],['receive','down','down','drop']];
  else if(index===0)programs=[['pick','right','right','right','right','drop'],[]];
  else if(index===1)programs=[['pick','right','right','right','right','drop'],['pick','left','left','left','left','drop']];
  else if(index<4)programs=[['pick','right','right','right','right','drop'],['pick',...Array(waits).fill('wait'),'down','down','down','down','drop']];
  else programs=[['pick','right','right','right','right','drop','send'],['receive','pick','down','down','down','down','drop']];
  if(tool){programs[0].unshift('lock');programs[0].splice(programs[0].indexOf('send'),0,'unlock');if(!programs[0].includes('send'))programs[0].push('unlock','send');programs[1].splice(1,0,'lock');programs[1].push('unlock');}
  const flip=seed&&rng.pick([false,true]);if(flip){starts=starts.map(([x,y])=>[4-x,y]);goals=goals.map(([x,y])=>[4-x,y]);programs=programs.map(p=>p.map(c=>c==='right'?'left':c==='left'?'right':c));}
  return {index,w:5,h:5,starts,goals,relay,tool,witness:programs,active:index===0?1:2,deadlock:index===7,flipped:Boolean(flip)};
}
const fresh=l=>({positions:copy(l.starts),cargo:[null,null],parcels:l.relay||l.active===1?[0]:[0,1],delivered:[],pc:[0,0],signals:[0,0],owner:null,ticks:0});
export const initial=l=>({programs:l.deadlock?[['receive'],['receive']]:[[],[]],...fresh(l)});
export const won=(l,s)=>s.delivered.length===l.goals.length&&(!l.tool||s.owner===null);
export function apply(l,s,a){
  if(a?.type==='add'&&Number.isInteger(a.bot)&&a.bot>=0&&a.bot<l.active&&Object.hasOwn(commandLabels,a.command)){if(s.programs[a.bot].length>=LIMITS.instructions)return no(s,'program-limit');const programs=copy(s.programs);programs[a.bot].push(a.command);return yes({programs,...fresh(l)},'edit');}
  if(a?.type==='remove'&&Number.isInteger(a.bot)&&a.bot>=0&&a.bot<l.active&&Number.isInteger(a.at)&&a.at>=0&&a.at<s.programs[a.bot].length){const programs=copy(s.programs);programs[a.bot].splice(a.at,1);return yes({programs,...fresh(l)},'edit');}
  if(a?.type==='restart')return yes({programs:copy(s.programs),...fresh(l)},'restart');
  if(a?.type!=='step')return no(s);if(s.ticks>=LIMITS.steps)return no(s,'step-limit');
  const n=copy(s),cmds=s.programs.map((p,i)=>p[s.pc[i]]),moves=copy(s.positions);let progressed=false;
  // All proposals read the same old state; nothing commits if any proposal is unsafe.
  if(cmds.filter(c=>c==='lock').length>1&&s.owner===null)return no(s,'tool-conflict');
  for(let i=0;i<l.active;i++){
    const cmd=cmds[i],other=1-i;if(!cmd)continue;
    if(cmd==='receive'&&!s.signals[i])continue;
    if(cmd==='lock'&&s.owner!==null&&s.owner!==i)continue;
    if(dirs[cmd]){moves[i]=[s.positions[i][0]+dirs[cmd][0],s.positions[i][1]+dirs[cmd][1]];if(moves[i].some(v=>v<0||v>=5))return no(s,'wall');}
    else if(cmd==='pick'){if(l.tool&&s.owner!==i)return no(s,'need-tool');if(s.cargo[i]!==null||!s.parcels.includes(i)||!same(s.positions[i],l.starts[i]))return no(s,'no-parcel');n.cargo[i]=i;n.parcels=n.parcels.filter(v=>v!==i);}
    else if(cmd==='drop'){if(l.tool&&s.owner!==i)return no(s,'need-tool');const parcel=s.cargo[i];if(parcel===null||!same(s.positions[i],l.goals[parcel]))return no(s,'wrong-dock');n.cargo[i]=null;n.delivered.push(parcel);}
    else if(cmd==='send')n.signals[other]++;
    else if(cmd==='receive')n.signals[i]--;
    else if(cmd==='lock')n.owner=i;
    else if(cmd==='unlock'){if(s.owner!==i)return no(s,'need-tool');n.owner=null;}
    else if(cmd==='handoff'){if(s.cargo[i]===null||s.cargo[other]!==null||cmds[other]==='pick'||cmds[other]==='handoff'||Math.abs(s.positions[i][0]-s.positions[other][0])+Math.abs(s.positions[i][1]-s.positions[other][1])!==1)return no(s,'partner-too-far');n.cargo[other]=s.cargo[i];n.cargo[i]=null;}
    n.pc[i]++;progressed=true;
  }
  if(l.active===2&&(same(moves[0],moves[1])||(same(moves[0],s.positions[1])&&same(moves[1],s.positions[0]))))return no(s,'bot-collision');
  if(!progressed)return no(s,cmds.some(Boolean)?'deadlock':'program-ended');n.positions=moves;n.ticks++;return yes(n,n.delivered.length>s.delivered.length?'deliver':'move');
}
export function solve(l,s=initial(l)){
  const actions=[];let n=copy(s);const add=a=>{const r=apply(l,n,a);if(!r.ok)throw Error(r.reason);n=r.state;actions.push(a);};
  for(let bot=0;bot<l.active;bot++){for(let at=n.programs[bot].length-1;at>=0;at--)add({type:'remove',bot,at});for(const command of l.witness[bot])add({type:'add',bot,command});}
  let budget=100;while(!won(l,n)&&budget--)add({type:'step'});return actions;
}
export function hint(l,s){for(let bot=0;bot<l.active;bot++){const bad=s.programs[bot].findIndex((v,i)=>v!==l.witness[bot][i]);if(bad>=0)return {type:'remove',bot,at:bad};if(s.programs[bot].length<l.witness[bot].length)return {type:'add',bot,command:l.witness[bot][s.programs[bot].length]};}return {type:'step'};}
export const controls=(l,s,bot=0)=>Object.entries(commandLabels).filter(([cmd])=>l.tool||!['lock','unlock'].includes(cmd)).map(([command,label])=>button(...label,{type:'add',bot,command}));
export function view(l,s){return {size:7,objects:[...gridObjects(5,5),...l.goals.map((p,i)=>({id:'goal-'+i,type:'dock',x:p[0],z:p[1],label:String.fromCharCode(65+i),on:s.delivered.includes(i)})),...s.parcels.map(i=>({id:'parcel-'+i,type:'crate',x:l.starts[i][0],z:l.starts[i][1],label:String.fromCharCode(65+i)})),...s.positions.slice(0,l.active).map((p,i)=>({id:'bot-'+i,type:'robot',x:p[0],z:p[1],color:i,label:String.fromCharCode(65+i),cargo:s.cargo[i]!==null}))],stats:[[s.delivered.length+'/'+l.goals.length,'交货','Deliveries'],[l.tool?(s.owner===null?'—':String.fromCharCode(65+s.owner)):s.ticks,l.tool?'工具主人':'时步',l.tool?'Tool holder':'Ticks']],programs:s.programs.map(p=>p.map(c=>commandLabels[c])),pc:s.pc};}
export const lesson=['两台机器人先一起计划，再一起移动。抢同一格、迎面交换或抢工具都不提交；等待信号只接收先前时步发出的信号。双方一直等就会互相卡住，可以改程序恢复。','Both robots plan and commit together. Cell collisions, head-on swaps and tool conflicts do not commit. A signal becomes readable on the next tick. Two waiting robots may deadlock; editing the program recovers.'];
