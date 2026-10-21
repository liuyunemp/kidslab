import { createAudio } from './audio.js';
import { createEnglishStage } from './scene.js';
import { createNarration } from './narration.js';
import {
  currentWord, initialState, progress, reduce, restore, serialize,
} from './english-model.js';

const GOALS = { color: 3, fruit: 3, animal: 3, number: 10, body: 3, school: 3 };
const PROGRESS_KEY = { color: 'painted', number: 'count', body: 'observed' };
const TRACK = {
  select: 'pick-word', paint: 'paint-toy', place: 'place-word', add: 'load-block',
  body: 'move-body', present: 'show', undo: 'undo', remove: 'take-out',
};

export function startEnglish(course, UI, manifest) {
  const $ = (id) => document.getElementById(id);
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const lang = () => ((document.documentElement.lang || 'zh').startsWith('zh') ? 'zh' : 'en');
  const goal = GOALS[course.kind] ?? 3;
  const saveKey = `kidslab.english.${course.id}.state`;

  const I18N = {
    zh: {
      ...UI.zh,
      title: course.title.zh,
      invitation: course.invitation.zh,
      action: course.action.zh,
      finish: course.finish.zh,
      hint: course.hint.zh,
      wordList: '单词',
      footTip: course.kind === 'body' ? '点一点小朋友的身体，看它会动' : '点一点 3D 里的东西，再听它怎么说',
      target: '涂色位置',
    },
    en: {
      ...UI.en,
      title: course.title.en,
      invitation: course.invitation.en,
      action: course.action.en,
      finish: course.finish.en,
      hint: course.hint.en,
      wordList: 'Words',
      footTip: course.kind === 'body' ? 'Tap a part of your friend and watch it move' : 'Tap something in the room and hear it',
      target: 'Painted spot',
    },
  };

  let t = (key) => I18N.zh[key] ?? key;
  let state = loadState();
  let unlocked = false;
  let stage = null;
  let coachTimer = 0;

  const audio = createAudio(course.id);
  const narration = createNarration({
    manifest,
    lang,
    show: (text) => flash(text),
    duck: () => audio.duck(),
    restore: () => audio.restore(),
  });

  /* ------------------------------------------------------------ persistence */

  function loadState() {
    try {
      const raw = localStorage.getItem(saveKey);
      if (!raw) return initialState(course);
      return restore(course, raw);
    } catch {
      return initialState(course);
    }
  }

  function save() {
    try { localStorage.setItem(saveKey, JSON.stringify(serialize(state))); } catch { /* private mode */ }
  }

  /* ------------------------------------------------------------ chrome */

  function flash(text, busy = false) {
    const coach = $('coach');
    coach.textContent = text;
    clearTimeout(coachTimer);
    if (!busy) coachTimer = setTimeout(() => { coach.textContent = t('invitation'); }, 4200);
  }

  function note(text) {
    const node = $('statusNote');
    if (!text) { node.hidden = true; return; }
    node.hidden = false;
    node.textContent = text;
  }

  function renderWords() {
    const list = $('wordList');
    list.textContent = '';
    for (const item of course.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'word';
      button.dataset.id = item.id;
      if (item.color) {
        const swatch = document.createElement('span');
        swatch.className = 'word__swatch';
        swatch.style.background = item.color;
        button.append(swatch);
      } else {
        const icon = document.createElement('span');
        icon.className = 'word__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = item.icon;
        button.append(icon);
      }
      const text = document.createElement('span');
      text.className = 'word__text';
      const en = document.createElement('b');
      en.textContent = item.en;
      text.append(en);
      if (lang() === 'zh') {
        const zh = document.createElement('small');
        zh.textContent = item.zh;
        text.append(zh);
      }
      button.append(text);
      button.addEventListener('click', () => {
        unlockAll();
        choose(item.id);
      });
      list.append(button);
    }
  }

  function refresh() {
    const word = currentWord(course, state);
    const shown = Math.min(progress(course, state), goal);
    $('progressVal').textContent = `${shown}/${goal}`;
    $('progressLabel').textContent = `${shown}/${goal}`;
    $('wordVal').textContent = word.en;
    $('wordZh').textContent = lang() === 'zh' ? word.zh : '';
    $('hudLabel').textContent = t(PROGRESS_KEY[course.kind] ?? 'progress');
    $('actionBtn').textContent = `${course.kind === 'color' ? '🎨' : course.kind === 'number' ? '🧱' : course.kind === 'body' ? '🙋' : '➕'} ${course.action[lang()] ?? t('action')}`;
    $('presentBtn').textContent = `✨ ${course.finish[lang()] ?? t('finish')}`;
    $('removeBtn').hidden = course.kind === 'color' || course.kind === 'body';
    for (const button of $('wordList').querySelectorAll('.word')) {
      const active = button.dataset.id === state.selected;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      const entry = course.items.find((item) => item.id === button.dataset.id);
      if (entry && lang() === 'zh') {
        const small = button.querySelector('small');
        if (small) small.textContent = entry.zh;
      }
    }
    $('wordList').setAttribute('aria-label', t('wordList'));
    stage?.update(state);
  }

  function renderChrome() {
    document.title = `${course.icon} ${course.title[lang()]} · KidsLab`;
    $('langBtn').textContent = lang() === 'zh' ? 'EN' : '中';
    for (const id of ['themeBtn', 'themeBtnPanel']) {
      const button = $(id);
      if (!button) continue;
      const moon = document.documentElement.dataset.theme === 'light';
      button.textContent = id === 'themeBtn' ? (moon ? '🌙' : '☀️') : `${moon ? '🌙' : '☀️'} ${t('theme')}`;
      button.setAttribute('aria-label', t('theme'));
    }
    $('musicBtn').textContent = audio.musicOn ? '♫' : '♪';
    $('musicBtn').setAttribute('aria-pressed', String(audio.musicOn));
    $('musicBtn').setAttribute('aria-label', t('music'));
    $('musicBtnPanel').setAttribute('aria-pressed', String(audio.musicOn));
    $('musicBtnPanel').setAttribute('aria-label', t('music'));
    $('musicBtnPanel').style.opacity = audio.musicOn ? '' : '0.6';
    $('soundBtn').textContent = audio.sfxOn ? '🔊' : '🔇';
    $('soundBtn').setAttribute('aria-pressed', String(audio.sfxOn));
    $('soundBtn').setAttribute('aria-label', t(audio.sfxOn ? 'mute' : 'unmute'));
    const speechOn = window.cool?.speech?.enabled !== false;
    $('speechBtn').setAttribute('aria-pressed', String(speechOn));
    $('speechBtn').setAttribute('aria-label', t('speech'));
    $('speechBtn').style.opacity = speechOn ? '' : '0.55';
    $('hintText').textContent = course.hint[lang()];
  }

  /* ------------------------------------------------------------ actions */

  function unlockAll() {
    if (unlocked) return;
    unlocked = true;
    audio.unlock().catch(() => {});
    window.cool?.stage?.('level2');
  }

  function reject(reason) {
    const key = I18N.zh[reason] ? reason : 'invalid';
    if (key === 'hint') {
      const text = course.hint[lang()];
      flash(text);
      audio.error();
      narration.say(text);
      return;
    }
    const text = t(key);
    flash(text);
    note(text);
    audio.error();
    narration.say(text);
    window.cool?.track?.('blocked', { reason: key });
  }

  function speakWord(id) {
    const word = course.items.find((item) => item.id === id);
    if (word) narration.say(word.en, { lang: 'en' });
  }

  function apply(action) {
    const result = reduce(course, state, action);
    if (!result.changed) {
      reject(result.error ?? 'invalid');
      return result;
    }
    // Commit before any animation so a double tap cannot count twice.
    state = result.state;
    save();
    if (result.actedWord) speakWord(result.actedWord);
    if (action.type === 'paint') audio.paint();
    else if (action.type === 'place' || action.type === 'add') audio.place();
    else if (action.type === 'undo') audio.pick();
    else audio.pick();
    note('');
    if (TRACK[action.type]) window.cool?.track?.(TRACK[action.type], { word: result.actedWord ?? null });
    if (action.type === 'present') {
      stage?.present();
      audio.present();
      if (result.completedNow) {
        window.cool?.complete?.();
        narration.success(true);
        flash(t('done'), true);
        window.cool?.track?.('finish-show');
      } else {
        narration.success(false);
        flash(t('done'), true);
      }
    } else if (result.actedWord && action.type !== 'body') {
      const word = course.items.find((item) => item.id === result.actedWord);
      if (word) flash(lang() === 'zh' ? `${word.en} · ${word.zh}` : word.en, true);
    }
    refresh();
    return result;
  }

  function choose(id) {
    if (course.kind === 'color') {
      apply({ type: 'paint', index: state.target, id });
      return;
    }
    if (course.kind === 'body') {
      const result = apply({ type: 'body', id });
      if (result.changed) stage?.playPart(id);
      return;
    }
    apply({ type: 'select', id });
  }

  /* ------------------------------------------------------------ wiring */

  const stageApi = createEnglishStage({
    canvas: $('scene'),
    cssVar,
    onFirstInteract: unlockAll,
    onSelect: (id) => {
      unlockAll();
      choose(id);
    },
    onTarget: (index) => {
      unlockAll();
      apply({ type: 'target', index });
      const slot = course.targets?.[index];
      if (slot) flash(lang() === 'zh' ? `给${slot.zh}涂色` : `Paint the ${slot.en.toLowerCase()}`, true);
    },
    onDrop: (id) => {
      unlockAll();
      apply(course.kind === 'color' ? { type: 'paint', index: state.target, id } : { type: 'place', id });
    },
    onZone: () => {
      unlockAll();
      if (course.kind === 'number') speakWord(currentWord(course, state).id);
      else if (course.kind === 'color') apply({ type: 'paint', index: state.target, id: state.selected });
      else apply({ type: 'place', id: state.selected });
    },
    onAdd: () => {
      unlockAll();
      apply({ type: 'add' });
    },
    onNotice: (reason) => {
      unlockAll();
      reject(reason);
    },
  });

  if (!stageApi) {
    $('nogl').hidden = false;
    $('scene').hidden = true;
  } else {
    stage = stageApi;
    stage.mount(course);
    stage.onCue((id, index) => {
      audio.countNote(index);
      speakWord(id);
    });
  }

  $('actionBtn').addEventListener('click', () => {
    unlockAll();
    if (course.kind === 'color') apply({ type: 'paint', index: state.target, id: state.selected });
    else if (course.kind === 'number') apply({ type: 'add' });
    else     if (course.kind === 'body') {
      // Keep tapping useful: the button always moves to a part the child has not tried yet.
      const next = course.items.find((item) => !state.visited.includes(item.id)) ?? currentWord(course, state);
      const result = apply({ type: 'body', id: next.id });
      if (result.changed) stage?.playPart(next.id);
    } else apply({ type: 'place', id: state.selected });
  });

  $('removeBtn').addEventListener('click', () => {
    unlockAll();
    apply({ type: 'remove' });
  });

  $('undoBtn').addEventListener('click', () => {
    unlockAll();
    apply({ type: 'undo' });
  });

  $('resetBtn').addEventListener('click', () => {
    unlockAll();
    narration.reset();
    const result = apply({ type: 'reset' });
    if (result.changed) {
      flash(t('ready'), true);
      note('');
      window.cool?.track?.('restart');
    }
  });

  $('presentBtn').addEventListener('click', () => {
    unlockAll();
    apply({ type: 'present' });
  });

  $('sentenceBtn').addEventListener('click', () => {
    unlockAll();
    const word = currentWord(course, state);
    narration.say(word.sentence, { lang: 'en' });
    flash(word.sentence, true);
    window.cool?.track?.('hear-sentence', { word: word.id });
  });

  $('hintBtn').addEventListener('click', () => {
    unlockAll();
    const body = $('hintBody');
    body.hidden = !body.hidden;
    $('hintArrow').textContent = body.hidden ? '▸' : '▾';
    // Always read the instructions aloud: this is the one "read it to me" control, so a
    // second tap must replay instead of only closing the text.
    narration.say(course.hint[lang()]);
  });

  for (const id of ['musicBtn', 'musicBtnPanel']) {
    $(id).addEventListener('click', () => {
      unlockAll();
      audio.setMusic(!audio.musicOn);
      renderChrome();
    });
  }
  $('soundBtn').addEventListener('click', () => {
    unlockAll();
    const on = !audio.sfxOn;
    // One visible switch silences everything; music keeps its own finer control.
    audio.setSfx(on);
    audio.setMusic(on);
    renderChrome();
  });
  $('speechBtn').addEventListener('click', () => {
    unlockAll();
    const speech = window.cool?.speech;
    if (!speech) return;
    speech.toggle();
    window.cool?.track?.('toggle-voice', { on: speech.enabled });
    renderChrome();
  });
  $('langBtn').addEventListener('click', () => window.cool?.preferences?.toggleLang());
  for (const id of ['themeBtn', 'themeBtnPanel']) {
    $(id).addEventListener('click', () => window.cool?.preferences?.toggleTheme());
  }

  let panelOpen = matchMedia('(min-width: 861px)').matches;
  function applyPanel() {
    $('panel').classList.toggle('is-collapsed', !panelOpen);
    $('panelBody').hidden = !panelOpen;
    $('panelArrow').textContent = panelOpen ? '▾' : '▸';
    $('panelHandle').setAttribute('aria-expanded', String(panelOpen));
  }
  $('panelHandle').addEventListener('click', () => {
    unlockAll();
    panelOpen = !panelOpen;
    applyPanel();
    stage?.refreshView?.();
  });
  applyPanel();
  stage?.refreshView?.();

  addEventListener('themechange', () => stage?.applyTheme());
  addEventListener('langchange', () => {
    renderWords();
    renderChrome();
    refresh();
  });

  window.cool?.bindI18n(I18N, {
    onChange({ t: translate }) {
      t = translate;
      renderWords();
      renderChrome();
      refresh();
    },
  });

  renderWords();
  renderChrome();
  refresh();
  if (state.completed) note(t('done'));
  return { apply, get state() { return state; } };
}
