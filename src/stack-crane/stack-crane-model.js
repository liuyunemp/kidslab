import {random,copy,yes,no,levelIndex,button,LIMITS} from './model-utils.js';
export const commands=['input-stack','input-queue','stack-out','queue-out','stack-queue','queue-stack'];
export const commandLabels={'input-stack':['入货 → 栈','Input → stack'],'input-queue':['入货 → 队列','Input → queue'],'stack-out':['栈 → 出货','Stack → output'],'queue-out':['队列 → 出货','Queue → output'],'stack-queue':['栈 → 队列','Stack → queue'],'queue-stack':['队列 → 栈','Queue → stack']};
export function makeLevel(index,seed=0){
  levelIndex(index);const rng=random(seed),count=[1,2,3,3,4,3,4,4,5][index],input=(seed?rng.shuffle(['A','B','C','D','E','F']):['A','B','C','D','E','F']).slice(0,count),capacity=index===7?2:count;
  const programs=[['input-stack','stack-out'],Array(count).fill('input-stack').concat(Array(count).fill('stack-out')),Array(count).fill('input-queue').concat(Array(count).fill('queue-out')),Array(count).fill('input-stack').concat(Array(count).fill('stack-out')),Array(count).fill('input-queue').concat(Array(count).fill('queue-out')),['input-stack','input-queue','input-stack','queue-out','stack-out','stack-out'],['input-stack','input-stack','stack-queue','input-stack','input-queue','stack-out','stack-out','queue-out','queue-out'],['input-stack','input-stack','stack-out','input-queue','input-queue','stack-out','queue-out','queue-out'],['input-stack','input-queue','input-stack','stack-queue','input-stack','input-queue','stack-out','queue-out','stack-out','queue-out','queue-out']];
  const witness=programs[index],l={index,input,capacity,witness,target:[]};let s=initial(l);for(const cmd of witness){s=execute(l,s,cmd,false).state;}l.target=s.output;return l;
}
const fresh=l=>({input:[...l.input],stack:[],queue:[],output:[],pc:0,ticks:0});
export const initial=l=>({program:[],...fresh(l)});
export const won=(l,s)=>s.output.length===l.target.length&&s.output.every((v,i)=>v===l.target[i])&&s.input.length===0&&s.stack.length===0&&s.queue.length===0;
export function execute(l,s,cmd,check=true){
  if(!commands.includes(cmd))return no(s);const [from,to]=cmd.split('-'),source=from==='input'?'input':from, target=to==='out'?'output':to;
  if(!s[source].length)return no(s,'empty-store');if(target!=='output'&&s[target].length>=l.capacity)return no(s,'full-store');
  const value=source==='stack'?s.stack.at(-1):s[source][0];if(check&&target==='output'&&value!==l.target[s.output.length])return no(s,'wrong-order');
  const n=copy(s);source==='stack'?n[source].pop():n[source].shift();n[target].push(value);n.pc++;n.ticks++;return yes(n,target==='output'?'deliver':'transfer');
}
export function apply(l,s,a){
  if(a?.type==='add'&&commands.includes(a.command)){if(s.program.length>=LIMITS.instructions)return no(s,'program-limit');return yes({program:[...s.program,a.command],...fresh(l)},'edit');}
  if(a?.type==='remove'&&Number.isInteger(a.at)&&a.at>=0&&a.at<s.program.length){const program=[...s.program];program.splice(a.at,1);return yes({program,...fresh(l)},'edit');}
  if(a?.type==='restart')return yes({program:[...s.program],...fresh(l)},'restart');
  if(a?.type==='step'){if(s.ticks>=LIMITS.steps)return no(s,'step-limit');if(s.pc>=s.program.length)return no(s,'program-ended');return execute(l,s,s.program[s.pc]);}return no(s);
}
export function solve(l,s=initial(l)){return [...s.program.map((_,i)=>({type:'remove',at:s.program.length-1-i})),...l.witness.map(command=>({type:'add',command})),...l.witness.map(()=>({type:'step'}))];}
export function hint(l,s){const bad=s.program.findIndex((cmd,i)=>cmd!==l.witness[i]);if(bad>=0)return {type:'remove',at:bad};if(s.program.length<l.witness.length)return {type:'add',command:l.witness[s.program.length]};return {type:'step'};}
export const controls=()=>commands.map(command=>button(...commandLabels[command],{type:'add',command}));
export function view(l,s){return {size:8,objects:[{id:'crane',type:'crane',x:2,z:1.5},...['input','stack','queue','output'].flatMap((name,j)=>[{id:'store-'+j,type:name==='stack'?'rack':'belt',x:j*1.6,z:0,label:({input:['入货','Input'],stack:['栈 · 顶部取','Stack · top'],queue:['队列 · 前端取','Queue · front'],output:['出货','Output']})[name]},...s[name].map((v,i)=>({id:name+'-'+v,type:'crate',x:j*1.6+(name==='stack'?0:i*.34),y:name==='stack'?i*.55:0,z:name==='stack'?0:i*.45,label:v,color:l.input.indexOf(v)}))])],stats:[[s.output.join(' ')||'—','已出货','Delivered'],[l.target.join(' → '),'订单','Order']],program:s.program.map(cmd=>commandLabels[cmd]),pc:s.pc};}
export const lesson=['栈是后放先取，队列是先来先走。取空货架、放满货架和送错顺序都会停在原处；修改程序后可以重新运行。','A stack is last in, first out. A queue is first in, first out. Empty reads, full stores and wrong deliveries leave the scene unchanged. Edit the program and run again.'];
