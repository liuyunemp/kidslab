export function stoneRange(base){return base.setup?[7,29]:base.id==='classic'?[9,21]:base.max===4?[16,21]:[13,21];}
export function stoneFamily(base){const [min,max]=stoneRange(base);return Array.from({length:max-min+1},(_,i)=>({...base,initial:min+i}));}
export function stoneTask(base,rng){return rng.pick(stoneFamily(base));}
export function validStones(a,base){const [min,max]=stoneRange(base);return a?.id===base.id&&a.max===base.max&&a.misere===base.misere&&a.setup===base.setup&&a.chooser===base.chooser&&Number.isInteger(a.initial)&&a.initial>=min&&a.initial<=max;}
export function stonePit(n,rule){return n%(rule.max+1)===(rule.misere?1:0);}
export function stoneTake(n,rule){
  if(!Number.isInteger(n)||n<=0)return 0;
  for(let take=1;take<=Math.min(n,rule.max);take++){const left=n-take;if(left===0?!rule.misere:stonePit(left,rule))return take;}
  return 1;
}
export function validStonePlay(s,a){
  if(!s||!Number.isInteger(s.initial)||s.initial<7||s.initial>29||!Number.isInteger(s.stones)||s.stones<0||s.stones>s.initial||!['human','rabbit','fox'].includes(s.turn)||!Array.isArray(s.history)||s.history.length>30||!s.history.length)return false;
  let left=s.initial;if(s.history[0].who!=='start'||s.history[0].left!==left||s.history[0].take!==0)return false;
  for(const move of s.history.slice(1)){if(!['human','rabbit','fox'].includes(move.who)||!Number.isInteger(move.take)||move.take<1||move.take>a.max||move.take>left)return false;left-=move.take;if(move.left!==left)return false;}
  return left===s.stones&&Boolean(s.over)===(left===0);
}
