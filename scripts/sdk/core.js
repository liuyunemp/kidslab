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
  function readProgress() {
    if (!progressKey) return null;
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
    const current = readProgress() || {};
    const next = {
      status: current.status === 'completed' ? 'completed' : status,
      stage: stage || current.stage || '',
      updatedAt: Date.now(),
    };
    /* 同一 stage 再访也刷新 updatedAt，供主站「最近探索的」排序 */
    storage.set(progressKey, JSON.stringify(next));
    return next;
  }

  const progress = {
    get: readProgress,
    clear() {
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
  cool.sdkVersion = 4;
  cool.courseId = courseId;
  cool.storage = storage;
  cool.preferences = preferences;
  cool.bindI18n = bindI18n;
  cool.progress = progress;
  cool.speech = speech;
  if (typeof cool.track !== 'function') cool.track = () => {};
  cool.stage = (name) => {
    if (typeof name !== 'string' || !name) return;
    writeProgress('played', name.slice(0, 48));
  };
  cool.complete = () => writeProgress('completed');
  w.cool = cool;
  applyDocument();
})();
