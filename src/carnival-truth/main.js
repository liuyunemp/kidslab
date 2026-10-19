import {createRounds} from './random-rounds.js';
import {random,seedFrom} from './random-core.js';
import {carnivalTask,carnivalFamily,validCarnival,carnivalTrials,carnivalCopy,probabilityFraction} from './random-model.js';
(() => {
  'use strict';

  const I18N = {
    zh: {
      doc: '游园会真相 · KidsLab',
      back: '返回平台',
      title: '游园会真相',
      case: '调查',
      evidence: '概率证据台',
      claim: '摊主声称',
      theory: '理论概率',
      experiment: '试验频率',
      inspector: '游园会调查局',
      formula: '先算一算',
      goldZones: '大奖区数量',
      designGoal: '目标：12 格中放 2 格，诱人但不容易中',
      honest: '承诺可信',
      dishonest: '夸大中奖率',
      hint: '调查提示',
      trial: '启动 1000 次试验',
      rerun: '再试 1000 次',
      check: '提交调查结论',
      launch: '发布我的转盘',
      next: '下一处摊位',
      finish: '归档全部证据',
      reset: '重置本次调查',
      playAgain: '重新巡查游园会',
      soundOff: '关闭声音',
      soundOn: '打开声音',
      theme: '切换主题',
      navLabel: '调查进度',
      verdictLabel: '公平性判断',
      decrease: '减少大奖区',
      increase: '增加大奖区',
      waiting: '等待试验',
      running: '正在模拟 1000 位游客',
      ready: '证据已生成',
      sealed: '证据已归档',
      seal: '证据成立',
      finalKicker: '三份概率证据全部归档',
      finalTitle: '你成为了“游园会真相官”！',
      finalText: '你会先数等可能结果，再用大量试验核对承诺，还设计出了中奖率为 1/6 的诚实转盘。',
      cases: [
        {
          kicker: '旋转木马旁 · 幸运转盘',
          title: '“一半的人都能中大奖！”是真的吗？',
          prompt: '先数大奖区，再启动千次试验仪，用证据判断摊主有没有夸大。',
          instruction: '收集一千位模拟游客的结果',
          total: 12,
          wins: 1,
          claim: '1/2',
          theory: '1/12',
          expected: 'dishonest',
          start: '转一转，看证据。',
          formula: '1 个大奖区 ÷ 12 个等大格 = 1/12',
          lesson: '格子一样大时，中奖概率 = 大奖格数 ÷ 总格数。试验频率会在理论概率附近摇摆。',
          hintText: '先比较 1/2 和 1/12：摊主承诺的中奖率远高于转盘真正能给出的中奖率。',
          missingTrial: '只有猜测还不能查封摊位。先启动 1000 次试验，让数据说话。',
          missingVerdict: '证据已经有了，再选择“承诺可信”或“夸大中奖率”。',
          wrong: '再看一眼：承诺是 1/2，但 12 个等大格中只有 1 个大奖格。',
          correct: '查封成功！理论概率是 1/12，千次试验也稳定在约 8%，远不是 1/2。',
        },
        {
          kicker: '棉花糖屋 · 金球摸奖机',
          title: '“每 5 次大约中 1 次”可信吗？',
          prompt: '机器每次摸球后都会放回。数清金球和总球数，再核对长期频率。',
          instruction: '检查一条可能是真的中奖承诺',
          total: 10,
          wins: 2,
          claim: '1/5',
          theory: '2/10',
          expected: 'honest',
          start: '摸一千次，看金球。',
          formula: '2 个金球 ÷ 10 个球 = 2/10 = 1/5',
          lesson: '公平调查不是“全都查封”。公开承诺和理论概率一致，就应该给摊位盖可信章。',
          hintText: '把 2/10 约分：分子分母同时除以 2，正好得到 1/5。',
          missingTrial: '先跑 1000 次有放回摸球，看看金球频率会不会靠近 1/5。',
          missingVerdict: '数据准备好了。现在判断这句承诺是否可信。',
          wrong: '别因为是游园会就先怀疑。2/10 约分后正好等于 1/5。',
          correct: '承诺可信！2/10 = 1/5，千次试验的金球频率也在 20% 附近。',
        },
        {
          kicker: '中央广场 · 你的转盘工坊',
          title: '设计一个“诱人但不容易中”的转盘',
          prompt: '转盘固定 12 个等大格。留下 2 个大奖区，让模拟顾客替你压力测试。',
          instruction: '调整大奖格，再请 1000 位 AI 顾客试玩',
          total: 12,
          wins: 4,
          claim: '公开概率',
          theory: '4/12',
          start: '大奖格太多了？改一改。',
          formula: '4 个大奖区 ÷ 12 个等大格 = 4/12 = 1/3',
          lesson: '设计低概率游戏也要诚实：大奖格可以少，但必须让顾客看清真实概率。',
          hintText: '目标是 2 个大奖格：2/12 约分后是 1/6，约等于 16.7%。',
          missingTrial: '设计改动后要重新试验。先请 1000 位 AI 顾客试玩。',
          wrongDesign: '还没达到设计任务：把大奖格调整到 2 个，再重新试验。',
          staleTrial: '大奖格数量变了，旧数据不能证明新转盘。请重新试验。',
          correct: '发布成功！2/12 = 1/6，模拟频率靠近 16.7%，而且真实概率已经公开。',
        },
      ],
    },
    en: {
      doc: 'Carnival Truth · KidsLab',
      back: 'Back to platform',
      title: 'Carnival Truth',
      case: 'CASE',
      evidence: 'PROBABILITY EVIDENCE',
      claim: 'BOOTH CLAIM',
      theory: 'THEORETICAL',
      experiment: 'EXPERIMENTAL',
      inspector: 'CARNIVAL AUDIT BUREAU',
      formula: 'Do the math first',
      goldZones: 'Prize sectors',
      designGoal: 'Goal: 2 of 12 sectors—tempting, but hard to win',
      honest: 'Claim checks out',
      dishonest: 'Odds are inflated',
      hint: 'Investigator hint',
      trial: 'Run 1,000 trials',
      rerun: 'Run 1,000 again',
      check: 'Submit verdict',
      launch: 'Publish my wheel',
      next: 'Next booth',
      finish: 'File all evidence',
      reset: 'Reset this case',
      playAgain: 'Audit the carnival again',
      soundOff: 'Turn sound off',
      soundOn: 'Turn sound on',
      theme: 'Switch theme',
      navLabel: 'Case progress',
      verdictLabel: 'Fairness verdict',
      decrease: 'Remove a prize sector',
      increase: 'Add a prize sector',
      waiting: 'AWAITING TRIALS',
      running: 'SIMULATING 1,000 VISITORS',
      ready: 'EVIDENCE READY',
      sealed: 'EVIDENCE FILED',
      seal: 'CASE PROVED',
      finalKicker: 'ALL THREE PROBABILITY FILES COMPLETE',
      finalTitle: 'You are a Carnival Truth Officer!',
      finalText: 'You counted equally likely outcomes, checked claims with large trials, and built an honest wheel with a 1-in-6 chance.',
      cases: [
        {
          kicker: 'BY THE CAROUSEL · LUCKY WHEEL',
          title: 'Can “half of all players win big” be true?',
          prompt: 'Count prize sectors, run the thousand-trial machine, and audit the booth with evidence.',
          instruction: 'Collect results from one thousand simulated visitors',
          total: 12,
          wins: 1,
          claim: '1/2',
          theory: '1/12',
          expected: 'dishonest',
          start: 'Spin it. Look at the evidence.',
          formula: '1 prize sector ÷ 12 equal sectors = 1/12',
          lesson: 'For equal sectors, probability = prize sectors ÷ all sectors. Trial frequency wobbles around that probability.',
          hintText: 'Compare 1/2 with 1/12. The booth promises far more wins than its wheel can produce.',
          missingTrial: 'A hunch cannot close a booth. Run 1,000 trials and let the data speak.',
          missingVerdict: 'The evidence is ready. Choose whether the claim checks out or inflates the odds.',
          wrong: 'Look again: the claim is 1/2, but only 1 of 12 equal sectors pays the grand prize.',
          correct: 'Booth closed! Theoretical probability is 1/12, and the large trial settles near 8%—not 1/2.',
        },
        {
          kicker: 'COTTON-CANDY HOUSE · GOLD-BALL DRAW',
          title: 'Does “about 1 win in every 5 tries” check out?',
          prompt: 'Every ball is replaced after a draw. Count gold balls, then compare the long-run frequency.',
          instruction: 'Audit a prize claim that might be honest',
          total: 10,
          wins: 2,
          claim: '1/5',
          theory: '2/10',
          expected: 'honest',
          start: 'Draw a thousand times. Watch the gold.',
          formula: '2 gold balls ÷ 10 balls = 2/10 = 1/5',
          lesson: 'A fair audit does not close every booth. When the public claim matches the theoretical probability, approve it.',
          hintText: 'Simplify 2/10 by dividing top and bottom by 2. It becomes exactly 1/5.',
          missingTrial: 'Run 1,000 draws with replacement and see whether gold settles near 1/5.',
          missingVerdict: 'The data is ready. Decide whether the claim checks out.',
          wrong: 'Do not reject every carnival claim. 2/10 simplifies exactly to 1/5.',
          correct: 'Claim approved! 2/10 = 1/5, and the thousand-trial gold frequency sits near 20%.',
        },
        {
          kicker: 'CENTRAL PLAZA · YOUR WHEEL WORKSHOP',
          title: 'Design a wheel that looks tempting but is hard to win',
          prompt: 'The wheel has 12 equal sectors. Keep 2 prize sectors, then let simulated customers stress-test it.',
          instruction: 'Adjust prize sectors, then invite 1,000 AI customers',
          total: 12,
          wins: 4,
          claim: 'Publish odds',
          theory: '4/12',
          start: 'Too many prize sectors? Change it.',
          formula: '4 prize sectors ÷ 12 equal sectors = 4/12 = 1/3',
          lesson: 'A low-odds game can still be honest: use fewer prize sectors, but publish the real probability.',
          hintText: 'Set 2 prize sectors. 2/12 simplifies to 1/6, or about 16.7%.',
          missingTrial: 'Test every design change. Invite 1,000 AI customers first.',
          wrongDesign: 'The brief is not met yet. Set exactly 2 prize sectors, then test again.',
          staleTrial: 'The sector count changed, so old data cannot prove this wheel. Run a fresh trial.',
          correct: 'Published! 2/12 = 1/6, the simulated frequency sits near 16.7%, and the true odds are visible.',
        },
      ],
    },
  };

  const SAVE_KEY = 'kidslab.carnival-truth';
  const SOUND_KEY = 'kidslab.sound.muted';
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    course: $('#course'),
    topbar: $('#topbar'),
    caseNumber: $('#caseNumber'),
    caseKicker: $('#caseKicker'),
    caseTitle: $('#caseTitle'),
    casePrompt: $('#casePrompt'),
    caseNav: $('#caseNav'),
    evidenceStage: $('#evidenceStage'),
    machineState: $('#machineState'),
    canvas: $('#evidenceCanvas'),
    claimReadout: $('#claimReadout'),
    theoryReadout: $('#theoryReadout'),
    experimentReadout: $('#experimentReadout'),
    sealText: $('#sealText'),
    panelInstruction: $('#panelInstruction'),
    status: $('#status'),
    formulaCard: $('#formulaCard'),
    formulaText: $('#formulaText'),
    designer: $('#designer'),
    prizeSlots: $('#prizeSlots'),
    minusBtn: $('#minusBtn'),
    plusBtn: $('#plusBtn'),
    verdicts: $('#verdicts'),
    hintCard: $('#hintCard'),
    lessonText: $('#lessonText'),
    hintBtn: $('#hintBtn'),
    trialBtn: $('#trialBtn'),
    checkBtn: $('#checkBtn'),
    nextBtn: $('#nextBtn'),
    resetBtn: $('#resetBtn'),
    soundBtn: $('#soundBtn'),
    themeBtn: $('#themeBtn'),
    langBtn: $('#langBtn'),
    finale: $('#finale'),
    finaleCanvas: $('#finaleCanvas'),
    playAgainBtn: $('#playAgainBtn'),
  };

  let t = (key) => key;
  let lang = 'zh';
  let muted = false;
  let audioContext = null;
  let trialAnimation = null;
  let idleTimer = null;
  /** 答对后自动进入下一处摊位；手动点按钮会取消它，避免连跳 */
  let autoNextTimer = 0;
  function cancelAutoNext() { if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = 0; } }
  function scheduleAutoNext(fn, ms = 1400) {
    cancelAutoNext();
    autoNextTimer = setTimeout(() => { autoNextTimer = 0; fn(); }, ms);
  }
  let finaleAnimation = null;
  const rounds=createRounds('carnival-truth'),hadSnapshots=rounds.hasSnapshot;
  const bases=[{kind:'dishonest',total:12,wins:1,claimWins:6},{kind:'honest',total:10,wins:2,claimWins:2},{kind:'design',total:12,wins:4,target:2}];
  const CASES=bases.map((base,i)=>rounds.define(i,base,carnivalTask,validCarnival,a=>a,carnivalFamily));
  let legacy={};try{legacy=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');}catch{}
  let state=loadState(),completedEver=Boolean(legacy.completed);
  const mastered=new Set(Array.isArray(legacy.mastered)?legacy.mastered:[]);
  if(!hadSnapshots&&!rounds.explicitSeed&&!state.completed&&(state.trialWins!==null||state.selectedVerdict!==null||state.solved||state.prizeSlots!==4)){
    CASES[state.caseIndex]=bases[state.caseIndex];rounds.adopt(state.caseIndex,CASES[state.caseIndex],state);
  }
  if(rounds.active!==null)state.caseIndex=Number(rounds.active);
  if(state.completed&&!hadSnapshots)state=freshState();
  let animationEpoch=0;
  function stopAnimations(){animationEpoch++;cancelAutoNext();if(trialAnimation)cancelAnimationFrame(trialAnimation);trialAnimation=null;if(finaleAnimation)cancelAnimationFrame(finaleAnimation);finaleAnimation=null;clearTimeout(idleTimer);}


  function freshState() {
    return {
      caseIndex: 0,
      selectedVerdict: null,
      prizeSlots: 4,
      trialWins: null,
      trialSlots: null,
      solved: false,
      completed: false,
      feedback: 'start',trialNo:0,
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!saved || !Number.isInteger(saved.caseIndex)) return freshState();
      return {
        caseIndex: Math.max(0, Math.min(2, saved.caseIndex)),
        selectedVerdict: ['honest', 'dishonest'].includes(saved.selectedVerdict) ? saved.selectedVerdict : null,
        prizeSlots: Number.isInteger(saved.prizeSlots) ? Math.max(1, Math.min(6, saved.prizeSlots)) : 4,
        trialWins: Number.isInteger(saved.trialWins) ? Math.max(0, Math.min(1000, saved.trialWins)) : null,
        trialSlots: Number.isInteger(saved.trialSlots) ? Math.max(1, Math.min(12, saved.trialSlots)) : null,
        solved: Boolean(saved.solved),
        completed: Boolean(saved.runComplete??saved.completed),
        trialNo:Number.isInteger(saved.trialNo)&&saved.trialNo>=0?saved.trialNo:0,
        feedback: typeof saved.feedback === 'string' ? saved.feedback : 'start',
      };
    } catch {
      return freshState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({...state,completed:completedEver,runComplete:state.completed,mastered:[...mastered]}));
    } catch {
      // Progress remains session-local when storage is unavailable.
    }
  }

  function currentCase() {
    return carnivalCopy(t('cases')[state.caseIndex],CASES[state.caseIndex],lang);
  }

  function runTrial() {
    if (state.solved || trialAnimation) return;
    const current = currentCase();
    const wins = state.caseIndex === 2 ? state.prizeSlots : current.wins;
    const record=rounds.record(state.caseIndex),epoch=animationEpoch;
    const rng=random(seedFrom(`${record.version}/${record.seed}/${record.round}/${state.caseIndex}/trial/${state.trialNo}/${wins}`));
    const result=carnivalTrials(current.total,wins,rng);state.trialNo++;
    state.trialWins = result;
    state.trialSlots = wins;
    state.feedback = 'running';
    saveState();
    playSound('machine');
    window.cool?.track?.('run_thousand_trials', { case: state.caseIndex + 1, prizeSlots: wins, wins: result });
    render();

    const started = performance.now();
    const animate = (now) => {
      if(epoch!==animationEpoch)return;
      const progress = Math.max(0,Math.min(1, (now - started) / 720));
      drawEvidence(progress);
      elements.experimentReadout.textContent = `${Math.round(result * progress)} / ${Math.round(1000 * progress) || 1}`;
      if (progress < 1) {
        trialAnimation = requestAnimationFrame(animate);
        return;
      }
      trialAnimation = null;
      state.feedback = 'trialReady';
      saveState();
      playSound('success');
      render();rounds.checkpoint();
    };
    trialAnimation = requestAnimationFrame(animate);
  }

  function selectVerdict(verdict) {
    if (state.solved || state.caseIndex === 2) return;
    state.selectedVerdict = verdict;
    state.feedback = state.trialWins === null ? 'start' : 'trialReady';
    saveState();
    playSound('tick');
    window.cool?.track?.('choose_fairness_verdict', { case: state.caseIndex + 1, verdict });
    render();
    scheduleIdleHint();
  }

  function adjustPrize(delta) {
    if (state.solved || state.caseIndex !== 2) return;
    const next = Math.max(1, Math.min(6, state.prizeSlots + delta));
    if (next === state.prizeSlots) {
      playSound('error');
      return;
    }
    stopAnimations();state.prizeSlots = next;
    state.feedback = 'designing';
    saveState();
    playSound('tick');
    window.cool?.track?.('adjust_prize_sectors', { sectors: next });
    render();
    scheduleIdleHint();
  }

  function checkAnswer() {
    if (state.solved || trialAnimation) return;
    const current = currentCase();
    if (state.trialWins === null) {
      state.feedback = 'missingTrial';
      playSound('error');
      render();
      return;
    }

    if (state.caseIndex === 2) {
      if (state.prizeSlots !== CASES[2].target) {
        state.feedback = 'wrongDesign';
        playSound('error');
        render();
        return;
      }
      if (state.trialSlots !== state.prizeSlots) {
        state.feedback = 'staleTrial';
        playSound('error');
        render();
        return;
      }
    } else {
      if (!state.selectedVerdict) {
        state.feedback = 'missingVerdict';
        playSound('error');
        render();
        return;
      }
      if (state.selectedVerdict !== current.expected) {
        state.feedback = 'wrong';
        playSound('error');
        window.cool?.track?.('reject_wrong_verdict', { case: state.caseIndex + 1, verdict: state.selectedVerdict });
        render();
        return;
      }
    }

    state.solved = true;mastered.add(state.caseIndex);
    state.feedback = 'correct';
    saveState();
    playSound('success');
    window.cool?.track?.('solve_probability_case', { case: state.caseIndex + 1 });
    render();
    if (state.caseIndex < 2) scheduleAutoNext(nextCase);
  }

  function nextCase() {
    cancelAutoNext();
    if (!state.solved) return;
    if (state.caseIndex === 2) {
      state.completed = true;const first=!completedEver;completedEver=true;
      saveState();
      if(first)window.cool?.complete?.();
      window.cool?.track?.('complete_carnival_audit', { cases: 3 });
      playSound('complete');
      render();
      return;
    }
    rounds.checkpoint();const next=state.caseIndex+1;
    if(rounds.record(next).play)CASES[next]=rounds.next(next);
    state.caseIndex=next;resetCase();window.cool?.stage?.(`case-${state.caseIndex+1}`);rounds.checkpoint();
  }

  function resetCase() {
    stopAnimations();state.completed=false;state.trialNo=0;
    if (trialAnimation) {
      cancelAnimationFrame(trialAnimation);
      trialAnimation = null;
    }
    state.selectedVerdict = null;
    state.prizeSlots = state.caseIndex === 2 ? CASES[2].wins : state.prizeSlots;
    state.trialWins = null;
    state.trialSlots = null;
    state.solved = false;
    state.feedback = 'start';
    saveState();
    playSound('page');
    render();
    scheduleIdleHint();
  }

  function playAgain(){
    rounds.checkpoint();const a=rounds.next(0);stopAnimations();CASES[0]=a;state=freshState();resetCase();rounds.checkpoint();
  }

  function showHint() {
    if (state.solved) return;
    state.feedback = 'hint';
    playSound('hint');
    window.cool?.track?.('request_probability_hint', { case: state.caseIndex + 1 });
    render();
  }

  function statusText(current) {
    if (state.feedback === 'hint') return current.hintText;
    if (state.feedback === 'missingTrial') return current.missingTrial;
    if (state.feedback === 'missingVerdict') return current.missingVerdict;
    if (state.feedback === 'wrong') return current.wrong;
    if (state.feedback === 'wrongDesign') return current.wrongDesign;
    if (state.feedback === 'staleTrial') return current.staleTrial;
    if (state.feedback === 'correct') return current.correct;
    if (state.feedback === 'trialReady') {
      const percent = (state.trialWins / 10).toFixed(1);
      return lang === 'zh'
        ? `1000 次中有 ${state.trialWins} 次中奖，试验频率是 ${percent}%。`
        : `${state.trialWins} wins in 1,000 trials: an experimental frequency of ${percent}%.`;
    }
    if (state.feedback === 'running') return lang === 'zh' ? '结果正在像瀑布一样落下……' : 'Results are cascading into the chart…';
    if (state.feedback === 'designing') {
      return lang === 'zh'
        ? `现在有 ${state.prizeSlots} 个大奖格。新设计需要重新试验。`
        : `The wheel now has ${state.prizeSlots} prize sectors. Test the new design.`;
    }
    return current.start;
  }

  function render() {
    const current = currentCase();
    document.querySelector('[data-t=designGoal]').textContent=lang==='zh'?`目标中奖概率 ${probabilityFraction(CASES[2].target,CASES[2].total)}`:`Target chance: ${probabilityFraction(CASES[2].target,CASES[2].total)}`;
    document.querySelector('[data-t=finalText]').textContent=lang==='zh'?'三份调查已归档，你用理论概率核对承诺，再用试验观察频率。':'All three cases are filed: compare promises with theoretical probability, then observe trial frequencies.';
    const designer = state.caseIndex === 2;
    const activeWins = designer ? state.prizeSlots : current.wins;
    const divisor = greatestCommonDivisor(activeWins, current.total);
    const simplified = `${activeWins / divisor}/${current.total / divisor}`;

    elements.caseNumber.textContent = String(state.caseIndex + 1).padStart(2, '0');
    elements.caseKicker.textContent = current.kicker;
    elements.caseTitle.textContent = current.title;
    elements.casePrompt.textContent = current.prompt;
    elements.panelInstruction.textContent = current.instruction;
    elements.claimReadout.textContent = current.claim;
    elements.theoryReadout.textContent = designer ? `${activeWins}/${current.total}` : current.theory;
    elements.experimentReadout.textContent = state.trialWins === null ? '—' : `${state.trialWins}/1000`;
    elements.formulaText.textContent = designer
      ? (lang === 'zh'
        ? `${activeWins} 个大奖区 ÷ 12 个等大格 = ${activeWins}/12 = ${simplified}`
        : `${activeWins} prize sectors ÷ 12 equal sectors = ${activeWins}/12 = ${simplified}`)
      : current.formula;
    elements.lessonText.textContent = state.feedback === 'hint' ? current.hintText : current.lesson;
    const showFormula = state.solved || ['hint', 'trialReady', 'correct', 'staleTrial'].includes(state.feedback);
    const showLesson = state.solved || ['hint', 'correct'].includes(state.feedback);
    if (elements.formulaCard) elements.formulaCard.hidden = !showFormula;
    if (elements.hintCard) elements.hintCard.hidden = !showLesson;
    elements.status.textContent = statusText(current);
    elements.status.className = `status${['wrong', 'wrongDesign', 'staleTrial', 'missingTrial', 'missingVerdict'].includes(state.feedback) ? ' is-wrong' : ''}${state.feedback === 'correct' ? ' is-correct' : ''}`;
    elements.evidenceStage.dataset.result = state.feedback === 'correct' ? 'correct' : (['wrong', 'wrongDesign'].includes(state.feedback) ? 'wrong' : 'idle');
    elements.machineState.textContent = state.feedback === 'running' ? t('running') : state.solved ? t('sealed') : state.trialWins === null ? t('waiting') : t('ready');
    elements.sealText.textContent = t('seal');
    elements.designer.hidden = !designer;
    elements.verdicts.hidden = designer;
    elements.prizeSlots.textContent = state.prizeSlots;
    elements.minusBtn.disabled = state.solved || state.prizeSlots <= 1;
    elements.plusBtn.disabled = state.solved || state.prizeSlots >= 6;
    elements.minusBtn.setAttribute('aria-label', t('decrease'));
    elements.plusBtn.setAttribute('aria-label', t('increase'));
    elements.verdicts.setAttribute('aria-label', t('verdictLabel'));
    elements.verdicts.querySelectorAll('[data-verdict]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.verdict === state.selectedVerdict);
      button.disabled = state.solved;
    });
    elements.trialBtn.querySelector('span').textContent = state.trialWins === null ? t('trial') : t('rerun');
    elements.trialBtn.disabled = state.solved || Boolean(trialAnimation);
    elements.checkBtn.querySelector('span').textContent = designer ? t('launch') : t('check');
    elements.checkBtn.hidden = state.solved;
    elements.nextBtn.hidden = !state.solved;
    elements.nextBtn.querySelector('span').textContent = state.caseIndex === 2 ? t('finish') : t('next');
    elements.caseNav.innerHTML = [0, 1, 2].map((index) => {
      const className = mastered.has(index)
        ? 'is-done'
        : index === state.caseIndex ? 'is-current' : '';
      return `<span class="${className}" aria-label="${index + 1}">${mastered.has(index) ? '✓' : index + 1}</span>`;
    }).join('');
    elements.caseNav.setAttribute('aria-label', t('navLabel'));
    elements.soundBtn.textContent = muted ? '🔇' : '🔊';
    elements.soundBtn.setAttribute('aria-pressed', String(muted));
    elements.soundBtn.setAttribute('aria-label', muted ? t('soundOn') : t('soundOff'));
    elements.themeBtn.setAttribute('aria-label', t('theme'));
    elements.course.inert = state.completed;
    elements.topbar.inert = state.completed;
    document.body.classList.toggle('course-complete', state.completed);
    elements.finale.hidden = !state.completed;
    syncStarMapBack();
    drawEvidence(1);
    if (state.completed) {
      drawFinale();
      requestAnimationFrame(() => elements.playAgainBtn.focus());
    }
  }

  function greatestCommonDivisor(a, b) {
    let left = a;
    let right = b;
    while (right) [left, right] = [right, left % right];
    return left;
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, width, height };
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function drawEvidence(progress = 1) {
    const { context: ctx, width, height } = setupCanvas(elements.canvas);
    const current = currentCase();
    const wins = state.caseIndex === 2 ? state.prizeSlots : current.wins;
    ctx.clearRect(0, 0, width, height);

    const compact = width < 500;
    const wheelRadius = Math.min(compact ? 55 : 108, height * (compact ? .28 : .34), width * (compact ? .15 : .2));
    const wheelX = compact ? width * .23 : width * .29;
    const wheelY = height * .43;
    const colors = [cssVar('--red'), cssVar('--gold'), cssVar('--teal'), '#f7e6b5'];
    const start = -Math.PI / 2;
    for (let index = 0; index < current.total; index += 1) {
      const angle = Math.PI * 2 / current.total;
      ctx.beginPath();
      ctx.moveTo(wheelX, wheelY);
      ctx.arc(wheelX, wheelY, wheelRadius, start + index * angle, start + (index + 1) * angle);
      ctx.closePath();
      ctx.fillStyle = index < wins ? cssVar('--gold') : colors[2 + (index % 2)];
      ctx.fill();
      ctx.strokeStyle = cssVar('--stage-deep');
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelRadius * .13, 0, Math.PI * 2);
    ctx.fillStyle = cssVar('--cream');
    ctx.fill();
    ctx.strokeStyle = cssVar('--stage-deep');
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wheelX, wheelY - wheelRadius - 10);
    ctx.lineTo(wheelX - 11, wheelY - wheelRadius + 8);
    ctx.lineTo(wheelX + 11, wheelY - wheelRadius + 8);
    ctx.closePath();
    ctx.fillStyle = cssVar('--red');
    ctx.fill();

    const chartX = compact ? width * .48 : width * .56;
    const chartBottom = height * .78;
    const chartHeight = height * .53;
    const barGap = compact ? 12 : 24;
    const barWidth = Math.min(compact ? 42 : 76, (width - chartX - 28 - barGap) / 2);
    const resultWins = state.trialWins === null ? 0 : state.trialWins * progress;
    const resultLosses = state.trialWins === null ? 0 : (1000 - state.trialWins) * progress;
    const values = [resultWins, resultLosses];
    const labels = lang === 'zh' ? ['中奖', '未中'] : ['WIN', 'MISS'];
    const barColors = [cssVar('--gold'), cssVar('--red')];
    ctx.font = `900 ${16}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = 'center';
    values.forEach((value, index) => {
      const x = chartX + index * (barWidth + barGap);
      const barHeight = Math.max(state.trialWins === null ? 0 : 2, value / 1000 * chartHeight);
      ctx.fillStyle = 'rgba(255,255,255,.09)';
      ctx.fillRect(x, chartBottom - chartHeight, barWidth, chartHeight);
      ctx.fillStyle = barColors[index];
      ctx.fillRect(x, chartBottom - barHeight, barWidth, barHeight);
      ctx.fillStyle = cssVar('--stage-ink');
      ctx.fillText(String(Math.round(value)), x + barWidth / 2, chartBottom - barHeight - 8);
      ctx.fillText(labels[index], x + barWidth / 2, chartBottom + (compact ? 17 : 23));
    });
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chartX - 8, chartBottom);
    ctx.lineTo(chartX + 2 * barWidth + barGap + 8, chartBottom);
    ctx.stroke();
  }

  function drawFinale() {
    if (finaleAnimation) cancelAnimationFrame(finaleAnimation);
    const started = performance.now();
    const animate = (now) => {
      if (!state.completed) return;
      const { context: ctx, width, height } = setupCanvas(elements.finaleCanvas);
      ctx.clearRect(0, 0, width, height);
      const elapsed = (now - started) / 1000;
      for (let index = 0; index < 42; index += 1) {
        const x = ((index * 97 + elapsed * (26 + index % 5)) % (width + 40)) - 20;
        const y = ((index * 61 + elapsed * (52 + index % 7)) % (height + 40)) - 20;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(elapsed + index);
        ctx.fillStyle = [cssVar('--gold'), cssVar('--red'), cssVar('--teal')][index % 3];
        ctx.fillRect(-4, -9, 8, 18);
        ctx.restore();
      }
      finaleAnimation = requestAnimationFrame(animate);
    };
    finaleAnimation = requestAnimationFrame(animate);
  }

  function scheduleIdleHint() {
    clearTimeout(idleTimer);
    if (state.solved || state.completed) return;
    idleTimer = setTimeout(() => {
      state.feedback = 'hint';
      render();
    }, 30000);
  }

  function syncStarMapBack() {
    const starMapBack = document.querySelector('.kidslab-starmap-back');
    if (!starMapBack) return;
    starMapBack.inert = state.completed;
    starMapBack.hidden = state.completed;
  }

  function ensureAudio() {
    if (muted) return null;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      return audioContext;
    } catch {
      return null;
    }
  }

  function playSound(kind) {
    const context = ensureAudio();
    if (!context || muted) return;
    const sounds = {
      tick: { notes: [440], duration: .06, type: 'square', gain: .025 },
      machine: { notes: [220, 330, 440], duration: .08, type: 'square', gain: .025 },
      hint: { notes: [523, 659], duration: .1, type: 'sine', gain: .035 },
      error: { notes: [190, 145], duration: .14, type: 'sawtooth', gain: .025 },
      success: { notes: [392, 523, 659], duration: .12, type: 'triangle', gain: .045 },
      page: { notes: [294, 392], duration: .1, type: 'sine', gain: .035 },
      complete: { notes: [392, 494, 587, 784], duration: .17, type: 'triangle', gain: .05 },
    };
    const sound = sounds[kind] || sounds.tick;
    sound.notes.forEach((frequency, index) => {
      const at = context.currentTime + index * sound.duration * .72;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = sound.type;
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(sound.gain, at + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, at + sound.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + sound.duration + .02);
    });
  }

  function toggleSound() {
    muted = !muted;
    try {
      localStorage.setItem(SOUND_KEY, String(muted));
    } catch {
      // Sound preference remains session-local if storage is unavailable.
    }
    if (muted && audioContext?.state === 'running') audioContext.suspend().catch(() => {});
    if (!muted) playSound('tick');
    render();
  }

  elements.verdicts.addEventListener('click', (event) => {
    const button = event.target.closest('[data-verdict]');
    if (button) selectVerdict(button.dataset.verdict);
  });
  elements.minusBtn.addEventListener('click', () => adjustPrize(-1));
  elements.plusBtn.addEventListener('click', () => adjustPrize(1));
  elements.trialBtn.addEventListener('click', runTrial);
  elements.checkBtn.addEventListener('click', checkAnswer);
  elements.nextBtn.addEventListener('click', nextCase);
  elements.hintBtn.addEventListener('click', showHint);
  elements.resetBtn.addEventListener('click', resetCase);
  elements.playAgainBtn.addEventListener('click', playAgain);
  elements.soundBtn.addEventListener('click', toggleSound);
  elements.langBtn.addEventListener('click', () => window.cool.preferences.toggleLang());
  elements.themeBtn.addEventListener('click', () => window.cool.preferences.toggleTheme());
  addEventListener('DOMContentLoaded', syncStarMapBack);
  addEventListener('resize', () => drawEvidence(1));

  try {
    const storedMute = localStorage.getItem(SOUND_KEY);
    muted = storedMute === 'true' || storedMute === '1';
  } catch {
    muted = false;
  }

  function restorePlay(s){
    const a=CASES[state.caseIndex];
    if(s.caseIndex!==state.caseIndex||!Number.isInteger(s.prizeSlots)||s.prizeSlots<1||s.prizeSlots>6||s.trialWins!==null&&(!Number.isInteger(s.trialWins)||s.trialWins<0||s.trialWins>1000)||!Number.isInteger(s.trialNo??0))throw new Error('Invalid probability record');
    if(s.solved&&(s.trialWins===null||(a.kind==='design'?s.prizeSlots!==a.target||s.trialSlots!==a.target:s.selectedVerdict!==(a.claimWins===a.wins?'honest':'dishonest'))))throw new Error('Invalid verdict');
    state={...s,trialNo:s.trialNo??0};if(state.feedback==='running')state.feedback='trialReady';saveState();render();
  }
  window.cool.bindI18n(I18N, {
    onChange({ t: translate, lang: nextLang, theme }) {
      t = translate;
      lang = nextLang;
      document.title = t('doc');
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      elements.langBtn.textContent = lang === 'zh' ? 'EN' : '中';
      elements.themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
      render();
    },
  });
  const currentIndex=state.caseIndex;state={...freshState(),caseIndex:currentIndex,prizeSlots:CASES[2].wins};
  rounds.attach({parent:'.topbar__actions',compact:true,dialog:'#finale',active:()=>state.caseIndex,capture:()=>state,restore:restorePlay,retry:resetCase,beforeReload:stopAnimations});
  render();window.cool?.stage?.(`case-${state.caseIndex + 1}`);
  scheduleIdleHint();
})();
