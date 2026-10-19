import{solvePuzzle as s}from"./puzzle.js?v=282c4f60";self.onmessage=({data:e})=>{try{self.postMessage({record:s(e.state,{maxNodes:12e4})})}catch{self.postMessage({error:"solve-failed"})}};
