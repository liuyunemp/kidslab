import {random,copy,yes,no,levelIndex,dirs,same,posKey,arrows,gridObjects,path} from './model-utils.js';
const inside=(l,p)=>p[0]>=0&&p[1]>=0&&p[0]<l.w&&p[1]<l.h&&!l.walls.some(x=>same(x,p));
export function makeLevel(index,seed=0){
  levelIndex(index);const rng=random(seed),w=6,h=6,count=1+Math.floor(index/3);
  const walls=[];if(index%3===2)walls.push([2,2]);if(index===4)walls.push([1,1],[4,1]);
  const goals=Array.from({length:count},(_,i)=>[i+1,4]);
  const l={index,w,h,walls,goals,start:{player:[4,4],boxes:copy(goals),moves:0},witness:[]};
  let p=[4,4],boxes=copy(goals),reverse=[];
  // Reverse legal pulls produce a forward-playable puzzle, including the player's route.
  for(let k=0;k<12+index*7;k++){
    const options=[];
    for(const [dir,d] of Object.entries(dirs)){
      const next=[p[0]+d[0],p[1]+d[1]],behind=[p[0]-d[0],p[1]-d[1]];
      if(!inside(l,next)||boxes.some(b=>same(b,next)))continue;
      options.push({dir,next,box:boxes.findIndex(b=>same(b,behind))});
    }
    if(!options.length)break;
    const pulls=options.filter(o=>o.box>=0),o=rng.pick(pulls.length&&rng()<.7?pulls:options);
    if(o.box>=0)boxes[o.box]=[...p];p=o.next;
    reverse.push({type:'move',dir:{up:'down',down:'up',left:'right',right:'left'}[o.dir]});
  }
  l.start={player:p,boxes,moves:0};l.witness=reverse.reverse();
  if(boxes.every(b=>goals.some(g=>same(g,b)))){
    // A short guaranteed alternative when a reverse walk returns to its starting arrangement.
    l.walls=[];l.start={player:[1,2],boxes:goals.map(([x])=>[x,3]),moves:0};
    l.witness=[];let cursor=[1,2],obstacles=copy(l.start.boxes);
    for(let i=0;i<count;i++){const route=path(cursor,[i+1,2],w,h,obstacles)||[];l.witness.push(...route,{type:'move',dir:'down'});cursor=[i+1,3];obstacles[i]=[i+1,4];}
  }
  return l;
}
export const initial=l=>copy(l.start);
export const won=(l,s)=>s.boxes.every(b=>l.goals.some(g=>same(g,b)));
export function apply(l,s,a){
  if(a?.type!=='move'||!dirs[a.dir])return no(s,'invalid');
  const d=dirs[a.dir],p=[s.player[0]+d[0],s.player[1]+d[1]];
  if(!inside(l,p))return no(s,'blocked');
  const box=s.boxes.findIndex(b=>same(b,p)),n=copy(s);
  if(box>=0){const to=[p[0]+d[0],p[1]+d[1]];if(!inside(l,to)||s.boxes.some(b=>same(b,to)))return no(s,'blocked');n.boxes[box]=to;}
  n.player=p;n.moves++;return yes(n,box>=0?'push':'move');
}
export const solve=l=>copy(l.witness);
export const controls=()=>arrows();
export function hint(l,s){
  const key=a=>posKey(a.player)+'/'+a.boxes.map(posKey).sort().join(';'),seen=new Set([key(s)]),q=[[s,null]];
  for(let i=0;i<q.length&&i<18000;i++){
    const [at,first]=q[i];if(won(l,at))return first;
    for(const dir of Object.keys(dirs)){const a={type:'move',dir},r=apply(l,at,a);if(!r.ok)continue;const k=key(r.state);if(seen.has(k))continue;seen.add(k);q.push([r.state,first||a]);}
  }return {type:'undo'};
}
export function view(l,s){return {size:7,objects:[...gridObjects(l.w,l.h,l.walls),...l.goals.map((p,i)=>({id:'goal-'+i,type:'dock',x:p[0],z:p[1],label:String(i+1)})),...s.boxes.map((p,i)=>({id:'box-'+i,type:'crate',x:p[0],z:p[1],on:l.goals.some(g=>same(g,p)),label:String(i+1)})),{id:'cart',type:'robot',x:s.player[0],z:s.player[1],label:'↟',draggable:true}],stats:[[s.boxes.filter(b=>l.goals.some(g=>same(g,b))).length+'/'+l.goals.length,'货物到位','Docked crates']]};}
export const lesson=['箱子只能推，不能拉。先想好推完后，人还能不能绕到另一侧；卡住时可以撤销。','Crates can be pushed, not pulled. Leave a route to walk around them. Undo if a crate becomes stuck.'];
