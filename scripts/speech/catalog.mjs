import { readFile } from 'node:fs/promises';
import { courses } from '../g1-games/data.mjs';
import { speakText, praiseText, encourageText } from '../g1-games/model.js';
import { ids as explorationIds } from '../g1b-sync.mjs';
import { MESSAGES, normalizeSpeech } from './model.js';

export const legacyIds = courses.map(c => c.id);
export const extraIds = ['number-fireflies', 'shadow-theater', 'pattern-caterpillar'];
export const ids = [...legacyIds, ...explorationIds, ...extraIds];
export { explorationIds };
// Only visible retry guidance; never harvest arbitrary lesson/result fields.
export const retryKeys = ['invalid','range','nothing','trace','place','index','pieces','play','drop','money','align','unbundle','same'];
export async function catalog() {
  const engine = await readFile(new URL('../g1-games/engine.js', import.meta.url), 'utf8');
  const WORDS = Function(`"use strict";return (${engine.match(/export const WORDS = (\{[\s\S]*?\n\});/)[1]});`)();
  const result = new Map(ids.map(id => [id, { zh: new Set(), en: new Set() }]));
  const add = (id, lang, text) => { const value = normalizeSpeech(text); if (value) result.get(id)[lang].add(value); };
  for (const id of ids) for (const lang of ['zh', 'en']) {
    for (const table of Object.values(MESSAGES)) for (const line of table[lang]) add(id, lang, line);
  }
  for (const course of courses) for (const lang of ['zh', 'en']) {
    add(course.id, lang, course.description[lang]);
    if (course.kind === 'stroke') for (const key of ['traceOff','traceWobbly','traceMiss']) add(course.id, lang, WORDS[lang][key]);
    for (const task of course.tasks) {
      add(course.id, lang, speakText({ kind: course.kind, task, words: WORDS[lang], lang }));
      for (const hint of Object.values(task.hints ?? {})) add(course.id, lang, hint[lang]);
    }
    for (let i = 0; i < 9; i++) {
      add(course.id, lang, praiseText('clear', i, lang));
      add(course.id, lang, praiseText('streak3', i, lang));
      add(course.id, lang, encourageText(i, lang));
    }
  }
  // The existing exploration speech consists solely of title + invitation.
  const main = await readFile(new URL('../../src/g1b-character-lab/main.js', import.meta.url), 'utf8');
  const literals = main.match(/const I18N=(\{[\s\S]*?\});\s*\n/)[1];
  const dictionary = Function(`"use strict";return (${literals});`)();
  for (const id of explorationIds) {
    const { course } = await import(`../../src/${id}/content.js`);
    for (const lang of ['zh','en']) {
      for (const a of course.activities) add(id, lang, `${a.title[lang]}。${a.invite[lang]}`);
      for (const key of retryKeys) add(id, lang, dictionary[lang][key]);
    }
  }
  const fragments = {
    'number-fireflies': {
      zh: ['原来有', '要留下', '圈出多余的萤火虫。', '圈住萤火虫，让数字合起来是', '看看灯笼上的数字，再试一次。'],
      en: ['Start with', 'leave', 'Circle the extra fireflies.', 'Circle fireflies that add up to', 'Look at the lantern number and try again.'],
    },
    'shadow-theater': {
      zh: ['看看两张影子，选择积木。', '转动积木，让影子像', '圆形', '正方形', '长方形', '三角形', '小房子', '很接近，继续转一转！', '影子还没对上，再试试～', '先点一个积木吧'],
      en: ['Look at both shadows and choose a block.', 'Turn the block to make a', 'shadow.', 'circle', 'square', 'rectangle', 'triangle', 'little house', 'So close — keep turning!', 'The shadow is not there yet. Try again!', 'Pick a block first'],
    },
    'pattern-caterpillar': {
      zh: ['红色','黄色','蓝色','绿色','圆形','星形','方形','小','大','咚','嚓','叮','跳','转','趴','接着摆，让毛毛虫找规律。','看看这组怎样重复，选下一个。','看看前面的队列，再试一次。'],
      en: ['red','yellow','blue','green','circle','star','square','small','big','boom','clap','ding','jump','spin','rest','Keep arranging a repeating pattern.','Look for the repeating unit. Choose the next item.','Look at the earlier items and try again.'],
    },
  };
  for (const [id, table] of Object.entries(fragments)) for (const lang of ['zh','en']) {
    for (const fragment of table[lang]) add(id, lang, fragment);
    if (id !== 'shadow-theater') for (let n = 0; n <= (id === 'number-fireflies' ? 20 : 10); n++) add(id, lang, String(n));
  }
  return result;
}
