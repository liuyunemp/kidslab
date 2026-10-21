import {random,copy,yes,no,levelIndex,button,dirs,same,gridObjects,path} from './model-utils.js';
export function makeLevel(index,seed=0){
  levelIndex(index);const rng=random(seed),count=index<3?1:index<6?2:3,w=6,h=5;
  const rows=seed?rng.shuffle([0,2,4]):[0,2,4],flowers=[];
  for(let i=0;i<count;i++){flowers.push({id:'m'+i,sex:'male',p:[1,rows[i]]});flowers.push({id:'f'+i,sex:'female',p:[4,rows[i]]});}
  const walls=index>=4?[[3,1],[3,3]]:[];
  if(index===7)walls.push([4,2]);
  return {index,w,h,flowers,walls,start:[0,rows[0]],capacity:index>=5?1:2,goal:index===0?'collect':index===1?'pollinate':'fruit',relocate:index===7,flowerMove:index===7?flowers.findIndex(f=>f.sex==='female'&&f.p[1]===2):-1};
}
export const initial=l=>({bee:[...l.start],pollen:0,flowers:copy(l.flowers).map(f=>({...f,phase:0,age:0})),moves:0,ticks:0});
export const won=(l,s)=>l.goal==='collect'?s.pollen>0:s.flowers.filter(f=>f.sex==='female').every(f=>f.phase>=(l.goal==='pollinate'?1:3));
export function apply(l,s,a){
  if(a?.type==='move'&&dirs[a.dir]){const d=dirs[a.dir],p=[s.bee[0]+d[0],s.bee[1]+d[1]];if(p[0]<0||p[1]<0||p[0]>=l.w||p[1]>=l.h||l.walls.some(w=>same(w,p)))return no(s,'hedge');const n=copy(s);n.bee=p;n.moves++;return yes(n,'fly');}
  if(a?.type==='visit'){
    const k=s.flowers.findIndex(f=>same(f.p,s.bee));if(k<0)return no(s,'no-flower');const n=copy(s),f=n.flowers[k];
    if(f.sex==='male'){n.pollen=l.capacity;return yes(n,'collect');}
    if(!s.pollen)return no(s,'no-pollen');if(f.phase)return no(s,'already-pollinated');f.phase=1;f.age=0;n.pollen--;return yes(n,'pollinate');
  }
  if(a?.type==='relocate'&&l.relocate&&l.flowerMove>=0){const n=copy(s),f=n.flowers[l.flowerMove];f.p=f.p[0]===4?[5,2]:[4,2];return yes(n,'move-pot');}
  if(a?.type==='step'){const n=copy(s);for(const f of n.flowers){if(f.phase===1&&++f.age>=2){f.phase=2;f.age=0;}else if(f.phase===2&&++f.age>=3){f.phase=3;f.age=0;}}n.ticks++;return yes(n,'grow');}return no(s);
}
export function solve(l,s=initial(l)){
  let n=copy(s);const result=[],add=a=>{const r=apply(l,n,a);if(!r.ok)throw Error(r.reason);n=r.state;result.push(a);};
  const walk=p=>{const r=path(n.bee,p,l.w,l.h,l.walls);if(!r)throw Error('unreachable');r.forEach(add);};
  if(l.relocate&&n.flowers[l.flowerMove]?.p[0]===4)add({type:'relocate'});
  if(l.goal==='collect'){walk(n.flowers.find(f=>f.sex==='male').p);add({type:'visit'});return result;}
  for(const f of n.flowers.filter(f=>f.sex==='female'&&f.phase===0)){
    if(!n.pollen){walk(n.flowers.filter(f=>f.sex==='male').sort((a,b)=>Math.abs(a.p[1]-n.bee[1])-Math.abs(b.p[1]-n.bee[1]))[0].p);add({type:'visit'});}
    walk(f.p);add({type:'visit'});
  }
  let limit=6;while(!won(l,n)&&limit--)add({type:'step'});return result;
}
export const hint=(l,s)=>solve(l,s)[0];
export const invite=l=>l.goal==='collect'?['带蜜蜂到雄花上，再点“拜访花朵”。','Move onto a male flower, then tap Visit flower.']:l.goal==='pollinate'?['把花粉送到雌花柱头上。','Deliver pollen to the female stigma.']:['帮雌花收到花粉，再观察幼果长大。','Pollinate the female flowers, then observe fruit development.'];
export function controls(l){return [...Object.keys(dirs).map(dir=>button(({up:'↑ 向前',down:'↓ 向后',left:'← 向左',right:'→ 向右'})[dir],({up:'↑ North',down:'↓ South',left:'← West',right:'→ East'})[dir],{type:'move',dir})),button('拜访花朵','Visit flower',{type:'visit'}),...(l.index>=2?[button('观察生长','Observe growth',{type:'step'})]:[]),...(l.relocate?[button('移动中间花盆','Move middle pot',{type:'relocate'})]:[])];}
export function view(l,s){const names=[['未传粉','Unpollinated'],['已传粉','Pollinated'],['受精后','Fertilized'],['幼果','Young fruit']];return {size:7,objects:[...gridObjects(l.w,l.h,l.walls).map(o=>({...o,type:o.type==='tile'?'grass':'hedge'})),...s.flowers.map((f,i)=>({id:f.id,type:'flower',x:f.p[0],z:f.p[1],sex:f.sex,phase:f.phase,label:f.sex==='male'?['雄 · 花药','M · anther']:['雌 · '+names[f.phase][0],'F · '+names[f.phase][1]]})),{id:'bee',type:'bee',x:s.bee[0],z:s.bee[1],pollen:s.pollen,draggable:true}],stats:[[s.pollen,'携带花粉','Pollen carried'],[s.flowers.filter(f=>f.phase===3).length+'/'+s.flowers.filter(f=>f.sex==='female').length,'幼果','Young fruit']]};}
export const lesson=['这里只种南瓜：雄花花药产生花粉，雌花柱头接收花粉。传粉不是受精；在花粉相容、水光温度适宜的假设下，之后才受精并发育为果实。生长时间已压缩，花蜜不是花粉。','These are pumpkin flowers. Male anthers produce pollen; female stigmas receive it. Pollination is not fertilization. Compatible pollen and suitable growing conditions allow later fertilization and fruit development. Time is compressed. Nectar is not pollen.'];
