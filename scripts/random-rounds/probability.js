export const probabilityFraction=(n,d)=>{let a=n,b=d;while(b)[a,b]=[b,a%b];return `${n/a}/${d/a}`;};
export function carnivalFamily(base){
  if(base.kind==='design')return [1,2,3].flatMap(target=>[4,5,6].map(wins=>({...base,target,wins})));
  if(base.kind==='honest')return [1,2,3,4].map(wins=>({...base,wins,claimWins:wins}));
  return [1,2,3].flatMap(wins=>Array.from({length:6-wins},(_,i)=>({...base,wins,claimWins:wins+i+1})));
}
export const carnivalTask=(base,rng)=>rng.pick(carnivalFamily(base));
export function validCarnival(a,base){
  if(a?.kind!==base.kind||a.total!==base.total)return false;
  return carnivalFamily(base).some(b=>b.wins===a.wins&&b.claimWins===a.claimWins&&b.target===a.target);
}
export function carnivalTrials(total,wins,rng){
  if(!Number.isInteger(total)||total<2||!Number.isInteger(wins)||wins<0||wins>total)throw new RangeError('Invalid equally likely outcomes');
  let count=0;for(let i=0;i<1000;i++)if(rng.int(0,total-1)<wins)count++;return count;
}
export function carnivalCopy(template,a,lang){
  const zh=lang==='zh',design=a.kind==='design',theory=probabilityFraction(a.wins,a.total),claim=design?'':probabilityFraction(a.claimWins,a.total),target=probabilityFraction(a.target??a.wins,a.total),expected=a.claimWins===a.wins?'honest':'dishonest';
  return {...template,...a,theory:`${a.wins}/${a.total}`,claim:design?(zh?'公开概率':'Published probability'):claim,expected,
    title:design?(zh?'设计一个诚实的转盘':'Design an honest wheel'):(zh?`“中奖概率是 ${claim}”可信吗？`:`Is the promised ${claim} chance accurate?`),
    prompt:design?(zh?`${a.total} 个等大格，调整到中奖概率 ${target}，再做试验。`:`Adjust ${a.total} equal sectors to a ${target} win chance, then test.`):template.prompt,
    formula:`${a.wins} ÷ ${a.total} = ${theory}`,
    hintText:design?(zh?`目标概率 ${target}，总共 ${a.total} 格。找出该留几个大奖格。`:`Target ${target} with ${a.total} sectors. Find the prize-sector count.`):(zh?`比较承诺 ${claim} 与实际 ${theory}。`:`Compare the promised ${claim} with the actual ${theory}.`),
    wrong:zh?`有 ${a.wins} 个中奖结果，总共 ${a.total} 个等可能结果；请重新比较。`:`There are ${a.wins} winning outcomes among ${a.total} equally likely outcomes. Compare again.`,
    correct:design?(zh?`设计完成！${a.target}/${a.total} = ${target}，真实概率已公开。`:`Design ready: ${a.target}/${a.total} = ${target}. The true probability is published.`):(zh?`理论概率 ${theory}，${expected==='honest'?'与承诺一致。':'低于承诺。'}`:`Theoretical chance ${theory}: ${expected==='honest'?'matches the promise.':'lower than promised.'}`),
    wrongDesign:zh?`当前设计还不等于目标概率 ${target}。`:`The current design does not yet match ${target}.`,
    missingTrial:zh?'先做 1000 次有放回试验，观察试验频率。':'Run 1000 trials with replacement to observe the frequency.',
  };
}
