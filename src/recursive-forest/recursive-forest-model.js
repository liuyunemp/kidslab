import {random,copy,yes,no,levelIndex,button,LIMITS,close} from './model-utils.js';
export function expand(rule,roots){
  const stack=roots.map(x=>({x,y:0,angle:Math.PI/2,length:rule.length,depth:1})),lines=[];
  while(stack.length){const f=stack.pop();if(f.depth>LIMITS.depth||lines.length>=LIMITS.steps)throw Error('depth-limit');const to=[f.x+Math.cos(f.angle)*f.length,f.y+Math.sin(f.angle)*f.length];lines.push({from:[f.x,f.y],to,depth:f.depth});if(rule.stop&&f.depth>=rule.depth)continue;for(let side=0;side<rule.branches;side++)stack.push({x:to[0],y:to[1],angle:f.angle+(rule.branches===1?0:(side?1:-1))*rule.angle*Math.PI/180,length:f.length*rule.shrink,depth:f.depth+1});}
  return lines;
}
export function makeLevel(index,seed=0){
  levelIndex(index);const rng=random(seed),rule={length:seed?rng.pick([1,1.5,2]):1.5,depth:[1,2,3,3,4,4,5,4,4][index],shrink:seed?rng.pick([.55,.65,.75]):.65,angle:seed?rng.pick([20,30,40]):30,branches:index<2?1:2,stop:true};
  const roots=index===8?[-2,2]:[0];if(index===7)rule.angle=20;
  const target=expand(rule,roots),start={length:1.5,depth:1,shrink:.75,angle:40,branches:1,stop:index!==3};
  if(index===0)start.depth=2;
  return {index,rule,roots,target,start,obstacle:index===7?{x:2,y:2.2,r:.35}:null};
}
const runtime=(rule,roots)=>({stack:roots.map(x=>({x,y:0,angle:Math.PI/2,length:rule.length,depth:1})),lines:[],ticks:0});
export const initial=l=>({rule:copy(l.start),...runtime(l.start,l.roots)});
export const won=(l,s)=>s.stack.length===0&&s.lines.length===l.target.length&&s.lines.every((v,i)=>v.to.every((x,j)=>close(x,l.target[i].to[j]))&&v.from.every((x,j)=>close(x,l.target[i].from[j])));
export function apply(l,s,a){
  const values={length:[1,1.5,2],depth:[1,2,3,4,5,6],shrink:[.55,.65,.75],angle:[20,30,40],branches:[1,2],stop:[true,false]};
  if(a?.type==='rule'&&Object.hasOwn(values,a.key)&&values[a.key].includes(a.value)){const rule={...s.rule,[a.key]:a.value};return yes({rule,...runtime(rule,l.roots)},'edit');}
  if(a?.type==='restart')return yes({rule:copy(s.rule),...runtime(s.rule,l.roots)},'restart');
  if(a?.type!=='step')return no(s);
  if(!s.stack.length)return no(s,'program-ended');if(s.ticks>=LIMITS.steps)return no(s,'step-limit');
  const n=copy(s),f=n.stack.pop();if(f.depth>LIMITS.depth)return no(s,'depth-limit');
  const to=[f.x+Math.cos(f.angle)*f.length,f.y+Math.sin(f.angle)*f.length];
  if(l.obstacle){const {x,y,r}=l.obstacle,dx=to[0]-f.x,dy=to[1]-f.y,t=Math.max(0,Math.min(1,((x-f.x)*dx+(y-f.y)*dy)/(dx*dx+dy*dy)));if(Math.hypot(f.x+t*dx-x,f.y+t*dy-y)<r)return no(s,'tree-obstacle');}
  n.lines.push({from:[f.x,f.y],to,depth:f.depth});n.ticks++;
  if(!(n.rule.stop&&f.depth>=n.rule.depth))for(let side=0;side<n.rule.branches;side++)n.stack.push({x:to[0],y:to[1],angle:f.angle+(n.rule.branches===1?0:(side?1:-1))*n.rule.angle*Math.PI/180,length:f.length*n.rule.shrink,depth:f.depth+1});
  return yes(n,'branch');
}
export function solve(l,s=initial(l)){const edits=Object.keys(l.rule).filter(k=>s.rule[k]!==l.rule[k]).map(key=>({type:'rule',key,value:l.rule[key]}));return [...edits,...(!edits.length&&s.ticks?[{type:'restart'}]:[]),...l.target.map(()=>({type:'step'}))];}
export function hint(l,s){const key=Object.keys(l.rule).find(k=>s.rule[k]!==l.rule[k]);return key?{type:'rule',key,value:l.rule[key]}:s.stack.length?{type:'step'}:null;}
export function controls(l,s){return Object.entries({length:[['树干长度','Trunk length'],[1,1.5,2]],depth:[['停止层数','Stop at depth'],[1,2,3,4,5,6]],shrink:[['子枝长度 ×','Child length ×'],[.55,.65,.75]],angle:[['分枝角度 °','Branch angle °'],[20,30,40]],branches:[['调用子枝数','Child calls'],[1,2]],stop:[['停止条件','Stop condition'],[true,false]]}).map(([key,[label,values]])=>({select:true,label,value:s.rule[key],options:values.map(value=>({label:typeof value==='boolean'?(value?['启用','On']:['禁用','Off']):String(value),action:{type:'rule',key,value}}))}));}
export function view(l,s){return {size:l.index===8?10:7,objects:[...l.roots.map((x,i)=>({id:'pot-'+i,type:'planter',x,z:0})),...l.target.map((line,i)=>({id:'ghost-'+i,type:'branch',...line,ghost:true})),...s.lines.map((line,i)=>({id:'branch-'+i,type:'branch',...line})),...(l.obstacle?[{id:'obstacle',type:'orb',x:l.obstacle.x,y:l.obstacle.y,z:0,r:l.obstacle.r}]:[])],stats:[[s.lines.length+'/'+l.target.length,'枝条','Branches'],[s.stack.at(-1)?.depth||'✓','下一调用层','Next call depth']],program:[['画枝 → 调用子枝 → 满足条件停止','Draw → call children → stop at the limit']]};}
export const lesson=['递归让规则调用自己；停止条件决定何时不再调用。每次子枝长度乘同一个比例。这是几何树，不是植物真实生长预测；安全上限为 6 层、1024 步。','Recursion calls the same rule again. A stopping condition ends the calls. Child lengths use the same scale factor. This is a geometric tree, not a plant-growth prediction. Safety limits: depth 6 and 1024 steps.'];
