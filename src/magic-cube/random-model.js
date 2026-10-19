const clone=a=>JSON.parse(JSON.stringify(a));
const DIRS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
export const PYRAMID_AROUND=[[0,1,2],[0,3,4],[1,3,5],[2,4,5]];
export const TWIST_COUNTS={cube:{2:[3,6,12],3:[4,9,20],4:[6,14,28]},pyramid:[4,9,18]};
export function twistSolved(kind,size=3){
  if(kind==='pyramid')return {tipOri:[0,0,0,0],cenOri:[0,0,0,0],edgePerm:[0,1,2,3,4,5],edgeOri:[0,0,0,0,0,0]};
  const a=[],m=size-1;for(let x=-m;x<=m;x+=2)for(let y=-m;y<=m;y+=2)for(let z=-m;z<=m;z+=2){
    const c=[x,y,z];if(Math.max(...c.map(Math.abs))!==m)continue;
    a.push({c,st:DIRS.flatMap((n,col)=>c[col>>1]===n[col>>1]*m?[{n:[...n],col}]:[])});
  }return a;
}
export function validTwistMove(m,base){
  if(!m||!Number.isInteger(m.turns)||m.turns<1)return false;
  return base.kind==='pyramid'?Number.isInteger(m.vertex)&&m.vertex>=0&&m.vertex<4&&[0,1].includes(m.layer)&&m.turns<=2:
    [0,1,2].includes(m.axis)&&Number.isInteger(m.coord)&&Math.abs(m.coord)<=base.size-1&&(m.coord+base.size-1)%2===0&&m.turns<=3;
}
const rotate=(v,axis)=>axis===0?[v[0],-v[2],v[1]]:axis===1?[v[2],v[1],-v[0]]:[-v[1],v[0],v[2]];
export function applyTwist(state,move,base){
  if(!validTwistMove(move,base))throw new RangeError('Invalid twist');
  for(let n=0;n<move.turns;n++){
    if(base.kind==='pyramid'){
      state.tipOri[move.vertex]=(state.tipOri[move.vertex]+1)%3;
      if(move.layer){state.cenOri[move.vertex]=(state.cenOri[move.vertex]+1)%3;const [a,b,c]=PYRAMID_AROUND[move.vertex];[state.edgePerm[a],state.edgePerm[b],state.edgePerm[c]]=[state.edgePerm[c],state.edgePerm[a],state.edgePerm[b]];}
    }else for(const p of state)if(p.c[move.axis]===move.coord){p.c=rotate(p.c,move.axis);for(const s of p.st)s.n=rotate(s.n,move.axis);}
  }return state;
}
export function twistPath(base,moves,start=twistSolved(base.kind,base.size)){
  if(!Array.isArray(moves)||moves.length>10000)throw new RangeError('Invalid history');
  const state=clone(start);for(const move of moves)applyTwist(state,move,base);return state;
}
export function twistIsSolved(state,base){
  if(base.kind==='pyramid')return state.tipOri.every(v=>v===0)&&state.cenOri.every(v=>v===0)&&state.edgePerm.every((v,i)=>v===i)&&state.edgeOri.every(v=>v===0);
  const colors=new Map();for(const p of state)for(const s of p.st){const k=s.n.join(',');if(colors.has(k)&&colors.get(k)!==s.col)return false;colors.set(k,s.col);}return colors.size===6;
}
export function twistInverse(m,base){return {...m,turns:(base.kind==='pyramid'?3:4)-m.turns};}
export function twistBase(kind,size,diff){
  if(!['cube','pyramid'].includes(kind)||![0,1,2].includes(diff)||kind==='cube'&&![2,3,4].includes(size))throw new RangeError('Unknown twist difficulty');
  return {kind,size:kind==='cube'?size:0,diff,count:kind==='cube'?TWIST_COUNTS.cube[size][diff]:TWIST_COUNTS.pyramid[diff],standard:true,moves:[],start:twistSolved(kind,size)};
}
export function twistTask(base,rng){
  const moves=[];let last='';for(let n=0;n<base.count;n++){
    const choices=base.kind==='pyramid'?[0,1,2,3].filter(v=>String(v)!==last):[0,1,2].flatMap(axis=>Array.from({length:base.size},(_,i)=>({axis,coord:2*i-base.size+1}))).filter(m=>`${m.axis}:${m.coord}`!==last);
    const a=rng.pick(choices),move=base.kind==='pyramid'?{vertex:a,layer:base.diff>0&&rng.int(0,3)===0?0:1,turns:rng.int(1,2)}:{...a,turns:rng.int(1,3)};
    last=base.kind==='pyramid'?String(a):`${a.axis}:${a.coord}`;moves.push(move);
  }
  let start=twistPath(base,moves);
  // A legal scramble can accidentally cancel itself; change its last turn without increasing the difficulty.
  if(twistIsSolved(start,base)){const last=moves.at(-1);last.turns=last.turns%(base.kind==='pyramid'?2:3)+1;start=twistPath(base,moves);}
  return {...base,standard:false,moves,start};
}
export function validTwist(a,base){
  try{return !!a&&a.kind===base.kind&&a.size===base.size&&a.diff===base.diff&&a.count===base.count&&typeof a.standard==='boolean'&&
    a.moves.length===(a.standard?0:base.count)&&JSON.stringify(twistPath(base,a.moves))===JSON.stringify(a.start)&&(a.standard||!twistIsSolved(a.start,base));}catch{return false;}
}
// Canonicalize cube orientation: a whole-cube rotation is not a new puzzle.
function cubeKey(state){return JSON.stringify(state.map(p=>({c:p.c,st:[...p.st].sort((a,b)=>a.col-b.col)})).sort((a,b)=>a.c.join(',').localeCompare(b.c.join(','))));}
export function twistIdentity(a){
  if(a.kind==='pyramid')return {kind:a.kind,diff:a.diff,start:a.start};
  const queue=[a.start],seen=new Set(),keys=[];
  for(let i=0;i<queue.length;i++){const state=queue[i],key=cubeKey(state);if(seen.has(key))continue;seen.add(key);keys.push(key);
    for(const axis of [0,1,2])queue.push(state.map(p=>({c:rotate(p.c,axis),st:p.st.map(s=>({col:s.col,n:rotate(s.n,axis)}))})));
  }
  return {kind:a.kind,size:a.size,diff:a.diff,state:keys.sort()[0]};
}
export function validTwistPlay(p,base){
  try{return !!p&&Array.isArray(p.history)&&Array.isArray(p.userStack)&&p.userStack.length<=p.history.length+10000&&
    p.userStack.every(m=>validTwistMove(m,base))&&Number.isSafeInteger(p.moves)&&p.moves>=0&&Number.isSafeInteger(p.hints)&&p.hints>=0&&p.hints<=p.moves&&Number.isFinite(p.seconds)&&p.seconds>=0&&
    ['playing','idle'].includes(p.phase)&&JSON.stringify(twistPath(base,p.history))===JSON.stringify(p.state);}
  catch{return false;}
}
