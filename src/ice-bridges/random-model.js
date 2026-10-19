export function bridgeDegrees(a){const d=Object.fromEntries(a.nodes.map(n=>[n.id,0]));for(const e of a.edges){d[e.a]++;d[e.b]++;}return d;}
export function connectedBridges(a){
  if(!a.nodes.length)return false;const seen=new Set([a.nodes[0].id]);let changed=true;
  while(changed){changed=false;for(const e of a.edges)if(seen.has(e.a)!==seen.has(e.b)){seen.add(e.a);seen.add(e.b);changed=true;}}
  return a.nodes.every(n=>seen.has(n.id));
}
export function bridgeRepair(a,choice){
  const edges=a.edges.map(e=>({...e}));if(choice==='close-one')edges.find(e=>e.id===a.repairs.close).closed=true;
  if(choice==='double')for(const id of a.repairs.double)edges.find(e=>e.id===id).closed=true;
  if(choice==='add-one')edges.push({...a.repairs.add,added:true});return {nodes:a.nodes,edges};
}
function curvedEdges(pairs){
  const keys=pairs.map(p=>[...p].sort().join('/'));
  return pairs.map(([a,b],i)=>{const same=keys.map((k,j)=>k===keys[i]?j:-1).filter(j=>j>=0),rank=same.indexOf(i);return {id:`b${i}`,a,b,curve:(rank-(same.length-1)/2)*16};});
}
function finish(base,pairs){
  const edges=curvedEdges(pairs);if(base.kind==='ring')return {...base,edges};
  const pair=edges.find(e=>edges.filter(f=>e.a===f.a&&e.b===f.b).length>=2),double=edges.filter(e=>e.a===pair.a&&e.b===pair.b).slice(0,2).map(e=>e.id);
  // Removing one of parallel bridges cannot disconnect the graph.
  return {...base,edges,repairs:{close:double[0],double,add:{id:'new',a:base.nodes[0].id,b:base.nodes[1].id,curve:24}}};
}
export function bridgeTask(base,rng){
  const ids=base.nodes.map(n=>n.id);
  if(base.kind==='ring'){const order=rng.shuffle(ids);return finish(base,order.map((a,i)=>[a,order[(i+1)%order.length]]));}
  const center=rng.pick(ids),pairs=ids.filter(a=>a!==center).map(a=>[...[center,a].sort()]);
  for(let k=0;k<2;k++){const [a,b]=rng.shuffle(ids);pairs.push([...[a,b].sort()],[...[a,b].sort()]);}
  return finish(base,pairs);
}
export function bridgeIdentity(a){return a.edges.map(e=>[e.a,e.b].sort().join('/')).sort();}
export function bridgeFamily(base){
  if(base.kind!=='ring')throw new RangeError('Only the five-node cycle has a small enumerated family');
  const [first,...tail]=base.nodes.map(n=>n.id),all=[],seen=new Set();
  function permute(path,left){if(left.length){for(const n of left)permute([...path,n],left.filter(a=>a!==n));return;}
    const order=[first,...path],a=finish(base,order.map((n,i)=>[n,order[(i+1)%order.length]])),key=JSON.stringify(bridgeIdentity(a));if(!seen.has(key)){seen.add(key);all.push(a);}}
  permute([],tail);return all;
}
export function validBridges(a,base){
  if(!a||a.kind!==base.kind||JSON.stringify(a.nodes)!==JSON.stringify(base.nodes)||!Array.isArray(a.edges)||a.edges.length!==(a.kind==='ring'?5:7))return false;
  const ids=a.nodes.map(n=>n.id);if(new Set(a.edges.map(e=>e.id)).size!==a.edges.length||a.edges.some(e=>!ids.includes(e.a)||!ids.includes(e.b)||e.a===e.b||!Number.isFinite(e.curve)||Math.abs(e.curve)>40)||!connectedBridges(a))return false;
  const d=Object.values(bridgeDegrees(a));if(a.kind==='ring')return d.every(n=>n===2);
  if(d.some(n=>n%2!==1)||!a.repairs||!Array.isArray(a.repairs.double)||a.repairs.double.length!==2||new Set(a.repairs.double).size!==2)return false;
  try{for(const choice of ['double','close-one','add-one']){
    const r=bridgeRepair(a,choice);r.edges=r.edges.filter(e=>!e.closed);
    if(!connectedBridges(r)||r.edges.some(e=>!ids.includes(e.a)||!ids.includes(e.b)||e.a===e.b)||Object.values(bridgeDegrees(r)).filter(n=>n%2).length!==(choice==='double'?4:2))return false;
  }}catch{return false;}return true;
}
