// Pure task instances. All arithmetic uses integers (decimal answers use hundredths).
const integer=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
const sum=a=>a.reduce((x,y)=>x+y,0);
export const rootIdentity=a=>({kind:a.kind,area:a.area});
export function rootTask(base,rng){
  const kind=base.kind;
  if(kind==='tile'||kind==='reverse'){
    const n=rng.int(kind==='tile'?2:6,kind==='tile'?9:12),area=n*n;
    return {...base,area,values:kind==='tile'?[n-1,n,n+1]:[n*2,area-1,area],answer:kind==='tile'?1:2};
  }
  if(kind==='bounds'){
    const n=rng.int(3,8),area=rng.int(n*n+1,(n+1)*(n+1)-1);
    return {...base,area,values:[[n-1,n],[n,n+1],[n+1,n+2]],answer:1};
  }
  if(kind==='simplify'){
    const outside=rng.int(2,6),inside=rng.pick([2,3]);
    return {...base,area:outside*outside*inside,values:[[outside-1,inside],[outside,inside],[outside+1,inside]],answer:1};
  }
  if(kind==='decimal'){
    const area=rng.pick(Array.from({length:29},(_,i)=>i+2).filter(n=>!Number.isInteger(Math.sqrt(n)))),cents=Math.round(Math.sqrt(area)*100);
    return {...base,area,values:[cents-10,cents,cents+10],answer:1};
  }
  return {...base,area:rng.int(2,100)};
}
export function rootFamily(base){
  const seeds=[];
  if(base.kind==='tile'||base.kind==='reverse')for(let n=base.kind==='tile'?2:6;n<=(base.kind==='tile'?9:12);n++)seeds.push(rootTask(base,{int:()=>n}));
  if(base.kind==='simplify')for(let outside=2;outside<=6;outside++)for(const inside of [2,3])seeds.push(rootTask(base,{int:()=>outside,pick:()=>inside}));
  return seeds;
}
export function rootCorrect(a,value){
  if(a.kind==='tile')return value>=0&&value*value===a.area;
  if(a.kind==='reverse')return value===a.area;
  if(a.kind==='bounds')return Array.isArray(value)&&value[1]===value[0]+1&&value[0]**2<a.area&&a.area<value[1]**2;
  if(a.kind==='decimal')return value===Math.round(Math.sqrt(a.area)*100);
  if(a.kind==='simplify'){
    if(!Array.isArray(value)||value[0]**2*value[1]!==a.area)return false;
    for(let n=2;n*n<=value[1];n++)if(value[1]%(n*n)===0)return false;
    return true;
  }
  return false;
}
export function validRoot(a,base){
  return a?.kind===base.kind&&integer(a.area,1,200)&&(a.kind==='explore'||(integer(a.answer,0,2)&&Array.isArray(a.values)&&a.values.length===3&&a.values.filter(v=>rootCorrect(a,v)).length===1&&rootCorrect(a,a.values[a.answer])));
}
export function rootQuestion(a,lang){
  const zh=lang==='zh',n=a.area;
  const prompt={tile:zh?`正方形地砖面积是 ${n} cm²，边长是多少？`:`A square tile has area ${n} cm². What is its side length?`,bounds:zh?`√${n} 在哪两个相邻整数之间？`:`Between which consecutive integers is √${n}?`,simplify:zh?`√${n} 完全化简后是哪一项？`:`Which is the fully simplified form of √${n}?`,decimal:zh?`√${n} 保留两位小数约是多少？`:`What is √${n} rounded to two decimal places?`,reverse:zh?`哪个数的算术平方根是 ${Math.sqrt(n)}？`:`Which number has principal square root ${Math.sqrt(n)}?`}[a.kind];
  return {prompt,choices:a.values.map(v=>a.kind==='tile'?`${v} cm`:a.kind==='bounds'?v.join(zh?' 和 ':' and '):a.kind==='simplify'?`${v[0]}√${v[1]}`:a.kind==='decimal'?(v/100).toFixed(2):String(v))};
}

export function ratioTask(base,rng){
  const shares=base.shares,scale=base.kind==='scale'?rng.pick([20,40,60,80,100]):base.kind==='coins'?rng.int(5,12):rng.int(2,5);
  const correct=shares.map(n=>n*scale),total=sum(correct);
  const options=base.kind==='scale'?[shares.map(n=>n*(scale-10)),correct,shares.map(n=>n*(scale+10))]:[[correct[0]-1,correct[1]+1,...correct.slice(2)],correct,[correct[0]+1,correct[1]-1,...correct.slice(2)]];
  return {...base,total,options,correct:1,labels:options.map(values=>base.kind==='scale'?`× ${values[0]/shares[0]}`:values.join(' : '))};
}
export const ratioIdentity=a=>({kind:a.kind,shares:a.shares,total:a.total});
export function ratioFamily(base){
  const scales=base.kind==='scale'?[20,40,60,80,100]:Array.from({length:base.kind==='coins'?8:4},(_,i)=>i+(base.kind==='coins'?5:2));
  return scales.map(n=>ratioTask(base,{int:()=>n,pick:()=>n}));
}
export function validRatio(a,base){
  if(a?.kind!==base.kind||JSON.stringify(a.shares)!==JSON.stringify(base.shares)||!integer(a.total,10,600)||!Array.isArray(a.options)||a.options.length!==3)return false;
  const matches=a.options.map(values=>Array.isArray(values)&&values.length===a.shares.length&&values.every(n=>integer(n,1,600))&&sum(values)===a.total&&values.every((n,i)=>n*a.shares[0]===values[0]*a.shares[i]));
  return matches.filter(Boolean).length===1&&matches[a.correct]&&new Set(a.options.map(x=>x.join(','))).size===3;
}

export function signedTask(base,rng){
  if(base.mode==='move')return {...base,start:-rng.int(2,6),target:rng.int(2,6)};
  if(base.skin==='temperature'){
    const target=-rng.int(1,4),start=target-rng.int(2,5),options=rng.shuffle([target,start]);
    return {...base,start,target,options,correct:options.indexOf(target)};
  }
  const start=rng.int(3,8),debt=rng.int(2,8),options=rng.shuffle([-debt,debt,start*2+debt]);
  return {...base,start,target:-debt,options,correct:options.indexOf(-debt)};
}
export const signedIdentity=a=>({skin:a.skin,start:a.start,target:a.target});
export function validSigned(a,base){
  if(a?.mode!==base.mode||a.skin!==base.skin||!integer(a.start,-10,10)||!integer(a.target,-10,10)||a.min!==-10||a.max!==10)return false;
  if(a.mode==='move')return a.start<0&&a.target>0;
  if(!Array.isArray(a.options)||new Set(a.options).size!==a.options.length||a.options[a.correct]!==a.target)return false;
  return a.skin==='temperature'?a.options.length===2&&a.start<a.target&&a.target<0&&a.options.includes(a.start):a.options.length===3&&a.start>0&&a.target<0&&a.options.every(n=>integer(n,-10,24));
}

export function zoomFamily(base){
  if(base.kind==='explore')return Array.from({length:10},(_,exp)=>({...base,exp}));
  return Array.from({length:base.kind==='decimal'?9:8},(_,i)=>({...base,hundredths:base.kind==='decimal'?i+1:(i+2)*100}));
}
export const zoomTask=(base,rng)=>rng.pick(zoomFamily(base));
export const zoomIdentity=a=>a.kind==='explore'?{exp:a.exp}:{from:a.from,to:a.to,hundredths:a.hundredths};
export function validZoom(a,base){
  if(a?.kind!==base.kind)return false;
  return a.kind==='explore'?integer(a.exp,0,9):a.from===base.from&&a.to===base.to&&a.scale===base.scale&&zoomFamily(base).some(b=>b.hundredths===a.hundredths);
}
export function zoomQuestion(a){
  const input=a.hundredths/100,result=a.hundredths*a.scale/100;
  return [`${input} ${a.from} = ? ${a.to}`,String(result),[String(result/10),String(result),String(result*10)],`${input} ${a.from} = ${result} ${a.to}`];
}
export function studioTask(base,rng){
  const total=rng.pick([16,20]),counts=rng.shuffle(total===16?[7,5,3,1]:[8,6,4,2]);
  const votes=rng.shuffle(counts.flatMap((n,i)=>Array(n).fill(base.ids[i])));
  const trend=rng.shuffle(Array.from({length:20},(_,i)=>i+1)).slice(0,6).sort((a,b)=>a-b);
  return {...base,counts,votes,trend};
}
export const studioIdentity=a=>({counts:a.counts,trend:a.trend});
export function validStudio(a,base){
  if(!a||JSON.stringify(a.ids)!==JSON.stringify(base.ids)||!Array.isArray(a.counts)||a.counts.length!==4||!a.counts.every(n=>integer(n,1,8))||![16,20].includes(sum(a.counts)))return false;
  return a.counts.filter(n=>n===Math.max(...a.counts)).length===1&&Array.isArray(a.votes)&&a.votes.length===sum(a.counts)&&a.ids.every((id,i)=>a.votes.filter(x=>x===id).length===a.counts[i])&&Array.isArray(a.trend)&&a.trend.length===6&&a.trend.every((n,i)=>integer(n,1,20)&&(!i||n>a.trend[i-1]));
}
export function beatFamily(base){
  if(base.kind==='fill')return [[1],[2],[4],[1,1],[1,2],[2,2],[4,1]].map(initial=>({...base,initial}));
  if(base.kind==='equal')return [{target:2,unit:1},{target:4,unit:1},{target:4,unit:2}].map(a=>({...base,...a}));
  const permutations=new Map();
  const visit=(rest,prefix=[])=>{if(!rest.length)permutations.set(prefix.join(','),{...base,sequence:prefix});else rest.forEach((n,i)=>visit(rest.filter((_,j)=>j!==i),[...prefix,n]));};
  visit([2,1,1,4]);return [...permutations.values()];
}
export const beatTask=(base,rng)=>rng.pick(beatFamily(base));
export const beatIdentity=a=>({kind:a.kind,initial:a.initial,target:a.target,unit:a.unit,sequence:a.sequence});
export function validBeat(a,base){
  if(a?.kind!==base.kind)return false;
  if(a.kind==='fill')return Array.isArray(a.initial)&&a.initial.every(n=>[1,2,4].includes(n))&&sum(a.initial)<8;
  if(a.kind==='equal')return [2,4].includes(a.target)&&[1,2].includes(a.unit)&&a.unit<a.target;
  return Array.isArray(a.sequence)&&a.sequence.length===4&&[...a.sequence].sort().join(',')==='1,1,2,4';
}
export function beatSolved(a,beats){
  if(!Array.isArray(beats)||beats.some(n=>![1,2,4].includes(n)))return false;
  if(a.kind==='fill')return sum(beats)===8;
  if(a.kind==='equal')return beats.length*a.unit===a.target&&beats.every(n=>n===a.unit);
  return JSON.stringify(beats)===JSON.stringify(a.sequence);
}

export function tailorFamily(base){
  const sizes=base.kind==='parallelogram'?[[6,4],[7,4],[8,4],[9,4],[6,5],[7,5],[8,5],[9,5],[6,6],[7,6],[8,6],[9,6]]:
    base.kind==='triangle'?[[6,4],[7,4],[8,4],[9,4],[6,6],[7,6],[8,6],[9,6],[6,8],[7,8],[8,8],[9,8]]:
    [[8,4,4],[8,6,4],[10,4,4],[10,6,4],[10,8,4],[8,4,6],[8,6,6],[10,4,6],[10,6,6],[10,8,6],[8,4,8],[10,6,8]];
  return sizes.map(v=>{
    const b=v[0],h=base.kind==='trapezoid'?v[2]:v[1],top=base.kind==='trapezoid'?v[1]:null;
    const answer=(base.kind==='trapezoid'?b+top:b)*h/(base.kind==='parallelogram'?1:2);
    return {...base,base:b,height:h,top,answer,defaultGuess:Math.max(base.min,answer-2)};
  });
}
export const tailorTask=(base,rng)=>rng.pick(tailorFamily(base));
export const tailorIdentity=a=>({kind:a.kind,base:a.base,height:a.height,top:a.top});
export function validTailor(a,base){
  return a?.kind===base.kind&&a.id===base.id&&integer(a.base,6,10)&&integer(a.height,4,8)&&
    (a.kind!=='trapezoid'||integer(a.top,4,a.base-2))&&a.min===base.min&&a.max===base.max&&integer(a.defaultGuess,a.min,a.max)&&integer(a.answer,a.min,a.max)&&
    a.answer===(a.kind==='trapezoid'?a.base+a.top:a.base)*a.height/(a.kind==='parallelogram'?1:2);
}
// Geometry uses centimeters with y pointing up. Pieces have rigid motions only.
export function tailorShape(m){
  const p=(x,y)=>({x,y}),b=m.base,h=m.height;
  if(m.kind==='parallelogram'){
    const s=2.4;
    return {body:[p(0,0),p(b,0),p(b+s,h),p(s,h)],piece:[p(0,0),p(s,0),p(s,h)],remain:[p(s,0),p(b,0),p(b+s,h),p(s,h)],target:[p(b,0),p(b+s,0),p(b+s,h)],rect:[p(s,0),p(b+s,0),p(b+s,h),p(s,h)],cutFrom:p(s,0),cutTo:p(s,h),slide:p(b,0)};
  }
  if(m.kind==='triangle'){
    const apex=p(b*.4,h),body=[p(0,0),p(b,0),apex];
    return {body,piece:body,remain:body,target:[p(b*1.4,h),apex,p(b,0)],rect:[p(0,0),p(b,0),p(b*1.4,h),apex],pivot:p(b*.7,h/2),cutFrom:p(b*.4,0),cutTo:apex};
  }
  const t=m.top,a=(b+t)/2;
  return {body:[p(0,0),p(b,0),p(t,h),p(0,h)],piece:[p(a,0),p(b,0),p(a,h/2)],remain:[p(0,0),p(a,0),p(a,h/2),p(t,h),p(0,h)],target:[p(a,h),p(t,h),p(a,h/2)],rect:[p(0,0),p(a,0),p(a,h),p(0,h)],pivot:p(a,h/2),cutFrom:p(a,0),cutTo:p(a,h/2)};
}
export function tailorPiece(g,t){
  if(!g.pivot)return g.piece.map(p=>({x:p.x+g.slide.x*t,y:p.y+g.slide.y*t}));
  const c=Math.cos(Math.PI*t),s=Math.sin(Math.PI*t),o=g.pivot;
  return g.piece.map(p=>({x:o.x+(p.x-o.x)*c-(p.y-o.y)*s,y:o.y+(p.x-o.x)*s+(p.y-o.y)*c}));
}

export function saleFamily(base){
  if(base.kind!=='compare')return Array.from({length:12},(_,i)=>({...base,price:(i+2)*2000}));
  return [32000,34000,36000,38000,40000,42000,44000,46000].flatMap(price=>[6000,8000,10000].map(reduction=>({...base,price,reduction,verdict:price-reduction<price*3/4?0:price-reduction===price*3/4?1:2})));
}
export const saleTask=(base,rng)=>rng.pick(saleFamily(base));
export const saleIdentity=a=>({kind:a.kind,price:a.price,reduction:a.reduction});
export function salePrices(a){return a.kind==='raise'?[a.price*125*80/10000,a.price]:a.kind==='pair'?[a.price*3/2,a.price*2]:[a.price-a.reduction,a.price*3/4];}
export function validSale(a,base){
  if(a?.kind!==base.kind||!integer(a.price,4000,46000)||a.price%2000||a.evidence!==0)return false;
  if(a.kind==='raise')return a.verdict===0;
  if(a.kind==='pair')return a.verdict===1;
  if(a.threshold!==30000||a.price<=a.threshold||![6000,8000,10000].includes(a.reduction))return false;
  const [x,y]=salePrices(a);return a.verdict===(x<y?0:x===y?1:2);
}
export function saleCopy(template,a,lang){
  const zh=lang==='zh',p=a.price/100,[x,y]=salePrices(a).map(n=>n/100),c={...template};
  c.starting=a.kind==='pair'?`2 × ${p}`:String(p);c.results=[String(x),String(y)];
  if(a.kind==='raise'){
    c.prompt=zh?`两家店原价都是 ${p} 元。算出实际付款，再比较。`:`Both shops start at ${p} coins. Find and compare checkout prices.`;
    c.offers=[zh?'先涨 25%，再打八折':'Raise 25%, then 20% off',zh?`原价 ${p} 元`:`Original price ${p}`];
    c.routes=[`${p} → ${p*1.25} → ${x}`,`${p} → ${p}`];
    c.evidence=[[`${p} × 1.25 × 0.8 = ${x}`,template.evidence[0][1]],[`${p} × (25% − 20%) = ${p*.05}`,template.evidence[1][1]],[`${p} × (1 − 25% + 20%) = ${p*.95}`,template.evidence[2][1]]];
    c.hintText=zh?`先把 ${p} 乘 1.25，再把新价格乘 0.8。`:`Multiply ${p} by 1.25, then the new price by 0.8.`;
    c.correctText=zh?`${p} × 1.25 × 0.8 = ${x}，两家一样贵。`:`${p} × 1.25 × 0.8 = ${x}. Both charge the same.`;
  }else if(a.kind==='pair'){
    c.prompt=zh?`同款点心每件 ${p} 元，一次买两件。算总价和平均折扣。`:`Each treat costs ${p} coins. Buy two and find the average rate.`;
    c.offers=[zh?`第一件 ${p}，第二件 ${p/2}`:`First ${p}, second ${p/2}`,zh?`两件共 ${y} 元`:`Two cost ${y}`];
    c.routes=[`${p} + ${p/2} = ${x}`,`${p} + ${p} = ${y}`];
    c.evidence=[[`(${p} + ${p/2}) ÷ ${y} = 75%`,template.evidence[0][1]],[`${p/2} ÷ ${p} = 50%`,template.evidence[1][1]],[`(${p} − ${p/2}) ÷ ${y} = 25%`,template.evidence[2][1]]];
    c.hintText=zh?`两件原价共 ${y} 元，活动后付 ${x} 元。用实际总价除以原总价。`:`Regular total ${y}, sale total ${x}. Divide the sale total by the regular total.`;
    c.correctText=zh?`两件付 ${x} 元，${x} ÷ ${y} = 75%，平均七五折。`:`Pay ${x} for two. ${x} ÷ ${y} = 75% of the original price.`;
  }else{
    const r=a.reduction/100,h=a.threshold/100,d=Math.abs(x-y);
    c.title=zh?`满 ${h} 减 ${r} 和七五折，哪个更省？`:`Save ${r} over ${h}, or pay 75%?`;
    c.prompt=zh?`购物车原价 ${p} 元，两种活动只能选一种。`:`The cart costs ${p} coins. Choose one offer.`;
    c.offers=[zh?`满 ${h} 减 ${r}`:`Save ${r} over ${h}`,zh?'全单七五折':'Pay 75%'];
    c.routes=[`${p} − ${r} = ${x}`,`${p} × 0.75 = ${y}`];
    c.evidence=[[c.routes.join('；'),template.evidence[0][1]],[`${h} − ${r} = ${h-r}；${p} × 0.75 = ${y}`,template.evidence[1][1]],[`${p} × (0.75 − ${r/100}) = ${Number((p*(.75-r/100)).toFixed(2))}`,template.evidence[2][1]]];
    c.verdicts=zh?['满减更省','两种一样','七五折更省']:['Threshold offer wins','Same price','75% offer wins'];
    c.start=zh?`“满 ${h}”只是门槛，两种活动都从 ${p} 元开始算。`:`${h} is only a threshold. Both calculations start at ${p}.`;
    c.hintText=zh?`满减算 ${p} − ${r}；折扣算 ${p} × 0.75，再比较。`:`Compare ${p} − ${r} with ${p} × 0.75.`;
    c.wrongEvidence=zh?`门槛不是标价，${r} 元不是 ${r}%。从 ${p} 元出发。`:`The threshold is not the price, and ${r} coins is not ${r}%. Start at ${p}.`;
    c.correctText=zh?`满减付 ${x} 元，折扣付 ${y} 元。${c.verdicts[a.verdict]}，相差 ${d} 元。`:`Checkout prices: ${x} and ${y}. ${c.verdicts[a.verdict]}; difference ${d}.`;
  }
  c.wrongVerdict=zh?`收据是 ${x} 和 ${y}。${a.kind==='pair'?'比较实际总价占原总价的比例。':'再比较实际付款。'}`:`Receipts: ${x} and ${y}. ${a.kind==='pair'?'Find sale total divided by regular total.':'Compare checkout prices.'}`;
  return c;
}

export function droneTask(base,rng){
  if(base.kind==='locate'){
    const origin=[rng.int(1,3),rng.int(1,4)],delta=[rng.int(2,5),rng.int(2,5)];
    return {...base,origin,delta,target:origin.map((n,i)=>n+delta[i])};
  }
  if(base.kind==='wind'){
    const command=[rng.int(2,7),rng.int(3,7)],wind=[rng.int(1,2),-rng.int(1,2)];
    return {...base,wind,target:command.map((n,i)=>n+wind[i])};
  }
  const x=rng.shuffle([1,2,3,4,5,6,7,8,9]).slice(0,3).sort((a,b)=>a-b),y=rng.shuffle([1,2,3,4,5,6,7,8,9]).slice(0,3).sort((a,b)=>a-b);
  const points=[[x[0],0],[x[0],y[0]],[x[1],y[0]],[x[1],y[1]],[x[2],y[1]],[x[2],y[2]],[x[1],0],[x[2],y[0]],[x[0],y[1]]];
  const km=rng.int(2,4),options=rng.shuffle([[km*2,500],[km*2,400],[km*2,600]]);
  return {...base,target:[x[2],y[2]],points,km,options,correct:options.findIndex(v=>v[0]*v[1]===km*1000)};
}
export const droneIdentity=a=>a.kind==='route'?{km:a.km,options:[...a.options].sort(),points:[...a.points].sort()}:{kind:a.kind,target:a.target,wind:a.wind,origin:a.origin};
export function dronePath(a,indices){
  if(!Array.isArray(indices)||indices.length>6||new Set(indices).size!==indices.length)return false;
  let previous=[0,0];
  return indices.every(i=>{const p=a.points[i];if(!p||(previous[0]!==p[0]&&previous[1]!==p[1])||previous.join()===p.join())return false;previous=p;return true;});
}
export function validDrone(a,base){
  const pair=(p,lo,hi)=>Array.isArray(p)&&p.length===2&&p.every(n=>integer(n,lo,hi));
  if(a?.kind!==base.kind||!pair(a.target,0,9)||!pair(a.wind,-2,2))return false;
  if(a.kind==='locate')return a.wind.every(n=>n===0)&&pair(a.origin,0,5)&&pair(a.delta,1,5)&&a.origin.every((n,i)=>n+a.delta[i]===a.target[i]);
  if(a.kind==='wind')return a.wind[0]>0&&a.wind[1]<0&&a.target.every((n,i)=>integer(n-a.wind[i],0,9));
  return integer(a.km,2,4)&&Array.isArray(a.options)&&a.options.length===3&&a.options.every(p=>pair(p,1,800))&&a.options.filter(p=>p[0]*p[1]===a.km*1000).length===1&&a.options[a.correct]?.[0]*a.options[a.correct]?.[1]===a.km*1000&&Array.isArray(a.points)&&a.points.length===9&&a.points.every(p=>pair(p,0,9))&&new Set(a.points.map(p=>p.join())).size===9&&dronePath(a,[0,1,2,3,4,5]);
}
export function droneCopy(template,a,lang){
  const zh=lang==='zh',p=v=>`(${v.join(', ')})`,c={...template,target:a.target,wind:a.wind};
  if(a.kind==='locate'){
    c.title=zh?`把图书送到 ${p(a.target)}`:`Deliver books to ${p(a.target)}`;
    c.start=zh?`邮局在 ${p(a.origin)}。向东 ${a.delta[0]} 格、向北 ${a.delta[1]} 格到图书馆。`:`From ${p(a.origin)}, go ${a.delta[0]} east and ${a.delta[1]} north to the library.`;
    c.hintText=`x: ${a.origin[0]} + ${a.delta[0]}; y: ${a.origin[1]} + ${a.delta[1]}`;
    c.correct=zh?`送达 ${p(a.target)}！横坐标在前，纵坐标在后。`:`Delivered to ${p(a.target)}! x comes first, then y.`;
  }else if(a.kind==='wind'){
    c.title=zh?`风会把无人机吹偏 ${p(a.wind)}`:`Wind pushes the drone by ${p(a.wind)}`;
    c.prompt=zh?`学校在 ${p(a.target)}。反向修正指令，让风把无人机推到学校。`:`School: ${p(a.target)}. Correct the command to cancel the wind.`;
    c.start=zh?`目标 ${p(a.target)}，风偏 ${p(a.wind)}。`:`Target ${p(a.target)}, wind ${p(a.wind)}.`;
    c.hintText=`x: ${a.target[0]} − (${a.wind[0]}); y: ${a.target[1]} − (${a.wind[1]})`;
    c.correct=`${p(a.target.map((n,i)=>n-a.wind[i]))} + ${p(a.wind)} = ${p(a.target)}`;
  }else{
    c.title=zh?`选出 ${a.km} km 的跨城航线`:`Choose the ${a.km} km route`;
    c.prompt=zh?`比例尺不同，算实际距离，找出 ${a.km} km 的航线。`:`Use each scale to find the route that is ${a.km} km long.`;
    const correct=a.options[a.correct];c.hintText=`${correct[0]} × ${correct[1]} = ${a.km*1000} m = ${a.km} km`;
    c.wrong=()=>zh?`还不是 ${a.km} km。用图上厘米数乘每厘米代表的米数。`:`Not ${a.km} km yet. Multiply map centimeters by meters per centimeter.`;
    c.options=a.options.map((v,i)=>['ABC'[i],`${v[0]} cm × ${v[1]} m/cm`,`= ${v[0]*v[1]/1000} km`]);
  }
  return c;
}

export function fireflyTask(base,rng){
  const a={...base};
  if(a.type==='sub'){a.start=rng.int(10,15);a.result=a.start-rng.int(2,6);}
  const goal=a.type==='sub'?a.start-a.result:a.target,groups=a.lights,parts=goal>18?3:2,nums=[];
  for(let i=0;i<groups;i++){
    let left=goal;
    for(let j=0;j<parts-1;j++){const n=rng.int(Math.max(1,left-9*(parts-j-1)),Math.min(9,left-(parts-j-1)));nums.push(n);left-=n;}
    nums.push(left);
  }
  while(nums.length<base.nums.length)nums.push(rng.int(1,9));
  return {...a,nums:rng.shuffle(nums)};
}
export const fireflyIdentity=a=>({type:a.type,target:a.target,start:a.start,result:a.result,nums:[...a.nums].sort((x,y)=>x-y)});
export function fireflyGroups(nums,goal,count){
  const memo=new Set();
  const visit=(mask,left)=>{
    if(!left)return [];
    const key=`${mask}/${left}`;if(memo.has(key))return null;memo.add(key);
    const choose=(at,total,chosen)=>{
      if(total===goal){const tail=visit(mask|chosen,left-1);return tail?[chosen,...tail]:null;}
      for(let i=at;i<nums.length;i++)if(!(mask&(1<<i))&&total+nums[i]<=goal){const found=choose(i+1,total+nums[i],chosen|(1<<i));if(found)return found;}
      return null;
    };return choose(0,0,0);
  };
  return visit(0,count);
}
export function validFirefly(a,base){
  if(a?.type!==base.type||a.target!==base.target||a.lights!==base.lights||a.need!==base.need||a.seconds!==base.seconds||!Array.isArray(a.nums)||a.nums.length!==base.nums.length||!a.nums.every(n=>integer(n,1,9)))return false;
  if(a.type==='sub'&&(!integer(a.start,10,15)||!integer(a.result,4,a.start-2)))return false;
  return fireflyGroups(a.nums,a.type==='sub'?a.start-a.result:a.target,a.lights)!==null;
}
export function fireflySpeech(a,lang){
  if(lang==='en')return a.type==='sub'?`Start with ${a.start}, leave ${a.result}. Circle the extra fireflies.`:`Circle fireflies that add up to ${a.target}.`;
  return a.type==='sub'?`原来有 ${a.start}，要留下 ${a.result}。圈出多余的萤火虫。`:`圈住萤火虫，让数字合起来是 ${a.target}。`;
}

export function lanternFamily(base){
  if(base.mode==='cut')return [3,4,5,6,7].map(length=>({...base,length,intervals:length-1,answer:length-1,defaultGuess:length}));
  if(base.mode==='stairs')return [1,2,3,4].flatMap(startFloor=>[3,4,5,6,7].map(intervals=>({...base,startFloor,endFloor:startFloor+intervals,length:intervals,intervals,answer:intervals,defaultGuess:intervals+1})));
  const min=base.mode==='both'?6:base.mode==='neither'?3:4;
  return [5,10,15].flatMap(gap=>Array.from({length:5},(_,i)=>{
    const intervals=min+i,answer=intervals+(base.mode==='both'?1:base.mode==='neither'?-1:0);
    return {...base,intervals,gap,length:intervals*gap,answer,defaultGuess:answer===intervals?answer+1:intervals};
  }));
}
export const lanternTask=(base,rng)=>rng.pick(lanternFamily(base));
export const lanternIdentity=a=>({mode:a.mode,length:a.length,gap:a.gap,startFloor:a.startFloor,endFloor:a.endFloor});
export function validLantern(a,base){
  if(a?.mode!==base.mode||a.id!==base.id||a.skin!==base.skin||a.min!==base.min||a.max!==base.max||!integer(a.answer,a.min,a.max)||!integer(a.defaultGuess,a.min,a.max)||!integer(a.intervals,2,10))return false;
  if(a.mode==='cut')return integer(a.length,3,7)&&a.answer===a.length-1&&a.intervals===a.answer;
  if(a.mode==='stairs')return integer(a.startFloor,1,4)&&integer(a.endFloor,a.startFloor+3,a.startFloor+7)&&a.answer===a.endFloor-a.startFloor&&a.intervals===a.answer&&a.length===a.answer;
  return [5,10,15].includes(a.gap)&&a.length===a.intervals*a.gap&&a.answer===a.intervals+(a.mode==='both'?1:a.mode==='neither'?-1:0);
}

export function voxelViews(cells){
  const views=Array.from({length:3},()=>Array(16).fill(false));
  for(const [x,y,z]of cells){views[0][(3-y)*4+x]=true;views[1][z*4+x]=true;views[2][(3-y)*4+z]=true;}
  return views;
}
export function validVoxels(cells,grounded=true){
  if(!Array.isArray(cells)||cells.length>64||cells.some(p=>!Array.isArray(p)||p.length!==3||p.some(n=>!integer(n,0,3))))return false;
  const keys=new Set(cells.map(p=>p.join()));
  return keys.size===cells.length&&(!grounded||cells.every(([x,y,z])=>y===0||keys.has([x,y-1,z].join())));
}
export function voxelTask(base,rng){
  const count=base.kind==='free'?rng.int(4,6):base.cells.length,maxY=base.kind==='free'?1:Math.max(...base.cells.map(p=>p[1]));
  const x=rng.int(0,3),z=rng.int(0,3),cells=Array.from({length:maxY+1},(_,y)=>[x,y,z]);
  while(cells.length<count){
    const keys=new Set(cells.map(p=>p.join())),candidates=[];
    for(let xx=0;xx<4;xx++)for(let zz=0;zz<4;zz++){
      let y=0;while(keys.has([xx,y,zz].join()))y++;
      if(y<=maxY&&(y>0||cells.some(([cx,cy,cz])=>cy===0&&Math.abs(cx-xx)+Math.abs(cz-zz)===1)))candidates.push([xx,y,zz]);
    }
    if(!candidates.length)throw new Error('No supported cube position');
    cells.push(rng.pick(candidates));
  }
  return {...base,cells};
}
export const voxelIdentity=a=>({kind:a.kind,views:voxelViews(a.cells),shared:Boolean(a.shared)});
export function validVoxel(a,base){
  if(a?.kind!==base.kind||!validVoxels(a.cells,!a.shared))return false;
  if(a.kind==='free')return a.shared?a.cells.length>0:a.cells.length===0||a.cells.length>=4&&a.cells.length<=6;
  return a.cells.length===base.cells.length&&Math.max(...a.cells.map(p=>p[1]))===Math.max(...base.cells.map(p=>p[1]));
}
