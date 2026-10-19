const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export function validTriangle(points){
  if(!Array.isArray(points)||points.length!==3||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=.12&&p.x<=.88&&p.y>=.14&&p.y<=.82))return false;
  const [a,b,c]=points;
  return Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))>.015;
}
export function triangleExperiment(base,rng){
  if(base.type==='frame')return {...base,width:rng.int(40,60),height:rng.int(40,58)};
  if(base.type==='angles')return {...base,triangles:base.triangles.map(()=>[
    {x:rng.int(16,30)/100,y:rng.int(65,78)/100},
    {x:rng.int(40,65)/100,y:rng.int(18,35)/100},
    {x:rng.int(75,85)/100,y:rng.int(65,78)/100},
  ])};
  return {...base,sets:base.sets.map(set=>{
    const a=rng.int(2,5),b=rng.int(a,6),[x,y,z]=[...set.lengths].sort((a,b)=>a-b);
    const c=x+y===z?a+b:x+y<z?a+b+rng.int(1,3):rng.int(b,a+b-1);
    return {lengths:[a,b,c],canBuild:a+b>c};
  })};
}
export function validTriangleExperiment(a,base){
  if(!a||a.type!==base.type)return false;
  if(a.type==='frame')return integer(a.width,40,60)&&integer(a.height,40,58);
  if(a.type==='angles')return Array.isArray(a.triangles)&&a.triangles.length===3&&a.triangles.every(validTriangle);
  return Array.isArray(a.sets)&&a.sets.length===base.sets.length&&a.sets.every((s,i)=>{
    if(!Array.isArray(s.lengths)||s.lengths.length!==3||!s.lengths.every(n=>integer(n,1,14)))return false;
    const [x,y,z]=[...s.lengths].sort((a,b)=>a-b),[u,v,w]=[...base.sets[i].lengths].sort((a,b)=>a-b);
    return Math.sign(x+y-z)===Math.sign(u+v-w)&&s.canBuild===(x+y>z);
  });
}
export function tangram(base,rng){
  const mirror=rng.pick([-1,1]),dx=rng.int(-4,4)/100,dy=rng.int(-3,0)/100;
  return {targets:base.targets.map(([x,y,r,f])=>[Number(((mirror===1?x:1-x)+dx).toFixed(6)),Number((y+dy).toFixed(6)),((mirror*r)%360+360)%360,mirror*f]),
    mirror,dx,dy,rotations:base.rotations.map(()=>rng.int(0,7)*45)};
}
export function validTangram(a,base){
  if(!a||![-1,1].includes(a.mirror)||!Number.isFinite(a.dx)||Math.abs(a.dx)>.04||!Number.isFinite(a.dy)||a.dy<-.03||a.dy>0||!Array.isArray(a.targets)||a.targets.length!==7||!Array.isArray(a.rotations)||a.rotations.length!==7||!a.rotations.every(n=>integer(n,0,315)&&n%45===0))return false;
  return a.targets.every(([x,y,r,f],i)=>{
    const [u,v,s,g]=base.targets[i];
    return x>=.08&&x<=.92&&y>=.12&&y<=.8&&Math.abs(x-((a.mirror===1?u:1-u)+a.dx))<1e-7&&Math.abs(y-v-a.dy)<1e-7&&r===((a.mirror*s)%360+360)%360&&f===a.mirror*g;
  });
}
export const validTangramPlay=s=>s&&integer(s.selected,0,6)&&Array.isArray(s.pieces)&&s.pieces.length===7&&s.pieces.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-.25&&p.x<=1.25&&p.y>=-.25&&p.y<=1.25&&integer(p.rotation,0,315)&&p.rotation%45===0&&[-1,1].includes(p.flip)&&typeof p.placed==='boolean');
export function fenceMetrics(s,kind){
  const extra=kind==='l'?s.ew*s.eh:0;
  return {area:s.w*s.h+extra,perimeter:kind==='wall'?s.w+2*s.h:2*(s.w+s.h+(kind==='l'?s.ew:0))};
}
export function fenceSolutions(a){
  const out=[];
  for(let w=1;w<=12;w++)for(let h=1;h<=8;h++)for(let ew=1;ew<=(a.kind==='l'?Math.min(5,12-w):1);ew++)for(let eh=1;eh<=(a.kind==='l'?h-1:1);eh++){
    const s={w,h,ew,eh},m=fenceMetrics(s,a.kind);
    if(a.kind==='reverse'?m.area===a.area&&m.perimeter<=a.goalPerimeter:m.perimeter===a.budget&&m.area>=a.goal)out.push(s);
  }
  return out;
}
export function fence(base,rng){
  const a={...base,start:{w:rng.int(1,6),h:rng.int(2,7),ew:rng.int(1,3),eh:1}};
  if(base.kind==='normal'){
    const gap=Math.floor((base.budget/2)**2/4)-base.goal;
    const budgets=[base.budget-4,base.budget,base.budget+4].filter(n=>n>=12&&n<=24);
    a.budget=rng.pick(budgets);a.goal=Math.floor((a.budget/2)**2/4)-gap;
  }else if(base.kind==='wall'){
    a.budget=rng.pick([12,16,20]);a.goal=a.budget*a.budget/8;
  }else if(base.kind==='l'){
    const s={w:rng.int(3,5),h:rng.int(3,5),ew:rng.int(1,3),eh:rng.int(1,2)};
    const m=fenceMetrics(s,'l');a.budget=m.perimeter;a.goal=m.area;
  }else{
    const w=rng.int(3,6),h=rng.int(w,6);a.area=w*h;a.goalPerimeter=2*(w+h);
  }
  return a;
}
export const validFence=(a,base)=>a&&a.kind===base.kind&&a.start&&integer(a.start.w,1,12)&&integer(a.start.h,1,10)&&fenceSolutions(a).length>0;
