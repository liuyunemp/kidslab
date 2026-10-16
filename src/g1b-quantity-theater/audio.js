export function createAudio(key) {
  const read=(k,f=true)=>{try{const v=localStorage.getItem(`${key}.${k}`);return v===null?f:v==='1';}catch{return f;}};
  const write=(k,v)=>{try{localStorage.setItem(`${key}.${k}`,v?'1':'0');}catch{}};
  let music=read('music'),effects=read('effects'),muted=read('muted',false),unlocked=false,ctx=null,bgm=null,lastTone=-Infinity;
  const active=new Set();
  function stopTones(){for(const osc of active){try{osc.stop();osc.disconnect();}catch{}}active.clear();}
  function sync(){if(!bgm)return;if(music&&!muted&&unlocked&&!document.hidden)bgm.play().catch(()=>{});else bgm.pause();}
  function unlock(){
    if(unlocked)return;unlocked=true;
    try{const C=window.AudioContext||window.webkitAudioContext;if(C)ctx=new C();if(!muted)ctx?.resume().catch(()=>{});else ctx?.suspend().catch(()=>{});}catch{ctx=null;}
    try{bgm=new Audio(new URL('./audio/lab-glow.ogg',import.meta.url));bgm.loop=true;bgm.volume=.16;bgm.preload='none';sync();}catch{bgm=null;}
  }
  function tone(kind='action') {
    if(!ctx||!effects||muted||document.hidden||ctx.state!=='running')return;
    const now=ctx.currentTime;if(now-lastTone<.065)return;lastTone=now;
    const notes=kind==='complete'?[523,659,784]:kind==='success'?[659,880]:kind==='error'?[220,165]:[440];
    try{notes.forEach((frequency,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),at=now+i*.09;
      osc.type=kind==='error'?'triangle':'sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.055,at+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+.2);
      osc.connect(gain).connect(ctx.destination);active.add(osc);osc.start(at);osc.stop(at+.22);osc.onended=()=>{active.delete(osc);osc.disconnect();gain.disconnect();};});}catch{}
  }
  function set(k,v){if(k==='music')music=v;if(k==='effects')effects=v;if(k==='muted')muted=v;write(k,v);sync();if(muted||!effects)stopTones();if(muted)ctx?.suspend().catch(()=>{});else if(unlocked&&!document.hidden)ctx?.resume().catch(()=>{});}
  const visibility=()=>{sync();if(document.hidden){stopTones();ctx?.suspend().catch(()=>{});}else if(!muted&&unlocked)ctx?.resume().catch(()=>{});};
  document.addEventListener('visibilitychange',visibility);
  const stop=()=>{bgm?.pause();stopTones();ctx?.suspend().catch(()=>{});};addEventListener('pagehide',stop);addEventListener('pageshow',visibility);
  return{unlock,tone,set,get music(){return music;},get effects(){return effects;},get muted(){return muted;}};
}
