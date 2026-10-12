import { initGame } from './engine.js';
import { levels } from './levels.js';

const messages = {
  zh: {
    back: '返回',
    theme: '主题',
    lang: 'EN',
    stars: '星星',
    coins: '金币',
    stickers: '贴纸',
    nav: '关卡星图',
    foot: '点一点，闯一关，集星星！',
    go: '开始吧！',
    correct: '答对啦！🌟',
    wrong: '再试试看～',
    locked: '先通关前面的关卡吧',
    doneTitle: '太棒了！',
    doneText: '你闯过了所有关卡，集满了小星星！',
    moneyQ: '这些钱一共是多少？',
    tangramQ: '缺了哪一块？',
    opt: { gt: '大于', lt: '小于', eq: '等于', more: '多', less: '少', equal: '同样多', left: '左边重', right: '右边重' },
    chapters: {
      count: '数一数', compareNum: '比大小', compareGroup: '比多少', calc: '加减法',
      clock: '认时钟', pattern: '找规律', weight: '比轻重', direction: '认方向',
      money: '认钱币', shape: '认图形', tangram: '七巧板',
    },
  },
  en: {
    back: 'Back',
    theme: 'Theme',
    lang: '中',
    stars: 'Stars',
    coins: 'Coins',
    stickers: 'Stickers',
    nav: 'Star Map',
    foot: 'Tap, play, collect stars!',
    go: 'Let’s go!',
    correct: 'Correct! 🌟',
    wrong: 'Try again~',
    locked: 'Finish earlier levels first',
    doneTitle: 'Awesome!',
    doneText: 'You cleared every level and filled the sky with stars!',
    moneyQ: 'How much is this in total?',
    tangramQ: 'Which piece is missing?',
    opt: { gt: '>', lt: '<', eq: '=', more: 'more', less: 'fewer', equal: 'same', left: 'left', right: 'right' },
    chapters: {
      count: 'Count', compareNum: 'Compare', compareGroup: 'More/Less', calc: 'Add & Subtract',
      clock: 'Clock', pattern: 'Patterns', weight: 'Weight', direction: 'Directions',
      money: 'Coins', shape: 'Shapes', tangram: 'Tangram',
    },
  },
};

initGame({ levels, messages });
