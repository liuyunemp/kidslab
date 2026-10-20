// Shared authoring source. Each course receives an identical standalone copy.
export const locale = value => String(value || 'zh').toLowerCase().startsWith('en') ? 'en' : 'zh';
export const normalizeSpeech = text => String(text ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const separators = /^[\s，。！？、,.!?;；:：]+/u;

// Longest reviewed phrase wins; no arbitrary characters or hidden answer fields.
export function speechPlan(text, lang, manifest) {
  const language = locale(lang), value = normalizeSpeech(text);
  const entries = manifest?.entries?.[language] ?? {};
  const phrases = Object.keys(entries).sort((a, b) => b.length - a.length);
  const clips = [];
  let rest = value;
  while (rest) {
    const punctuation = rest.match(separators)?.[0];
    if (punctuation) {
      if (clips.length && /[，。！？、,.!?;；]/u.test(punctuation)) clips.at(-1).pauseAfter = .18;
      rest = rest.slice(punctuation.length); continue;
    }
    const phrase = phrases.find(p => rest.startsWith(p));
    if (!phrase) throw new RangeError(`Unrecorded speech (${language}): ${rest}`);
    const entry = entries[phrase];
    clips.push({ src: entry.path, text: phrase, pauseAfter: .05 });
    rest = rest.slice(phrase.length);
  }
  if (!clips.length) throw new RangeError('Empty speech');
  clips.at(-1).pauseAfter = 0;
  return { text: value, lang: language, clips };
}

export const MESSAGES = {
  success: {
    zh: ['这一关完成啦，真棒！', '你做到了，继续探索吧！', '认真尝试的你，真了不起！'],
    en: ['You finished this activity. Well done!', 'You did it. Keep exploring!', 'Your practice paid off. Great work!'],
  },
  complete: {
    zh: ['全部完成啦，你真棒！', '所有探索都完成了，真了不起！', '你坚持完成了全部挑战！'],
    en: ['You finished them all. Wonderful!', 'All activities completed. Great work!', 'You kept going and finished every challenge!'],
  },
  encourage: {
    zh: ['没关系，慢慢来，再试一次。', '加油，看看线索再试试。', '别着急，换个办法试试看。'],
    en: ['No rush. Have another try.', 'Keep going. Look for a clue.', 'Take your time. Try another way.'],
  },
};
export function feedbackText(kind, index = 0, lang = 'zh') {
  const lines = MESSAGES[kind]?.[locale(lang)];
  return lines ? lines[Math.abs(Math.trunc(Number(index) || 0)) % lines.length] : '';
}
export function shouldEncourage(previous, step, now) {
  return !previous || previous.step !== step || now - previous.at >= 5000;
}
