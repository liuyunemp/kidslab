export function icecreamAnswer(a){const cone=a.cone[0]**2*a.cone[1],cyl=3*a.cyl[0]**2*a.cyl[1];return cone===cyl?'equal':cone>cyl?'cone':'cyl';}
export function icecreamTask(base,rng){
  if(base.kind==='lathe')return {...base,r:rng.int(1,4),h:rng.int(2,8)};
  if(base.kind==='triple'){
    const cups=base.cups.map((s,i)=>({...s,r:(rng.int(80,90)+i*25)/100,h:(rng.int(210,230)+i*50)/100}));
    return {...base,cups,control:{r:rng.int(50,60)/100,h:rng.int(140,160)/100}};
  }
  const r=rng.int(2,5),height=rng.int(2,5),delta=base.ans==='equal'?0:base.ans==='cone'?1:-1;
  const a={...base,cone:[r,(height+delta)*3],cyl:[r,height]};a.ans=icecreamAnswer(a);return a;
}
export function validIcecream(a,base){
  if(!a||a.kind!==base.kind)return false;
  if(a.kind==='lathe')return Number.isInteger(a.r)&&a.r>=1&&a.r<=4&&Number.isInteger(a.h)&&a.h>=2&&a.h<=8;
  if(a.kind==='triple')return Array.isArray(a.cups)&&a.cups.length===3&&a.cups.every((c,i)=>c.key===['S','M','L'][i]&&Number.isFinite(c.r)&&Number.isFinite(c.h)&&c.r>=.8&&c.r<=1.4&&c.h>=2.1&&c.h<=3.3&&(i===0||c.r>a.cups[i-1].r&&c.h>a.cups[i-1].h))&&a.control&&a.control.r>=.5&&a.control.r<=.8&&a.control.h>=1.4&&a.control.h<=2&&a.cups.every(c=>icecreamRatio(a.control,c)<1/3);
  return ['cone','cyl'].every(k=>Array.isArray(a[k])&&a[k].length===2&&a[k].every(Number.isInteger)&&a[k][0]>=2&&a[k][0]<=5&&a[k][1]>=1&&a[k][1]<=18)&&a.ans===base.ans&&icecreamAnswer(a)===a.ans;
}
export function icecreamRatio(cone,cup){return cone.r**2*cone.h/(3*cup.r**2*cup.h);}
export function icecreamOrders(base){const all=[];for(let r=2;r<=5;r++)for(let h=2;h<=5;h++){const delta=base.ans==='equal'?0:base.ans==='cone'?1:-1;all.push({...base,cone:[r,3*(h+delta)],cyl:[r,h]});}return all;}
export function validIcecreamPlay(s,kind){
  if(!s||typeof s!=='object')return false;
  if(kind==='lathe')return Number.isInteger(s.shape)&&s.shape>=0&&s.shape<4&&Number.isInteger(s.r)&&s.r>=1&&s.r<=4&&Number.isInteger(s.h)&&s.h>=2&&s.h<=8&&Number.isFinite(s.phi)&&s.phi>=0&&s.phi<=2*Math.PI;
  if(kind==='triple')return Number.isInteger(s.sizeIdx)&&s.sizeIdx>=0&&s.sizeIdx<3&&Number.isInteger(s.scoops)&&s.scoops>=0&&s.scoops<=100&&Array.isArray(s.records)&&s.records.length<=3&&new Set(s.records.map(r=>r.key)).size===s.records.length&&s.records.every(r=>['S','M','L'].includes(r.key)&&r.scoops===3);
  return typeof s.answered==='boolean';
}
