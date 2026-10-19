const clone=a=>JSON.parse(JSON.stringify(a));
function permutations(xs){if(!xs.length)return [[]];return xs.flatMap(x=>permutations(xs.filter(a=>a!==x)).map(t=>[x,...t]));}
export function detectiveRule(r,s){
  if(r.kind==='is')return s[r.person][r.dimId]===r.val;
  if(r.kind==='not')return s[r.person][r.dimId]!==r.val;
  if(r.kind==='link'){const owner=Object.keys(s).find(p=>s[p][r.dimA]===r.valA);return (s[owner][r.dimB]===r.valB)!==r.neg;}
  throw new RangeError('Unknown clue');
}
export function detectiveSolutions(a,limit=2){
  const choices=a.dims.map(d=>permutations(d.values.map(v=>v.id))),solutions=[];
  function visit(i,s){
    if(i<a.dims.length){for(const values of choices[i]){const next=clone(s);a.people.forEach((p,j)=>next[p.id][a.dims[i].id]=values[j]);visit(i+1,next);if(solutions.length>=limit)return;}return;}
    const wrong=a.clues.map((c,i)=>c.rules.every(r=>detectiveRule(r,s))?-1:i).filter(i=>i>=0);
    if(wrong.length===(a.liar?1:0))solutions.push({solution:s,falseClue:wrong[0]??null});
  }
  visit(0,Object.fromEntries(a.people.map(p=>[p.id,{}])));return solutions;
}
export function detectiveLabels(a){
  const label=(rule,lang)=>{
    const person=id=>a.people.find(p=>p.id===id).name[lang],dim=id=>a.dims.find(d=>d.id===id),value=(d,v)=>dim(d).values.find(x=>x.id===v).name[lang];
    if(rule.kind==='is'||rule.kind==='not')return lang==='zh'?`${person(rule.person)}的${dim(rule.dimId).name.zh}${rule.kind==='not'?'不是':'是'}${value(rule.dimId,rule.val)}`:`${person(rule.person)}: ${dim(rule.dimId).name.en} ${rule.kind==='not'?'is not':'is'} ${value(rule.dimId,rule.val)}`;
    return lang==='zh'?`${value(rule.dimA,rule.valA)}的主人，${dim(rule.dimB).name.zh}${rule.neg?'不是':'是'}${value(rule.dimB,rule.valB)}`:`The ${value(rule.dimA,rule.valA)} owner ${rule.neg?'does not have':'has'} ${value(rule.dimB,rule.valB)}`;
  };
  a.clues=a.clues.map(c=>({...c,label:Object.fromEntries(['zh','en'].map(lang=>[lang,c.rules.map(r=>label(r,lang)).join(lang==='zh'?'；':'; ')+(lang==='zh'?'。':'.')]))}));
  a.story=a.people.map(p=>Object.fromEntries(['zh','en'].map(lang=>[lang,`${p.name[lang]}：${a.dims.map(d=>`${d.name[lang]} ${d.values.find(v=>v.id===a.solution[p.id][d.id]).name[lang]}`).join(lang==='zh'?'，':', ')}。`])));
  if(a.liar)a.story.push({zh:`假证词：${a.clues[a.falseClue].label.zh}`,en:`False testimony: ${a.clues[a.falseClue].label.en}`});return a;
}
// Repair ambiguous legacy examples with the minimum additional matching evidence.
export function detectiveClassic(raw){
  const a=clone(raw);
  if(a.liar){
    const [p,q,r,s]=a.people.map(p=>p.id),d=a.dims[0].id,is=p=>({kind:'is',person:p,dimId:d,val:a.solution[p][d]});
    a.clues=[{rules:[is(p),is(q)]},{rules:[is(q),is(r)]},{rules:[{...is(r),val:a.solution[p][d]}],falseRule:true},{rules:[is(s),is(p)]}];a.falseClue=2;
  }else {
    for(let count=0;count<a.size*a.dims.length;count++){
      const solutions=detectiveSolutions(a,2);if(solutions.length===1&&JSON.stringify(solutions[0].solution)===JSON.stringify(a.solution))break;
      const other=solutions.find(x=>JSON.stringify(x.solution)!==JSON.stringify(a.solution));if(!other)throw new Error('Inconsistent classic case');
      const p=a.people.find(p=>a.dims.some(d=>a.solution[p.id][d.id]!==other.solution[p.id][d.id])).id,d=a.dims.find(d=>a.solution[p][d.id]!==other.solution[p][d.id]).id;
      a.clues.push({rules:[{kind:'is',person:p,dimId:d,val:a.solution[p][d]}],falseRule:false});
    }
  }
  return detectiveLabels(a);
}
export function detectiveTask(base,rng){
  const a=clone(base),people={};
  const names=rng.shuffle(a.people.map(p=>p.id));a.people.forEach((p,i)=>people[p.id]=names[i]);
  const values=Object.fromEntries(a.dims.map(d=>{const v=rng.shuffle(d.values.map(v=>v.id));return [d.id,Object.fromEntries(d.values.map((x,i)=>[x.id,v[i]]))];}));
  a.solution=Object.fromEntries(base.people.map(p=>[people[p.id],Object.fromEntries(a.dims.map(d=>[d.id,values[d.id][base.solution[p.id][d.id]]]))]));
  for(const c of a.clues)for(const r of c.rules){
    if(r.person){r.person=people[r.person];r.val=values[r.dimId][r.val];}
    else{r.valA=values[r.dimA][r.valA];r.valB=values[r.dimB][r.valB];}
  }
  a.clues=rng.shuffle(a.clues);if(a.liar)a.falseClue=a.clues.findIndex(c=>c.falseRule);
  return detectiveLabels(a);
}
export function detectiveIdentity(a){return a.clues.map(c=>c.rules.map(r=>JSON.stringify(r)).sort().join(';')).sort();}
export function detectiveLinkDeductions(rule,people,marks){
  const out=[],key=(p,d,v)=>`${p}|${d}|${v}`;
  for(const person of people){const a=key(person.id,rule.dimA,rule.valA),b=key(person.id,rule.dimB,rule.valB);
    for(const [from,to] of [[a,b],[b,a]]){
      const mark=marks[from];if(rule.neg){if(mark==='yes'&&!marks[to])out.push({key:to,mark:'no'});}
      else if(['yes','no'].includes(mark)&&!marks[to])out.push({key:to,mark});
    }
  }return out;
}
export function validDetective(a,base){
  if(!a||a.size!==base.size||JSON.stringify(a.people)!==JSON.stringify(base.people)||JSON.stringify(a.dims)!==JSON.stringify(base.dims)||Boolean(a.liar)!==Boolean(base.liar)||!Array.isArray(a.clues)||a.clues.length!==base.clues.length)return false;
  try{
    if(a.dims.some(d=>new Set(a.people.map(p=>a.solution[p.id][d.id])).size!==a.size||a.people.some(p=>!d.values.some(v=>v.id===a.solution[p.id][d.id]))))return false;
    for(const [i,c] of a.clues.entries()){
      if(!Array.isArray(c.rules)||!c.rules.length||Boolean(c.falseRule)!==Boolean(a.liar&&i===a.falseClue))return false;
      if(c.rules.every(r=>detectiveRule(r,a.solution))===Boolean(a.liar&&i===a.falseClue))return false;
    }
    const s=detectiveSolutions(a);if(s.length!==1||s[0].falseClue!==(a.liar?a.falseClue:null)||a.people.some(p=>a.dims.some(d=>s[0].solution[p.id][d.id]!==a.solution[p.id][d.id])))return false;
    const expected=detectiveLabels(clone(a));return JSON.stringify(expected.clues)===JSON.stringify(a.clues)&&JSON.stringify(expected.story)===JSON.stringify(a.story);
  }catch{return false;}
}
