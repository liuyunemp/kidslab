// 七巧板皮影戏的声音层：本地 BGM + 振荡器音效 + 可见静音开关的持久化状态。
// Web Audio 不可用时静默降级，玩法与视觉反馈完全不受影响。
export function createAudio(key) {
  const read = (k, fallback = true) => {
    try {
      const value = localStorage.getItem(`${key}.${k}`);
      return value === null ? fallback : value === '1';
    } catch {
      return fallback;
    }
  };
  const write = (k, v) => {
    try { localStorage.setItem(`${key}.${k}`, v ? '1' : '0'); } catch { /* 存储可选 */ }
  };

  let music = read('music');
  let effects = read('effects');
  let muted = read('muted', false);
  let unlocked = false;
  let ctx = null;
  let bgm = null;
  let lastTone = -Infinity;
  const active = new Set();

  function stopTones() {
    for (const osc of active) {
      try { osc.stop(); osc.disconnect(); } catch { /* 已结束 */ }
    }
    active.clear();
  }

  function sync() {
    if (!bgm) return;
    if (music && !muted && unlocked && !document.hidden) bgm.play().catch(() => {});
    else bgm.pause();
  }

  // 首次用户手势调用；绝不 await 在玩法动作之前，否则第一次点击要等音频下载完才有反应。
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) ctx = new AudioContextClass();
      if (muted) ctx?.suspend().catch(() => {});
      else ctx?.resume().catch(() => {});
    } catch {
      ctx = null;
    }
    try {
      bgm = new Audio(new URL('./audio/shadow-stage.ogg', import.meta.url));
      bgm.loop = true;
      bgm.volume = 0.16;
      bgm.preload = 'none';
      sync();
    } catch {
      bgm = null;
    }
  }

  function tone(kind = 'action') {
    if (!ctx || !effects || muted || document.hidden || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    // 冷却：连续拖拽或连点不会堆叠音源。
    if (now - lastTone < 0.065) return;
    lastTone = now;
    const notes = kind === 'complete' ? [523, 659, 784, 1047]
      : kind === 'success' ? [659, 880]
        : kind === 'error' ? [233, 175]
          : kind === 'pick' ? [392, 523]
            : kind === 'hint' ? [784, 988]
              : [440];
    try {
      notes.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const at = now + index * 0.09;
        osc.type = kind === 'error' ? 'triangle' : 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.055, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
        osc.connect(gain).connect(ctx.destination);
        active.add(osc);
        osc.start(at);
        osc.stop(at + 0.22);
        osc.onended = () => { active.delete(osc); osc.disconnect(); gain.disconnect(); };
      });
    } catch { /* 静默降级 */ }
  }

  function set(k, v) {
    if (k === 'music') music = v;
    if (k === 'effects') effects = v;
    if (k === 'muted') muted = v;
    write(k, v);
    sync();
    if (muted || !effects) stopTones();
    if (muted) ctx?.suspend().catch(() => {});
    else if (unlocked && !document.hidden) ctx?.resume().catch(() => {});
  }

  const visibility = () => {
    sync();
    if (document.hidden) {
      stopTones();
      ctx?.suspend().catch(() => {});
    } else if (!muted && unlocked) {
      ctx?.resume().catch(() => {});
    }
  };
  document.addEventListener('visibilitychange', visibility);
  const stop = () => { bgm?.pause(); stopTones(); ctx?.suspend().catch(() => {}); };
  addEventListener('pagehide', stop);
  addEventListener('pageshow', visibility);

  return {
    unlock,
    tone,
    set,
    get music() { return music; },
    get effects() { return effects; },
    get muted() { return muted; },
  };
}
