import{solveLBL as s}from"./solver.js?v=e3dafabb";self.onmessage=({data:e})=>{try{self.postMessage({record:e.size===4?null:s(e.state,e.size)})}catch{self.postMessage({error:"solve-failed"})}};
