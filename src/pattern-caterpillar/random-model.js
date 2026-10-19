import {fingerprint} from './random-core.js';

// Names and hues do not define a new repeating rule. Preserve ordinal counts/sizes.
export function patternIdentity(a){
  const maps={};
  const normalize=items=>items.map(item=>Object.fromEntries(Object.entries(item).map(([k,v])=>{
    if(k==='count'||k==='size')return [k,v];
    const values=maps[k]??(maps[k]=[]);if(!values.includes(v))values.push(v);return [k,values.indexOf(v)];
  })));
  return {key:a.key,pattern:normalize(a.kind==='reverse'?(a.initial??[]):a.pattern)};
}
export function patternFamily(base){
  let raw=[];
  if(base.kind==='reverse'){
    raw=[Array(4).fill(base.choices[0]),[0,1,0,1].map(i=>base.choices[i])].map(initial=>({...base,initial}));
  }else{
    const patterns=base.key==='l11'?[1,2,3].map(start=>[0,1,2].map(n=>({count:start+n}))):[base.pattern];
    for(const pattern of patterns)for(let offset=0;offset<pattern.length;offset++){
      const rotated=pattern.map((_,i)=>pattern[(i+offset)%pattern.length]);
      raw.push({...base,pattern:rotated,choices:base.key==='l11'?[1,2,3,4,5].map(count=>({count})):base.choices,initial:[]});
    }
  }
  return [...new Map(raw.map(a=>[fingerprint(patternIdentity(a)),a])).values()];
}
export const patternTask=(base,rng)=>rng.pick(patternFamily(base));
export function validPattern(a,base){
  if(!a||a.key!==base.key||a.kind!==base.kind||a.bites!==base.bites||a.hint!==base.hint)return false;
  return [base,...patternFamily(base)].some(b=>fingerprint({pattern:a.pattern,choices:a.choices,initial:a.initial??[]})===fingerprint({pattern:b.pattern,choices:b.choices,initial:b.initial??[]}));
}
export function inferPattern(seq){
  for(let p=1;p<=3;p++)if(seq.length>=p*2&&seq.every((item,i)=>fingerprint(item)===fingerprint(seq[i%p])))return p;
  return 0;
}
export function patternSpeech(a,seq,lang){
  const words={zh:{red:'红色',yellow:'黄色',blue:'蓝色',green:'绿色',circle:'圆形',star:'星形',square:'方形',small:'小',big:'大',drum:'咚',clap:'嚓',bell:'叮',jump:'跳',spin:'转',sleep:'趴'},en:{red:'red',yellow:'yellow',blue:'blue',green:'green',circle:'circle',star:'star',square:'square',small:'small',big:'big',drum:'boom',clap:'clap',bell:'ding',jump:'jump',spin:'spin',sleep:'rest'}};
  const names=seq.map(item=>Object.entries(item).map(([k,v])=>k==='count'?String(v):words[lang]?.[v]??v).join(' ')).join(lang==='zh'?'，':', ');
  return lang==='zh'?`${names}。${a.kind==='reverse'?'接着摆，让毛毛虫找规律。':'看看这组怎样重复，选下一个。'}`:`${names}. ${a.kind==='reverse'?'Keep arranging a repeating pattern.':'Look for the repeating unit. Choose the next item.'}`;
}

export const CATERPILLAR_LEVELS = [
    { key: 'l1', kind: 'visual', pattern: [{ color: 'red' }, { color: 'yellow' }], choices: [{ color: 'red' }, { color: 'yellow' }, { color: 'blue' }], bites: 8, hint: 'visual' },
    { key: 'l2', kind: 'visual', pattern: [{ shape: 'circle' }, { shape: 'star' }], choices: [{ shape: 'circle' }, { shape: 'star' }, { shape: 'square' }], bites: 8, hint: 'visual' },
    { key: 'l3', kind: 'visual', pattern: [{ color: 'red' }, { color: 'yellow' }, { color: 'blue' }], choices: [{ color: 'red' }, { color: 'yellow' }, { color: 'blue' }, { color: 'green' }], bites: 9, hint: 'visual' },
    { key: 'l4', kind: 'visual', pattern: [{ color: 'green' }, { color: 'blue' }, { color: 'blue' }], choices: [{ color: 'green' }, { color: 'blue' }, { color: 'yellow' }], bites: 9, hint: 'visual' },
    { key: 'l5', kind: 'visual', pattern: [{ color: 'red', size: 'small' }, { color: 'red', size: 'big' }], choices: [{ color: 'red', size: 'small' }, { color: 'red', size: 'big' }, { color: 'yellow', size: 'big' }], bites: 8, hint: 'visual' },
    { key: 'l6', kind: 'sound', pattern: [{ sound: 'drum' }, { sound: 'drum' }, { sound: 'clap' }], choices: [{ sound: 'drum' }, { sound: 'clap' }, { sound: 'bell' }], bites: 9, hint: 'sound' },
    { key: 'l7', kind: 'sound', pattern: [{ sound: 'bell' }, { sound: 'drum' }, { sound: 'bell' }, { sound: 'clap' }], choices: [{ sound: 'bell' }, { sound: 'drum' }, { sound: 'clap' }], bites: 8, hint: 'sound' },
    { key: 'l8', kind: 'action', pattern: [{ action: 'jump' }, { action: 'jump' }, { action: 'spin' }], choices: [{ action: 'jump' }, { action: 'spin' }, { action: 'sleep' }], bites: 9, hint: 'action' },
    { key: 'l9', kind: 'action', pattern: [{ action: 'jump' }, { action: 'spin' }, { action: 'sleep' }], choices: [{ action: 'jump' }, { action: 'spin' }, { action: 'sleep' }], bites: 9, hint: 'action' },
    { key: 'l10', kind: 'visual', pattern: [{ color: 'red', shape: 'circle' }, { color: 'yellow', shape: 'star' }, { color: 'red', shape: 'square' }, { color: 'yellow', shape: 'circle' }, { color: 'red', shape: 'star' }, { color: 'yellow', shape: 'square' }], choices: [{ color: 'red', shape: 'circle' }, { color: 'yellow', shape: 'circle' }, { color: 'blue', shape: 'circle' }], bites: 10, hint: 'dual' },
    { key: 'l11', kind: 'visual', pattern: [{ count: 1 }, { count: 2 }, { count: 3 }], choices: [{ count: 1 }, { count: 2 }, { count: 3 }, { count: 4 }], bites: 9, hint: 'visual' },
    { key: 'l12', kind: 'reverse', pattern: [], choices: [{ color: 'red' }, { color: 'yellow' }, { color: 'blue' }, { color: 'green' }], bites: 6, hint: 'reverse' },
  ];
