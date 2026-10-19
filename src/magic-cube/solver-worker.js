import {solveLBL} from './solver.js';
self.onmessage=({data})=>{try{self.postMessage({record:data.size===4?null:solveLBL(data.state,data.size)});}catch{self.postMessage({error:'solve-failed'});}};
