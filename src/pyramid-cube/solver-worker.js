import {solvePyraminx} from './solver.js';
self.onmessage=({data})=>{try{self.postMessage({record:solvePyraminx(data.state)});}catch{self.postMessage({error:'solve-failed'});}};
