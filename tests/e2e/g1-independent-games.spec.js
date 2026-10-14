import { test, expect } from '@playwright/test';
import { courses } from '../../scripts/g1-games/data.mjs';

async function moveNumber(page, value, target) {
  let delta = target - value;
  const sign = Math.sign(delta);
  const tens = Math.floor(Math.abs(delta) / 10);
  for (let i = 0; i < tens; i++) await page.locator(`[data-step="${sign * 10}"]`).click();
  delta -= tens * sign * 10;
  for (let i = 0; i < Math.abs(delta); i++) await page.locator(`[data-step="${sign}"]`).click();
}

async function trace(page, task) {
  const box = await page.locator('#trace').boundingBox();
  const point = ([x, y]) => [box.x + box.width * x / 100, box.y + box.height * y / 100];
  const [x0, y0] = point(task.points[0]);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (const p of task.points.slice(1)) {
    const [x, y] = point(p);
    await page.mouse.move(x, y, { steps: 6 });
  }
  await page.mouse.up();
}

async function solve(page, course, task) {
  switch (course.kind) {
    case 'add':
    case 'subtract':
      await moveNumber(page, task.a, Number(task.answer));
      await page.locator('[data-submit="number"]').click();
      break;
    case 'mixed':
      await moveNumber(page, task.a, task.a + task.b);
      await page.locator('[data-submit="number"]').click();
      await moveNumber(page, task.a + task.b, Number(task.answer));
      await page.locator('[data-submit="number"]').click();
      break;
    case 'pinyin':
      for (const [part, value] of [['initial', task.initial], ['final', task.final], ['tone', task.tone]]) {
        await page.locator(`[data-part="${part}"][data-value="${value}"]`).click();
      }
      await page.locator('[data-submit="pinyin"]').click();
      break;
    case 'stroke':
      await trace(page, task);
      break;
    case 'sentence':
      for (const word of task.words) await page.locator(`[data-word="${word}"]`).click();
      break;
    default:
      await page.locator(`[data-answer="${task.answer}"]`).click();
  }
}

async function makeMistake(page, course, task) {
  if (['add', 'subtract', 'mixed'].includes(course.kind)) await page.locator('[data-submit="number"]').click();
  else if (course.kind === 'pinyin') await page.locator('[data-submit="pinyin"]').click();
  else if (course.kind === 'stroke') {
    const box = await page.locator('#trace').boundingBox();
    await page.mouse.move(box.x + box.width * task.points[0][0] / 100, box.y + box.height * task.points[0][1] / 100);
    await page.mouse.down(); await page.mouse.up();
  } else if (course.kind === 'sentence') {
    for (const word of [...task.words].reverse()) await page.locator(`[data-word="${word}"]`).click();
  } else {
    const wrong = course.kind === 'direction' ? String((Number(task.answer) + 1) % task.items.length) :
      course.kind === 'compare' ? (task.answer === '>' ? '<' : '>') :
      course.kind === 'weight' ? (task.answer === 'left' ? 'right' : 'left') :
      course.kind === 'shape' ? (task.answer === 'circle' ? 'square' : 'circle') :
      task.choices.find((choice) => choice !== task.answer);
    await page.locator(`[data-answer="${wrong}"]`).click();
  }
  await expect(page.locator('#count')).toHaveText('1/8');
  await expect(page.locator('#stars')).toHaveText('⭐ 0');
}

for (const course of courses) {
  test(`${course.title.zh}: 八题通关，错误重试与重载续玩`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.setItem('kidslab.g1.music', '0');
    });
    await page.goto(`/courseware/${course.id}/`);
    await expect(page.locator('#count')).toHaveText('1/8');

    const readButton = page.locator('button.prompt[data-speak="1"]');
    await expect(readButton).toBeVisible();
    const readBox = await readButton.boundingBox();
    expect(readBox.width, '题面朗读按钮命中区宽度').toBeGreaterThanOrEqual(44);
    expect(readBox.height, '题面朗读按钮命中区高度').toBeGreaterThanOrEqual(44);
    await readButton.click();

    await makeMistake(page, course, course.tasks[0]);
    for (let i = 0; i < 8; i++) {
      await solve(page, course, course.tasks[i]);
      if (i < 7) {
        await expect(page.locator('#count')).toHaveText(`${i + 2}/8`);
        await expect(page.locator('#stage')).toHaveAttribute('aria-label', `任务 ${i + 2}/8`);
        const progress = await page.evaluate((id) => JSON.parse(localStorage.getItem(`kidslab.progress.${id}`) || 'null'), course.id);
        expect(progress?.status).not.toBe('completed');
      } else {
        await expect(page.locator('.end-scene')).toBeVisible();
        await expect(page.locator('.end-scene [data-praise="clear"]')).toBeVisible();
        await expect(page.locator('#hearAgain')).toBeVisible();
      }
      if (i === 2) {
        /* 答错一次后连对三题：只出现奖章，不打断出题节奏。 */
        await expect(page.locator('#praise')).toHaveAttribute('data-praise', 'streak3');
        await page.reload();
        await expect(page.locator('#count')).toHaveText('4/8');
      }
    }
    const progress = await page.evaluate((id) => JSON.parse(localStorage.getItem(`kidslab.progress.${id}`) || 'null'), course.id);
    expect(progress?.status).toBe('completed');
    await page.locator('#replay').click();
    await expect(page.locator('#count')).toHaveText('1/8');
    await expect(page.locator('#stars')).toHaveText('⭐ 0');
  });
}

async function expectToolbarFits(page) {
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    buttons: [...document.querySelectorAll('.topbar .icon-button')].map((node) => {
      const rect = node.getBoundingClientRect();
      return { right: Math.round(rect.right), width: Math.round(rect.width), height: Math.round(rect.height) };
    }),
  }));
  expect(layout.buttons.length).toBe(5);
  for (const button of layout.buttons) {
    expect(button.width, '顶栏按钮命中区').toBeGreaterThanOrEqual(44);
    expect(button.height, '顶栏按钮命中区').toBeGreaterThanOrEqual(44);
    expect(button.right, '顶栏按钮不得溢出视口').toBeLessThanOrEqual(layout.viewport + 1);
  }
}

test('语音开关可关闭并持久化，引导语可点朗读且不产生报错', async ({ page }) => {
  const failures = [];
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => failures.push(`page: ${error.message}`));

  await page.addInitScript(() => {
    localStorage.setItem('kidslab.lang', 'zh');
    localStorage.setItem('kidslab.theme', 'light');
    localStorage.setItem('kidslab.g1.music', '0');
  });
  await page.goto('/courseware/g1-word-post/');

  await expectToolbarFits(page);

  const speechButton = page.locator('#speechBtn');
  await expect(speechButton).toBeVisible();
  await expect(speechButton).toHaveAttribute('aria-label', '关闭朗读');
  await expect(speechButton).toHaveAttribute('aria-pressed', 'true');

  const intro = page.locator('#intro');
  if (await intro.isVisible()) await intro.click();
  await page.locator('button.prompt[data-speak="1"]').click();

  /* 关掉语音后仍在朗读的发音会被立刻打断，并且选择要记住。 */
  await speechButton.click();
  await expect(speechButton).toHaveAttribute('aria-pressed', 'false');
  await expect(speechButton).toHaveAttribute('aria-label', '打开朗读');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('kidslab.speech'))).toBe('0');

  await page.reload();
  await expect(page.locator('#speechBtn')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#speechBtn').click();
  await expect(page.locator('#speechBtn')).toHaveAttribute('aria-pressed', 'true');

  /* 切到英文后开关文案跟着换，题面朗读按钮仍然可点。 */
  await page.locator('#languageBtn').click();
  await expect(page.locator('#speechBtn')).toHaveAttribute('aria-label', 'Turn reading off');
  await expect(page.locator('#speechBtn')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('button.prompt[data-speak="1"]').click();

  const overflow = await page.evaluate(() => ({
    vertical: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  expect(overflow.vertical).toBe(false);
  expect(overflow.horizontal).toBe(false);
  expect(failures).toEqual([]);
});
