import { speechPlan, feedbackText, shouldEncourage } from './speech-model.js';

export function createNarration({ manifest, lang = () => window.cool.preferences.lang, muted = () => false,
  show = () => {}, duck = () => {}, restore = () => {} } = {}) {
  const speech = window.cool.speech;
  let previous = null, praise = 0, misses = 0;
  function fail() { show(lang() === 'en' ? 'Could not play. Tap to try again.' : '暂时没能播放，点一下再试。'); }
  function say(text, callbacks = {}) {
    if (muted() || !speech.enabled) return null;
    try {
      return speech.play(speechPlan(text, lang(), manifest), {
        onStart() { duck(); callbacks.onStart?.(); },
        onEnd() { restore(); callbacks.onEnd?.(); },
        onCancel() { restore(); callbacks.onCancel?.(); },
        onError(error) { restore(); fail(); callbacks.onError?.(error); },
      });
    } catch { fail(); return null; }
  }
  const unlock = () => speech.unlock();
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  // Also catches legacy courses whose language buttons dispatch DOM events.
  window.addEventListener('langchange', () => speech.stop());
  return {
    say,
    success(complete = false) {
      previous = null;
      const message = feedbackText(complete ? 'complete' : 'success', praise++, lang());
      show(message, true); return say(message);
    },
    encourage(step, hint = '') {
      const now = Date.now();
      if (!shouldEncourage(previous, step, now)) return null;
      previous = { step, at: now };
      const message = [hint, feedbackText('encourage', misses++, lang())].filter(Boolean).join(' ');
      show(message, false); return say(message);
    },
    reset() { previous = null; speech.stop(); restore(); },
  };
}

// Used only by the three older courses that did not have a narration switch.
export function narrationControls(parent, lang) {
  const speech = window.cool.speech;
  const panel = document.createElement('details');
  panel.className = 'narration-settings';
  const summary = document.createElement('summary');
  const button = document.createElement('button');
  button.type = 'button'; button.dataset.narrationToggle = '';
  panel.append(summary, button); parent.append(panel);
  const update = () => {
    summary.textContent = lang() === 'en' ? 'Voice' : '朗读';
    const label = lang() === 'en' ? (speech.enabled ? 'Turn voice off' : 'Turn voice on') : (speech.enabled ? '关闭朗读' : '打开朗读');
    button.textContent = label; button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(speech.enabled));
  };
  button.addEventListener('click', () => { speech.toggle(); update(); });
  speech.subscribe(update); window.addEventListener('langchange', update); update();
  return update;
}
