export function golfTask(base,rng){
  const tee={x:rng.int(90,115),y:rng.int(305,350)};
  const answer=base.answer===0?0:base.path.length===2?rng.int(22,34):rng.int(58,63);
  let path=[tee];
  if(base.path.length===2){const x=rng.int(590,630);path.push({x,y:tee.y-(x-tee.x)*Math.tan(answer*Math.PI/180)});}
  else{
    const tangent=Math.tan(answer*Math.PI/180);let previous=tee;
    for(const y of [60,380,60,rng.int(160,220)]){const point={x:previous.x+Math.abs(y-previous.y)/tangent,y};path.push(point);previous=point;}
  }
  return {...base,answer,tee,cup:path.at(-1),path};
}
export function validGolf(a,base){
  if(!a||!Number.isInteger(a.answer)||!Array.isArray(a.path)||a.path.length!==base.path.length||a.kicker!==base.kicker||!a.tee||!a.cup)return false;
  if(base.answer===0?a.answer!==0:base.path.length===2?a.answer<22||a.answer>34:a.answer<58||a.answer>63)return false;
  if(a.path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<70||p.x>775||p.y<55||p.y>380))return false;
  if(JSON.stringify(a.tee)!==JSON.stringify(a.path[0])||JSON.stringify(a.cup)!==JSON.stringify(a.path.at(-1)))return false;
  if(a.path.length===5&&a.path.slice(1,4).some((p,i)=>p.y!==[60,380,60][i]))return false;
  for(let i=1;i<a.path.length;i++){
    const prev=a.path[i-1],p=a.path[i];if(p.x<=prev.x)return false;
    const measured=Math.atan2(Math.abs(p.y-prev.y),p.x-prev.x)*180/Math.PI;
    if(Math.abs(measured-a.answer)>.1)return false;
    if(i===1&&p.y>prev.y)return false;
  }
  return true;
}
export function golfIdentity(a){return {tee:a.tee,cup:a.cup,path:a.path};}
export function golfGate(a){
  const [start,end]=a.path,dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy),x=(start.x+end.x)/2,y=(start.y+end.y)/2;
  return [-1,1].map(sign=>({x:x-sign*dy/length*48,y:y+sign*dx/length*48}));
}
export function golfText(key,a,lang){
  const zh=lang==='zh',normal=90-a.answer,mark=Math.round(a.answer/10)*10;
  if(key==='gateSuccess')return zh?`穿门进洞！${a.answer}° 是一个锐角。`:`Through the gate! ${a.answer}° is an acute angle.`;
  if(key==='bankSuccess')return zh?`三次反弹命中！每次都是 ${normal}° 入射、${normal}° 反射。`:`Three banks! ${normal}° incidence equals ${normal}° reflection.`;
  if(key==='reflectLabel')return `${normal}° = ${normal}°`;
  if(key==='hint2')return zh?`先找 ${mark}° 刻度，看看球洞在它的哪一边。`:`Find the ${mark}° mark. Which side is the cup on?`;
  if(key==='hint3')return zh?'把球洞想象成墙后的镜像，观察三次反弹。':'Imagine the cup reflected behind the walls. Watch the three banks.';
  return null;
}
