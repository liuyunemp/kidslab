import {random,copy,yes,no,levelIndex,button,close} from './model-utils.js';
export const radius=teeth=>teeth*.025;
export function analyse(slots,edges,teeth,input=12) {
  const rates=teeth.map(()=>null);rates[0]=input;
  if(!teeth[0])return {rates,reason:'missing-gear'};
  for(let pass=0;pass<slots.length;pass++)for(const [a,b,kind] of edges){
    if(!teeth[a]||!teeth[b])continue;
    if(kind==='mesh'&&!close(Math.hypot(slots[a].x-slots[b].x,slots[a].z-slots[b].z),radius(teeth[a])+radius(teeth[b])))continue;
    const ratio=kind==='axle'?1:-teeth[a]/teeth[b];
    if(rates[a]!==null&&rates[b]===null)rates[b]=rates[a]*ratio;
    else if(rates[b]!==null&&rates[a]===null)rates[a]=rates[b]/ratio;
    else if(rates[a]!==null&&!close(rates[b],rates[a]*ratio))return {rates:teeth.map(()=>null),reason:'gear-conflict'};
  }
  return {rates,reason:rates.some(v=>v===null)?'missing-gear':null};
}
export function makeLevel(index,seed=0){
  levelIndex(index);const rng=random(seed),designs=[[24,24],[24,24,24],[24,48],[24,12,24],[24,48],[48,24],[24,48,12,36],[24,24,48],[24,48,12,24,24]];
  const teeth=[...designs[index]];
  if(seed&&index!==0){const factor=rng.pick([1,.5]);for(let i=0;i<teeth.length;i++)teeth[i]*=factor;}
  const slots=[{x:0,z:0,y:0}],edges=[];
  for(let i=1;i<teeth.length;i++){
    const axle=(index===6||index===8)&&i===2,branch=index===7&&i===2,parent=branch?0:i-1;
    slots.push({x:slots[parent].x+(axle?0:radius(teeth[parent])+radius(teeth[i])),z:branch?-(radius(teeth[parent])+radius(teeth[i])):slots[parent].z,y:axle?.5:slots[parent].y});
    if(branch)slots[i].x=slots[parent].x;
    edges.push([parent,i,axle?'axle':'mesh']);
  }
  const input=seed?rng.pick([12,18,24]):12,outputs=index===7?[1,2]:[teeth.length-1],rates=analyse(slots,edges,teeth,input).rates;
  return {index,slots,edges,design:teeth,input,outputs,targets:outputs.map(i=>rates[i]),palette:[6,12,18,24,36,48],missing:teeth.map((_,i)=>i).slice(1)};
}
export const initial=l=>({teeth:l.design.map((v,i)=>i?0:v),ticks:0});
export const won=(l,s)=>s.ticks>0&&l.outputs.every((o,i)=>{const rate=analyse(l.slots,l.edges,s.teeth,l.input).rates[o];return rate!==null&&close(rate,l.targets[i]);});
export function apply(l,s,a){
  if(a?.type==='gear'&&Number.isInteger(a.slot)&&a.slot>0&&a.slot<l.slots.length&&[0,...l.palette].includes(a.teeth)){const n=copy(s);n.teeth[a.slot]=a.teeth;n.ticks=0;return yes(n,'fit');}
  if(a?.type==='step'){const result=analyse(l.slots,l.edges,s.teeth,l.input);if(result.reason)return no(s,result.reason);const n=copy(s);n.ticks++;return yes(n,'turn');}return no(s);
}
export const solve=(l,s=initial(l))=>[...l.missing.filter(i=>s.teeth[i]!==l.design[i]).map(i=>({type:'gear',slot:i,teeth:l.design[i]})),{type:'step'}];
export const hint=(l,s)=>solve(l,s)[0];
export function controls(l,s){return [...l.missing.map(i=>({label:[`轴 ${i+1} · 齿数`,`Shaft ${i+1} · teeth`],select:true,value:s.teeth[i],options:[0,...l.palette].map(teeth=>({label:teeth?String(teeth):'—',action:{type:'gear',slot:i,teeth}}))})),button('启动传动','Start the drive',{type:'step'})];}
const speed=v=>v===null?'—':`${Math.abs(v)} ${v<0?'↻':'↺'}`;
export function view(l,s){const result=analyse(l.slots,l.edges,s.teeth,l.input),rates=result.rates;return {size:Math.max(5,...l.slots.map(p=>p.x+3)),objects:[...l.slots.map((p,i)=>({id:'gear-'+i,type:'gear',...p,teeth:s.teeth[i],pitch:s.teeth[i]?radius(s.teeth[i]):.25,label:String(i+1),spin:s.ticks&&!result.reason&&rates[i]!==null?rates[i]*Math.PI/30:0,color:i})),...l.outputs.map((o,i)=>({id:'ride-'+i,type:'ride',x:l.slots[o].x,z:l.slots[o].z+1.6,spin:s.ticks&&!result.reason&&rates[o]!==null?rates[o]*Math.PI/30:0,label:speed(l.targets[i])}))],stats:l.outputs.map((o,i)=>[`${speed(rates[o])} / ${speed(l.targets[i])}`,'当前 / 目标 · rpm','Now / target · rpm'])};}
export const lesson=['忽略摩擦：外啮合两轮转向相反，转速×齿数相等。同轴轮同速；中间惰轮不改变首末两轮的转速比。','Ignoring friction: meshing gears turn oppositely and speed × tooth count is equal. Gears on one shaft have equal speed. An idler does not change the first-to-last speed ratio.'];
