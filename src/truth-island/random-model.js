const people=['mia','noah'];
const claims=[{kind:'same'},{kind:'different'},...people.flatMap(person=>[true,false].map(truth=>({kind:'role',person,truth})))];
export function truthClaim(claim,roles){
  if(claim.kind==='same')return roles.mia===roles.noah;if(claim.kind==='different')return roles.mia!==roles.noah;
  if(claim.kind==='role'&&people.includes(claim.person)&&typeof claim.truth==='boolean')return roles[claim.person]===claim.truth;
  throw new RangeError('Invalid claim');
}
export function truthSolutions(a){
  if(a.level===0)return [true,false].map(mia=>({mia,noah:!mia})).filter(roles=>a.claims.every((claim,i)=>truthClaim(claim,roles)===roles[people[i]]));
  if(a.level===1)return ['left','right'].filter(road=>((road===a.road)||a.gateOpen===a.gateClaim)===true&&a.gateOpen!==a.gateClaim);
  return [a.road];
}
export function truthFamily(base){
  if(base.level===0){const all=[];for(const mia of [true,false])for(const first of claims)for(const second of claims){const a={level:0,roles:{mia,noah:!mia},claims:[first,second]};const solutions=truthSolutions(a);if(solutions.length===1&&solutions[0].mia===mia)all.push(a);}return all;}
  if(base.level===1)return ['left','right'].flatMap(road=>[true,false].flatMap(gateOpen=>[true,false].map(mia=>({level:1,road,gateOpen,gateClaim:!gateOpen,roles:{mia,noah:!mia}}))));
  return ['left','right'].map(road=>({level:2,road}));
}
export const TRUTH_BASES=[{level:0,roles:{mia:true,noah:false},claims:[{kind:'role',person:'noah',truth:false},{kind:'same'}]},{level:1,road:'left',gateOpen:false,gateClaim:true,roles:{mia:true,noah:false}},{level:2,road:'left'}];
export function truthTask(base,rng){return rng.pick(truthFamily(base));}
export function validTruth(a,base){
  if(!a||a.level!==base.level)return false;
  if(a.level===0){if(!a.roles||typeof a.roles.mia!=='boolean'||a.roles.noah!==!a.roles.mia||!Array.isArray(a.claims)||a.claims.length!==2)return false;
    try{const solutions=truthSolutions(a);return solutions.length===1&&solutions[0].mia===a.roles.mia;}catch{return false;}}
  if(!['left','right'].includes(a.road))return false;
  return a.level===2||a.level===1&&typeof a.gateOpen==='boolean'&&a.gateClaim===!a.gateOpen&&a.roles&&typeof a.roles.mia==='boolean'&&a.roles.noah===!a.roles.mia&&truthSolutions(a).length===1;
}
export function truthIdentity(a){return a.level===0?a.claims:a;}
export function truthCopy(a,key,lang){
  const en=lang==='en',name=p=>p==='mia'?(en?'Mia':'米娅'):(en?'Noah':'诺亚'),role=r=>r?(en?'truth-teller':'真话族'):(en?'liar':'反话族'),road=a.road==='left'?(en?'left':'左边'):(en?'right':'右边'),wrong=a.road==='left'?(en?'right':'右边'):(en?'left':'左边');
  const identity=a.roles?`${name('mia')}: ${role(a.roles.mia)}; ${name('noah')}: ${role(a.roles.noah)}`:'';
  if(key==='statements0'&&a.level===0)return a.claims.map(c=>c.kind==='same'?(en?'“We are the same type.”':'“我们是同一族。”'):c.kind==='different'?(en?'“We are different types.”':'“我们不是同一族。”'):(en?`“${name(c.person)} is a ${role(c.truth)}.”`:`“${name(c.person)}是${role(c.truth)}。”`));
  if(key==='identityRight')return en?`Both claims agree only with ${identity}.`:`两句话只与这组身份一致：${identity}。`;
  if(key==='identityHint')return en?'Try both badge arrangements. Does each claim match its speaker?':'分别试两种身份，检查每句话是否符合说话者的身份。';
  const gate=a.gateOpen?(en?'open':'开着'):(en?'closed':'关着'),gateClaim=a.gateClaim?(en?'the gate is open':'月门开着'):(en?'the gate is NOT open':'月门没有打开');
  if(key==='statements1'&&a.level===1){const truth=en?`“Treasure is ${road}, OR ${gateClaim}.”`:`“宝藏在${road}，或者${gateClaim}。”`,lie=en?`“${gateClaim}.”`:`“${gateClaim}。”`;return a.roles.mia?[truth,lie]:[lie,truth];}
  if(key==='status1')return en?`${identity}. The Moon Gate is ${gate}.`:`${identity}。月门现在${gate}。`;
  if(key==='moonFact')return en?`Scene evidence: the Moon Gate is ${gate}.`:`现场证据：月门${gate}。`;
  if(key==='roadQuestion')return en?'The truth-teller’s OR must be true. Which road is consistent?':'真话族的“或”命题必须为真。哪条路符合线索？';
  if(key==='roadWrong')return en?'That road makes both parts of the truth-teller’s OR false. Check the gate.':'这条路会让真话族的“或”两边都为假。再看看月门。';
  if(key==='roadRight')return en?`The gate claim is false, so treasure must be ${road}.`:`关于月门的分句为假，所以宝藏必须在${road}。`;
  if(key==='magicAnswer')return en?`Either guard points ${wrong}, the wrong road.`:`不管问谁，守卫都会指向${wrong}的错路。`;
  if(key==='afterPoint')return en?`Both point ${wrong}. Which road has treasure?`:`两位都会指${wrong}。宝藏在哪边？`;
  if(key==='finalRight')return en?`You took the opposite ${road} road and found the treasure!`:`你走向相反的${road}小路，找到了宝藏！`;
  return null;
}
