import {random,copy,yes,no,levelIndex,button} from './model-utils.js';
const W=6,H=5;
export function makeLevel(index,seed=0){
  levelIndex(index);const rng=random(seed),row=seed?rng.int(1,3):2,route=Array.from({length:W},(_,x)=>x+row*W);
  if(index===1||index===5||index===8){for(let x=2;x<W;x++)route[x]=x+(row===3?2:row+1)*W;}
  const routes=[route];if(index===6||index===8){routes.push(Array.from({length:W},(_,x)=>x+(x<2?row:row===1?0:row-1)*W));}
  const channel=[...new Set(routes.flat())],goals=routes.map(r=>r.at(-1));
  const open=channel.filter((_,i)=>i===0||(index===0&&i%2===0));
  const village=index>=5?[Array.from({length:H},(_,y)=>y*W+4).find(i=>!channel.includes(i))]:[];
  return {index,w:W,h:H,source:route[0],channel,goals,open,village,blocked:index===7?route[3]:null,need:seed?rng.int(4,7):5,flow:seed?rng.pick([1,2]):1};
}
export const initial=l=>({depth:Array(W*H).fill(0).map((_,i)=>l.open.includes(i)?1:0),banks:Array(W*H).fill(false),pools:Array(W*H).fill(false),water:Array(W*H).fill(0),silt:Array(W*H).fill(0),bed:Array(W*H).fill(0).map((_,i)=>i===l.blocked?1:2),deposited:Array(W*H).fill(0).map((_,i)=>i===l.blocked?1:0),out:Array(W*H).fill(0),removed:0,sedimentOut:0,sedimentInput:0,escaped:0,eroded:0,input:0,flow:l.flow,slope:1,slopes:[],ticks:0});
export const waterBalance=s=>s.water.reduce((a,b)=>a+b,0)+s.out.reduce((a,b)=>a+b,0)+s.escaped-s.input;
export const sedimentBalance=s=>s.bed.reduce((a,b)=>a+b,0)+s.silt.reduce((a,b)=>a+b,0)+s.deposited.reduce((a,b)=>a+b,0)+s.removed+s.sedimentOut-W*H*2-s.sedimentInput;
export function tick(l,s){
  const n=copy(s);n.water[l.source]+=s.flow;n.input+=s.flow;
  if(l.index>=4){n.silt[l.source]+=s.flow*.1;n.sedimentInput+=s.flow*.1;}
  const water=[...n.water],silt=[...n.silt];
  for(let i=0;i<W*H;i++){
    if(water[i]<=0||!s.depth[i]||(i===l.blocked&&s.deposited[i]>.5))continue;
    const x=i%W,y=Math.floor(i/W),dest=[];
    if(x<W-1)for(const yy of [y-1,y,y+1]){const j=yy*W+x+1;if(yy>=0&&yy<H&&s.depth[j])dest.push(j);}
    const capacity=s.slope*(s.pools[i]?.35:1.0),amount=Math.min(water[i],capacity);
    if(!dest.length&&x<W-1)continue;
    const erosion=l.index>=3&&!s.banks[i]?Math.min(n.bed[i],amount*.04):0;
    n.bed[i]-=erosion;n.eroded+=erosion;n.silt[i]+=erosion;
    const suspended=silt[i]+erosion,deposit=s.pools[i]?suspended*.65:0;
    n.silt[i]-=deposit;n.deposited[i]+=deposit;
    const transported=(suspended-deposit)*amount/water[i];n.silt[i]-=transported;n.water[i]-=amount;
    if(x===W-1){if(l.goals.includes(i))n.out[i]+=amount;else n.escaped+=amount;n.sedimentOut+=transported;}
    else for(const j of dest){n.water[j]+=amount/dest.length;n.silt[j]+=transported/dest.length;}
  }
  n.ticks++;if(n.out.some(v=>v>0)&&!n.slopes.includes(n.slope))n.slopes.push(n.slope);
  return n;
}
export function won(l,s){return l.goals.every(g=>s.out[g]>=l.need)&&(!l.village.some(v=>s.water[v]>.5))&&(l.index<3||s.eroded<.6)&&(l.index!==2||s.slopes.length===2)&&(l.index<4||(s.deposited.some(v=>v>.05)&&s.sedimentOut<.04*s.out.reduce((a,b)=>a+b,0)));}
export function apply(l,s,a){
  const cell=Number.isInteger(a?.cell)&&a.cell>=0&&a.cell<W*H;
  if(['dig','bank','pool'].includes(a?.type)&&cell){if(l.village.includes(a.cell))return no(s,'village');const n=copy(s);if(a.type==='dig')n.depth[a.cell]=1-n.depth[a.cell];else n[a.type==='bank'?'banks':'pools'][a.cell]=!n[a.type==='bank'?'banks':'pools'][a.cell];return yes(n,a.type);}
  if(a?.type==='dredge'&&cell){if(!s.deposited[a.cell])return no(s,'no-sediment');const n=copy(s);n.removed+=n.deposited[a.cell];n.deposited[a.cell]=0;return yes(n,'dredge');}
  if(['flow','slope'].includes(a?.type)&&Number.isInteger(a.value)&&a.value>=1&&a.value<=(a.type==='flow'?3:2)){const n=copy(s);n[a.type]=a.value;return yes(n,'adjust');}
  if(a?.type==='step'){if(s.ticks>=1024)return no(s,'step-limit');return yes(tick(l,s),'flow');}return no(s);
}
export function solve(l,s=initial(l)){
  const actions=[];let n=copy(s);const add=a=>{const r=apply(l,n,a);if(!r.ok)throw Error(r.reason);n=r.state;actions.push(a);};
  if(n.eroded>=.6||n.sedimentOut>=.4)return [{type:'retry'}];
  if(l.blocked!==null&&n.deposited[l.blocked]>.5)add({type:'dredge',cell:l.blocked});
  for(let i=0;i<W*H;i++){if(Boolean(n.depth[i])!==l.channel.includes(i))add({type:'dig',cell:i});if(l.index>=3&&l.channel.includes(i)&&!n.banks[i])add({type:'bank',cell:i});}
  if(l.index>=4)for(const g of l.goals)if(!n.pools[g])add({type:'pool',cell:g});
  let limit=160;while(!won(l,n)&&limit--){if(l.index===2&&n.slopes.length===1)add({type:'slope',value:n.slopes[0]===1?2:1});add({type:'step'});}
  return actions;
}
export const hint=(l,s)=>solve(l,s)[0];
export function controls(l,s){return [{tool:true,label:['工具','Tool'],options:[['dig','⛏ 挖 / 填','⛏ Dig / fill'],['bank','🧱 护岸','🧱 Bank'],['pool','◉ 沉沙池','◉ Settling pool'],['dredge','清淤','Dredge']]},{select:true,label:['入水量（相对值）','Inflow (relative)'],value:s.flow,options:[1,2,3].map(value=>({label:String(value),action:{type:'flow',value}}))},{select:true,label:['坡度档','Slope setting'],value:s.slope,options:[1,2].map(value=>({label:String(value),action:{type:'slope',value}}))},button('放水一步','Flow one tick',{type:'step'})];}
export function view(l,s){return {size:7,overhead:true,objects:Array.from({length:W*H},(_,i)=>({id:'river-'+i,type:l.village.includes(i)?'house':'land',x:i%W,z:Math.floor(i/W),depth:s.depth[i],water:s.water[i],bank:s.banks[i],pool:s.pools[i],silt:s.silt[i]+s.deposited[i],on:l.goals.includes(i),source:i===l.source,label:l.goals.includes(i)?`${s.out[i].toFixed(1)}/${l.need}`:i===l.source?'→':'',cell:i,action:l.village.includes(i)?null:{type:'tool',cell:i}})),stats:[[l.goals.map(g=>s.out[g].toFixed(1)+'/'+l.need).join(' · '),'田塘进水','Water delivered'],...(l.index>=3?[[s.eroded.toFixed(2)+' / <0.60','冲刷上限','Erosion limit']]:[]),...(l.index===2?[[s.slopes.length+'/2','坡度对照','Slopes compared']]:[]),...(l.index>=4?[[s.deposited.some(v=>v>.05)?'✓':'—','沉沙','Settled'],[(s.out.reduce((a,b)=>a+b,0)?s.sedimentOut/s.out.reduce((a,b)=>a+b,0):0).toFixed(3)+' / <0.040','出口沙水比','Sediment / water']]:[])]};}
export const invite=l=>l.index===2?['用两档坡度分别引水入塘。','Deliver water using both slope settings.']:l.index===7?['清掉淤堵，再把清水引到田塘。','Clear the blockage and deliver cleaner water.']:l.index>=4?['引清水入塘，留意冲刷和出口泥沙。','Deliver cleaner water; watch erosion and outgoing sediment.']:l.index===3?['引水入塘，让冲刷保持在上限内。','Deliver water while keeping erosion below the limit.']:['从左侧水源挖到右侧田塘，再放水。','Dig from the left source to the right field, then release water.'];
export const lesson=['这是固定时步的简化沙盘：水沿下坡河格分流，护岸减少冲刷，沉沙池让悬沙沉下。水和泥沙分别守恒；读数只比较趋势，不能预测真实洪水。','This fixed-step sandbox splits water between downhill channel cells. Banks reduce erosion and pools settle sediment. Water and sediment are conserved separately. Relative readings show trends, not real flood forecasts.'];
