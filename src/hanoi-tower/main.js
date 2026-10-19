import {createRounds} from './random-rounds.js';
import {hanoiClassic,hanoiTask,validHanoi,hanoiIdentity,hanoiSolution,validHanoiState,hanoiMove} from './random-model.js';
/* 汉诺塔挑战 Tower of Hanoi */
(async () => {
  'use strict';

  const I18N = {
    zh: {
      back: '返回平台', title: '汉诺塔挑战', langBtn: 'EN', doc: '汉诺塔挑战 · KidsLab',
      discs: '盘子数', moves: '步数', minLabel: '最少', solve: '看看电脑怎么解', reset: '重新开始', again: '再来一局',
      tip0: '把盘子搬到 B 或 C：点柱子拿起、放下。',
      tipHold: (n) => `拿起了 ${n} 号盘，放到哪根柱子？`,
      tipBad: '⚠️ 大盘子不能放在小盘子上面哦！',
      tipSolving: '🤖 电脑正在演示最优解法……',
      winTitle: '太棒了！',
      winPerfect: (m) => `你用了 ${m} 步 —— 正好是最少步数，完美！🌟`,
      winOk: (m, min) => `你用了 ${m} 步完成（最少 ${min} 步），再试试更快的走法？`,
      winBot: (m) => `电脑用最少的 ${m} 步完成了演示，轮到你啦！`,
    },
    en: {
      back: 'Back to platform', title: 'Tower of Hanoi', langBtn: '中', doc: 'Tower of Hanoi · KidsLab',
      discs: 'Discs', moves: 'Moves', minLabel: 'min', solve: 'Watch the robot solve', reset: 'Restart', again: 'Play again',
      tip0: 'Move all discs to B or C. Tap pegs to pick up and drop.',
      tipHold: (n) => `Holding disc ${n} — where to?`,
      tipBad: '⚠️ A big disc cannot sit on a smaller one!',
      tipSolving: '🤖 The robot is showing the optimal solution…',
      winTitle: 'Brilliant!',
      winPerfect: (m) => `You did it in ${m} moves — exactly the minimum. Perfect! 🌟`,
      winOk: (m, min) => `Done in ${m} moves (minimum is ${min}). Try for a faster run?`,
      winBot: (m) => `The robot finished in the minimum ${m} moves. Your turn!`,
    },
  };
  let lang = window.cool.preferences.lang;

  const COLORS = ['#ef476f', '#ff9f1c', '#ffd166', '#06d6a0', '#4cc9f0', '#118ab2', '#9b5de5', '#f15bb5'];

  const rounds=createRounds('hanoi-tower'),games={};
  // The toolbar is wired before the puzzles are solved: generating the boards awaits a worker,
  // and a child who taps the language or theme button first must not be ignored.
  const bindChrome = () => {
    document.querySelector('#langBtn')?.addEventListener('click', () => window.cool.preferences.toggleLang());
    document.querySelector('#themeBtn')?.addEventListener('click', () => window.cool.preferences.toggleTheme());
  };
  bindChrome();
  for(let n=3;n<=8;n++)games[n]=await rounds.defineAsync(n,hanoiClassic(n),hanoiTask,validHanoi,hanoiIdentity,{generator:'hanoiTask',validator:'validHanoi',identity:'hanoiIdentity',...(n<=4?{enumerator:'hanoiFamily'}:{})});
  const PROGRESS='kidslab.hanoi-tower';let earned=[];try{const a=JSON.parse(localStorage.getItem(PROGRESS));if(Array.isArray(a?.completed))earned=a.completed.filter(n=>Number.isInteger(n)&&n>=3&&n<=8);}catch{}
  const state = {
    n: Number(rounds.active??4),
    pegs: [[], [], []],
    src: null,
    moves: 0,
    solving: false,
    solveTimer: 0,
    botWin: false,
    demoMin:0,
  };

  const $ = (s) => document.querySelector(s);
  const t = () => I18N[lang];
  const minMoves = () => games[state.n].solution.length;

  /* ---------- 渲染 ---------- */
  function render() {
    document.querySelectorAll('.peg').forEach((pegEl, i) => {
      const holder = pegEl.querySelector('.peg__discs');
      holder.innerHTML = '';
      pegEl.classList.toggle('src', state.src === i);
      state.pegs[i].forEach((size, idx) => {
        const d = document.createElement('div');
        d.className = 'disc';
        const isTop = idx === state.pegs[i].length - 1;
        if (isTop && state.src === i) d.classList.add('lifted');
        const wMin = 16, wMax = 88;
        d.style.width = `${wMin + ((size - 1) / 7) * (wMax - wMin)}%`;
        d.style.background = `linear-gradient(180deg, ${COLORS[size - 1]}, ${shade(COLORS[size - 1])})`;
        d.textContent = size;
        holder.appendChild(d);
      });
    });
    $('#moveCount').textContent = state.moves;
    $('#minMoves').textContent = minMoves();
  }
  function shade(hex) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.round(v * 0.72);
    return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
  }

  function setTip(msg) { $('#tip').textContent = msg; }

  /* ---------- 游戏逻辑 ---------- */
  function reset(n = state.n) {
    clearTimeout(state.solveTimer);
    state.n = n;
    state.pegs = games[n].pegs.map(p=>[...p]);
    state.src = null;
    state.moves = 0;
    state.solving = false;
    state.botWin = false;
    state.celebrated=false;
    $('#solveBtn').disabled = false;
    $('#winBox').hidden = true;
    setTip(t().tip0);
    renderPick();
    render();
  }

  function tryMove(from, to) {
    if(from===to||![from,to].every(i=>Number.isInteger(i)&&i>=0&&i<3))return false;
    const src = state.pegs[from], dst = state.pegs[to];
    if (!src.length) return false;
    const disc = src[src.length - 1];
    if (dst.length && dst[dst.length - 1] < disc) {
      const pegEl = document.querySelector(`.peg[data-peg="${to}"]`);
      pegEl.classList.remove('shake');
      void pegEl.offsetWidth;
      pegEl.classList.add('shake');
      setTip(t().tipBad);
      return false;
    }
    hanoiMove(state.pegs,from,to);
    state.moves++;
    return true;
  }

  function checkWin() {
    const done = state.pegs[1].length === state.n || state.pegs[2].length === state.n;
    if (!done) return;
    if(!state.botWin&&!earned.includes(state.n)){earned.push(state.n);try{localStorage.setItem(PROGRESS,JSON.stringify({completed:earned}));}catch{}window.cool?.stage?.(`discs-${state.n}`);window.cool?.complete?.();}
    const tt = t();
    $('#winTitle').textContent = tt.winTitle;
    $('#winDesc').textContent = state.botWin
      ? tt.winBot(state.demoMin)
      : state.moves === minMoves() ? tt.winPerfect(state.moves) : tt.winOk(state.moves, minMoves());
    $('#winBox').hidden = false;
    if(!state.celebrated){state.celebrated=true;confetti();}
  }

  function onPegClick(i) {
    if (state.solving || !$('#winBox').hidden) return;
    if (state.src === null) {
      if (state.pegs[i].length) {
        state.src = i;
        setTip(t().tipHold(state.pegs[i][state.pegs[i].length - 1]));
      }
    } else if (state.src === i) {
      state.src = null;
      setTip(t().tip0);
    } else {
      if (tryMove(state.src, i)) {
        state.src = null;
        setTip(t().tip0);
        render();
        checkWin();
        return;
      }
      state.src = null;
    }
    render();
  }

  /* ---------- 自动求解 ---------- */
  function solve() {
    clearTimeout(state.solveTimer);state.src=null;$('#winBox').hidden=true;
    const seq=hanoiSolution(state.pegs,state.n);state.demoMin=seq.length;
    state.solving=true;state.botWin=true;$('#solveBtn').disabled=true;setTip(t().tipSolving);
    const stepMs = Math.max(140, 3600 / seq.length);
    let i = 0;
    (function playNext() {
      if (i >= seq.length) {
        state.solving = false;
        $('#solveBtn').disabled = false;
        render();
        checkWin();rounds.checkpoint();
        return;
      }
      const [a, c] = seq[i++];
      tryMove(a, c);
      render();rounds.checkpoint();
      state.solveTimer = setTimeout(playNext, stepMs);
    })();
  }

  /* ---------- 彩纸 ---------- */
  function confetti() {
    const colors = COLORS;
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('i');
      p.className = 'confetti';
      p.style.left = `${Math.random() * 100}vw`;
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = `${1.6 + Math.random() * 1.8}s`;
      p.style.animationDelay = `${Math.random() * 0.5}s`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 4200);
    }
  }

  /* ---------- UI ---------- */
  function renderPick() {
    const box = $('#discPick');
    box.innerHTML = '';
    for (let n = 3; n <= 8; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = n;
      b.classList.toggle('on', n === state.n);
      b.addEventListener('click',()=>{rounds.checkpoint();reset(n);const play=rounds.record(n).play;if(play){try{restorePlay(play);}catch{reset(n);}}rounds.checkpoint();});
      box.appendChild(b);
    }
  }

  document.querySelectorAll('.peg').forEach((pegEl) => {
    const name=['A','B','C'][Number(pegEl.dataset.peg)];pegEl.dataset.name=name;pegEl.setAttribute('aria-label',name);pegEl.tabIndex=0;pegEl.setAttribute('role','button');
    pegEl.addEventListener('click', () => onPegClick(+pegEl.dataset.peg));
    pegEl.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPegClick(+pegEl.dataset.peg);}});
  });
  $('#resetBtn').addEventListener('click', () => reset());
  $('#againBtn').addEventListener('click',async()=>{if(state.generating)return;state.generating=true;try{games[state.n]=await rounds.nextAsync(state.n);reset();rounds.checkpoint();}finally{state.generating=false;}});
  $('#solveBtn').addEventListener('click', solve);

  function applyLang() {
    const tt = t();
    document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = tt[n.dataset.t]; });
    $('#langBtn').textContent = tt.langBtn;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = tt.doc;
    if(!$('#winBox').hidden)checkWin();
  }
  window.cool.preferences.subscribe(({ kind }) => {
    $('#themeBtn').textContent = window.cool.preferences.theme === 'light' ? '🌙' : '☀️';
    if (kind !== 'lang') return;
    lang = window.cool.preferences.lang;
    applyLang();
    if (!state.solving) setTip(t().tip0);
  });

  // The language may have changed while the boards were being generated, so re-read it here.
  lang = window.cool.preferences.lang;
  applyLang();
  $('#themeBtn').textContent = window.cool.preferences.theme === 'light' ? '🌙' : '☀️';
  function restorePlay(s){
    if(!validHanoiState(s.pegs,state.n)||!Number.isInteger(s.moves)||s.moves<0||s.src!==null&&![0,1,2].includes(s.src))throw new Error('Invalid Hanoi snapshot');
    clearTimeout(state.solveTimer);state.pegs=s.pegs;state.moves=s.moves;state.src=s.src;state.solving=false;state.botWin=Boolean(s.botWin);state.demoMin=Number.isInteger(s.demoMin)?s.demoMin:0;
    render();checkWin();
  }
  reset(state.n);
  rounds.attach({parent:'.bar__actions',compact:true,dialog:'#winBox',active:()=>state.n,capture:()=>({pegs:state.pegs,src:state.src,moves:state.moves,botWin:state.botWin,demoMin:state.demoMin}),restore:restorePlay,retry:()=>reset(),beforeReload:()=>clearTimeout(state.solveTimer)});
})();
