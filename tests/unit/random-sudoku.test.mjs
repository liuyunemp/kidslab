import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRound,remember} from '../../scripts/random-rounds/core.js';
import {sudokuTask,validSudoku,countSolutions,sudokuIdentity,validSudokuPlay} from '../../scripts/random-rounds/sudoku.js';
import {CLASSIC_PUZZLES} from '../../src/sudoku-zoo/classic-puzzles.js';
function independentCount(puzzle,n){
  const grid=[...puzzle],height=n===9?3:2,width=n/height,mask=(1<<n)-1;
  const row=new Int16Array(n),col=new Int16Array(n),box=new Int16Array(n);const group=i=>Math.floor(Math.floor(i/n)/height)*(n/width)+Math.floor((i%n)/width);
  for(let i=0;i<grid.length;i++)if(grid[i]){const bit=1<<(grid[i]-1);if((row[Math.floor(i/n)]|col[i%n]|box[group(i)])&bit)return 0;row[Math.floor(i/n)]|=bit;col[i%n]|=bit;box[group(i)]|=bit;}
  function walk(){let best=-1,bits=0,count=Infinity;for(let i=0;i<grid.length;i++)if(!grid[i]){const available=mask&~(row[Math.floor(i/n)]|col[i%n]|box[group(i)]),length=available.toString(2).replaceAll('0','').length;if(!length)return 0;if(length<count){best=i;bits=available;count=length;}}
    if(best<0)return 1;let total=0;const r=Math.floor(best/n),c=best%n,b=group(best);while(bits){const bit=bits&-bits;bits^=bit;grid[best]=1;row[r]|=bit;col[c]|=bit;box[b]|=bit;total+=walk();grid[best]=0;row[r]^=bit;col[c]^=bit;box[b]^=bit;if(total>=2)return 2;}return total;
  }return walk();
}
for(const [level,base] of CLASSIC_PUZZLES.entries())test(`Sudoku ${base.size}/${base.holes}: 100 generated unique puzzles and recent structural dedup`,()=>{
  assert(validSudoku(base,base));let recent=[];
  for(let seed=0;seed<100;seed++){
    const config={seed,levelId:`l${level+1}`,round:0,recent,generate:({rng})=>sudokuTask(base,rng),validate:a=>validSudoku(a,base),identify:sudokuIdentity,fallback:()=>base};
    const a=generateRound(config);assert.equal(independentCount(a.instance.puzzle,base.size),1);assert(!recent.includes(a.fingerprint));recent=remember(recent,a.fingerprint);assert.deepEqual(a,generateRound(config));
  }
});
test('Sudoku rejects duplicate givens and contradictory snapshots; label permutation is not new content',()=>{
  const a=CLASSIC_PUZZLES[0],bad=[...a.puzzle];bad[0]=bad[1]=1;assert.equal(countSolutions(bad,4),0);
  const changed={...a,puzzle:a.puzzle.map(v=>v?5-v:0)};assert.deepEqual(sudokuIdentity(changed),sudokuIdentity(a));
  assert(!validSudokuPlay({grid:a.puzzle,hints:3,hintsUsed:1,errors:0,streak:0,sel:-1,brush:0,elapsed:0},a));
});
