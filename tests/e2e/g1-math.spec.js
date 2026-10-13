import { test, expect } from '@playwright/test';

test('旧数学和语文网址保留导航，综合卡不进入主站清单', async ({ page, request }) => {
  const manifest = await (await request.get('/courseware/index.json')).json();
  const ids = new Set(manifest.courses.map((course) => course.id));
  expect(ids.has('g1-math')).toBe(false);
  expect(ids.has('g1-chinese')).toBe(false);
  expect(ids.has('g1-compare-bridge')).toBe(true);
  expect(ids.has('g1-pinyin-tracks')).toBe(true);
  for (const [oldId, target] of [['g1-math', 'g1-compare-bridge'], ['g1-chinese', 'g1-pinyin-tracks']]) {
    await page.goto(`/courseware/${oldId}/`);
    await expect(page.locator(`a[href="../${target}/"]`)).toBeVisible();
  }
  const chinese = ['g1-character-garden', 'g1-pinyin-tracks', 'g1-stroke-workshop', 'g1-word-post', 'g1-rhyme-stage', 'g1-sentence-train'];
  for (const course of manifest.courses.filter((entry) => entry.id.startsWith('g1-'))) {
    expect(course.category).toBe(chinese.includes(course.id) ? 'chinese' : 'math');
    if (chinese.includes(course.id)) expect(course.grades).toContain('g1a');
  }
});
