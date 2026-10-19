import test from 'node:test';
import assert from 'node:assert/strict';
import {random} from '../../scripts/random-rounds/core.js';
import {detectiveClassic,detectiveTask,validDetective,detectiveLinkDeductions} from '../../scripts/random-rounds/detective.js';
import {LEGACY_CASES} from '../../src/detective-board/classic-cases.js';
function verify(a){
  const results=[],solution={},used=a.dims.map(()=>new Set()),slots=a.people.flatMap(p=>a.dims.map((d,i)=>({p:p.id,d,i})));
  function visit(k){
    if(k<slots.length){const {p,d,i}=slots[k];solution[p]??={};for(const v of d.values)if(!used[i].has(v.id)){used[i].add(v.id);solution[p][d.id]=v.id;visit(k+1);used[i].delete(v.id);}return;}
    const truths=a.clues.map(c=>c.rules.every(r=>{
      if(r.kind==='is')return solution[r.person][r.dimId]===r.val;if(r.kind==='not')return solution[r.person][r.dimId]!==r.val;
      const same=a.people.some(p=>solution[p.id][r.dimA]===r.valA&&solution[p.id][r.dimB]===r.valB);return r.neg?!same:same;
    }));if(truths.filter(x=>!x).length===(a.liar?1:0))results.push({solution:JSON.parse(JSON.stringify(solution)),falseClue:truths.indexOf(false)});
  }visit(0);return results;
}
test('a linked attribute excluded for a person excludes its partner for that person',()=>{
  assert.deepEqual(detectiveLinkDeductions({kind:'link',dimA:'event',valA:'throw',dimB:'number',valB:'44',neg:false},[{id:'ann'}],{'ann|number|44':'no'}),[{key:'ann|event|throw',mark:'no'}]);
});
for(const [i,raw] of LEGACY_CASES.entries())test(`detective ${i}: 100 instances independently have one assignment and one false witness when required`,()=>{
  const base=detectiveClassic(raw);assert.ok(validDetective(base,base));
  for(let seed=0;seed<100;seed++){
    const a=detectiveTask(base,random(seed));assert.deepEqual(a,detectiveTask(base,random(seed)));assert.ok(validDetective(a,base));const s=verify(a);assert.equal(s.length,1);assert.deepEqual(s[0].solution,a.solution);if(a.liar)assert.equal(s[0].falseClue,a.falseClue);
    for(const lang of ['zh','en'])for(const p of a.people)for(const d of a.dims)assert.ok(a.story.some(x=>x[lang].includes(p.name[lang])&&x[lang].includes(d.values.find(v=>v.id===a.solution[p.id][d.id]).name[lang])));
  }
  assert.equal(validDetective({...base,clues:[]},base),false);assert.equal(validDetective({...base,story:[]},base),false);
});
