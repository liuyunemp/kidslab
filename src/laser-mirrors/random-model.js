const DIR={R:[1,0],D:[0,1],L:[-1,0],U:[0,-1]},REFLECT={'/':{R:'U',U:'R',L:'D',D:'L'},'\\':{R:'D',D:'R',L:'U',U:'L'}};
const key=(x,y)=>`${x},${y}`;
export function validLaserMirrors(a,mirrors){
  if(!mirrors||typeof mirrors!=='object'||Array.isArray(mirrors)||Object.keys(mirrors).length>a.limit)return false;
  return Object.entries(mirrors).every(([k,v])=>/^[0-7],[0-5]$/.test(k)&&['/','\\'].includes(v)&&![...a.fixed,...a.targets].some(p=>key(p.x,p.y)===k));
}
export function laserTrace(a,mirrors){
  if(!validLaserMirrors(a,mirrors))throw new RangeError('Illegal mirror placement');
  const queue=[{x:-1,y:a.source.y,dir:'R',color:a.source.color,points:[{x:0,y:a.source.y+.5}]}],visited=new Set(),beams=[],hits=new Set();let mismatch=false;
  for(let i=0;i<queue.length;i++){
    let {x,y,dir,color,points}=queue[i];points=[...points];
    for(let step=0;step<80;step++){
      x+=DIR[dir][0];y+=DIR[dir][1];if(x<0||x>=8||y<0||y>=6){points.push({x:Math.min(8,Math.max(0,x+.5)),y:Math.min(6,Math.max(0,y+.5))});break;}
      points.push({x:x+.5,y:y+.5});const state=`${x},${y},${dir},${color}`;if(visited.has(state))break;visited.add(state);
      const target=a.targets.findIndex(t=>t.x===x&&t.y===y);if(target>=0){if(a.targets[target].color==='white'||a.targets[target].color===color)hits.add(target);else mismatch=true;break;}
      const f=a.fixed.find(f=>f.x===x&&f.y===y);if(f?.type==='wall')break;
      if(f?.type==='filter'){
        if(color!=='white'&&color!==f.color)break;
        if(color!==f.color){beams.push({color,points});color=f.color;points=[{x:x+.5,y:y+.5}];}
      }
      if(f?.type==='splitter')queue.push({x,y,dir:REFLECT[f.mirror][dir],color,points:[{x:x+.5,y:y+.5}]});
      const m=mirrors[key(x,y)];if(m)dir=REFLECT[m][dir];
    }beams.push({color,points});
  }return {beams,hits,mismatch};
}
export function laserTask(base,rng){
  const a=JSON.parse(JSON.stringify(base));
  if(base.code==='L-01'){
    const sy=rng.int(1,4),x=rng.int(1,7),ty=rng.pick([0,5]);a.source.y=sy;a.targets=[{x,y:ty,color:'white'}];a.fixed=[];a.solution={[key(x,sy)]:ty<sy?'/':'\\'};
  }else if(base.code==='L-02'){
    const wx=rng.int(3,5),top=rng.int(0,1),sy=rng.int(top,top+2),gap=top+4,mx=rng.int(1,wx-1),tx=rng.int(wx+1,7);
    a.source.y=sy;a.fixed=Array.from({length:4},(_,i)=>({x:wx,y:top+i,type:'wall'}));a.targets=[{x:tx,y:gap,color:'white'}];a.solution={[key(mx,sy)]:'\\',[key(mx,gap)]:'\\'};
  }else if(base.code==='L-03'){
    const sx=rng.int(2,4),sy=rng.int(2,3),right=rng.int(sx+1,7),down=rng.int(sy+1,5),left=rng.int(0,sx-1),up=rng.int(0,sy-1);
    a.source.y=sy;a.fixed=[{x:sx,y:sy,type:'splitter',mirror:'/'}];a.targets=[{x:right,y:down,color:'white'},{x:left,y:up,color:'white'}];a.solution={[key(right,sy)]:'\\',[key(sx,up)]:'\\'};
  }else if(base.code==='L-04'){
    const sx=rng.int(2,3),sy=rng.int(1,2),fx=rng.int(sx+1,5),right=rng.int(fx+1,7),up=rng.int(0,sy-1),left=rng.int(0,sx-1),down=rng.int(sy+2,5);
    a.source.y=sy;a.fixed=[{x:sx,y:sy,type:'splitter',mirror:'\\'},{x:fx,y:sy,type:'filter',color:'red'},{x:sx,y:sy+1,type:'filter',color:'blue'}];a.targets=[{x:right,y:up,color:'red'},{x:left,y:down,color:'blue'}];a.solution={[key(right,sy)]:'/',[key(sx,down)]:'/'};
  }else throw new RangeError('Unknown laser room');return a;
}
export function laserClassic(base){
  const routes=[{'3,4':'/'},{'2,1':'\\','2,5':'\\'},{'6,3':'\\','3,1':'\\'},{'6,2':'/','2,5':'/'}];
  return {...base,solution:routes[Number(base.code.slice(-2))-1]};
}
export function laserIdentity(a){return {source:a.source,targets:a.targets,fixed:a.fixed};}
export function validLaser(a,base){
  if(!a||a.code!==base.code||a.limit!==base.limit||!a.source||a.source.color!=='white'||!Number.isInteger(a.source.y)||a.source.y<0||a.source.y>=6||!Array.isArray(a.fixed)||!Array.isArray(a.targets)||a.fixed.length!==base.fixed.length||a.targets.length!==base.targets.length)return false;
  const all=[...a.fixed,...a.targets];if(new Set(all.map(p=>key(p.x,p.y))).size!==all.length||all.some(p=>!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.x>=8||p.y<0||p.y>=6))return false;
  if(a.targets.some((t,i)=>t.color!==base.targets[i].color)||a.fixed.some((f,i)=>f.type!==base.fixed[i].type||f.color!==base.fixed[i].color||f.mirror!==base.fixed[i].mirror)||!validLaserMirrors(a,a.solution)||Object.keys(a.solution).length!==a.limit)return false;
  try{return laserTrace(a,a.solution).hits.size===a.targets.length;}catch{return false;}
}
export function laserHint(a,mirrors,lang){
  const missing=Object.entries(a.solution).find(([k,m])=>mirrors[k]!==m);
  if(!missing)return lang==='en'?'The turns are connected. Power up to check.':'转弯处已经连上，通电看看。';
  const [x,y]=missing[0].split(',').map(Number);return lang==='en'?`Look at row ${y+1}, column ${x+1}. Which way should the incoming beam turn?`:`看看第 ${y+1} 行第 ${x+1} 列：来光需要往哪边转？`;
}
