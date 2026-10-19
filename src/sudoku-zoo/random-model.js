export const boxDims=n=>n===4?[2,2]:n===6?[2,3]:[3,3];
export function candidates(grid,n,index){
  const [br,bc]=boxDims(n),r=Math.floor(index/n),c=index%n,used=new Set();
  for(let k=0;k<n;k++){used.add(grid[r*n+k]);used.add(grid[k*n+c]);}
  const r0=r-r%br,c0=c-c%bc;for(let y=0;y<br;y++)for(let x=0;x<bc;x++)used.add(grid[(r0+y)*n+c0+x]);
  return Array.from({length:n},(_,i)=>i+1).filter(v=>!used.has(v));
}
export function validSudokuGrid(grid,n){
  if(![4,6,9].includes(n)||!Array.isArray(grid)||grid.length!==n*n||grid.some(v=>!Number.isInteger(v)||v<0||v>n))return false;
  return grid.every((v,i)=>{if(!v)return true;const copy=[...grid];copy[i]=0;return candidates(copy,n,i).includes(v);});
}
export function countSolutions(puzzle,n,limit=2){
  if(!validSudokuGrid(puzzle,n))return 0;
  const grid=[...puzzle];let nodes=0;
  function visit(){
    if(++nodes>100000)throw new Error('Sudoku search budget');
    let cell=-1,values=null;
    for(let i=0;i<grid.length;i++)if(!grid[i]){const a=candidates(grid,n,i);if(a.length===0)return 0;if(!values||a.length<values.length){cell=i;values=a;if(a.length===1)break;}}
    if(cell<0)return 1;let count=0;
    for(const value of values){grid[cell]=value;count+=visit();grid[cell]=0;if(count>=limit)return limit;}return count;
  }return visit();
}
export function sudokuTask(base,rng){
  const n=base.size,[br,bc]=boxDims(n),digits=rng.shuffle(Array.from({length:n},(_,i)=>i+1));
  const rows=rng.shuffle(Array.from({length:n/br},(_,i)=>i)).flatMap(b=>rng.shuffle(Array.from({length:br},(_,r)=>b*br+r)));
  const cols=rng.shuffle(Array.from({length:n/bc},(_,i)=>i)).flatMap(b=>rng.shuffle(Array.from({length:bc},(_,c)=>b*bc+c)));
  const solution=rows.flatMap(r=>cols.map(c=>digits[(r*bc+Math.floor(r/br)+c)%n])),puzzle=[...solution];let removed=0;
  for(const i of rng.shuffle(Array.from({length:n*n},(_,i)=>i))){
    if(removed===base.holes)break;const old=puzzle[i];puzzle[i]=0;
    if(countSolutions(puzzle,n)===1)removed++;else puzzle[i]=old;
  }
  return {size:n,holes:base.holes,puzzle,solution};
}
export function validSudoku(a,base){
  return a?.size===base.size&&a.holes===base.holes&&validSudokuGrid(a.solution,a.size)&&a.solution.every(Boolean)&&validSudokuGrid(a.puzzle,a.size)&&a.puzzle.filter(v=>v===0).length===base.holes&&a.puzzle.every((v,i)=>!v||v===a.solution[i])&&countSolutions(a.puzzle,a.size)===1;
}
export function sudokuIdentity(a){
  const map=new Map();return {size:a.size,pattern:a.puzzle.map(v=>{if(!v)return 0;if(!map.has(v))map.set(v,map.size+1);return map.get(v);})};
}
export function validSudokuPlay(s,a){
  return s&&Array.isArray(s.grid)&&s.grid.length===a.puzzle.length&&s.grid.every((v,i)=>Number.isInteger(v)&&(a.puzzle[i]?v===a.puzzle[i]:v===0||v===a.solution[i]))&&['hints','hintsUsed','errors','streak'].every(k=>Number.isInteger(s[k])&&s[k]>=0)&&s.hints+s.hintsUsed===3&&Number.isInteger(s.sel)&&s.sel>=-1&&s.sel<s.grid.length&&Number.isInteger(s.brush)&&s.brush>=0&&s.brush<=a.size&&Number.isFinite(s.elapsed)&&s.elapsed>=0;
}
