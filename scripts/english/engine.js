import { createAudio } from './audio.js';
import { createEnglishStage } from './scene.js';
import { createNarration } from './narration.js';
import { initialState,reduce,restore,serialize,currentWord,practisedCount,RULES } from './english-model.js';

export function startEnglish(course,UI,manifest) {
  const $=id=>document.getElementById(id),lang=()=>document.documentElement.lang.startsWith('en')?'en':'zh',t=key=>UI[lang()][key]??key;
  const key=`kidslab.english.${course.id}.state`,muteKey=`kidslab.english.${course.id}.muted`;
  const read=(key)=>{try{return localStorage.getItem(key);}catch{return null;}};
  const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{/* private storage does not stop play */}};
  const query=new URLSearchParams(location.search),requested=Number(query.get('seed'));
  const seed=Number.isInteger(requested)&&requested>0&&requested<=0xffffffff?requested:(crypto.getRandomValues(new Uint32Array(1))[0]||1);
  let state=read(key)?restore(course,read(key),seed):initialState(course,seed);
  if(read(key))state={...state,paused:true};
  let masterMuted=read(muteKey)==='1',unlocked=false,settingsOpen=false,autoId=null,voiceGeneration=0,lastTick=performance.now(),rendering=false,recoveries=0;
  const audio=createAudio(course.id);audio.setMuted(masterMuted);
  const narration=createNarration({manifest,lang,muted:()=>masterMuted,duck:audio.duck,restore:audio.restore,show:message=>{if(state.phase!=='answer')notice(message);}});
  const stage=createEnglishStage({canvas:$('scene'),course});
  if(!stage){$('nogl').hidden=false;state.paused=true;}
  const save=()=>write(key,JSON.stringify(serialize(state)));
  /**
   * A malformed word bank can make the pure model reject a transition
   * (e.g. not enough unambiguous choices). Without this guard the 200ms timer
   * would keep throwing and the UI would freeze on the last frame.
   */
  function recover(error){
    console.error('[kidslab] english round could not continue',error);
    recoveries+=1;
    if(recoveries>1){state={...state,paused:true};}
    else state=initialState(course,(state.seed+1)>>>0||1);
    lastTick=performance.now();save();render();notice(t('recovered'));
  }
  function unlock(){if(unlocked)return;unlocked=true;audio.unlock().catch(()=>{});audio.setMuted(masterMuted);window.cool?.stage?.('english-round');}
  function stopVoice(){voiceGeneration++;narration.reset();}
  function notice(text){$('notice').textContent=text||'';$('notice').hidden=!text;}
  function button(label,fn,kind='secondary',id){const b=document.createElement('button');b.type='button';b.className=kind;b.textContent=label;if(id)b.id=id;b.addEventListener('click',()=>{unlock();fn();});return b;}
  function picture(id,className='prompt-picture'){
    const img=document.createElement('img');img.className=className;img.alt='';img.draggable=false;img.width=240;img.height=240;img.src=stage?.thumbnail(id)||'';return img;
  }
  function wordCard(word){const card=document.createElement('div');card.className='learn-card';card.append(picture(word.id));const text=document.createElement('div'),en=document.createElement('b'),zh=document.createElement('span');en.textContent=word.en;en.lang='en';zh.textContent=lang()==='zh'?word.zh:'';text.append(en,zh);card.append(text);return card;}
  function hear(text,challenge=false){
    if(masterMuted||window.cool?.speech?.enabled===false){if(challenge)apply({type:'audio-error',questionId:state.question.id});return;}
    const generation=++voiceGeneration,qid=state.question?.id;
    const handle=narration.say(text,{lang:'en',onStart(){if(challenge&&generation===voiceGeneration)apply({type:'audio-start',questionId:qid});},onError(){if(challenge&&generation===voiceGeneration)apply({type:'audio-error',questionId:qid});}});
    if(challenge&&!handle)apply({type:'audio-error',questionId:qid});
  }
  function maybeHear(){
    if(state.paused||settingsOpen||!stage)return;
    if(state.phase==='answer'&&state.question.mode==='listen'&&autoId!==state.question.id){autoId=state.question.id;hear(currentWord(course,state).en,true);}
  }
  function updateClock(){
    const active=state.phase==='answer';$('timer').textContent=active?`${Math.ceil(state.remainingMs/1000)}s`:'—';$('timer').classList.toggle('urgent',active&&state.remainingMs<=5000);$('timer').setAttribute('aria-label',`${Math.ceil(state.remainingMs/1000)} ${t('seconds')}`);
    $('timeFill').style.transform=`scaleX(${active?state.remainingMs/RULES.milliseconds:0})`;
  }
  function tick(allowHidden=false){
    if(rendering||(!allowHidden&&document.hidden)||!stage)return;
    const now=performance.now(),elapsedMs=now-lastTick;lastTick=now;
    const previousPhase=state.phase;
    let result;
    try{result=reduce(course,state,{type:'tick',elapsedMs,questionId:state.question?.id});}
    catch(error){recover(error);return;}
    if(result.changed){state=result.state;save();updateClock();if(state.phase!==previousPhase){stopVoice();audio.error();window.cool?.track?.('word-timeout',{word:state.question.target});render();}}
  }
  function apply(action){
    // Settle the old state before every transition, including audio start/resume.
    // Waiting and paused states reject ticks but still establish the new time origin.
    tick();
    const before=state;
    let result;
    try{result=reduce(course,state,action);}
    catch(error){recover(error);return {state,changed:false,error};}
    if(!result.changed)return result;
    state=result.state;save();
    if(['next','learn-next','retry','new-round','pause','fallback'].includes(action.type))stopVoice();
    if(action.type==='answer'){
      stopVoice();
      const correct=action.id===before.question.target;
      if(correct){audio.success();hear(currentWord(course,state).en);}else audio.error();
      window.cool?.track?.('recognise-word',{word:before.question.target,mode:before.question.mode,correct,review:before.question.review});
    }
    if(state.phase==='roundDone'&&before.phase!=='roundDone'){audio.present();window.cool?.track?.('finish-word-round',{round:state.round,fallbacks:state.fallbacks});}
    if(state.phase==='levelDone'&&before.phase!=='levelDone')audio.present();
    if(result.completedNow)window.cool?.complete?.();
    if(action.type==='fallback')window.cool?.track?.('use-written-word',{word:state.question.target});
    if(action.type==='retry')window.cool?.track?.('retry-word-level',{level:state.level+1});
    if(action.type==='new-round')window.cool?.stage?.('english-round');
    render();return result;
  }
  function settings(){
    $('langBtn').textContent=lang()==='zh'?'EN':'中';$('langBtn').setAttribute('aria-label',t('language'));
    $('themeBtn').textContent=document.documentElement.dataset.theme==='dark'?'☀':'☾';$('themeBtn').setAttribute('aria-label',t('theme'));
    $('soundBtn').textContent=masterMuted?'🔇':'🔊';$('soundBtn').setAttribute('aria-label',t(masterMuted?'unmute':'mute'));$('soundBtn').setAttribute('aria-pressed',String(!masterMuted));
    for(const [id,on,label] of [['musicBtn',audio.musicOn,'music'],['effectsBtn',audio.sfxOn,'effects'],['speechBtn',window.cool?.speech?.enabled!==false,'speech']]){const b=$(id);b.textContent=`${t(label)} · ${t(on?'on':'off')}`;b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',t(label));}
    $('panelHandle').setAttribute('aria-expanded',String(settingsOpen));$('panelBody').hidden=!settingsOpen;
  }
  function render(){
    if(rendering)return;rendering=true;
    try{
      const word=currentWord(course,state),q=state.question;
      document.title=`${course.icon} ${course.title[lang()]} · KidsLab`;$('title').textContent=`${course.icon} ${course.title[lang()]}`;
      $('roundLabel').textContent=`${lang()==='zh'?'第 ':t('round')+' '}${state.round}${lang()==='zh'?' 轮':''} · ${t('batch')}`;
      $('coverage').textContent=`${t('learned')} ${practisedCount(state)}/${course.items.length}`;
      $('levelSteps').replaceChildren(...UI[lang()].stages.map((label,i)=>{const li=document.createElement('li');li.textContent=`${i+1} ${label}`;li.className=i===state.level?'active':i<state.level?'done':'';return li;}));
      $('hearts').textContent='♥'.repeat(state.lives)+'♡'.repeat(3-state.lives);$('hearts').setAttribute('aria-label',`${t('hearts')} ${state.lives}`);
      $('progressVal').textContent=state.phase==='learn'?`${state.learnIndex+1}/8`:q?.review&&state.phase==='answer'?t('review'):`${state.baseIndex}/8`;updateClock();settings();
      $('pauseCover').hidden=!state.paused||settingsOpen;$('pauseText').textContent=t('paused');$('playArea').setAttribute('aria-hidden',String(state.paused));
      $('prompt').replaceChildren();$('choices').replaceChildren();$('controls').replaceChildren();notice('');
      const controls=$('controls');
      if(state.phase==='learn'){
        $('coach').textContent=t('learn');$('prompt').append(wordCard(word));
        controls.append(button('🔈 '+t('hear'),()=>hear(word.en),'secondary','hearBtn'),button((state.learnIndex===3||state.learnIndex===7)?t('begin'):t('next'),()=>{apply({type:'learn-next'});if(state.phase==='learn')hear(currentWord(course,state).en);},'primary','nextBtn'));
      }else if(state.phase==='answer'){
        $('coach').textContent=t(q.mode);
        if(q.mode==='picture')$('prompt').append(picture(word.id));
        else if(q.mode==='read'){const label=document.createElement('strong');label.className='prompt-word';label.lang='en';label.textContent=word.en;$('prompt').append(label);}
        else $('prompt').append(button('🔈 '+t('hear'),()=>{tick();if(state.phase==='answer')hear(word.en,true);},'secondary','hearBtn'));
        q.options.forEach((id,i)=>{const choice=course.items.find(w=>w.id===id),b=button('',()=>apply({type:'answer',id,questionId:q.id}),'choice');b.dataset.choice=id;b.setAttribute('aria-label',q.mode==='picture'?choice.en:`${lang()==='zh'?'选项':'Option'} ${i+1}`);
          if(q.mode==='picture'){b.textContent=choice.en;b.lang='en';}else{b.append(picture(id));const n=document.createElement('span');n.className='number';n.textContent=String(i+1);n.setAttribute('aria-hidden','true');b.append(n);}
          b.disabled=state.paused||q.wrong.includes(id)||!q.started||q.audioBlocked;b.classList.toggle('wrong',q.wrong.includes(id));$('choices').append(b);
        });
        if(q.mode==='listen'&&(q.audioBlocked||!q.started)){
          notice(t(q.audioBlocked?'audioBlocked':'loading'));controls.append(button(t('fallback'),()=>apply({type:'fallback'}),'secondary','fallbackBtn'));
        }else if(state.result==='wrong')notice(t('wrong'));
        else if(q.mode!==q.originalMode)notice(t('visualOnly'));
      }else if(state.phase==='feedback'){
        $('coach').textContent=t(state.result);$('prompt').append(wordCard(word));controls.append(button('🔈 '+t('hear'),()=>hear(word.en),'secondary','hearBtn'),button(t('next'),()=>apply({type:'next'}),'primary','nextBtn'));
      }else if(state.phase==='failed'){
        $('coach').textContent=t('failed');const list=document.createElement('div');list.className='review-list';
        state.roundMisses.forEach(id=>{const item=course.items.find(w=>w.id===id),b=button('',()=>hear(item.en),'review-word');b.append(picture(id));const label=document.createElement('span');label.textContent=item.en+(lang()==='zh'?` · ${item.zh}`:'');b.append(label);list.append(b);});$('prompt').append(list);controls.append(button(t('retry'),()=>apply({type:'retry'}),'primary','retryBtn'));
      }else{
        $('coach').textContent=t(state.phase);const badge=document.createElement('span');badge.className='celebrate';badge.textContent=state.phase==='roundDone'?'🏆':'⭐';$('prompt').append(badge);
        if(state.phase==='roundDone')notice(`${t('learned')} ${practisedCount(state)}/${course.items.length}`);
        controls.append(button(t(state.phase==='roundDone'?'newRound':'next'),()=>apply({type:state.phase==='roundDone'?'new-round':'next'}),'primary','nextBtn'));
      }
      stage?.update(state);
    }finally{rendering=false;}
    maybeHear();
  }
  $('soundBtn').addEventListener('click',()=>{unlock();masterMuted=!masterMuted;write(muteKey,masterMuted?'1':'0');audio.setMuted(masterMuted);stopVoice();if(masterMuted&&state.phase==='answer'&&state.question.mode==='listen')apply({type:'audio-error',questionId:state.question.id});else render();});
  $('musicBtn').addEventListener('click',()=>{unlock();audio.setMusic(!audio.musicOn);settings();});
  $('effectsBtn').addEventListener('click',()=>{unlock();audio.setSfx(!audio.sfxOn);settings();});
  $('speechBtn').addEventListener('click',()=>{unlock();window.cool?.speech?.toggle();settings();});
  window.cool?.speech?.subscribe(()=>{if(state.phase==='answer'&&state.question.mode==='listen'&&window.cool.speech.enabled===false&&!state.paused)apply({type:'audio-error',questionId:state.question.id});settings();});
  $('langBtn').addEventListener('click',()=>window.cool?.preferences?.toggleLang());
  $('themeBtn').addEventListener('click',()=>window.cool?.preferences?.toggleTheme());
  $('panelHandle').addEventListener('click',()=>{unlock();settingsOpen=!settingsOpen;if(settingsOpen)apply({type:'pause'});else{autoId=null;apply({type:'resume'});}render();});
  $('hintBtn').addEventListener('click',()=>{unlock();narration.say(course.hint[lang()]);});
  $('resumeBtn').addEventListener('click',()=>{unlock();autoId=null;apply({type:'resume'});});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){tick(true);stopVoice();apply({type:'pause'});}lastTick=performance.now();});
  addEventListener('pagehide',()=>{tick(true);save();stopVoice();});
  addEventListener('themechange',()=>{stage?.applyTheme();render();});
  addEventListener('langchange',()=>{stopVoice();autoId=null;render();});
  window.cool?.bindI18n(UI,{onChange:()=>render()});
  if(query.has('e2e')) {
    window.__englishState=()=>serialize(state);
    window.__englishVisuals=()=>course.items.map(item=>({id:item.id,en:item.en,src:stage?.thumbnail(item.id)}));
  }
  render();save();const timer=setInterval(tick,200);
  return {get state(){return state;},dispose(){clearInterval(timer);stopVoice();stage?.dispose();}};
}
