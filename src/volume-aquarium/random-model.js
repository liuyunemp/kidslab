const integer=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
export function aquariumTask(base,rng){
  if(base.kind==='build'){
    const solutions=[];
    for(let l=2;l<=6;l++)for(let w=2;w<=6;w++)for(let h=1;h<=6;h++){
      const v=l*w*h;if(v<18||v>48)continue;
      if(base.pref==='flat'&&!(h<=2&&l>=w)||base.pref==='tall'&&h<Math.max(l,w))continue;
      solutions.push([l,w,h]);
    }
    const solution=rng.pick(solutions);return {...base,need:solution.reduce((a,b)=>a*b,1),initial:[rng.int(1,4),rng.int(1,4),rng.int(1,3)]};
  }
  if(base.kind==='displace')return {...base,volume:rng.int(6,20)*20};
  if(base.kind==='pump')return {...base,ml:base.unit==='toL'?rng.int(2,18)*50:rng.int(11,49)*100,liters:base.unit==='sum'?rng.int(1,4):0};
  return {...base,left:rng.int(2,4),right:rng.int(1,3),width:rng.int(2,3),low:rng.int(1,2),high:rng.int(3,4)};
}
export function validAquarium(a,base){
  if(a?.kind!==base.kind)return false;
  if(a.kind==='build')return a.pref===base.pref&&integer(a.need,18,48)&&Array.isArray(a.initial)&&a.initial.length===3&&a.initial.every(n=>integer(n,1,6))&&Array.from({length:216},(_,i)=>[i%6+1,Math.floor(i/6)%6+1,Math.floor(i/36)+1]).some(([l,w,h])=>l*w*h===a.need&&(a.pref==='flat'?h<=2&&l>=w:a.pref==='tall'?h>=Math.max(l,w):true));
  if(a.kind==='displace')return integer(a.volume,120,400)&&a.volume%20===0;
  if(a.kind==='pump')return a.unit===base.unit&&integer(a.ml,a.unit==='toL'?100:100,a.unit==='toL'?900:4900)&&a.ml%(a.unit==='toL'?50:100)===0&&integer(a.liters,0,4)&&(a.unit==='sum'?a.liters>0:a.liters===0);
  return integer(a.left,2,4)&&integer(a.right,1,3)&&integer(a.width,2,3)&&integer(a.low,1,2)&&integer(a.high,3,4);
}
export function aquariumQuestion(a){
  const answer=a.unit==='toL'?a.ml/1000:a.unit==='sum'?a.liters*1000+a.ml:a.ml;
  const opts=a.unit==='sum'?[a.liters*1000+a.ml/10,answer,answer*10]:[answer/10,answer,answer*10];
  const q=a.unit==='toL'?{zh:`${a.ml} cm³ 等于多少 L？`,en:`How many L is ${a.ml} cm³?`}:a.unit==='sum'?{zh:`${a.liters} L 加 ${a.ml} cm³，一共多少 cm³？`,en:`${a.liters} L plus ${a.ml} cm³: how many cm³?`}:{zh:`${a.ml/1000} L 等于多少 cm³？`,en:`How many cm³ is ${a.ml/1000} L?`};
  return {q,answer:String(answer),opts:opts.map(String)};
}
export const aquariumVolume=a=>a.width*(a.left*a.low+a.right*a.high);
export const aquariumFormula=a=>`${a.left}×${a.width}×${a.low} + ${a.right}×${a.width}×${a.high} = ${aquariumVolume(a)} cm³`;
