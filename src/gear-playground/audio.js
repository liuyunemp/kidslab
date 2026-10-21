// Audio is an optional side effect: gameplay never awaits resume or loading.
export function createAudio(key){
  const get=k=>{try{return localStorage.getItem(key+'.'+k)!=='0';}catch{return true;}},set=(k,v)=>{try{localStorage.setItem(key+'.'+k,v?'1':'0');}catch{}};
  let musicOn=get('music'),sfxOn=get('sfx'),ctx=null,gain=null,unlocked=false,last=0;
  const music=new Audio(new URL('./audio/lab-glow.ogg',import.meta.url));music.loop=true;music.volume=.18;music.preload='none';
  const play=()=>{if(unlocked&&musicOn&&!document.hidden)music.play().catch(()=>{});};
  function unlock(){unlocked=true;try{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(C){ctx=new C();gain=ctx.createGain();gain.gain.value=sfxOn?.22:0;gain.connect(ctx.destination);}}ctx?.resume().catch(()=>{});}catch{ctx=null;}play();}
  function effect(kind='click'){
    if(!ctx||ctx.state!=='running'||!sfxOn||document.hidden)return;const now=ctx.currentTime;if(now-last<.045)return;last=now;
    const notes=kind==='win'?[523,659,784,1047]:kind==='success'?[659,880]:kind==='error'?[220,165]:[520];
    try{notes.forEach((f,i)=>{const osc=ctx.createOscillator(),amp=ctx.createGain(),at=now+i*.085;osc.type=kind==='error'?'triangle':'sine';osc.frequency.setValueAtTime(f,at);amp.gain.setValueAtTime(.0001,at);amp.gain.exponentialRampToValueAtTime(.25,at+.01);amp.gain.exponentialRampToValueAtTime(.0001,at+.14);osc.connect(amp).connect(gain);osc.start(at);osc.stop(at+.16);osc.onended=()=>{osc.disconnect();amp.disconnect();};});}catch{}
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){music.pause();ctx?.suspend().catch(()=>{});}else if(unlocked){ctx?.resume().catch(()=>{});play();}});
  window.addEventListener('pagehide',()=>{music.pause();ctx?.suspend().catch(()=>{});});
  return {unlock,effect,setMusic(v){musicOn=v;set('music',v);v?play():music.pause();},setSfx(v){sfxOn=v;set('sfx',v);if(gain)gain.gain.setTargetAtTime(v?.22:0,ctx.currentTime,.02);},get musicOn(){return musicOn;},get sfxOn(){return sfxOn;}};
}
