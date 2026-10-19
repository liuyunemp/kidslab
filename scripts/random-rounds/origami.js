export function foldReflect(point,fold){
  if(fold==='v50')return {c:3-point.c,r:point.r};if(fold==='h50')return {c:point.c,r:3-point.r};if(fold==='v25')return {c:1-point.c,r:point.r};if(fold==='h25')return {c:point.c,r:1-point.r};throw new RangeError('Unknown fold');
}
export function foldHoles(level){let points=[level.punch];for(const fold of [...level.folds].reverse())points=[...points,...points.map(p=>foldReflect(p,fold))];return [...new Set(points.map(p=>`${p.c},${p.r}`))].sort();}
export function foldFamily(base){
  const cols=base.folds.includes('v25')?1:base.folds.includes('v50')?2:4,rows=base.folds.includes('h25')?1:base.folds.includes('h50')?2:4,all=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)all.push({...base,punch:{c,r}});return all;
}
export function foldTask(base,rng){return rng.pick(foldFamily(base));}
export function validFold(a,base){return a?.code===base.code&&JSON.stringify(a.folds)===JSON.stringify(base.folds)&&foldFamily(base).some(b=>b.punch.c===a.punch?.c&&b.punch.r===a.punch?.r)&&foldHoles(a).length===2**a.folds.length&&foldHoles(a).every(p=>/^[0-3],[0-3]$/.test(p));}
export function foldIdentity(a){return {folds:a.folds,holes:foldHoles(a)};}
