/**
 * KidsLab platform SDK — always injected into built courseware.
 * Preferences and i18n stay local; analytics extends this object only when configured.
 */
(() => {
  'use strict';

  const w = window;
  const cool = w.cool || {};
  if (cool.sdkVersion) return;

  /* 触控延时优化：取消双击缩放的手势仲裁等待，点按即时响应。
     只收紧浏览器手势，不影响课件内 touch-action:none 的拖拽画布。 */
  try { document.documentElement.style.touchAction = 'manipulation'; } catch { /* noop */ }

  const configuredCourseId = '__COURSE_ID__';
  const pathParts = location.pathname.split('/').filter(Boolean);
  const pathTail = pathParts.at(-1) || '';
  const inferredCourseId = pathTail.includes('.') ? pathParts.at(-2) : pathTail;
  const courseId = configuredCourseId.startsWith('__') ? inferredCourseId : configuredCourseId;

  const storage = {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };

  const listeners = new Set();
  const validLangs = new Set(['zh', 'en']);
  const validThemes = new Set(['light', 'dark']);
  const systemLang = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  let systemTheme = 'light';
  try {
    systemTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    // Browsers without matchMedia use the light theme.
  }

  let lang = storage.get('kidslab.lang', systemLang);
  let theme = storage.get('kidslab.theme', systemTheme);
  if (!validLangs.has(lang)) lang = systemLang;
  if (!validThemes.has(theme)) theme = systemTheme;

  function applyDocument() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.dataset.theme = theme;
  }

  /* ---------- 韧性层：诊断缓冲 + 白屏兜底 + 返回手势 ----------
     只读排查的结论是：安卓上「玩着玩着白屏」主要来自 WebGL 上下文被系统回收、
     以及启动期未捕获异常；「跳回主站」来自边缘返回手势与误触悬浮按钮。
     这里统一兜底：任何一步失败都静默降级，绝不抛出、绝不阻塞玩法。 */
  const DIAG_KEY = 'kidslab.diag.v1';
  const DIAG_MAX = 20;
  const GUARD_STYLE_ID = 'kidslab-guard-style';
  /* 事件绑定一律走这里：老 WebView 或测试桩缺少某个 API 时不能让 SDK 在加载期崩掉。 */
  const on = (target, type, fn, opts) => {
    try { target?.addEventListener?.(type, fn, opts); } catch { /* noop */ }
  };
  let diagCache = null;
  let guardEl = null;
  let guardKind = '';
  let noticeEl = null;
  let noticeTimer = 0;

  const copy = () => (lang === 'en' ? {
    preparing: 'Getting ready…',
    errorTitle: 'Something went wrong here',
    errorHint: 'Tap Restore to reload. Your progress is safe.',
    lostTitle: 'The system took the picture away',
    lostHint: 'Tap Restore to bring the stage back. Your progress is safe.',
    restored: 'The picture is back',
    retry: 'Restore',
    leave: 'Back to list',
    backAgain: 'Press back again to leave',
    saveFail: 'This device is low on space, so this progress may not be saved.',
  } : {
    preparing: '正在准备…',
    errorTitle: '这里出了点小问题',
    errorHint: '点「恢复」重新打开，进度不会丢。',
    lostTitle: '画面被系统收回了',
    lostHint: '点「恢复」把舞台找回来，进度不会丢。',
    restored: '画面回来了',
    retry: '恢复',
    leave: '返回列表',
    backAgain: '再按一次返回列表',
    saveFail: '本机存储空间不足，这次进度可能没存上。',
  });

  function readDiag() {
    if (diagCache) return diagCache;
    try {
      const parsed = JSON.parse(storage.get(DIAG_KEY, '[]'));
      diagCache = Array.isArray(parsed) ? parsed.slice(-DIAG_MAX) : [];
    } catch {
      diagCache = [];
    }
    return diagCache;
  }

  /* 环形缓冲 + 同签名合并：同一个错误反复出现也只占一条，读写都只有几十字节。 */
  function logDiag(type, detail) {
    try {
      const list = readDiag();
      const name = String(type || 'event').slice(0, 24);
      const text = String(detail || '').slice(0, 200);
      const key = `${name}|${text}`;
      const last = list[list.length - 1];
      if (last && last.k === key) {
        last.n = (last.n || 1) + 1;
        last.t = Date.now();
      } else {
        list.push({ k: key, type: name, detail: text, t: Date.now(), n: 1 });
        while (list.length > DIAG_MAX) list.shift();
      }
      storage.set(DIAG_KEY, JSON.stringify(list));
    } catch { /* 诊断永不抛错 */ }
  }

  function ensureGuardStyle() {
    if (document.getElementById(GUARD_STYLE_ID) || !document.head) return;
    const style = document.createElement('style');
    style.id = GUARD_STYLE_ID;
    style.textContent = `
.kg-layer{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;
  padding:20px;background:rgba(16,18,32,.72);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);}
.kg-card{max-width:min(420px,100%);padding:22px 20px;border-radius:18px;text-align:center;
  background:#fbf6ec;color:#241c36;box-shadow:0 12px 34px rgba(0,0,0,.35);font-size:17px;line-height:1.5;}
[data-theme="dark"] .kg-card{background:#241f33;color:#f2eeff;}
.kg-card h2{margin:0 0 6px;font-size:19px;line-height:1.4;}
.kg-card p{margin:0 0 16px;font-size:16px;opacity:.85;}
.kg-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.kg-actions button{min-height:44px;min-width:44px;padding:10px 20px;border-radius:12px;border:0;
  font-size:17px;font-weight:700;cursor:pointer;background:#7c5cff;color:#fff;}
.kg-actions button[data-act="leave"]{background:transparent;color:inherit;border:2px solid currentColor;}
.kg-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147482100;
  max-width:min(420px,90vw);padding:12px 18px;border-radius:14px;font-size:16px;line-height:1.45;
  background:#241f33;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.3);}
.kg-skeleton{position:fixed;inset:0;z-index:2147481900;display:flex;align-items:center;justify-content:center;
  font-size:17px;color:#6a6280;background:#fbf6ec;pointer-events:none;transition:opacity .25s;}
[data-theme="dark"] .kg-skeleton{background:#1a1726;color:#a79ec2;}
@media (prefers-reduced-motion:reduce){.kg-skeleton{transition:none}}
`;
    document.head.appendChild(style);
  }

  function hideGuard() {
    if (guardEl) {
      try { guardEl.remove(); } catch { /* noop */ }
    }
    guardEl = null;
    guardKind = '';
  }

  /* kind: 'error' | 'lost'。恢复层只提供「恢复 / 返回列表」，不会自动跳转。 */
  function showGuard(kind) {
    if (!document.body) {
      try { document.addEventListener('DOMContentLoaded', () => showGuard(kind), { once: true }); } catch { /* noop */ }
      return;
    }
    /* 已经展示过同一类不再重建，避免错误风暴时反复插 DOM */
    if (guardEl && guardKind === kind) return;
    hideGuard();
    try {
      ensureGuardStyle();
      const text = copy();
      const layer = document.createElement('div');
      layer.className = 'kg-layer';
      layer.setAttribute('role', 'alertdialog');
      layer.setAttribute('aria-live', 'assertive');
      const card = document.createElement('div');
      card.className = 'kg-card';
      const title = document.createElement('h2');
      const hint = document.createElement('p');
      const actions = document.createElement('div');
      actions.className = 'kg-actions';
      title.textContent = kind === 'lost' ? text.lostTitle : text.errorTitle;
      hint.textContent = kind === 'lost' ? text.lostHint : text.errorHint;
      for (const [act, label] of [['retry', text.retry], ['leave', text.leave]]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.act = act;
        button.textContent = label;
        button.addEventListener('click', () => {
          logDiag('guard', `${kind}:${act}`);
          if (act === 'retry') { try { location.reload(); } catch { /* noop */ } }
          else { try { location.href = '../../index.html'; } catch { /* noop */ } }
        });
        actions.appendChild(button);
      }
      card.append(title, hint, actions);
      layer.appendChild(card);
      document.body.appendChild(layer);
      guardEl = layer;
      guardKind = kind;
      try { actions.querySelector('button')?.focus(); } catch { /* noop */ }
    } catch { /* 恢复层失败也不能影响课件 */ }
  }

  function notice(text) {
    try {
      if (!text || !document.body) return;
      ensureGuardStyle();
      if (!noticeEl || !noticeEl.isConnected) {
        noticeEl = document.createElement('div');
        noticeEl.className = 'kg-toast';
        noticeEl.setAttribute('role', 'status');
        document.body.appendChild(noticeEl);
      }
      noticeEl.textContent = text;
      noticeEl.hidden = false;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { if (noticeEl) noticeEl.hidden = true; }, 4000);
    } catch { /* noop */ }
  }

  /* 首屏「白屏感」：只铺一层不拦点击的底色，load 后淡出，最长 6s 兜底移除。 */
  function paintSkeleton() {
    if (!document.body) {
      try { document.addEventListener('DOMContentLoaded', paintSkeleton, { once: true }); } catch { /* noop */ }
      return;
    }
    try {
      ensureGuardStyle();
      const layer = document.createElement('div');
      layer.className = 'kg-skeleton';
      layer.setAttribute('aria-hidden', 'true');
      layer.textContent = copy().preparing;
      document.body.appendChild(layer);
      /* 玩法脚本执行完（DOMContentLoaded）就交给真实画面，不等图片/音频把 load 拖住，
         否则这层遮罩会挡住已经可点的按钮。 */
      const drop = () => {
        if (!layer.isConnected) return;
        const run = () => {
          try { layer.style.opacity = '0'; setTimeout(() => layer.remove(), 300); } catch { /* noop */ }
        };
        try {
          if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(run));
          else setTimeout(run, 32);
        } catch { run(); }
      };
      if (document.readyState === 'loading') on(document, 'DOMContentLoaded', drop, { once: true });
      else drop();
      setTimeout(() => { try { layer.remove(); } catch { /* noop */ } }, 6000);
    } catch { /* noop */ }
  }

  function blankStage() {
    try {
      if (document.querySelector('canvas')) return false;
      /* 已有明确的「不支持 WebGL」提示时不要叠加恢复层，避免两条提示打架 */
      const nogl = document.getElementById('nogl');
      if (nogl && !nogl.hidden) return false;
      return true;
    } catch { return false; }
  }

  /* 只有「确实没有舞台」才升级为白屏级故障：偶发无害异常只记诊断，不吓孩子。 */
  function fatalIfBlank() {
    try {
      if (blankStage()) { showGuard('error'); return; }
      setTimeout(() => { try { if (blankStage()) showGuard('error'); } catch { /* noop */ } }, 1500);
    } catch { /* noop */ }
  }

  function watchFailures() {
    on(w, 'error', (event) => {
      const message = event?.message || event?.error?.message || '';
      if (!message) return;            // 资源加载失败没有 message，不算崩溃
      logDiag('error', message);
      fatalIfBlank();
    });
    on(w, 'unhandledrejection', (event) => {
      const reason = event?.reason;
      const message = typeof reason === 'string' ? reason : reason?.message || String(reason || '');
      logDiag('rejection', message);
      fatalIfBlank();
    });

    /* 安卓切后台/显存紧张会回收 GPU 上下文：three.js 自己会 preventDefault，
       这里只负责给孩子一个「点一下就回来」的出口，并把事件记进诊断。 */
    on(document, 'webglcontextlost', (event) => {
      try { event.preventDefault(); } catch { /* noop */ }
      logDiag('webgl-lost', String(location.pathname || '').split('/').filter(Boolean).slice(-2, -1)[0] || '');
      showGuard('lost');
    }, true);
    on(document, 'webglcontextrestored', () => {
      hideGuard();
      notice(copy().restored);
    }, true);
  }

  /* 安卓边缘返回手势会直接把孩子带回列表。第一次返回拦下来提示，1.8s 内再按放行。 */
  function watchBackGesture() {
    let blockedAt = 0;
    let releasing = false;
    const state = { kidslabGuard: 1 };
    try { history.pushState(state, '', location.href); } catch { return; }
    on(w, 'popstate', () => {
      if (releasing) return;
      const at = Date.now();
      if (at - blockedAt < 1800) {
        releasing = true;
        try { history.back(); } catch { releasing = false; }
        return;
      }
      blockedAt = at;
      try { history.pushState(state, '', location.href); } catch { /* noop */ }
      notice(copy().backAgain);
    });
  }

  function notify(kind, value) {
    const change = { kind, value };
    for (const listener of [...listeners]) listener(change);
    w.dispatchEvent(new CustomEvent(`${kind}change`, { detail: { [kind]: value } }));
  }

  const preferences = {
    get lang() {
      return lang;
    },
    get theme() {
      return theme;
    },
    setLang(value) {
      if (!validLangs.has(value)) throw new RangeError(`Unsupported language: ${value}`);
      if (value === lang) return;
      lang = value;
      storage.set('kidslab.lang', value);
      applyDocument();
      notify('lang', value);
    },
    setTheme(value) {
      if (!validThemes.has(value)) throw new RangeError(`Unsupported theme: ${value}`);
      if (value === theme) return;
      theme = value;
      storage.set('kidslab.theme', value);
      applyDocument();
      notify('theme', value);
    },
    toggleLang() {
      this.setLang(lang === 'zh' ? 'en' : 'zh');
    },
    toggleTheme() {
      this.setTheme(theme === 'light' ? 'dark' : 'light');
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Preference listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  function bindI18n(messages, options = {}) {
    if (!messages || typeof messages !== 'object') throw new TypeError('Messages must be an object');
    const root = options.root || document;
    if (!root.querySelectorAll && !root.matches) throw new TypeError('i18n root must be a Document or Element');

    function t(key, ...args) {
      const value = messages[lang]?.[key] ?? messages.zh?.[key] ?? messages.en?.[key];
      if (typeof value === 'function') return value(...args);
      return value ?? key;
    }

    function render(kind = 'lang') {
      const nodes = [];
      if (root.matches?.('[data-t]')) nodes.push(root);
      if (root.querySelectorAll) nodes.push(...root.querySelectorAll('[data-t]'));
      for (const node of nodes) {
        const value = t(node.dataset.t);
        if (typeof value === 'string') node.textContent = value;
      }
      options.onChange?.({ kind, lang, theme, t });
    }

    const unsubscribe = preferences.subscribe(({ kind }) => {
      if (kind === 'lang') render('lang');
      else options.onChange?.({ kind, lang, theme, t });
    });
    render('init');

    return {
      t,
      render,
      destroy: unsubscribe,
    };
  }

  const progressKey = courseId ? `kidslab.progress.${courseId}` : '';
  /* 写失败（配额满/隐私模式）不丢记录：先留一份在内存，等下次成功或离开前重试。 */
  let pendingProgress = null;
  let warnedSaveFail = false;

  function readProgress() {
    if (!progressKey) return null;
    if (pendingProgress) return pendingProgress;
    try {
      const value = JSON.parse(storage.get(progressKey, 'null'));
      if (!value || !['played', 'completed'].includes(value.status)) return null;
      return value;
    } catch {
      return null;
    }
  }

  function writeProgress(status, stage) {
    if (!progressKey) return null;
    /* 写入前重读并合并：多标签/多端同时玩时不会用旧快照覆盖掉「已完成」。 */
    const current = readProgress() || {};
    const stamp = Date.now();
    const completed = status === 'completed' || current.status === 'completed';
    const next = {
      version: 2,
      status: completed ? 'completed' : status,
      stage: stage || current.stage || '',
      lastStage: stage || current.lastStage || current.stage || '',
      completedAt: current.completedAt || (completed ? stamp : 0),
      /* 同一 stage 再访也刷新 updatedAt，供主站「最近探索的」排序 */
      updatedAt: stamp,
    };
    const payload = JSON.stringify(next);
    if (storage.set(progressKey, payload)) {
      pendingProgress = null;
      return next;
    }
    pendingProgress = next;
    logDiag('save-fail', progressKey);
    if (!warnedSaveFail) {
      warnedSaveFail = true;
      notice(copy().saveFail);
    }
    return next;
  }

  function flushProgress() {
    if (!progressKey || !pendingProgress) return;
    if (storage.set(progressKey, JSON.stringify(pendingProgress))) pendingProgress = null;
  }

  on(document, 'visibilitychange', () => { if (document.hidden) flushProgress(); });
  on(w, 'pagehide', flushProgress);

  const progress = {
    get: readProgress,
    clear() {
      pendingProgress = null;
      if (!progressKey) return false;
      return storage.remove(progressKey);
    },
  };

  /* 语音朗读：低年级课件用它把题面念给孩子听，也用它做语音夸奖。
     惰性初始化——只有真正调用 speak() 时才读取语音列表、挂载清理监听；
     浏览器不支持语音合成时全程静默降级，不抛错、不影响玩法。 */
  const speechKey = 'kidslab.speech';
  const canSpeak = typeof w.speechSynthesis !== 'undefined' && typeof w.SpeechSynthesisUtterance === 'function';
  let speechEnabled = storage.get(speechKey, '1') !== '0';
  let speechVoices = [];
  let speechWired = false;
  const speechListeners = new Set();

  /* 移动端首次调用 getVoices() 常常返回空数组，音色稍后才异步到达。
     这时如果直接朗读，第一句（孩子最先听到的题面或夸奖）会缺音色而无声。
     等音色就绪再念，最多等 VOICE_WAIT_MS，超时就用系统默认音色照常朗读。 */
  const VOICE_WAIT_MS = 600;
  const voiceWaiters = new Set();
  /* 每发起一次朗读就自增；等待音色期间序号若变了，说明这一句已作废。 */
  let speechTokens = 0;

  // Local narration has its own context: muting effects must not mute reading.
  let voiceContext = null;
  let playback = null;
  const decodedClips = new Map();
  const languageTag = value => String(value || lang).toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
  function invoke(callback, value) { try { callback?.(value); } catch { /* narration never owns gameplay */ } }
  function speechEvent(state, request, reason) {
    w.dispatchEvent(new CustomEvent('speechplayback', { detail: {
      state, text: request.text, lang: request.lang, backend: 'local', ...(reason ? { reason } : {}),
    } }));
  }
  function unlockSpeech() {
    wireSpeech();
    try {
      const Context = w.AudioContext || w.webkitAudioContext;
      if (!Context) return Promise.resolve(false);
      if (!voiceContext || voiceContext.state === 'closed') voiceContext = new Context();
      return Promise.resolve(voiceContext.state === 'suspended' ? voiceContext.resume() : undefined)
        .then(() => voiceContext.state === 'running', () => false);
    } catch { return Promise.resolve(false); }
  }
  function finishPlayback(request, state, reason) {
    if (request.finished) return;
    request.finished = true;
    request.controller.abort();
    clearTimeout(request.timeout); clearTimeout(request.startTimer);
    for (const source of request.sources) {
      source.onended = null;
      try { source.stop(); source.disconnect(); } catch { /* already ended */ }
    }
    if (playback === request) playback = null;
    speechEvent(state, request, reason);
    invoke(request.callbacks[state === 'ended' ? 'onEnd' : state === 'cancelled' ? 'onCancel' : 'onError'], reason);
  }
  function playSpeech(plan, callbacks = {}) {
    if (!speechEnabled || document.hidden) return null;
    stopSpeech();
    const request = { text: plan?.text || '', lang: languageTag(plan?.lang), callbacks,
      controller: new AbortController(), sources: [], finished: false, started: false };
    playback = request;
    // Create/resume synchronously inside the gesture, before fetching any audio.
    const unlocked = unlockSpeech();
    const handle = { cancel: () => finishPlayback(request, 'cancelled') };
    speechEvent('loading', request);
    request.timeout = setTimeout(() => finishPlayback(request, 'error', 'timeout'), 15000);
    (async () => {
      if (!request.text || !Array.isArray(plan.clips) || !plan.clips.length) throw new Error('invalid-plan');
      if (!await unlocked) throw new Error('audio-unavailable');
      if (request.finished) return;
      const buffers = new Array(plan.clips.length);
      let next = 0;
      const worker = async () => {
        while (next < plan.clips.length && !request.finished) {
          const index = next++, clip = plan.clips[index];
          if (!clip || !/^\.\/audio\/speech\/[a-f0-9]+\.mp3$/.test(clip.src)
            || !Number.isFinite(clip.pauseAfter) || clip.pauseAfter < 0 || clip.pauseAfter > 1) throw new Error('invalid-clip');
          let buffer = decodedClips.get(clip.src);
          if (!buffer) {
            const response = await fetch(clip.src, { signal: request.controller.signal });
            if (!response.ok) throw new Error('audio-download');
            buffer = await voiceContext.decodeAudioData(await response.arrayBuffer());
            if (!buffer.duration || !Number.isFinite(buffer.duration)) throw new Error('audio-decode');
            if (request.finished) return;
            decodedClips.set(clip.src, buffer);
            if (decodedClips.size > 48) decodedClips.delete(decodedClips.keys().next().value);
          }
          buffers[index] = buffer;
        }
      };
      await Promise.all([worker(), worker()]);
      if (request.finished) return;
      if (!speechEnabled || document.hidden || voiceContext.state !== 'running') throw new Error('audio-suspended');
      clearTimeout(request.timeout);
      let at = voiceContext.currentTime + .03;
      buffers.forEach((buffer, index) => {
        const source = voiceContext.createBufferSource();
        source.buffer = buffer; source.connect(voiceContext.destination);
        request.sources.push(source);
        if (index === buffers.length - 1) source.onended = () => finishPlayback(request, 'ended');
        source.start(at); at += buffer.duration + plan.clips[index].pauseAfter;
      });
      request.startTimer = setTimeout(() => {
        if (request.finished) return;
        if (voiceContext.state !== 'running') { finishPlayback(request, 'error', 'audio-suspended'); return; }
        request.started = true; speechEvent('started', request); invoke(callbacks.onStart);
      }, 35);
      request.timeout = setTimeout(() => finishPlayback(request, 'error', 'timeout'), (at - voiceContext.currentTime) * 1000 + 3000);
    })().catch(error => { if (!request.finished) finishPlayback(request, 'error', error.message || 'audio-error'); });
    return handle;
  }

  function releaseVoiceWaiters() {
    for (const waiter of [...voiceWaiters]) waiter();
    voiceWaiters.clear();
  }

  function refreshVoices() {
    if (!canSpeak) return;
    try {
      speechVoices = w.speechSynthesis.getVoices() || [];
    } catch {
      speechVoices = [];
    }
    if (speechVoices.length) releaseVoiceWaiters();
  }

  function awaitVoices() {
    if (speechVoices.length) return Promise.resolve(true);
    refreshVoices();
    if (speechVoices.length) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      let timer = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        voiceWaiters.delete(finish);
        if (timer !== null) clearTimeout(timer);
        refreshVoices();
        resolve(speechVoices.length > 0);
      };
      voiceWaiters.add(finish);
      timer = setTimeout(finish, VOICE_WAIT_MS);
    });
  }

  function stopSpeech() {
    speechTokens += 1;
    if (playback) finishPlayback(playback, 'cancelled');
    if (!canSpeak) return true;
    try {
      w.speechSynthesis.cancel();
      return true;
    } catch {
      return false;
    }
  }

  function wireSpeech() {
    if (speechWired) return;
    speechWired = true;
    refreshVoices();
    try {
      w.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    } catch {
      try { w.speechSynthesis.onvoiceschanged = refreshVoices; } catch { /* 无语音列表可用时静默降级 */ }
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpeech(); });
    w.addEventListener('pagehide', () => { stopSpeech(); });
  }

  function voiceFor(tag) {
    if (!speechVoices.length) refreshVoices();
    if (!speechVoices.length) return null;
    const wanted = tag.toLowerCase();
    const family = wanted.slice(0, 2);
    const language = (voice) => String(voice && voice.lang ? voice.lang : '').toLowerCase().replace('_', '-');
    return speechVoices.find((voice) => language(voice) === wanted)
      || speechVoices.find((voice) => language(voice).startsWith(family))
      || null;
  }

  /* 调用方会立刻拿到 utterance 并挂 onend/onerror，所以这里先构造、再择机 speak()。
     返回同一个对象也就意味着：如果孩子在等音色的这几百毫秒里又点了别处，
     中断逻辑照样能认得出它。 */
  function speakSpeech(text, options = {}) {
    if (!canSpeak || !speechEnabled) return null;
    const value = typeof text === 'string' ? text.trim() : '';
    if (!value) return null;
    wireSpeech();
    const tag = languageTag(options.lang);
    try {
      if (options.interrupt !== false && (w.speechSynthesis.speaking || w.speechSynthesis.pending)) stopSpeech();
      const utterance = new w.SpeechSynthesisUtterance(value);
      utterance.lang = tag;
      const voice = voiceFor(tag);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.92;
      utterance.pitch = 1;
      /* 缺中文音色、被打断或设备不支持时按静默处理，不产生控制台噪音。 */
      utterance.onerror = event => invoke(options.onError, event?.error || 'synthesis-error');
      utterance.onstart = () => invoke(options.onStart);
      if (typeof options.onEnd === 'function') utterance.onend = () => options.onEnd();

      const utter = () => {
        /* 等待音色期间语音被关掉、或已被更新的一句取代时，这一句就不再出声。 */
        if (!speechEnabled || token !== speechTokens) return;
        const ready = voiceFor(tag);
        if (ready) utterance.voice = ready;
        try { w.speechSynthesis.speak(utterance); } catch { invoke(options.onError, 'synthesis-error'); }
      };
      /* 认领本次朗读的序号：之后任何新朗读或 stop() 都会让它失效。 */
      const token = ++speechTokens;
      if (speechVoices.length) utter();
      else Promise.resolve(awaitVoices()).then(utter);
      return utterance;
    } catch {
      return null;
    }
  }

  const speech = {
    get available() {
      return canSpeak || Boolean(w.AudioContext || w.webkitAudioContext);
    },
    get enabled() {
      return speechEnabled;
    },
    setEnabled(value) {
      const next = Boolean(value);
      if (next === speechEnabled) return speechEnabled;
      speechEnabled = next;
      storage.set(speechKey, next ? '1' : '0');
      if (!next) stopSpeech();
      for (const listener of [...speechListeners]) listener({ enabled: speechEnabled });
      w.dispatchEvent(new CustomEvent('speechenabledchange', { detail: { enabled: speechEnabled } }));
      return speechEnabled;
    },
    toggle() {
      return speech.setEnabled(!speechEnabled);
    },
    speak: speakSpeech,
    play: playSpeech,
    unlock: unlockSpeech,
    stop: stopSpeech,
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Speech listener must be a function');
      speechListeners.add(listener);
      return () => speechListeners.delete(listener);
    },
  };

  preferences.subscribe(({ kind }) => { if (kind === 'lang') stopSpeech(); });
  cool.sdkVersion = 5;
  cool.courseId = courseId;
  cool.storage = storage;
  cool.preferences = preferences;
  cool.bindI18n = bindI18n;
  cool.progress = progress;
  cool.speech = speech;
  cool.diag = {
    read: () => readDiag().map(({ type, detail, t, n }) => ({ type, detail, at: t, count: n || 1 })),
    clear() {
      diagCache = [];
      storage.remove(DIAG_KEY);
    },
    log: logDiag,
    /* 供课件在自定义兜底里复用同一套恢复层 */
    show: showGuard,
  };
  if (typeof cool.track !== 'function') cool.track = () => {};
  cool.stage = (name) => {
    if (typeof name !== 'string' || !name) return;
    writeProgress('played', name.slice(0, 48));
  };
  cool.complete = () => writeProgress('completed');
  w.cool = cool;
  applyDocument();

  /* 韧性层最后挂载：此时 cool 已就绪，任何异常都能被记录并给出恢复入口。 */
  try { watchFailures(); } catch { /* noop */ }
  try { paintSkeleton(); } catch { /* noop */ }
  try { watchBackGesture(); } catch { /* noop */ }
})();
