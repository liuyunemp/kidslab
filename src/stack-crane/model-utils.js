// Shared author source; adventure:sync copies it into each standalone course.
export { random, copy, fingerprint, seedFrom, remember } from './random-core.js';
export const yes = (state, event = 'change') => ({ok:true,state,event});
export const no = (state, reason = 'invalid') => ({ok:false,state,reason});
export function levelIndex(i) { if (!Number.isInteger(i) || i < 0 || i > 8) throw new RangeError('Level must be 0–8'); }
export const dirs = {up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
export const same = (a,b) => a[0] === b[0] && a[1] === b[1];
export const posKey = p => p.join(',');
export const button = (zh,en,action,extra={}) => ({label:[zh,en],action,...extra});
export const arrows = () => Object.entries({up:['↑ 向前','↑ North'],left:['← 向左','← West'],down:['↓ 向后','↓ South'],right:['→ 向右','→ East']}).map(([dir,label])=>({label,action:{type:'move',dir}}));
export function gridObjects(w,h,walls=[]) { return Array.from({length:w*h},(_,i)=>({id:'tile-'+i,type:walls.some(p=>same(p,[i%w,Math.floor(i/w)]))?'wall':'tile',x:i%w,z:Math.floor(i/w)})); }
export function path(from,to,w,h,blocked=[]) {
  const q=[[from,[]]],seen=new Set([posKey(from)]);
  for(let i=0;i<q.length;i++) { const [p,route]=q[i];if(same(p,to))return route;
    for(const [dir,d] of Object.entries(dirs)){const n=[p[0]+d[0],p[1]+d[1]],k=posKey(n);if(n[0]<0||n[1]<0||n[0]>=w||n[1]>=h||seen.has(k)||blocked.some(b=>same(b,n)))continue;seen.add(k);q.push([n,[...route,{type:'move',dir}]]);}
  } return null;
}
export function replay(model,level,actions,state=model.initial(level)) {
  for(const action of actions) { const r=model.apply(level,state,action);if(!r.ok)return null;state=r.state; } return state;
}
export const close = (a,b) => Math.abs(a-b)<1e-8;
export const LIMITS = Object.freeze({depth:6,instructions:64,steps:1024});
