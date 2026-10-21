import test from 'node:test';import assert from 'node:assert/strict';import * as m from '../../src/gear-playground/gear-playground-model.js';import {adventureSuite} from './adventure-suite.mjs';
adventureSuite('gear-playground',m);
test('scene angular rates use rpm and an interrupted drive stops all connected animation',()=>{
  const l=m.makeLevel(0);let s=m.initial(l);for(const action of m.solve(l))s=m.apply(l,s,action).state;
  assert.equal(m.view(l,s).objects.find(o=>o.id==='gear-0').spin,12*Math.PI/30);
  s=m.apply(l,s,{type:'gear',slot:1,teeth:0}).state;
  assert.ok(m.view(l,s).objects.filter(o=>'spin'in o).every(o=>o.spin===0));
});
test('gear speed ratio, idler cancellation and shared axle speed follow geometry',()=>{const l=m.makeLevel(6),r=m.analyse(l.slots,l.edges,l.design,l.input);assert.equal(r.rates[1],-6);assert.equal(r.rates[2],-6);assert.equal(r.rates[3],2);const idler=m.makeLevel(3),x=m.analyse(idler.slots,idler.edges,idler.design,12);assert.equal(x.rates.at(-1),12);const bad=m.analyse(l.slots,l.edges,[24,24,12,36],12);assert.equal(bad.rates[1],null);});
test('odd external mesh cycle stops conflicting transmission',()=>{const r=m.analyse([{x:0,z:0},{x:1.2,z:0},{x:.6,z:Math.sqrt(1.08)}],[[0,1,'mesh'],[1,2,'mesh'],[2,0,'mesh']],[24,24,24]);assert.equal(r.reason,'gear-conflict');assert.ok(r.rates.every(v=>v===null));});
