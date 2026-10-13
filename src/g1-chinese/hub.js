const common = {
  zh: { back: '← 返回 KidsLab', theme: '切换主题', language: '切换语言' },
  en: { back: '← Back to KidsLab', theme: 'Switch theme', language: 'Switch language' },
};
const subjects = {
  math: {
    zh: {
      title: '🧮 一年级数学游戏地图', intro: '挑一个喜欢的游戏，玩完八个任务再换下一站！',
      fireflies: '✨ 数字萤火虫', metro: '🚇 百数地铁', clock: '🕰️ 时钟小镇', compare: '🐊 比大小桥',
      add: '🚂 加法车站', subtract: '🚋 减法车站', mixed: '🏃 加减接力', weight: '⚖️ 轻重天平',
      direction: '🧭 方位小镇', money: '🪙 找零售货机', pattern: '🐛 规律毛毛虫',
      tangram: '🎭 七巧板皮影戏', shadow: '🔦 立体影子剧场', shapes: '🔷 图形拼搭',
    },
    en: {
      title: '🧮 Grade 1 Math Games', intro: 'Pick a game and finish eight tasks before moving on!',
      fireflies: '✨ Number Fireflies', metro: '🚇 Hundred-Chart Metro', clock: '🕰️ Clock Town', compare: '🐊 Number Bridge',
      add: '🚂 Addition Depot', subtract: '🚋 Subtraction Depot', mixed: '🏃 Add-Subtract Relay', weight: '⚖️ Balance Playground',
      direction: '🧭 Direction Town', money: '🪙 Change Machine', pattern: '🐛 Pattern Caterpillar',
      tangram: '🎭 Tangram Shadow Play', shadow: '🔦 Shadow Shape Theater', shapes: '🔷 Shape Workshop',
    },
  },
  chinese: {
    zh: {
      title: '📚 一年级语文游戏地图', intro: '先选一个喜欢的主题，每个游戏都要完成八个小任务。',
      character: '🌱 汉字寻宝', pinyin: '🚃 拼音轨道', stroke: '🖌️ 笔画工坊',
      word: '📮 词语邮局', rhyme: '🥁 对韵小剧场', sentence: '🚄 句子列车',
    },
    en: {
      title: '📚 Grade 1 Chinese Games', intro: 'Pick a topic and finish eight little tasks in each game.',
      character: '🌱 Character Garden', pinyin: '🚃 Pinyin Tracks', stroke: '🖌️ Stroke Workshop',
      word: '📮 Word Post Office', rhyme: '🥁 Rhyme Stage', sentence: '🚄 Sentence Train',
    },
  },
};
const subject = subjects[document.body.dataset.subject];
const messages = Object.fromEntries(['zh', 'en'].map((lang) => [lang, { ...common[lang], ...subject[lang] }]));
const cool = window.cool;
const themeBtn = document.querySelector('#themeBtn');
const langBtn = document.querySelector('#langBtn');
cool.bindI18n(messages, {
  onChange({ lang, theme }) {
    document.title = `${messages[lang].title} · KidsLab`;
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeBtn.setAttribute('aria-label', messages[lang].theme);
    langBtn.textContent = lang === 'zh' ? 'EN' : '中';
    langBtn.setAttribute('aria-label', messages[lang].language);
  },
});
themeBtn.addEventListener('click', () => cool.preferences.toggleTheme());
langBtn.addEventListener('click', () => cool.preferences.toggleLang());
