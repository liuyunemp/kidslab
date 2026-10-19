// Numeric lesson generators. All values use the existing lesson's units and controls.
const whole = (n,min,max) => Number.isInteger(n)&&n>=min&&n<=max;
const digits = n => String(n).length;
function carryPattern(a,b,sub){
  const result=[];let carry=0;
  for(let i=0;i<4;i++){
    const x=Math.floor(a/10**i)%10,y=Math.floor(b/10**i)%10;
    carry=sub?Number(x-y-carry<0):Number(x+y+carry>=10);result.push(carry);
  }
  return result.join('');
}
export function arithmetic(base,rng){
  const sub=base.op==='subtract',pattern=carryPattern(base.a,base.b,sub);let a=0,b=0,carry=0;
  for(let i=0;i<Math.max(digits(base.a),digits(base.b));i++){
    const values=n=>i>=digits(n)?[0]:Array.from({length:10},(_,d)=>d).filter(d=>!(i===digits(n)-1&&d===0)&&!(Math.floor(n/10**i)%10===0&&d!==0));
    const pairs=[];for(const x of values(base.a))for(const y of values(base.b))if((sub?Number(x-y-carry<0):Number(x+y+carry>=10))===Number(pattern[i])&&!(sub&&i===digits(base.a-base.b)-1&&x-y-carry===0))pairs.push([x,y]);
    const [x,y]=rng.pick(pairs);a+=x*10**i;b+=y*10**i;carry=Number(pattern[i]);
  }
  return {...base,a,b};
}
export function validArithmetic(value,base){
  const sub=base.op==='subtract',answer=sub?value.a-value.b:value.a+value.b,old=sub?base.a-base.b:base.a+base.b;
  return whole(value.a,1,9999)&&whole(value.b,1,9999)&&whole(answer,0,9999)&&digits(value.a)===digits(base.a)&&digits(value.b)===digits(base.b)&&digits(answer)===digits(old)&&carryPattern(value.a,value.b,sub)===carryPattern(base.a,base.b,sub);
}
export const fraction=(base,rng)=>{const den=rng.int(2,12);return {num:rng.int(1,den),den};};
export const validFraction=a=>a&&whole(a.den,1,12)&&whole(a.num,0,a.den);
export function clock(base,rng){
  const step=base.target%60===0?60:base.target%30===0?30:15;
  const period=n=>n<720?'morning':n<780?'noon':n<1080?'afternoon':n<1200?'evening':'night';
  const targets=Array.from({length:3},(_,i)=>base.target+(i-1)*step).filter(n=>period(n)===base.period);
  const target=rng.pick(targets),start=target-rng.int(5,11)*5;
  return {...base,target,start};
}
export function validClock(a,base){return whole(a.target,0,1439)&&whole(a.start,0,1439)&&a.target>a.start&&(a.target-a.start)%5===0&&a.target-a.start<=55&&Math.abs(a.target-base.target)<=60;}
export function orchard(base,rng){
  if(base.odd){const pair=rng.pick([[3,6],[4,6],[4,8],[6,8]]);return {...base,n:pair[0]*pair[1]-1,example:pair};}
  if(base.split)return {...base,n:rng.int(2,6)*rng.int(2,4)+rng.int(2,6)*rng.int(2,4)};
  const max=Math.min(8,Math.ceil(Math.sqrt(base.n))+1),rows=rng.int(2,max),cols=rng.int(2,Math.min(9,Math.ceil(base.n/rows)+1));
  return {...base,n:rows*cols};
}
export function orchardSplitWitness(n){
  for(let h=1;h<=8;h++)for(let w=1;w<=5;w++)for(let h2=1;h2<=8;h2++)for(let w2=1;w2<=4;w2++)if(h*w+h2*w2===n)return [{r0:0,r1:h-1,c0:0,c1:w-1},{r0:0,r1:h2-1,c0:8,c1:7+w2}];
  return null;
}
export function validOrchard(a){return whole(a.n,4,72)&& (a.odd?Array.isArray(a.example)&&a.example[0]*a.example[1]===a.n+1:a.split?Boolean(orchardSplitWitness(a.n)): Array.from({length:8},(_,i)=>i+1).some(r=>a.n%r===0&&a.n/r<=12));}
const options=n=>[n,Math.max(0,n-1),n+1,n+2];
export function grid(base,rng){
  if(base.division){const per=rng.int(21,29),floors=rng.int(8,13);return {...base,per,floors,total:per*floors,answers:{total:options(floors)}};}
  const a=base.a<20?rng.int(11,19):rng.int(21,29),b=base.b<10?rng.int(2,9):rng.int(11,19);
  const split=n=>[Math.floor(n/10)*10,n%10].filter(Boolean),columns=split(a),rows=split(b),answers={total:options(a*b)};
  for(const x of columns)for(const y of rows)answers[x*y]=options(x*y);
  return {...base,a,b,columns,rows,answers};
}
export function validGrid(a){
  if(a.division)return whole(a.per,1,99)&&whole(a.floors,1,13)&&a.total===a.per*a.floors&&a.answers.total.includes(a.floors);
  return whole(a.a,11,29)&&whole(a.b,2,19)&&a.columns.reduce((n,x)=>n+x,0)===a.a&&a.rows.reduce((n,x)=>n+x,0)===a.b&&a.answers.total.includes(a.a*a.b)&&a.columns.every(x=>a.rows.every(y=>a.answers[x*y]?.includes(x*y)));
}
export function rolling(base,rng){
  const d=rng.int(5,30)/10,laps=rng.int(2,10);
  if(base.type==='forward')return {...base,d,laps};
  const choices=[d,d+.5,d+1];return {...base,dist:Number((d*Math.PI*laps).toFixed(1)),laps,choices};
}
export const validRolling=a=>whole(a.laps,2,10)&&(a.type==='forward'?a.d>=.5&&a.d<=3:a.choices.filter(d=>Math.abs(d-a.dist/(Math.PI*a.laps))<=.15).length===1);
export const rollingSetup=(base,rng)=>({...base,radius:rng.int(35,95),slices:rng.pick([8,16,24,32])});
export const validRollingSetup=a=>whole(a.radius,35,95)&&[8,16,24,32].includes(a.slices);
export function validRollingPlay(s){
  return s&&validRollingSetup(s)&&['roll','area','challenge'].includes(s.mode)&&whole(s.qIndex,0,5)&&Number.isFinite(s.roll)&&s.roll>=0&&s.roll<=1&&[0,1].includes(s.areaTarget)&&Array.isArray(s.records)&&s.records.length<=61&&s.records.every(r=>Number.isFinite(r.d)&&r.d>=70&&r.d<=190&&Math.abs(r.c-Math.PI*r.d)<1e-7&&Math.abs(r.ratio-Math.PI)<1e-12);
}
export function balance(base,rng){
  const answer=base.left.x===1?rng.int(11,29):rng.int(3,9);
  return {...base,answer,left:{...base.left},right:{...base.right,c:(base.left.x-base.right.x)*answer+base.left.c}};
}
export function validBalance(a,base){
  return whole(a.answer,1,29)&&a.left.x===base.left.x&&a.right.x===base.right.x&&a.left.c===base.left.c&&a.right.c===(a.left.x-a.right.x)*a.answer+a.left.c;
}
export function validBalanceState(s,a){
  if(!s||!Array.isArray(s.steps)||s.steps.length>10)return false;
  const left={...a.left},right={...a.right};
  for(const step of s.steps){
    if(!whole(step.amount,1,100))return false;
    if(step.type==='x'){left.x-=step.amount;right.x-=step.amount;}
    else if(step.type==='constant'){left.c-=step.amount;right.c-=step.amount;}
    else if(step.type==='divide'){for(const side of [left,right])for(const k of ['x','c'])side[k]/=step.amount;}
    else return false;
    if(![left.x,left.c,right.x,right.c].every(n=>whole(n,0,100)))return false;
  }
  if(!['left','right'].every((k,i)=>['x','c'].every(p=>s[k]?.[p]===[left,right][i][p])))return false;
  const solved=left.x===1&&left.c===0&&right.x===0&&right.c===a.answer;
  return (!s.solved||solved)&&(!s.completed||s.solved);
}
export function alienSolution(a){
  const {creatures,eyes,legs}=a.target;
  const quad=creatures===null?(3*eyes-legs)/2:legs-3*creatures;
  return {quad,tri:creatures===null?eyes-2*quad:creatures-quad};
}
export function alien(base,rng){
  if(base.target.creatures!==null){const n=base.target.creatures,quad=rng.int(2,n-2);return {...base,target:{...base.target,legs:3*n+quad}};}
  const pairs=[];for(let tri=3;tri<=10;tri++)for(let quad=3;quad<=9;quad++)if(3*tri+4*quad<=56)pairs.push([tri,quad]);
  const [tri,quad]=rng.pick(pairs);return {...base,target:{creatures:null,eyes:tri+2*quad,legs:3*tri+4*quad}};
}
export function validAlien(a,base){
  if(!a?.target||a.target.creatures!==base.target.creatures)return false;
  const {tri,quad}=alienSolution(a);
  return whole(tri,1,20)&&whole(quad,1,20)&&3*tri+4*quad===a.target.legs&&(a.target.eyes===null||tri+2*quad===a.target.eyes);
}

export function closetFamily(base) {
  if(base.mode==='stock')return [6,8,10,12,18,20,24,30].map(target=>({...base,target}));
  const family=[];
  for(let h=1;h<=base.hats.length;h++)for(let t=1;t<=base.tops.length;t++)
    if(h*t>=2)family.push({...base,hats:base.hats.slice(0,h),tops:base.tops.slice(0,t)});
  return family;
}
export const closetIdentity=a=>a.mode==='stock'?{target:a.target}:{hats:a.hats.length,tops:a.tops.length};
export const closet=(base,rng)=>rng.pick(closetFamily(base));
export function validCloset(a,base){
  if(a?.mode!==base.mode)return false;
  if(a.mode==='stock')return closetFamily(base).some(x=>x.target===a.target)&&a.ordersNeeded===2;
  return ['hats','tops'].every(k=>Array.isArray(a[k])&&a[k].length>0&&a[k].length<=base[k].length&&new Set(a[k]).size===a[k].length&&a[k].every(x=>base[k].includes(x)))&&a.hats.length*a.tops.length>=2;
}
export function validClosetPlay(s,a){
  if(!s||!Array.isArray(s.discovered)||!Array.isArray(s.foundOrders)||!whole(s.stockHats,2,6)||!whole(s.stockTops,2,6))return false;
  if(a.mode==='collect'){
    const keys=a.hats.flatMap(h=>a.tops.map(t=>`${h}:${t}`));
    return s.discovered.every(x=>keys.includes(x))&&new Set(s.discovered).size===s.discovered.length&&(!s.wornHat||a.hats.includes(s.wornHat))&&(!s.wornTop||a.tops.includes(s.wornTop))&&(!s.completed||s.discovered.length===keys.length);
  }
  return s.foundOrders.length<=2&&s.foundOrders.every(x=>whole(x.hats,2,6)&&whole(x.tops,2,6)&&x.hats*x.tops===a.target)&&new Set(s.foundOrders.map(x=>`${x.hats},${x.tops}`)).size===s.foundOrders.length&&(!s.completed||s.foundOrders.length===2);
}
export function factorPairs(value){
  const result=[];
  for(let a=2;a*a<=value;a++)if(value%a===0)result.push([a,value/a]);
  return result;
}
export function primeFactors(value){
  const result=[];
  for(let d=2;d<=value;d++)while(value%d===0){result.push(d);value/=d;}
  return result;
}
export function crystalFamily(base){
  return (base.kind==='first'?[8,12,18]:[12,18,20,28]).map(target=>({...base,target}));
}
export function crystal(base,rng){
  if(base.kind!=='wall')return rng.pick(crystalFamily(base));
  const hits=rng.shuffle(Array.from({length:10},(_,i)=>3*(i+1))).slice(0,7);
  const misses=rng.shuffle(Array.from({length:21},(_,i)=>i+10).filter(x=>x%3)).slice(0,3);
  return {...base,numbers:[...hits,...misses].sort((a,b)=>a-b)};
}
export function validCrystal(a,base){
  if(a?.kind!==base.kind)return false;
  if(a.kind!=='wall')return crystalFamily(base).some(x=>x.target===a.target)&&primeFactors(a.target).length===3;
  return Array.isArray(a.numbers)&&a.numbers.length===10&&new Set(a.numbers).size===10&&a.numbers.every(n=>whole(n,3,30))&&a.numbers.filter(n=>n%3===0).length===7;
}
export function factorOptions(value){
  const pairs=factorPairs(value);
  for(const pair of [[2,2],[2,3],[3,3],[2,5],[4,5]])if(pair[0]*pair[1]!==value&&pairs.length<4)pairs.push(pair);
  return pairs;
}
export function validFactorPlay(s,target){
  if(!s||!Array.isArray(s.history)||s.history.length>6)return false;
  const leaves=[target];
  for(const step of s.history){
    const i=leaves.findIndex(x=>factorPairs(x).length>0);
    if(i<0||leaves[i]!==step.from||!Array.isArray(step.pair)||step.pair.length!==2||!step.pair.every(n=>whole(n,2,target))||step.pair[0]*step.pair[1]!==step.from)return false;
    leaves.splice(i,1,...step.pair);
  }
  return JSON.stringify(leaves)===JSON.stringify(s.leaves)&&Boolean(s.solved)===leaves.every(n=>factorPairs(n).length===0);
}
