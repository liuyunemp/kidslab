const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export const pancakeFamily=base=>[2,3,4].map(minutes=>({...base,minutes}));
export function pancakeTask(base,rng){
  const a={...base,minutes:rng.int(2,4)};
  if(!a.parallel)return a;
  const total=a.rounds*a.minutes;
  a.start=rng.int(6,8)*60+60-total+rng.int(1,total-1);a.soy=rng.int(2,total-1);a.deadline=a.start+total+rng.int(5,20);return a;
}
export function validPancake(a,base){
  if(a?.rounds!==base.rounds||a.parallel!==base.parallel||JSON.stringify(a.pancakes)!==JSON.stringify(base.pancakes)||!integer(a.minutes,2,4))return false;
  return !a.parallel||integer(a.start,360,540)&&integer(a.soy,2,a.rounds*a.minutes-1)&&integer(a.deadline,a.start+a.rounds*a.minutes+1,600)&&Math.floor(a.start/60)!==Math.floor((a.start+a.rounds*a.minutes)/60);
}
export const pancakeTokens=a=>a.pancakes.flatMap(p=>[`${p}1`,`${p}2`]);
export function pancakeSchedule(a,schedule,partial=false){
  const tokens=pancakeTokens(a);
  if(!Array.isArray(schedule)||schedule.length!==tokens.length)return false;
  const filled=schedule.filter(v=>v!==null);
  if(filled.some(v=>!tokens.includes(v))||new Set(filled).size!==filled.length||!partial&&filled.length!==tokens.length)return false;
  return partial||Array.from({length:a.rounds},(_,i)=>schedule.slice(2*i,2*i+2)).every(([p,q])=>p[0]!==q[0]);
}
export const minuteClock=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
export const pancakeEnd=a=>a.start+Math.max(a.rounds*a.minutes,a.soy);
export const pancakeChoices=a=>[pancakeEnd(a)-1,pancakeEnd(a),pancakeEnd(a)+3].map(minuteClock);
export function pancakeCopy(a,key,lang){
  const zh=lang==='zh',n=a.pancakes.length,total=a.rounds*a.minutes,start=minuteClock(a.start),end=minuteClock(pancakeEnd(a));
  const messages={
    ruleText:zh?`一轮 ${a.minutes} 分钟，同时最多煎 2 个面。`:`Each round takes ${a.minutes} minutes, with room for 2 sides.`,
    mission1Text:zh?`每面煎 ${a.minutes} 分钟，把 ${n*2} 个面排进 ${a.rounds} 轮。`:`Each side takes ${a.minutes} minutes. Schedule ${n*2} sides in ${a.rounds} rounds.`,
    mission2Title:zh?`三张饼，${total} 分钟出餐`:`Three pancakes in ${total} minutes`,
    mission3Text:zh?`排好 ${total} 分钟铁板，启动豆浆机，再算出餐时刻。`:`Schedule ${total} minutes of cooking, start soy milk and find serving time.`,
    soyTitle:zh?`豆浆机 · 需要 ${a.soy} 分钟`:`Soy maker · ${a.soy} minutes`,
    soyText:zh?'同时开工，比较两边完成的时间。':'Start both jobs together and compare their finishing times.',
    clockQuestion:zh?`${start} 开始，${total} 分钟后是几点？`:`Start at ${start}. What time is it ${total} minutes later?`,
    finalKicker:zh?`赶上 ${minuteClock(a.deadline)} 的公交`:`Catch the ${minuteClock(a.deadline)} bus`,
    finalText:zh?`${n} 张饼最快 ${total} 分钟，豆浆并行做，${end} 全部出餐！`:`${n} pancakes need ${total} minutes. With soy made in parallel, everything is ready at ${end}!`,
    needClock:zh?`算一算 ${start} 再过 ${total} 分钟。`:`Add ${total} minutes to ${start}.`,
    wrongClock:zh?'经过整点时，分钟要从 00 重新计数。':'When you cross the hour, minutes start again from 00.',
    done1:zh?`${total} 分钟完成，铁板没有空等！`:`Finished in ${total} minutes with no idle slots!`,
    done2:zh?`${n*2} 个面排满 ${a.rounds} 轮，最快 ${total} 分钟。`:`${n*2} sides fill ${a.rounds} rounds: ${total} minutes at best.`,
    done3:zh?`${end} 全部出餐，比公交早 ${a.deadline-pancakeEnd(a)} 分钟！`:`Ready at ${end}, ${a.deadline-pancakeEnd(a)} minutes before the bus!`,
    hint3:zh?`让两项工作同时开始。先把 ${start} 加到下一个整点，再数剩下的分钟。`:`Start both jobs together. Count from ${start} to the next hour, then add the minutes left.`,
  };
  return messages[key]??null;
}
