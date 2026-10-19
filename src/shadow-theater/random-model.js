export function shadowFamily(base){return [
  {...base,answer:'cylinder',cards:['circle','rect'],choices:['sphere','cylinder','cone']},
  {...base,answer:'cone',cards:['circle','tri'],choices:['cylinder','cone','sphere']},
  {...base,answer:'box',cards:['square','rect'],choices:['cube','sphere','box']},
];}
export function shadowTask(base,rng){
  if(base.kind==='reverse')return rng.pick(shadowFamily(base));
  return {...base,scale:rng.int(75,95)/100,initial:[rng.int(-4,4)/10,rng.int(-4,4)/10,0]};
}
export function validShadow(a,base){
  if(a?.kind!==base.kind)return false;
  if(a.kind==='reverse')return shadowFamily(base).some(b=>b.answer===a.answer&&JSON.stringify(b.cards)===JSON.stringify(a.cards)&&JSON.stringify(b.choices)===JSON.stringify(a.choices));
  return a.block===base.block&&a.target===base.target&&a.pose===base.pose&&JSON.stringify(a.blocks)===JSON.stringify(base.blocks)&&Number.isFinite(a.scale)&&a.scale>=.75&&a.scale<=1&&Array.isArray(a.initial)&&a.initial.length===3&&a.initial.every(n=>Number.isFinite(n)&&Math.abs(n)<=.5);
}
export function shadowAxes([x,y,z]){
  const sx=Math.sin(x),cx=Math.cos(x),sy=Math.sin(y),cy=Math.cos(y),sz=Math.sin(z),cz=Math.cos(z);
  return [[cy*cz,cx*sz+sx*sy*cz,sx*sz-cx*sy*cz],[-cy*sz,cx*cz-sx*sy*sz,sx*cz+cx*sy*sz],[sy,-sx*cy,cx*cy]];
}
export function shadowScore(a,rotation,selected){
  if(a.kind==='reverse')return selected===a.answer?1:0;
  if(!Array.isArray(rotation)||rotation.length!==3||!rotation.every(Number.isFinite))return 0;
  const z=shadowAxes(rotation).map(v=>Math.abs(v[2]));
  const side=Math.sqrt(Math.max(0,1-z[1]*z[1]));
  if(a.kind==='combo')return a.blocks.includes(selected)?z[2]:0;
  if(a.target==='circle')return selected==='sphere'?1:['cylinder','cone'].includes(selected)?z[1]:0;
  if(a.target==='square')return selected==='cube'?Math.max(...z):selected==='box'?z[0]:0;
  if(a.target==='rect')return selected==='box'?Math.max(z[1],z[2]):selected==='cylinder'?side:selected==='prism'?z[0]:0;
  if(a.target==='tri')return selected==='cone'?side:selected==='prism'?z[2]:0;
  return 0;
}
export function shadowSpeech(a,lang){
  const words={circle:['圆形','circle'],square:['正方形','square'],rect:['长方形','rectangle'],tri:['三角形','triangle'],house:['小房子','little house']};
  const target=words[a.target]?.[lang==='zh'?0:1];
  return a.kind==='reverse'?(lang==='zh'?'看看两张影子，选择积木。':'Look at both shadows and choose a block.'):(lang==='zh'?`转动积木，让影子像${target}。`:`Turn the block to make a ${target} shadow.`);
}
