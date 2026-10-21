import {random,copy,yes,no,levelIndex,button} from './model-utils.js';
export function makeLevel(index,seed=0) {
  levelIndex(index);const rng=random(seed),count=1+Math.floor(index/3),long=index>=7;
  const nodes={L:[0,2],R:[6,2],X:[2,1],Y:[4,1],U:[3,0],D:[3,4]},routes=[['A','L','X','Y','R','a'],['B','R','Y','X','L','b'],['C','U','X','Y','D','c']].slice(0,count);
  Object.assign(nodes,{A:[-1,2],a:[7,2],B:[6,1],b:[0,1],C:[3,-1],c:[3,5]});
  if(!long)routes[1]=count>1?['B','R','Y','X','L','b']:undefined;
  routes.length=count;
  const switches=routes.map((route,i)=>({node:route[1],choices:rng.shuffle([route[2],'broken-'+i]),desired:route[2]}));
  switches.forEach((sw,i)=>nodes['broken-'+i]=[nodes[sw.node][0],nodes[sw.node][1]+(i===1?-1.2:1.2)]);
  // Approach blocks change the number of occupied ticks before the shared line.
  routes.forEach((route,i)=>{const blocks=seed?rng.int(0,2):index%3,from=nodes[route[0]],to=nodes[route[1]],approach=[];for(let j=0;j<blocks;j++){const id=`approach-${i}-${j}`,t=(j+1)/(blocks+1);nodes[id]=[from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t];approach.push(id);}route.splice(1,0,...approach);});
  // A longer shared block adds an occupied interior cell, not merely decoration.
  if(long){nodes.M=[3,1];routes.forEach(route=>{const a=route.indexOf('X'),b=route.indexOf('Y');if(Math.abs(a-b)===1)route.splice(Math.max(a,b),0,'M');});}
  const links=[];routes.forEach(route=>route.slice(1).forEach((n,j)=>{if(!links.some(e=>e.includes(n)&&e.includes(route[j])))links.push([route[j],n]);}));
  switches.forEach((s,i)=>links.push([s.node,'broken-'+i]));
  return {index,nodes,routes,switches,links};
}
export const initial=l=>({positions:l.routes.map(r=>r[0]),enabled:l.routes.map(()=>false),points:l.switches.map(()=>0),arrived:l.routes.map(()=>false),ticks:0});
export const won=(l,s)=>s.arrived.every(Boolean);
export function apply(l,s,a) {
  if(a?.type==='point'&&Number.isInteger(a.point)&&l.switches[a.point]){const n=copy(s);n.points[a.point]^=1;return yes(n,'switch');}
  if(a?.type==='signal'&&Number.isInteger(a.train)&&l.routes[a.train]&&!s.arrived[a.train]){const n=copy(s);n.enabled[a.train]=!n.enabled[a.train];return yes(n,'signal');}
  if(a?.type!=='step')return no(s);
  const next=[...s.positions];let moved=false;
  for(let i=0;i<next.length;i++){
    if(!s.enabled[i]||s.arrived[i])continue;
    const route=l.routes[i],at=route.indexOf(next[i]);if(at<0)return no(s,'broken-track');
    next[i]=next[i]===l.switches[i].node?l.switches[i].choices[s.points[i]]:route[at+1];
    if(!next[i]||next[i].startsWith('broken'))return no(s,'broken-track');moved=true;
  }
  if(!moved)return no(s,'signals-red');
  for(let i=0;i<next.length;i++)for(let j=i+1;j<next.length;j++){
    if(s.arrived[i]||s.arrived[j])continue;
    if(next[i]===next[j]||(next[i]===s.positions[j]&&next[j]===s.positions[i]))return no(s,'track-occupied');
  }
  const n=copy(s);n.positions=next;n.ticks++;
  n.arrived=next.map((p,i)=>p===l.routes[i].at(-1));n.enabled=n.enabled.map((v,i)=>v&&!n.arrived[i]);
  return yes(n,n.arrived.some((v,i)=>v&&!s.arrived[i])?'arrive':'move');
}
export function solve(l,s=initial(l)) {
  const actions=[];let at=copy(s);const act=a=>{const r=apply(l,at,a);if(!r.ok)throw Error(r.reason);at=r.state;actions.push(a);};
  for(let i=0;i<l.routes.length;i++)if(at.enabled[i])act({type:'signal',train:i});
  for(let i=0;i<l.routes.length;i++){
    if(at.arrived[i])continue;
    if(l.switches[i].choices[at.points[i]]!==l.switches[i].desired)act({type:'point',point:i});
    act({type:'signal',train:i});let budget=20;
    while(!at.arrived[i]&&budget--)act({type:'step'});
  }return actions;
}
export function hint(l,s){try{return solve(l,s)[0];}catch{return {type:'undo'};}}
export function controls(l,s){return [...l.routes.map((_,i)=>button(`${String.fromCharCode(65+i)} ${s.enabled[i]?'停车':'放行'}`,`${String.fromCharCode(65+i)} ${s.enabled[i]?'Stop':'Go'}`,{type:'signal',train:i},{disabled:s.arrived[i]})),...l.switches.map((sw,i)=>button(`道岔 ${i+1} · ${s.points[i]+1}`,`Points ${i+1} · ${s.points[i]+1}`,{type:'point',point:i})),button('前进一步','Advance one tick',{type:'step'})];}
export function view(l,s){return {size:10,objects:[{id:'base',type:'base',x:3,z:2,w:9.5,h:6.5},...[[0,4],[1,4],[5,4],[6,4],[0,0],[6,0]].map(([x,z],i)=>({id:'tree-'+i,type:'tree',x,z})),...l.links.map(([a,b],i)=>({id:'rail-'+i,type:'rail',x:l.nodes[a][0],z:l.nodes[a][1],to:l.nodes[b]})),...l.routes.flatMap((r,i)=>[{id:'station-'+i,type:'station',x:l.nodes[r.at(-1)][0],z:l.nodes[r.at(-1)][1],label:String.fromCharCode(65+i),color:i},{id:'train-'+i,type:'train',x:l.nodes[s.positions[i]][0],z:l.nodes[s.positions[i]][1],heading:Math.PI/2,label:'',color:i,on:s.arrived[i]}]),...l.switches.map((sw,i)=>({id:'point-'+i,type:'lever',x:l.nodes[sw.node][0],z:l.nodes[sw.node][1],label:String(i+1),on:!!s.points[i],action:{type:'point',point:i}}))],stats:[[s.arrived.filter(Boolean).length+'/'+l.routes.length,'到站','Arrivals'],[s.ticks,'时步','Ticks']]};}
export const lesson=['同一段轨道同一时刻只能有一辆车。两车迎面交换位置也不安全；红灯等待能让出共用路段。','Only one train may occupy a track cell. Swapping cells head-on is also unsafe. A red signal can keep a shared section clear.'];
