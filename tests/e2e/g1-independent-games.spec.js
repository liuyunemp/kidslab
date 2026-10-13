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
    await makeMistake(page, course, course.tasks[0]);
    for (let i = 0; i < 8; i++) {
      await solve(page, course, course.tasks[i]);
      if (i < 7) {
        await expect(page.locator('#count')).toHaveText(`${i + 2}/8`);
        await expect(page.locator('#stage')).toHaveAttribute('aria-label', `任务 ${i + 2}/8`);
        const progress = await page.evaluate((id) => JSON.parse(localStorage.getItem(`kidslab.progress.${id}`) || 'null'), course.id);
        expect(progress?.status).not.toBe('completed');
      } else await expect(page.locator('.end-scene')).toBeVisible();
      if (i === 2) {
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
