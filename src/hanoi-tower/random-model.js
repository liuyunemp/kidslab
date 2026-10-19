export function validHanoiState(pegs,n){
  if(!Number.isInteger(n)||n<3||n>8||!Array.isArray(pegs)||pegs.length!==3||pegs.some(p=>!Array.isArray(p)))return false;
  const disks=pegs.flat();return disks.length===n&&new Set(disks).size===n&&disks.every(d=>Number.isInteger(d)&&d>=1&&d<=n)&&pegs.every(p=>p.every((d,i)=>i===0||p[i-1]>d));
}
export function hanoiMove(pegs,from,to){
  if(![from,to].every(n=>Number.isInteger(n)&&n>=0&&n<3)||from===to)return false;
  const a=pegs[from],b=pegs[to];if(!a.length||b.length&&b.at(-1)<a.at(-1))return false;
  b.push(a.pop());return true;
}
// A shortest route to a corner: first free the largest disk, then recurse.
export function hanoiSolution(pegs,n){
  if(!validHanoiState(pegs,n))throw new RangeError('Invalid Hanoi state');
  const routes=[1,2].map(target=>{
    const state=pegs.map(p=>[...p]),moves=[];
    function solve(k,to){
      if(k===0)return;const from=state.findIndex(p=>p.includes(k));
      if(from===to){solve(k-1,to);return;}
      solve(k-1,3-from-to);if(!hanoiMove(state,from,to))throw new Error('Illegal solution');moves.push([from,to]);solve(k-1,to);
    }
    solve(n,target);return moves;
  });
  return routes[0].length<=routes[1].length?routes[0]:routes[1];
}
export function hanoiTask(base,rng){
  const pegs=[[base.n],[],[]];for(let disk=base.n-1;disk>=1;disk--)pegs[rng.int(0,2)].push(disk);
  const solution=hanoiSolution(pegs,base.n);return {n:base.n,pegs,solution};
}
export function hanoiClassic(n){const pegs=[Array.from({length:n},(_,i)=>n-i),[],[]];return {n,pegs,solution:hanoiSolution(pegs,n)};}
export function validHanoi(a,base){
  if(!a||a.n!==base.n||!validHanoiState(a.pegs,a.n)||!Array.isArray(a.solution)||a.solution.length<1||a.solution.length>2**a.n-1)return false;
  const state=a.pegs.map(p=>[...p]);for(const move of a.solution)if(!Array.isArray(move)||move.length!==2||!hanoiMove(state,...move))return false;
  return state[1].length===a.n||state[2].length===a.n;
}
export function hanoiIdentity(a){return {n:a.n,pegs:a.pegs};}
export function hanoiFamily(base){
  const all=[];for(let code=0;code<3**(base.n-1);code++){
    let digits=code;const pegs=[[base.n],[],[]];for(let d=base.n-1;d>0;d--){pegs[digits%3].push(d);digits=Math.floor(digits/3);}
    all.push({n:base.n,pegs,solution:hanoiSolution(pegs,base.n)});
  }return all;
}
