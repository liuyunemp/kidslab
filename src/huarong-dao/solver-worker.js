import {solvePuzzle} from './puzzle.js';
self.onmessage=({data})=>{
  try{self.postMessage({record:solvePuzzle(data.state,{maxNodes:120000})});}
  catch{self.postMessage({error:'solve-failed'});}
};
