import assert from 'node:assert/strict';
import test from 'node:test';
import { courses } from '../../scripts/g1-games/data.mjs';
import { WORDS } from '../../src/g1-weight-lab/engine.js';
import { MILESTONE_STREAK, ROUND_COUNT, encourageText, milestoneFor, praiseText, speakText } from '../../scripts/g1-games/model.js';

/* 每道题在中文模式下的朗读文本必须非空、且不得出现任何答案标记。 */
test('每道题的朗读文本非空且不泄露答案', () => {
  for (const course of courses) {
    for (const task of course.tasks) {
      const phases = course.kind === 'mixed' ? [0, 1] : [0];
      for (const phase of phases) {
        const text = speakText({ kind: course.kind, task, words: WORDS.zh, phase, lang: 'zh' });
        assert.ok(text.length > 0, `${course.id}/${task.id} 朗读文本为空`);
        const answer = String(task.answer);
        assert.equal(text.includes(answer), false, `${course.id}/${task.id} 朗读泄露答案「${answer}」：${text}`);
        assert.equal(text.includes('|'), false, `${course.id}/${task.id} 拼接过原始答案串：${text}`);
      }
    }
  }
});

/* 拼音题型最危险：声母、韵母、声调正好是答案，朗读里一个都不能出现。 */
test('拼音题只念要拼的字，不念声母韵母和声调', () => {
  const course = courses.find((entry) => entry.kind === 'pinyin');
  assert.ok(course, '缺少拼音题型课件');
  for (const task of course.tasks) {
    const text = speakText({ kind: 'pinyin', task, words: WORDS.zh, lang: 'zh' });
    assert.match(text, new RegExp(task.char), `${task.id} 应当念出题面字`);
    assert.equal(/[a-zA-Z]/.test(text), false, `${task.id} 朗读里出现了拼音字母：${text}`);
    for (const part of [task.initial, task.final, task.tone]) {
      assert.equal(text.includes(part), false, `${task.id} 朗读泄露拼音组成「${part}」`);
    }
  }
});

test('两种语言的朗读文本都不为空', () => {
  for (const course of courses) {
    for (const task of course.tasks) {
      for (const lang of ['zh', 'en']) {
        const text = speakText({ kind: course.kind, task, words: WORDS[lang], lang });
        assert.ok(text.length > 0, `${course.id}/${task.id}/${lang}`);
      }
    }
  }
});

test('未知题型与空题面被拒绝', () => {
  assert.equal(speakText(), '');
  assert.equal(speakText({ kind: 'nope', task: courses[0].tasks[0], words: WORDS.zh }), '');
  assert.equal(speakText({ kind: 'add', task: null, words: WORDS.zh }), '');
  assert.equal(speakText({ kind: 'add', task: {}, words: WORDS.zh }).includes('undefined'), false);
  assert.equal(speakText({ kind: 'compare', task: {}, words: WORDS.zh }).includes('undefined'), false);
  assert.equal(speakText({ kind: 'mixed', task: {}, words: WORDS.zh, phase: 1 }).includes('undefined'), false);
});

test('里程碑只在连对整数倍与通关时触发', () => {
  for (let streak = 1; streak < ROUND_COUNT; streak++) {
    const expected = streak % MILESTONE_STREAK === 0 ? 'streak3' : null;
    assert.equal(milestoneFor({ done: streak, streak, total: ROUND_COUNT }), expected, `streak=${streak}`);
  }
  assert.equal(milestoneFor({ done: 0, streak: 0, total: ROUND_COUNT }), null);
  /* 通关优先于连对，且最后一题同时满足两个条件时只报通关。 */
  assert.equal(milestoneFor({ done: ROUND_COUNT, streak: ROUND_COUNT, total: ROUND_COUNT }), 'clear');
  assert.equal(milestoneFor({ done: ROUND_COUNT, streak: 3, total: ROUND_COUNT }), 'clear');
  assert.equal(milestoneFor(), null);
});

test('夸奖语中英齐备、长度克制并确定性轮转', () => {
  const limits = { zh: 16, en: 48 };
  for (const key of ['streak3', 'clear']) {
    for (const lang of ['zh', 'en']) {
      const seen = new Set();
      for (let times = 0; times < 8; times++) {
        const text = praiseText(key, times, lang);
        assert.ok(text.length > 0, `${key}/${lang}`);
        assert.ok(text.length <= limits[lang], `${key}/${lang} 夸奖语过长：${text}`);
        assert.equal(text, praiseText(key, times, lang), `${key}/${lang} 同一次数应得到同一句`);
        seen.add(text);
      }
      assert.ok(seen.size >= 3, `${key}/${lang} 至少准备三句不同夸奖语，实际 ${seen.size} 句`);
    }
  }
  assert.equal(praiseText('nope', 0, 'zh'), '');
  assert.equal(praiseText('clear', 0, 'zh').length > 0, true);
});

/* 答错鼓励语：中英齐备、句子短、同一次数结果稳定，且绝不出现「错」这类否定词。 */
test('答错鼓励语中英齐备、短句且确定性轮转', () => {
  const limits = { zh: 16, en: 48 };
  for (const lang of ['zh', 'en']) {
    for (let miss = 0; miss < 6; miss++) {
      const text = encourageText(miss, lang);
      assert.ok(text.length > 0, `${lang} 第 ${miss} 次连错没有鼓励语`);
      assert.ok(text.length <= limits[lang], `${lang} 鼓励语过长：${text}`);
      assert.equal(text, encourageText(miss, lang), `${lang} 同一连错次数应得到同一句`);
    }
    /* 前三次连错应各给不同的一句，避免同一句反复念。 */
    assert.equal(new Set([0, 1, 2].map((n) => encourageText(n, lang))).size, 3, `${lang} 前三句应互不相同`);
  }
  /* 非法与缺失的连错次数按 0 处理，不能抛错也不能返回空。 */
  for (const bad of [undefined, null, -5, NaN, 'x', {}]) {
    assert.equal(encourageText(bad, 'zh'), encourageText(0, 'zh'), `连错次数 ${String(bad)} 应按 0 处理`);
  }
  /* 连错很多次也要一直有话说，且始终不出现否定性字眼。 */
  for (const miss of [7, 20, 999]) {
    const text = encourageText(miss, 'zh');
    assert.ok(text.length > 0, `连错 ${miss} 次仍要有鼓励语`);
    assert.equal(/错了|不对|又错|笨/.test(text), false, `鼓励语不得否定孩子：${text}`);
  }
  /* 未知道别语言回落到中文，不能返回空。 */
  const fallback = encourageText(0, 'fr');
  assert.ok(fallback.length > 0, '未知语言应回落到中文鼓励语');
});
