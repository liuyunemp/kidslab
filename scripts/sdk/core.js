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

  function refreshVoices() {
    if (!canSpeak) return;
    try {
      speechVoices = w.speechSynthesis.getVoices() || [];
    } catch {
      speechVoices = [];
    }
  }

  function stopSpeech() {
    if (!canSpeak) return false;
    try {
      w.speechSynthesis.cancel();
      return true;
    } catch {
      return false;
    }
  }

  function wireSpeech() {
    if (speechWired || !canSpeak) return;
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

  function speakSpeech(text, options = {}) {
    if (!canSpeak || !speechEnabled) return null;
    const value = typeof text === 'string' ? text.trim() : '';
    if (!value) return null;
    wireSpeech();
    const tag = (options.lang || lang) === 'en' ? 'en-US' : 'zh-CN';
    try {
      if (options.interrupt !== false && (w.speechSynthesis.speaking || w.speechSynthesis.pending)) stopSpeech();
      const utterance = new w.SpeechSynthesisUtterance(value);
      utterance.lang = tag;
      const voice = voiceFor(tag);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.92;
      utterance.pitch = 1;
      /* 缺中文音色、被打断或设备不支持时按静默处理，不产生控制台噪音。 */
      utterance.onerror = () => {};
      if (typeof options.onEnd === 'function') utterance.onend = () => options.onEnd();
      w.speechSynthesis.speak(utterance);
      return utterance;
    } catch {
      return null;
    }
  }

  const speech = {
    get available() {
      return canSpeak;
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
    stop: stopSpeech,
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Speech listener must be a function');
      speechListeners.add(listener);
      return () => speechListeners.delete(listener);
    },
  };

  cool.sdkVersion = 3;
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
