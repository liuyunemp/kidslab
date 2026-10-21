import test from 'node:test';import assert from 'node:assert/strict';import * as m from '../../src/river-sandbox/river-sandbox-model.js';import {adventureSuite} from './adventure-suite.mjs';
adventureSuite('river-sandbox',m);
test('dredging removes a real blockage, accounts for removed sediment and permits recovery',()=>{
  const l=m.makeLevel(7);let s=m.initial(l);
  assert.equal(m.apply(l,s,{type:'dredge',cell:0}).ok,false);
  for(const cell of l.channel){if(!s.depth[cell])s=m.apply(l,s,{type:'dig',cell}).state;s=m.apply(l,s,{type:'bank',cell}).state;}
  for(let i=0;i<12;i++)s=m.tick(l,s);
  assert.equal(s.out[l.goals[0]],0);assert.ok(s.water[l.blocked]>0);
  s=m.apply(l,s,{type:'dredge',cell:l.blocked}).state;
  assert.equal(s.removed,1);assert.ok(Math.abs(m.sedimentBalance(s))<1e-8);
  for(const action of m.solve(l,s))s=m.apply(l,s,action).state;
  assert.ok(m.won(l,s));assert.ok(Math.abs(m.waterBalance(s))<1e-8);assert.ok(Math.abs(m.sedimentBalance(s))<1e-8);
});
test('river conserves water and sediment and keeps all stores nonnegative',()=>{const l=m.makeLevel(8);let s=m.initial(l);for(let i=0;i<30;i++)if(!l.village.includes(i)&&!s.depth[i])s=m.apply(l,s,{type:'dig',cell:i}).state;for(let tick=0;tick<500;tick++){s=m.tick(l,s);assert.ok(Math.abs(m.waterBalance(s))<1e-8);assert.ok(Math.abs(m.sedimentBalance(s))<1e-8);for(const key of ['water','silt','bed','deposited','out'])assert.ok(s[key].every(x=>Number.isFinite(x)&&x>=-1e-10));}assert.ok(s.eroded>0);});
test('settling and bank protection have observable effects, and slope comparison requires both runs',()=>{const l=m.makeLevel(4);let s=m.initial(l);for(const i of l.channel){if(!s.depth[i])s=m.apply(l,s,{type:'dig',cell:i}).state;}let unprotected=s;for(let i=0;i<30;i++)unprotected=m.tick(l,unprotected);for(const i of l.channel)s=m.apply(l,s,{type:'bank',cell:i}).state;for(const i of l.goals)s=m.apply(l,s,{type:'pool',cell:i}).state;for(let i=0;i<30;i++)s=m.tick(l,s);assert.ok(unprotected.eroded>s.eroded);assert.ok(unprotected.sedimentOut>s.sedimentOut);assert.ok(s.deposited.some(v=>v>0));});
