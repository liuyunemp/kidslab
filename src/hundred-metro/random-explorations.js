import { copy, fingerprint, generateRound, remember, uint32 } from './random-core.js';

export const supportsRandom = course => course.category === 'math' && ['add','subtract','relay','column','compare','quantity','count','money','shape'].includes(course.kind);
const inside = n => Number.isInteger(n) && n >= 0 && n <= 100;
const sign = n => Math.sign(n);
const regroup = (a,b,subtract) => subtract ? a % 10 < b % 10 : a % 10 + b % 10 >= 10;
const operandClass = n => n === 0 ? 'zero' : n === 100 ? 'hundred' : n < 10 ? 'ones' : n % 10 === 0 ? 'tens' : n < 20 ? 'teens' : 'two-digits';
const domain = n => Array.from({length:101},(_,i)=>i).filter(i=>operandClass(i)===operandClass(n));
const coinPresent = (budget, coin) => {
  for (const value of [10000,5000,2000,1000,500,100,50,10,5,2,1]) {
    if (value === coin) return Math.floor(budget / value) > 0;
    budget %= value;
  }
  return false;
};
export function validActivity(course, base, a) {
  if (!a || a.id !== base.id) return false;
  const kind = course.kind;
  if (kind === 'shape') return Array.isArray(a.initialPositions) && a.initialPositions.length === base.pieces.length &&
    a.initialPositions.every((p,i)=>Number.isFinite(p.x)&&Math.abs(p.x-(-3.6+i*1.8))<=.2&&[.8,1.8,2.8].includes(p.z)) &&
    a.initialRotations?.length === base.pieces.length && a.initialRotations.every(n=>[0,1,2,3].includes(n));
  if (kind === 'money') {
    if (!Number.isInteger(a.budget)||!Number.isInteger(a.price)||a.price<1||a.price>a.budget||a.budget>10000) return false;
    if (base.exchangeOnly) return a.exchangeCoin===base.exchangeCoin && coinPresent(a.budget,a.exchangeCoin);
    return a.price % (base.price%10 ? 1 : base.price%100 ? 10 : 100) === 0 && a.budget % 100 === 0 && a.budget <= Math.max(base.budget,100) && a.budget >= base.budget / 2;
  }
  if (![a.a,a.b,a.c??0].every(inside)) return false;
  if (!['a','b',...(kind==='relay'?['c']:[])].every(key=>operandClass(a[key])===operandClass(base[key]))) return false;
  if (kind === 'count') return a.a>=10;
  if (kind === 'compare') return sign(a.a-a.b)===sign(base.a-base.b);
  if (kind === 'quantity') return a.relation===base.relation && (a.relation==='compare' ? sign(a.a-a.b)===sign(base.a-base.b) : a.relation==='decrease' ? a.a>=a.b : a.a+a.b<=100);
  const subtract=kind==='subtract'||base.op==='-';
  const value=subtract?a.a-a.b:a.a+a.b, original=subtract?base.a-base.b:base.a+base.b;
  if (!inside(value)||regroup(a.a,a.b,subtract)!==regroup(base.a,base.b,subtract)) return false;
  if ((original===100)!==(value===100)) return false;
  return kind!=='relay'||(inside(value-a.c)&&regroup(value,a.c,true)===regroup(original,base.c,true));
}

export function activityIdentity(a) {
  return Object.fromEntries(['a','b','c','op','relation','budget','price','exchangeCoin','initialPositions','initialRotations'].filter(k=>a[k]!==undefined).map(k=>[k,a[k]]));
}

// Enumerate legal pairs once. This avoids bias toward easy no-carry questions and rejection loops.
const pools = new Map();
export function generateActivity(course, base, rng) {
  if (course.kind==='shape') return {...copy(base),initialPositions:base.pieces.map((_,i)=>({x:-3.6+i*1.8,z:rng.pick([.8,1.8,2.8])})),initialRotations:base.pieces.map(()=>rng.int(0,3))};
  if (course.kind==='money') {
    if(base.exchangeOnly){const budgets=Array.from({length:9},(_,i)=>(i+1)*base.exchangeCoin).filter(n=>coinPresent(n,base.exchangeCoin));return {...copy(base),budget:rng.pick(budgets)};}
    const budget=rng.int(Math.max(1,Math.ceil(base.budget/200)),base.budget/100)*100;
    const unit=base.price%10?1:base.price%100?10:100;
    return {...copy(base),budget,price:rng.int(1,Math.floor(budget/unit))*unit};
  }
  const key=course.kind+fingerprint(base);
  if(!pools.has(key)){
    const values=[];
    for(const a of domain(base.a))for(const b of domain(base.b)) {
      const candidate={...base,a,b};
      if(course.kind==='relay') {
        const cs=domain(base.c).filter(c=>validActivity(course,base,{...candidate,c}));
        if(cs.length)values.push({a,b,cs});
      }else if(validActivity(course,base,candidate))values.push({a,b});
    }
    pools.set(key,values);
  }
  const picked=rng.pick(pools.get(key));
  return {...copy(base),a:picked.a,b:picked.b,...(picked.cs?{c:rng.pick(picked.cs)}:{})};
}

export function classicActivity(base) {
  return base.pieces?{...copy(base),initialPositions:base.pieces.map((_,i)=>({x:-3.6+i*1.8,z:1.8})),initialRotations:base.pieces.map(()=>0)}:copy(base);
}

export function activityRound(course, index, seed, previous=null, classic=false) {
  if(!supportsRandom(course)||!uint32(seed)||!Number.isInteger(index)||index<0||index>=course.activities.length)throw new RangeError('Invalid activity round');
  const base=course.activities[index], round=previous?previous.round+1:0, recent=previous?.recent??[];
  const record=generateRound({seed,levelId:base.id,round,recent:classic?[]:recent,
    generate:({rng})=>classic?classicActivity(base):generateActivity(course,base,rng),
    validate:a=>validActivity(course,base,a),identify:activityIdentity,fallback:()=>classicActivity(base)});
  return {...record,mode:classic?'classic':'random',recent:remember(recent,record.fingerprint)};
}
