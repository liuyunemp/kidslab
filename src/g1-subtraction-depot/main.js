import { course } from './content.js';
import { createNarration } from './narration.js';
import { manifest } from './speech-manifest.js';
import { initialState, current, reduce, restore, serialize, openActivity, text, valueOf, moneyValue, DENOMINATIONS, EXCHANGES, sentenceFor, speechText } from './exploration-model.js';
import { createAudio } from './audio.js';
import { createScene } from './scene.js';
import { supportsRandom } from './random-explorations.js';
import { freshSeed, urlSeed } from './random-rounds.js';

const $=id=>document.getElementById(id), cool=window.cool;
const key=`kidslab.exploration-v2.${course.id}`;
let saved=null;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}
const randomEnabled=supportsRandom(course),requestedSeed=urlSeed();
const restoreOptions=randomEnabled?{seed:requestedSeed??freshSeed()}:{};
let state=restore(course,requestedSeed!==null&&saved?.version===3&&saved.seed!==requestedSeed?null:saved,restoreOptions),lang=cool.preferences.lang,lab=null,feedbackTimer=0,strokePoints=null,strokePointer=null,started=false;
// Persist the question before the first gesture, so a refresh cannot silently change it.
if(randomEnabled)try{localStorage.setItem(key,JSON.stringify(serialize(state)));}catch{}
const entryActivity=new URLSearchParams(location.search).get('activity');
const entryState=openActivity(course,state,entryActivity);
if(entryState!==state){state=entryState;try{localStorage.setItem(key,JSON.stringify(serialize(state)));}catch{}}
const audio=createAudio(`kidslab.exploration-v2.${course.id}.audio`);
const narration=createNarration({manifest,lang:()=>lang,muted:()=>audio.muted,show:notice,duck:()=>audio.duck(true),restore:()=>audio.duck(false)});
const I18N={zh:{tools:'探索工具',choose:'选择探索关卡',free:'自由玩',undo:'撤销',reset:'重来',discover:'小发现',source:'查看出版社教材',back:'返回平台',no3d:'暂时不能打开 3D 舞台',no3dHint:'请换用支持 WebGL 的浏览器，或打开浏览器的图形加速后重试。',music:'背景音乐',effects:'操作音效',speech:'引导朗读',on:'开',off:'关',theme:'切换主题',language:'切换语言',mute:'关闭全部声音',unmute:'恢复声音',settings:'声音设置',scene:'可拖动的 3D 探索舞台',done:'发现已收藏',allDone:'八个发现都收藏好了！还可以继续探索。',practice:'自由玩：发现不计入关卡',same:'这个状态已经看过了，试着换一种摆法。',invalid:'试试台上的工具。',range:'到边界啦，换一个方向试试。',nothing:'还没有可以撤销的操作。',trace:'从亮点出发，沿着这一笔慢慢写。',place:'先把物件放到台上。',index:'先翻首字母，再找音节。',pieces:'先放好材料，再播放。',play:'先播放一次，再看看课文线索。',drop:'放到桌面上试试，物件会回到原位。',money:'看看手里的钱和托盘，还能换开或取回。',align:'先让相同的数位对齐。',unbundle:'散开的不够拿，试试拆开一个十。',bundle:'捆成一个十',split:'拆开一个十',operate:'合在一起',take:'送走这一批',depart:'再送走一批',alignButton:'对齐数位',playButton:'播放场景',replay:'回放笔顺',dismantle:'拆开看看',placeButton:'放到台上',act:'让它动起来',evidence:'看看课文线索',swap:'交换前后',rotate:'转一转',shift:'移一移',buy:'试着买下',exchangeYuan:'1元换10角',exchangeJiao:'1角换10分',exchangeTen:'10元换10张1元',wallet:'手里',tray:'托盘',price:'价格',spent:'已买下',left:'左边',right:'右边',ones:'个一',tens:'个十',current:'现在',whole:'合起来',difference:'相差',layout:'对齐比较',transfer:'移到另一组',poemAction:'移动景物',writingHint:'只描这一笔，随时可以重写。',original:'课文的先后线索',message:'消息已送到',waiting:'朋友还在等更清楚的信息',who:'主角',where:'地点',verb:'动作',setup:'摆好新的数量',freeA:'第一组',freeB:'第二组',unit:'单元',page:'页',observed:'课文关联',lookup:'本课小字典',letters:'首字母',syllables:'音节',entries:'汉字',soundRead:'朗读操作提示',wordMove:'把物件移到台上',restored:'本版探索',change:'找零后手里',numberLine:'数线',part:'两部分',col:'十位／个位',empty:'尚未操作',selectHint:'所有关卡都可以直接选择。'},
en:{tools:'Exploration tools',choose:'Choose an activity',free:'Free play',undo:'Undo',reset:'Reset',discover:'Discoveries',source:'Publisher textbook',back:'Back to KidsLab',no3d:'The 3D stage is unavailable',no3dHint:'Try a WebGL-capable browser, or enable graphics acceleration and reload.',music:'Background music',effects:'Sound effects',speech:'Read guidance',on:'On',off:'Off',theme:'Switch theme',language:'Switch language',mute:'Mute all sounds',unmute:'Restore sound',settings:'Sound settings',scene:'Interactive 3D exploration stage',done:'Discovery collected',allDone:'All eight discoveries collected! Keep exploring.',practice:'Free play: discoveries are not counted',same:'You have seen this state. Try another arrangement.',invalid:'Try one of the tools.',range:'At the boundary. Try another direction.',nothing:'There is nothing to undo yet.',trace:'Start at the dot and follow this stroke slowly.',place:'Put the object on the stage first.',index:'Open the initial, then a syllable.',pieces:'Arrange the pieces before playing.',play:'Play once, then look at the source clues.',drop:'Place it on the table; the piece will return.',money:'Look at your wallet and tray. Exchange or return a coin.',align:'Align equal place values first.',unbundle:'Not enough loose blocks. Unbundle a ten.',bundle:'Bundle ten',split:'Unbundle a ten',operate:'Join the groups',take:'Take the group away',depart:'Drop off the next group',alignButton:'Align place values',playButton:'Play the scene',replay:'Replay strokes',dismantle:'Take apart',placeButton:'Place on stage',act:'Set it in motion',evidence:'Read source clues',swap:'Swap neighbors',rotate:'Rotate',shift:'Move',buy:'Try a purchase',exchangeYuan:'1 yuan → 10 jiao',exchangeJiao:'1 jiao → 10 fen',exchangeTen:'10 yuan → ten 1 yuan',wallet:'Wallet',tray:'Tray',price:'Price',spent:'Purchased',left:'Left bank',right:'Right bank',ones:'ones',tens:'tens',current:'Now',whole:'Together',difference:'Difference',layout:'Pair and compare',transfer:'Move to other group',poemAction:'Move the scenery',writingHint:'Follow one stroke at a time. Rewrite whenever you like.',original:'Sequence in the source story',message:'The message has arrived',waiting:'Your friend needs clearer information',who:'Who',where:'Where',verb:'Action',setup:'Set up new quantities',freeA:'First group',freeB:'Second group',unit:'Unit',page:'pages',observed:'Textbook connection',lookup:'Our mini dictionary',letters:'Initial',syllables:'Syllable',entries:'Entry',soundRead:'Read the guidance',wordMove:'Move the object onto the stage',restored:'This edition',change:'Wallet after change',numberLine:'Number line',part:'Two parts',col:'Tens / ones',empty:'Ready to explore',selectHint:'Every activity can be chosen immediately.'}};
const t=k=>I18N[lang][k]??k;
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const room=()=>state.rooms[state.active],activity=()=>current(course,state);
const button=(label,action,attrs='')=>`<button type="button" data-action="${action}" ${attrs}>${esc(label)}</button>`;
function money(n){const yuan=Math.floor(n/100),jiao=Math.floor(n%100/10),fen=n%10;const parts=[];if(yuan)parts.push(`${yuan} ${lang==='zh'?'元':'yuan'}`);if(jiao)parts.push(`${jiao} ${lang==='zh'?'角':'jiao'}`);if(fen)parts.push(`${fen} ${lang==='zh'?'分':'fen'}`);return parts.join(' ')||`0 ${lang==='zh'?'元':'yuan'}`;}
function unlock(){audio.unlock();if(!started){started=true;cool.stage(`explore:${activity().id}`);}}
function notice(message,success=false){clearTimeout(feedbackTimer);$('feedback').hidden=false;$('feedback').textContent=message;$('feedback').classList.toggle('success',success);feedbackTimer=setTimeout(()=>$('feedback').hidden=true,success?2600:2200);}
function act(action){
  unlock();const result=reduce(course,state,action);
  if(!result.ok){audio.tone('error');notice(t(result.reason));narration.encourage(activity().id,t(result.reason));if(action.type==='position')lab?.update(activity(),room(),lang);return false;}
  state=result.state;try{localStorage.setItem(key,JSON.stringify(serialize(state)));}catch{}
  if(['newRound','classic','reset','select','undo','free'].includes(action.type)){
    clearTimeout(feedbackTimer);$('feedback').hidden=true;narration.reset();lab?.cancelDrag?.();
  }
  if(action.type==='select'&&new URLSearchParams(location.search).has('activity')){
    const url=new URL(location.href);url.searchParams.set('activity',activity().id);
    try{history.replaceState(null,'',url);}catch{}
  }
  if(!['select','free','undo','reset'].includes(action.type))cool.track('explore-action',{action:action.type,activity:activity().id});
  if(result.discovered){cool.track('collect-discovery',{activity:activity().id});if(result.complete)cool.complete();}
  if(result.loopCompleted){audio.tone(result.discovered&&result.complete?'complete':'success');narration.success(result.discovered&&result.complete);}
  else audio.tone('action');
  if(action.type==='free')notice(state.free?t('practice'):t('selectHint'));
  paint();
  if(action.type==='play'&&course.kind==='story')playStory();
  return true;
}
let storyTimers=[];
function playStory(){
  const cards=[...document.querySelectorAll('.story-card')];
  cards.forEach((card,i)=>storyTimers.push(setTimeout(()=>{cards.forEach(c=>c.classList.remove('playing'));if(card.isConnected){card.classList.add('playing');lab?.storyFrame(i);}},i*850)));
}
function soundChrome(){
  $('muteBtn').textContent=audio.muted?'🔇':'🔊';$('muteBtn').setAttribute('aria-label',t(audio.muted?'unmute':'mute'));$('muteBtn').setAttribute('aria-pressed',String(audio.muted));
  for(const [id,label,on] of [['musicBtn','music',audio.music],['soundBtn','effects',audio.effects],['speechBtn','speech',cool.speech.enabled]]){$(id).textContent=`${t(label)} · ${t(on?'on':'off')}`;$(id).setAttribute('aria-pressed',String(on));$(id).setAttribute('aria-label',`${t(label)}: ${t(on?'on':'off')}`);}
  $('settingsBtn').setAttribute('aria-label',t('settings'));$('themeBtn').textContent=cool.preferences.theme==='dark'?'☀️':'🌙';$('themeBtn').setAttribute('aria-label',t('theme'));$('langBtn').textContent=lang==='zh'?'EN':'中';$('langBtn').setAttribute('aria-label',t('language'));$('back').setAttribute('aria-label',t('back'));
}
function paint(){
  storyTimers.forEach(clearTimeout);storyTimers=[];
  const a=activity(),r=room(),kind=course.kind;document.body.dataset.kind=kind;
  $('randomControls').hidden=!randomEnabled;
  if(randomEnabled){
    $('roundMenuLabel').textContent=lang==='zh'?'本局':'This round';
    $('newRoundBtn').textContent=lang==='zh'?'新一局':'New round';
    $('classicRoundBtn').textContent=lang==='zh'?'经典示例':'Classic';
    $('resetBtn').textContent=lang==='zh'?'重试':'Retry';
    $('stageReadout').dataset.roundFingerprint=state.random.records[state.active].fingerprint;
    $('stageReadout').dataset.roundMode=state.random.records[state.active].mode;
  }
  document.title=`${text(course.title,lang)} · KidsLab`;$('title').textContent=`${course.icon} ${text(course.title,lang)}`;
  $('progress').textContent=`${state.done.length}/8`;$('progress').setAttribute('aria-label',`${t('restored')} ${state.done.length}/8`);
  $('unitBadge').textContent=`${t('unit')} ${a.source.unit} · ${state.active+1}/8`;
  $('coach').textContent=`♪ ${text(a.invite,lang)}`;$('coach').setAttribute('aria-label',`${t('soundRead')}: ${text(a.invite,lang)}`);
  $('scene').setAttribute('aria-label',t('scene'));
  $('activitySelect').innerHTML=course.activities.map((v,i)=>`<option value="${i}" ${i===state.active?'selected':''}>${state.done.includes(v.id)?'✓ ':''}${i+1}. ${esc(text(v.title,lang))}</option>`).join('');
  $('activitySelect').setAttribute('aria-label',t('choose'));$('freeBtn').setAttribute('aria-pressed',String(state.free));$('undoBtn').disabled=state.histories[state.active].length===0;
  $('lessonText').textContent=text(a.note,lang)+(kind==='dictionary'?'\n'+Array.from({length:26},(_,i)=>String.fromCharCode(65+i)+' '+String.fromCharCode(97+i)).join(' · '):'');$('bookSource').textContent=`${course.book.title} · ${course.book.edition} · ${a.source.lesson} · ${a.source.pages} ${t('page')}`;$('bookLink').href=course.book.url;
  let controls='',display='';
  if(kind==='character'){
    controls=a.variants.map((v,i)=>button(`${lang==='zh'?'装上':'Add'} ${v.part}`,'assemble',`data-index="${i}" aria-pressed="${r.assembled&&r.variant===i}"`)).join('')+button(t('dismantle'),'dismantle','class="wide"');
    const v=a.variants[r.variant];display=`<div class="caption"><div class="hanzi">${r.assembled?esc(v.char):`${esc(a.base)} + ${esc(v.part)}`}</div>${r.assembled?`<div class="pinyin">${esc(v.pinyin)}</div><p>${esc(v.word)}</p>`:''}</div>`;
  }else if(kind==='writing'){
    controls=button(t('replay'),'replay','class="wide"');
    const points=p=>p.map(v=>v.join(',')).join(' ');
    display=`<div class="writing-board" id="writingBoard"><svg id="trace" viewBox="0 0 100 100" role="img" aria-label="${esc(a.char)} ${r.stroke+1}/${a.strokes.length}"><path class="grid-line" d="M50 0V100 M0 50H100 M0 0L100 100 M100 0L0 100"/>${a.strokes.map((p,i)=>`<polyline class="stroke ${i<r.stroke?'done':i===r.stroke?'next':''}" points="${points(p)}" style="animation-delay:${i*.18}s"/>`).join('')}${r.stroke<a.strokes.length?`<circle class="start-dot" cx="${a.strokes[r.stroke][0][0]}" cy="${a.strokes[r.stroke][0][1]}" r="2.7"/>`:''}${r.ink.map(p=>`<polyline class="ink" points="${points(p)}"/>`).join('')}<polyline id="liveInk" class="ink" points=""/></svg></div>`;
  }else if(kind==='word'){
    controls=a.variants.map((v,i)=>button(lang==='zh'?v.word:`${v.word} · ${v.en}`,'variant',`data-index="${i}" aria-pressed="${r.variant===i}"`)).join('')+button(t('placeButton'),'place')+button(t('act'),'act');
    display=r.placed?`<div class="caption"><strong>${esc(a.variants[r.variant].word)}</strong></div>`:'';
  }else if(kind==='dictionary'){
    const initials=[...new Set(a.entries.map(e=>e.initial))].sort();
    controls=`<div class="wide"><span class="control-label">${t('letters')}</span><div class="button-row">${initials.map(v=>button(v,'initial',`data-value="${v}" aria-pressed="${r.initial===v}"`)).join('')}</div></div>`;
    if(r.initial)controls+=`<div class="wide"><span class="control-label">${t('syllables')}</span><div class="button-row">${[...new Set(a.entries.filter(e=>e.initial===r.initial).map(e=>e.syllable))].sort().map(v=>button(v,'syllable',`data-value="${v}" aria-pressed="${r.syllable===v}"`)).join('')}</div></div>`;
    if(r.syllable)controls+=`<div class="wide button-row">${a.entries.filter(e=>e.initial===r.initial&&e.syllable===r.syllable).map(e=>button(`${e.char} · ${e.page}`,'entry',`data-value="${e.char}"`)).join('')}</div>`;
    const e=a.entries.find(e=>e.char===r.entry);display=`<div class="caption"><div class="result-note">${t('lookup')} · ${e?`${e.page} ${t('page')}`:a.target}</div>${e?`<div class="hanzi">${e.char}</div><div class="pinyin">${e.pinyin}</div><p>${e.word}</p>`:`<strong>${r.initial||'ABC'} ${r.syllable}</strong>`}</div>`;
  }else if(kind==='sentence'){
    controls=[a.who,a.where,a.actions].map((values,slot)=>`<div class="wide"><span class="control-label">${t(['who','where','verb'][slot])}</span><div class="button-row">${values.map((v,index)=>button(v,'slot',`data-slot="${slot}" data-index="${index}" aria-pressed="${r.slots[slot]===index}"`)).join('')}</div></div>`).join('')+`<div class="button-row">${['。','！','？'].map(v=>button(v,'punctuation',`data-value="${v}"`)).join('')}</div>`+button(t('playButton'),'play');
    const sentence=sentenceFor(a,r);if(sentence)display=`<div class="caption"><strong>${esc(sentence)}</strong></div>`;
  }else if(kind==='poetry'){
    controls=button(a.title.zh==='再看月光'?(lang==='zh'?'转动月光':'Turn the moonlight'):t('poemAction'),'move','class="wide"');
    display=r.line?`<div class="caption poem"><p>${esc(a.lines[r.line-1])}</p></div>`:'';
    if(r.line)controls+=`<details class="wide"><summary>${lang==='zh'?'已发现的诗句':'Revealed lines'}</summary><p>${a.author} · ${a.lines.slice(0,r.line).map(esc).join('')}</p></details>`;
  }else if(kind==='story'){
    controls=button(`${t('swap')} 1 ↔ 2`,'swap','data-from="0" data-to="1"')+button(`${t('swap')} 2 ↔ 3`,'swap','data-from="1" data-to="2"')+button(t('playButton'),'play')+button(t('evidence'),'evidence');
    display=`<div class="story-strip">${r.order.map((n,i)=>`<div class="story-card"><small>${i+1}</small><div>${esc(a.events[n])}</div></div>`).join('')}</div>`;
    if(r.evidence)display+=`<div class="caption result-note">${t('original')}：${a.events.map(esc).join(' → ')}</div>`;
  }else if(kind==='speaking'){
    controls=a.parts.map((part,i)=>button(part,'include',`class="wide" data-index="${i}" aria-pressed="${r.included.includes(i)}"`)).join('')+button(t('playButton'),'play','class="wide"');
    if(r.included.length)display=`<div class="caption">${r.included.map(i=>`<p>${esc(a.parts[i])}</p>`).join('')}${r.played?`<p class="result-note">${lang==='zh'?esc(a.responses[r.included.at(-1)]):t(r.included.length===3?'message':'waiting')}</p>`:''}</div>`;
  }else if(kind==='shape'){
    const names={circle:['圆','Circle'],triangle:['三角形','Triangle'],square:['正方形','Square'],rectangle:['长方形','Rectangle'],parallelogram:['平行四边形','Parallelogram']};
    controls=a.pieces.map((v,i)=>`<div class="wide"><span class="control-label">${i+1}. ${names[v][lang==='zh'?0:1]}</span><div class="button-row">${button(t('rotate'),'rotate',`data-index="${i}"`)}${button(t('shift'),'shift',`data-index="${i}"`)}</div></div>`).join('');
  }else if(kind==='money'){
    controls=`<div class="wide button-row">${DENOMINATIONS.filter(v=>EXCHANGES[v]&&r.wallet[v]).map(v=>button(`${money(v)} → ${EXCHANGES[v][1]} × ${money(EXCHANGES[v][0])}`,'exchange',`data-coin="${v}"`)).join('')}</div>`;
    controls+=DENOMINATIONS.filter(v=>r.wallet[v]||r.tray[v]).map(v=>`<div class="wide button-row">${button(`+ ${money(v)} (${r.wallet[v]})`,'coin',`data-coin="${v}" aria-label="${lang==='zh'?'放入':'Add'} ${money(v)}"`)}${button(`− ${money(v)} (${r.tray[v]})`,'return',`data-coin="${v}" aria-label="${lang==='zh'?'取回':'Return'} ${money(v)}"`)}</div>`).join('');
    if(state.free)controls+=`<label>${lang==='zh'?'预算（分）':'Budget (fen)'}<input id="budget" type="number" min="1" max="10000" value="${r.budget}"></label><label>${lang==='zh'?'价格（分）':'Price (fen)'}<input id="price" type="number" min="1" max="10000" value="${r.price}"></label>${button(t('setup'),'budget','class="wide"')}`;
    if(!a.exchangeOnly||state.free)controls+=button(t('buy'),'buy','class="wide"');
    display=`<div class="caption"><div class="representation"><span>${t('wallet')} ${money(moneyValue(r.wallet))}</span><span>${t('tray')} ${money(moneyValue(r.tray))}</span></div><strong>${t(r.spent?'spent':'price')} ${money(r.price)}</strong></div>`;
  }else{
    const steps=side=>`<div class="wide"><span class="control-label">${t(side==='a'?'left':'right')}</span><div class="button-row">${[-10,-1,1,10].map(delta=>button(`${delta>0?'+':''}${delta}`,'step',`data-side="${side}" data-delta="${delta}"`)).join('')}</div></div>`;
    if(kind==='compare'){
      controls=steps('a')+steps('b');display=`<div class="caption math-equation">${r.a} ${r.a>r.b?'&gt;':r.a<r.b?'&lt;':'='} ${r.b}</div>`;
    }else if(kind==='quantity'){
      controls=a.relation==='part'?button('← 1','transfer','data-delta="-1"')+button('1 →','transfer','data-delta="1"'):a.relation==='compare'?button('− 1','step','data-side="a" data-delta="-1"')+button('+ 1','step','data-side="a" data-delta="1"'):button(t(a.relation==='increase'?'operate':'take'),'operate','class="wide"');
      controls+=button(lang==='zh'?'展开关系图':'Show relation','layout','class="wide"');
      const sub=a.relation==='decrease',compare=a.relation==='compare',result=sub?r.a-r.b:r.a+r.b;
      display=`<div class="caption"><div class="representation"><span>${r.a}</span><span>${r.b}</span></div>${r.layout?`<div class="relation-bars"><span style="flex:${compare?Math.min(r.a,r.b):sub?result:r.a}">${compare?Math.min(r.a,r.b):sub?result:r.a}</span><span style="flex:${compare?Math.abs(r.a-r.b):r.b}">${compare?Math.abs(r.a-r.b):r.b}</span></div><div class="math-equation">${compare?`${Math.max(r.a,r.b)} − ${Math.min(r.a,r.b)} = ${Math.abs(r.a-r.b)}`:`${r.a} ${sub?'−':'+'} ${r.b} = ${result}`}</div>`:''}</div>`;
    }else{
      if(kind==='count')controls=steps('a');
      if(kind==='column')controls+=button(t('alignButton'),'align','class="wide"');
      controls+=button(t('split'),'unbundle')+button(t('bundle'),'bundle');
      if(kind!=='count')controls+=button(t(kind==='subtract'||a.op==='-'?'take':'operate'),'operate','class="wide"');
      if(kind==='subtract')controls+=button(lang==='zh'?'移走一个':'Remove one','takeOne','class="wide"');
      if(kind==='relay')controls+=button(t('depart'),'depart','class="wide"');
      display=`<div class="caption"><div class="math-equation">${t('current')} ${valueOf(r)}</div><div class="representation"><span>${r.tens} ${t('tens')}</span><span>${r.ones} ${t('ones')}</span></div>`;
      if(kind==='count')display+=`<details class="hundred-chart"><summary>${lang==='zh'?'打开百数表':'Open hundred chart'}</summary><div class="chart-grid">${Array.from({length:100},(_,i)=>`<span class="${i+1===valueOf(r)?'selected':''}">${i+1}</span>`).join('')}</div></details>`;
      if(kind==='column'){
        const bTen=Math.floor(r.b/10)||'',aTen=Math.floor(r.a/10)||'';
        const digits=n=>[n>=100?1:'',n>=10?Math.floor(n/10)%10:'',n%10];
        display+=`<div class="column" id="columnView" data-aligned="${r.aligned}"><span></span>${digits(r.a).map(n=>`<span>${n}</span>`).join('')}<span>${a.op}</span>${(r.aligned?digits(r.b):['',r.b,'']).map(n=>`<span>${n}</span>`).join('')}<i class="rule"></i><span></span>${digits(valueOf(r)).map(n=>`<span>${r.phase&&r.ones<10?n:''}</span>`).join('')}</div>${r.exchanged?`<div class="result-note">${r.tens} × 10 + ${r.ones}</div>`:''}`;
      }else if(kind!=='count'&&r.phase)display+=`<div class="result-note">${r.a} ${kind==='subtract'?'−':'+'} ${r.b}${kind==='relay'&&r.phase===2?` − ${r.c}`:''} = ${valueOf(r)}</div>`;
      display+='</div>';
      if(kind==='subtract'&&r.a<=20)display+=`<div class="ten-frames" aria-label="${lang==='zh'?'十格盘':'Ten frames'}">${Array.from({length:20},(_,i)=>`<i class="${i<valueOf(r)?'filled':''}"></i>`).join('')}</div>`;
    }
    if(state.free)controls+=`<label>${t('freeA')}<input id="freeA" type="number" min="0" max="100" value="${r.a}"></label><label>${t('freeB')}<input id="freeB" type="number" min="0" max="100" value="${r.b}"></label>${button(t('setup'),'setup','class="wide"')}`;
  }
  const scroll=$('panelBody').scrollTop;
  $('controls').innerHTML=controls;$('panelBody').scrollTop=scroll;$('stageReadout').innerHTML=display;
  soundChrome();lab?.update(a,r,lang);
}
$('controls').addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');if(!b)return;
  const type=b.dataset.action;
  if(type==='replay'){unlock();$('writingBoard').classList.remove('replaying');requestAnimationFrame(()=>$('writingBoard')?.classList.add('replaying'));return;}
  if(type==='shift'){const i=Number(b.dataset.index),p=room().positions[i];act({type:'position',index:i,x:p.x>3?p.x-1:p.x+.5,z:p.z>.5?p.z-1:p.z+.5});return;}
  if(type==='budget'){act({type,budget:Number($('budget').value),price:Number($('price').value)});return;}
  if(type==='setup'){act({type,a:Number($('freeA').value),b:Number($('freeB').value)});return;}
  const action={type:type==='return'?'coin':type};for(const name of ['index','slot','from','to','delta','coin'])if(name in b.dataset)action[name]=Number(b.dataset[name]);for(const name of ['value','side'])if(name in b.dataset)action[name]=b.dataset[name];if(type==='return')action.back=true;
  act(action);
});
$('activitySelect').addEventListener('change',e=>act({type:'select',index:Number(e.target.value)}));
$('newRoundBtn').addEventListener('click',()=>act({type:'newRound'}));
$('classicRoundBtn').addEventListener('click',()=>act({type:'classic'}));
$('freeBtn').addEventListener('click',()=>act({type:'free',value:!state.free}));
$('resetBtn').addEventListener('click',()=>act({type:'reset'}));$('undoBtn').addEventListener('click',()=>act({type:'undo'}));
$('lessonBtn').addEventListener('click',()=>{$('lesson').hidden=!$('lesson').hidden;$('lessonBtn').setAttribute('aria-expanded',String(!$('lesson').hidden));});
$('panelHandle').addEventListener('click',()=>{const open=$('panelBody').hidden;$('panelBody').hidden=!open;$('panel').classList.toggle('collapsed',!open);$('panelHandle').setAttribute('aria-expanded',String(open));$('panelArrow').textContent=open?'▾':'▴';});
$('coach').addEventListener('click',()=>{unlock();narration.say(speechText(course,state,lang));});
$('langBtn').addEventListener('click',()=>cool.preferences.toggleLang());$('themeBtn').addEventListener('click',()=>cool.preferences.toggleTheme());
$('settingsBtn').addEventListener('click',()=>{$('soundMenu').hidden=!$('soundMenu').hidden;$('settingsBtn').setAttribute('aria-expanded',String(!$('soundMenu').hidden));});
$('muteBtn').addEventListener('click',()=>{audio.set('muted',!audio.muted);if(audio.muted)cool.speech.stop();unlock();soundChrome();});
$('musicBtn').addEventListener('click',()=>{audio.set('music',!audio.music);unlock();soundChrome();});$('soundBtn').addEventListener('click',()=>{audio.set('effects',!audio.effects);unlock();soundChrome();});$('speechBtn').addEventListener('click',()=>{cool.speech.toggle();soundChrome();});
cool.speech.subscribe(soundChrome);
function tracePoint(e){const svg=$('trace'),b=svg.getBoundingClientRect();return [Math.max(0,Math.min(100,(e.clientX-b.left)/b.width*100)),Math.max(0,Math.min(100,(e.clientY-b.top)/b.height*100))];}
$('stageReadout').addEventListener('pointerdown',e=>{if(strokePointer!==null||!e.target.closest('#trace'))return;unlock();strokePointer=e.pointerId;strokePoints=[tracePoint(e)];$('stageReadout').setPointerCapture(e.pointerId);});
$('stageReadout').addEventListener('pointermove',e=>{if(strokePointer!==e.pointerId||!strokePoints)return;const point=tracePoint(e),last=strokePoints.at(-1);if(Math.hypot(point[0]-last[0],point[1]-last[1])>=.5)strokePoints.push(point);if(strokePoints.length>1500)strokePoints=strokePoints.filter((_,i)=>i%2===0);$('liveInk')?.setAttribute('points',strokePoints.map(p=>p.join(',')).join(' '));});
function endTrace(e,cancel=false){if(strokePointer!==e.pointerId)return;const points=strokePoints;strokePointer=null;strokePoints=null;if($('stageReadout').hasPointerCapture(e.pointerId))$('stageReadout').releasePointerCapture(e.pointerId);if(cancel){$('liveInk')?.setAttribute('points','');return;}points.push(tracePoint(e));act({type:'trace',points});}
$('stageReadout').addEventListener('pointerup',e=>endTrace(e));$('stageReadout').addEventListener('pointercancel',e=>endTrace(e,true));
cool.bindI18n(I18N,{onChange({lang:next}){lang=next;paint();lab?.theme();}});
try{lab=createScene($('scene'),course,{onGesture:unlock,onDrop:(index,x,z)=>act({type:'position',index,x,z}),onActivate:()=>{if(course.kind==='poetry')act({type:'move'});if(course.kind==='word')act({type:room().placed?'act':'place'});}});lab.update(activity(),room(),lang);}catch{ $('nogl').hidden=false; }
addEventListener('pagehide',e=>{if(!e.persisted)lab?.dispose();});
// One non-blocking invitation if a child has not started; never display a long tutorial.
setTimeout(()=>{if(!started)notice(text(activity().invite,lang));},30000);
paint();
