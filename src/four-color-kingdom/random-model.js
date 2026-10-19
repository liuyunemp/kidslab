const EPS=1e-6;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function polygonArea(p){return Math.abs(p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-a[1]*b[0];},0))/2;}
export function shareBorder(a,b){
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
    if(Math.abs(cross(p,q,r))>EPS||Math.abs(cross(p,q,s))>EPS)continue;
    const axis=Math.abs(q[0]-p[0])>Math.abs(q[1]-p[1])?0:1;
    if(Math.min(Math.max(p[axis],q[axis]),Math.max(r[axis],s[axis]))-Math.max(Math.min(p[axis],q[axis]),Math.min(r[axis],s[axis]))>EPS)return true;
  }return false;
}
export function colorSolution(a,palette=['rose','sun','mint','sky'].slice(0,a.budget)){
  const colors={...a.fixed},order=[...a.regions].sort((a,b)=>b.neighbors.length-a.neighbors.length);
  if(Object.values(colors).some(c=>!palette.includes(c)))return null;
  function assign(i){
    if(i===order.length)return true;const r=order[i],choices=colors[r.id]?[colors[r.id]]:palette;
    for(const c of choices)if(r.neighbors.every(n=>colors[n]!==c)){colors[r.id]=c;if(assign(i+1))return true;}
    if(!a.fixed[r.id])delete colors[r.id];return false;
  }return assign(0)?colors:null;
}
function clip(poly,nx,ny,value){
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],da=a[0]*nx+a[1]*ny-value,db=b[0]*nx+b[1]*ny-value;
    if(da<=EPS)out.push(a);if((da< -EPS&&db>EPS)||(da>EPS&&db< -EPS)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }return out;
}
export function voronoiPolygons(sites){return sites.map((a,i)=>{
  let p=[[8,8],[92,8],[92,92],[8,92]];
  for(let j=0;j<sites.length;j++)if(i!==j){const b=sites[j];p=clip(p,b[0]-a[0],b[1]-a[1],(b[0]**2+b[1]**2-a[0]**2-a[1]**2)/2);}
  return p;
});}
function shape(a){
  a.regions.forEach(r=>{r.d=`M${r.polygon.map(p=>p.join(' ')).join(' L')} Z`;r.neighbors=a.regions.filter(s=>s.id!==r.id&&shareBorder(r.polygon,s.polygon)).map(s=>s.id);});
  a.solution=colorSolution(a);return a;
}
export function coloringTask(base,rng){
  const a=JSON.parse(JSON.stringify(base));a.kind='voronoi';
  const count=a.regions.length,outer=count===7?5:count-1,angle=rng.int(0,359)*Math.PI/180,cx=rng.int(47,53),cy=rng.int(47,53);
  const sites=Array.from({length:outer},(_,i)=>{const r=rng.int(28,31),t=angle+i*2*Math.PI/outer;return [Math.round(cx+r*Math.cos(t)),Math.round(cy+r*Math.sin(t))];});
  if(count===7)sites.push([cx-10,cy],[cx+10,cy]);else sites.push([cx,cy]);a.sites=rng.shuffle(sites);
  if(a.sites.some((p,i)=>a.sites.some((q,j)=>i!==j&&Math.hypot(p[0]-q[0],p[1]-q[1])<18)))throw new RangeError('Sites too close');
  const polygons=voronoiPolygons(a.sites);a.regions.forEach((r,i)=>{r.polygon=polygons[i];r.label=polygons[i].reduce((p,q)=>[p[0]+q[0]/polygons[i].length,p[1]+q[1]/polygons[i].length],[0,0]);});return shape(a);
}
function pathPolygon(d){
  const tokens=d.match(/[MLHVZ]|-?\d+(?:\.\d+)?/g),p=[];let command,x=0,y=0;
  for(let i=0;i<tokens.length;){if(/[MLHVZ]/.test(tokens[i]))command=tokens[i++];if(command==='Z')break;
    if(command==='M'||command==='L'){x=Number(tokens[i++]);y=Number(tokens[i++]);}
    else if(command==='H')x=Number(tokens[i++]);else if(command==='V')y=Number(tokens[i++]);else throw new Error('Unsupported polygon');
    if(!p.length||p.at(-1)[0]!==x||p.at(-1)[1]!==y)p.push([x,y]);
  }if(p.length>1&&p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1])p.pop();return p;
}
export function coloringClassic(raw){
  const a=JSON.parse(JSON.stringify(raw));a.kind='classic';a.regions.forEach(r=>r.polygon=pathPolygon(r.d));return shape(a);
}
export function coloringIdentity(a){return {edges:a.regions.map(r=>[r.id,[...r.neighbors].sort()]),fixed:a.fixed};}
export function validColoring(a,base){
  if(!a||a.id!==base.id||a.budget!==base.budget||a.showExtra!==base.showExtra||JSON.stringify(a.fixed)!==JSON.stringify(base.fixed)||!Array.isArray(a.regions)||a.regions.length!==base.regions.length||a.regions.some((r,i)=>r.id!==base.regions[i].id))return false;
  if(a.kind==='classic')return JSON.stringify(a)===JSON.stringify(base)&&Boolean(a.solution);
  if(a.kind!=='voronoi'||!Array.isArray(a.sites)||a.sites.length!==a.regions.length||a.sites.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<16||n>84))||new Set(a.sites.map(p=>p.join(','))).size!==a.sites.length)return false;
  try{
    const polys=voronoiPolygons(a.sites);if(Math.abs(polys.reduce((s,p)=>s+polygonArea(p),0)-84**2)>EPS)return false;
    for(const [i,r] of a.regions.entries()){
      if(JSON.stringify(r.polygon)!==JSON.stringify(polys[i])||polygonArea(r.polygon)<200||r.polygon.length<3)return false;
      const center=r.polygon.reduce((p,q)=>[p[0]+q[0]/r.polygon.length,p[1]+q[1]/r.polygon.length],[0,0]);if(JSON.stringify(center)!==JSON.stringify(r.label))return false;
      const neighbors=a.regions.filter(s=>s.id!==r.id&&shareBorder(r.polygon,s.polygon)).map(s=>s.id);if(JSON.stringify(neighbors)!==JSON.stringify(r.neighbors)||!neighbors.length)return false;
      if(r.d!==`M${r.polygon.map(p=>p.join(' ')).join(' L')} Z`)return false;
    }
    if(!a.solution||Object.values(a.solution).some(c=>!['rose','sun','mint','sky'].includes(c))||new Set(Object.values(a.solution)).size>a.budget||a.regions.some(r=>!a.solution[r.id]||r.neighbors.some(n=>a.solution[n]===a.solution[r.id]))||Object.entries(a.fixed).some(([k,v])=>a.solution[k]!==v))return false;
    // Retain the opening four-way conflict and the second map's three-color challenge.
    if(a.id==='welcome'&&a.regions.some(r=>r.neighbors.length!==3))return false;
    if(a.id==='budget3'&&!colorSolution(a,['rose','sun','mint']))return false;
    return true;
  }catch{return false;}
}
