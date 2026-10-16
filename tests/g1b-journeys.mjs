import { ids } from '../scripts/g1b-sync.mjs';
export const courses = await Promise.all(ids.map(async id => (await import(`../src/${id}/content.js`)).course));
// User journeys, not a completion shortcut: the browser performs these through real controls.
export function journey(c, a) {
 const k=c.kind;
 if(k==='character')return [{type:'assemble',index:0},{type:'dismantle'},{type:'assemble',index:1}];
 if(k==='writing')return a.strokes.map(points=>({type:'trace',points:points.flatMap((p,i)=>i?Array.from({length:8},(_,j)=>p.map((v,d)=>points[i-1][d]+(v-points[i-1][d])*(j+1)/8)):[p])}));
 if(k==='word')return [0,1].flatMap(index=>[{type:'variant',index},{type:'place'},{type:'act'}]);
 if(k==='dictionary'){const e=a.entries.find(v=>v.char===a.target);return [{type:'initial',value:e.initial},{type:'syllable',value:e.syllable},{type:'entry',value:e.char}];}
 if(k==='sentence')return [0,1,2].map(slot=>({type:'slot',slot,index:1})).concat({type:'play'});
 if(k==='poetry')return a.lines.map(()=>({type:'move'}));
 if(k==='story')return [{type:'play'},{type:'evidence'},{type:'swap',from:0,to:1},{type:'swap',from:1,to:2},{type:'play'}];
 if(k==='speaking')return [0,1,2].map(index=>({type:'include',index})).concat({type:'play'});
 if(k==='shape')return a.pieces.map((_,index)=>({type:'shift',index})).concat({type:'rotate',index:0});
 if(k==='count')return [{type:'unbundle'},{type:'bundle'},{type:'step',delta:a.a===100?-1:1,side:'a'}];
 if(k==='compare'){const delta=a.a<=a.b?1:-1;return Array.from({length:Math.max(2,Math.abs(a.a-a.b))},()=>({type:'step',side:'a',delta}));}
 if(k==='quantity')return [a.relation==='part'?{type:'transfer',delta:1}:a.relation==='compare'?{type:'step',side:'a',delta:1}:{type:'operate'},{type:'layout'}];
 if(k==='money'){
  if(a.exchangeOnly)return [{type:'exchange',coin:a.exchangeCoin}];
  const actions=[];let left=a.budget;for(const coin of [10000,5000,2000,1000,500,100,50,10,5,2,1]){const n=Math.floor(left/coin);left%=coin;for(let i=0;i<n;i++)actions.push({type:'coin',coin});}return actions.concat({type:'buy'});
 }
 const actions=k==='column'?[{type:'align'}]:[];const sub=k==='subtract'||a.op==='-';
 if(sub&&a.a%10<a.b%10)actions.push({type:'unbundle'});
 actions.push({type:'operate'});const n=sub?a.a-a.b:a.a+a.b;
 if(!sub&&a.a%10+a.b%10>=10)actions.push({type:'bundle'});
 if(k==='relay'){if(n%10<a.c%10)actions.push({type:'unbundle'});actions.push({type:'depart'});}
 return actions;
}
