export function pigeonFamily(base){
  const min=base.kind==='sock'?2:base.kind==='letter'?20:8,max=base.kind==='sock'?3:base.kind==='letter'?26:12;
  return Array.from({length:max-min+1},(_,i)=>({...base,drawers:min+i,categories:Array.from({length:min+i},(_,j)=>j)}));
}
export const pigeonTask=(base,rng)=>rng.pick(pigeonFamily(base));
export function validPigeon(a,base){
  return a?.id===base.id&&a.kind===base.kind&&a.mode===base.mode&&a.need===base.need&&pigeonFamily(base).some(p=>p.drawers===a.drawers&&JSON.stringify(p.categories)===JSON.stringify(a.categories));
}
export const pigeonSure=a=>a.drawers*(a.need-1)+1;
export function pigeonCopy(a,key,lang){
  const match=/^m\d(Title|Text|Rule|Lesson|Hint|Formula|Win|Ready)$/.exec(key);if(!match)return null;
  const zh=lang==='zh',n=a.drawers,k=a.need,p=pigeonSure(a),scope=a.kind==='month'?(zh?`只邀请 ${n} 个指定生日月的客人`:`Guests have birthdays only in the ${n} listed months`):a.kind==='letter'?(zh?`只邀请首字母属于这 ${n} 个字母的客人`:`Guests use only the ${n} listed initials`):(zh?`抽屉里只有 ${n} 种颜色的袜子`:`The drawer holds only ${n} sock colors`);
  const text={
    Title:zh?`${n} 个类别，怎样保证至少 ${k} 个一样？`:`${n} categories: how can you guarantee ${k} alike?`,
    Text:zh?`${scope}。${a.mode==='construct'?'请来客人，放入对应的抽屉。':'算好稳赢数，再观察最坏情况。'}`:`${scope}. ${a.mode==='construct'?'Invite a guest and choose a bin.':'Find the sure number, then inspect the worst case.'}`,
    Rule:zh?`每个抽屉最多先放 ${k-1} 个，共 ${n*(k-1)} 个还可能不够；再来 1 个必有 ${k} 个同类。`:`Up to ${k-1} in each bin gives ${n*(k-1)} without ${k} alike. One more guarantees ${k}.`,
    Lesson:`${n} × (${k} − 1) + 1 = ${p}`,
    Hint:zh?`先让每个抽屉都有 ${k-1} 个，再看多出来的那一个。`:`Put ${k-1} in every bin, then consider one extra.`,
    Formula:zh?`抽屉 ${n} · 保证 ≥${k}`:`Bins ${n} · guarantee ≥${k}`,
    Win:zh?`第 ${p} 位也进来了，至少一个抽屉有 ${k} 位！`:`Guest ${p} is here: at least one bin has ${k}!`,
    Ready:zh?(a.mode==='construct'?'请来第一位客人。':'算出稳赢数，开赌。'):(a.mode==='construct'?'Invite the first guest.':'Find the sure number.'),
  };return text[match[1]];
}
