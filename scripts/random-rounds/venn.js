export function vennFamily(base){
  return [0,1,2,3].map(extra=>{
    const codes=[0,1,2,3,extra].map((_,i,all)=>all[(i+extra+1)%5]);
    return {...base,ships:base.ships.map((ship,i)=>{
      const left=Boolean(codes[i]&2),right=Boolean(codes[i]&1),item={...ship,[base.rules[0]]:left,[base.rules[1]]:right};
      if(base.rules.includes('blue'))item.hull=left?'#237fa9':'#df7c4f';
      if(base.rules.includes('star'))item.mark=right?'★':'●';
      return item;
    })};
  });
}
export function vennTask(base,rng){return rng.pick(vennFamily(base));}
export function vennIdentity(a){return {rules:a.rules,codes:a.ships.map(s=>`${Number(s[a.rules[0]])}${Number(s[a.rules[1]])}`).sort()};}
export function validVenn(a,base){
  if(a?.id!==base.id||JSON.stringify(a.rules)!==JSON.stringify(base.rules)||!Array.isArray(a.ships)||a.ships.length!==5)return false;
  if(!a.ships.every((s,i)=>s.id===base.ships[i].id&&a.rules.every(r=>typeof s[r]==='boolean')))return false;
  if(a.rules.includes('blue')&&a.ships.some(s=>s.blue!==['#237fa9','#247fab','#2c91bd','#317ea8'].includes(s.hull)))return false;
  if(a.rules.includes('star')&&a.ships.some(s=>s.star!==(s.mark==='★')))return false;
  return new Set(vennIdentity(a).codes).size===4;
}
