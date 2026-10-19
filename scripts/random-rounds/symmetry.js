const integer=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
export function inkTask(base,rng){
  if(base.kind==='hatch')return {...base,positions:rng.shuffle([130,200,270,340].flatMap(x=>[110,185,260,335].map(y=>({x,y})))).slice(0,6)};
  if(base.kind==='mirror'){
    const options=rng.shuffle([65,130,195,260]).slice(0,3).sort((a,b)=>a-b),order=rng.shuffle([0,1,2]);
    return {...base,options,rounds:[120,235,350].map((y,i)=>({y:y+rng.int(-15,15),distance:options[order[i]],correct:order[i],color:['berry','ocean','lime'][i]}))};
  }
  return {...base,impostor:rng.int(0,2),spot:{x:rng.pick([-1,1])*rng.pick([32,44,56]),y:rng.pick([0,60,75])}};
}
export function inkDetails(a,index){
  const points=[[-38,-34,'eye'],[38,-34,'eye'],[-36,-31,'pupil'],[36,-31,'pupil'],[-22,52,'tooth'],[22,52,'tooth'],[-65,25,'spot'],[65,25,'spot'],[-72,-62,'spot'],[72,-62,'spot']];
  if(index===a.impostor)points.push([a.spot.x,a.spot.y,'spot']);return points;
}
export const symmetricDetails=points=>points.every(([x,y,k])=>points.some(([xx,yy,kk])=>xx===-x&&yy===y&&kk===k));
export function validInk(a,base){
  if(a?.kind!==base.kind)return false;
  if(a.kind==='hatch')return Array.isArray(a.positions)&&a.positions.length===6&&a.positions.every(p=>integer(p.x,100,400)&&integer(p.y,80,390))&&new Set(a.positions.map(p=>`${p.x}/${p.y}`)).size===6;
  if(a.kind==='mirror')return Array.isArray(a.options)&&a.options.length===3&&a.options.every(n=>integer(n,60,270))&&a.options.every((n,i)=>!i||n-a.options[i-1]>=55)&&Array.isArray(a.rounds)&&a.rounds.length===3&&a.rounds.every(r=>integer(r.y,80,390)&&integer(r.correct,0,2)&&r.distance===a.options[r.correct]&&['berry','ocean','lime'].includes(r.color));
  return integer(a.impostor,0,2)&&a.spot&&integer(Math.abs(a.spot.x),30,60)&&integer(a.spot.y,0,80)&&[0,1,2].filter(i=>!symmetricDetails(inkDetails(a,i))).length===1;
}
export const inkIdentity=a=>a.kind==='mirror'?{kind:a.kind,options:a.options,rounds:a.rounds.map(({y,distance})=>({y,distance}))}:a;
export function inkVerdict(a,lang){return lang==='zh'?`抓到了！${a.impostor+1} 号怪只有${a.spot.x<0?'左':'右'}边多了一颗斑点。`:`Caught it! Monster ${a.impostor+1} has one extra spot on the ${a.spot.x<0?'left':'right'}.`;}
