import {random,copy,yes,no,levelIndex,button} from './model-utils.js';
export function affected(l,k){
  const x=k%l.n,y=Math.floor(k/l.n);
  if(l.index===0)return [k];
  if(l.index===3)return Array.from({length:l.n*l.n},(_,i)=>i%l.n===x||Math.floor(i/l.n)===y?i:-1).filter(i=>i>=0);
  return [[x,y],[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>a>=0&&b>=0&&a<l.n&&b<l.n).map(([a,b])=>b*l.n+a);
}
export function makeLevel(index,seed=0){
  levelIndex(index);const rng=random(seed),n=index>=6?4:3;
  const l={index,n,allowed:Array.from({length:n*n},(_,i)=>i),target:Array(n*n).fill(0)};
  if(index===7)l.allowed=l.allowed.filter(i=>i%3!==1);
  if(index===8)l.target=l.target.map((_,i)=>Number(i%n===Math.floor(i/n)||i%n+Math.floor(i/n)===n-1));
  l.start=[...l.target];l.witness=rng.shuffle(l.allowed).slice(0,Math.min(l.allowed.length,1+index));
  for(const k of l.witness)for(const a of affected(l,k))l.start[a]^=1;
  if(l.start.every((v,i)=>v===l.target[i])){l.witness=[l.allowed[0]];for(const k of affected(l,l.allowed[0]))l.start[k]^=1;}
  return l;
}
export const initial=l=>({lights:[...l.start],moves:0});
export const won=(l,s)=>s.moves>0&&s.lights.every((v,i)=>v===l.target[i]);
export function apply(l,s,a){if(a?.type!=='flip'||!l.allowed.includes(a.cell))return no(s,'locked-switch');const next=copy(s);for(const k of affected(l,a.cell))next.lights[k]^=1;next.moves++;return yes(next);}
export function solve(l,s=initial(l)){
  const rows=s.lights.map((v,i)=>[...l.allowed.map(k=>Number(affected(l,k).includes(i))),v^l.target[i]]);
  let r=0;const pivots=[];
  for(let c=0;c<l.allowed.length;c++){const at=rows.findIndex((row,i)=>i>=r&&row[c]);if(at<0)continue;
    [rows[r],rows[at]]=[rows[at],rows[r]];
    for(let j=0;j<rows.length;j++)if(j!==r&&rows[j][c])rows[j]=rows[j].map((v,k)=>v^rows[r][k]);
    pivots.push(c);r++;
  }
  return pivots.filter((c,i)=>rows[i].at(-1)).map(c=>({type:'flip',cell:l.allowed[c]}));
}
export const controls=()=>[];
export const hint=(l,s)=>solve(l,s)[0];
export function view(l,s){return {size:l.n+1,overhead:true,objects:s.lights.map((on,k)=>({id:'lamp-'+k,type:'lamp',x:k%l.n*1.15,z:Math.floor(k/l.n)*1.15,on,target:l.target[k],locked:!l.allowed.includes(k),label:String(k+1),action:l.allowed.includes(k)?{type:'flip',cell:k}:null})),stats:[[s.lights.filter((v,i)=>v===l.target[i]).length+'/'+l.n**2,'匹配','Matched'] ]};}
export const lesson=['同一个开关按两次会回到原样。重叠的灯会被每次操作分别翻转。','Pressing the same switch twice restores its lights. Overlapping lights flip once for each operation.'];
