import{solvePyraminx as s}from"./solver.js?v=2a251990";self.onmessage=({data:e})=>{try{self.postMessage({record:s(e.state)})}catch{self.postMessage({error:"solve-failed"})}};
