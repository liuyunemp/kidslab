import { test, expect } from '@playwright/test';
import {levelInstance} from './random-task-helpers.js';
import {ferrySafe, ferryMove} from '../../scripts/random-rounds/ferry.js';

// The opening banks are generated, so a crossing that strands a dangerous pair is derived from
// the stored instance rather than assumed.
// Item ids map to the Chinese names the course shows, matching I18N in main.js.
const ITEM_NAMES = {
  wolf: '狼', goat: '羊', cabbage: '白菜',
  redParrot: '红鹦鹉', blueParrot: '蓝鹦鹉', dog: '大狗',
  cat: '猫', seeds: '种子', bird: '小鸟',
};
const nameOf = (scene, id) => ITEM_NAMES[id] ?? scene.items.find((item) => item.id === id)?.id;

const crossingNames = (scene) => scene.solution.map((id) => (id === null ? null : nameOf(scene, id)));

function unsafeCrossing(scene) {
  const state = scene.initial;
  const aboard = scene.items.filter((item, index) => state.positions[index] === state.boatSide);
  return aboard.find((item) => ferryMove(scene, state, item.id) === null) ?? aboard[0];
}

async function sailWith(page, passenger) {
  if (passenger) {
    await page.getByRole('button', { name: new RegExp(`^${passenger}在`) }).click();
  }
  await page.locator('#sailBtn').click();
  await expect(page.locator('#boat')).not.toHaveClass(/sailing/, { timeout: 3000 });
}

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    buttonHeights: [...document.querySelectorAll('button:not([hidden])')]
      .map((button) => button.getBoundingClientRect().height)
      .filter((height) => height > 0),
    missionFont: Number.parseFloat(getComputedStyle(document.querySelector('#missionText')).fontSize),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(Math.min(...layout.buttonHeights)).toBeGreaterThanOrEqual(44);
  expect(layout.missionFont).toBeGreaterThanOrEqual(16);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
}

test.describe('ferry tales', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.ferry-tales');
      localStorage.removeItem('kidslab.progress.ferry-tales');
      localStorage.removeItem('kidslab.sound.muted');
    });
    await page.goto('/courseware/ferry-tales/?seed=987');
  });

  test('rewinds an unsafe crossing and completes all three chapters', async ({ page }) => {
    const scene = await levelInstance(page, 'ferry-tales', 0);
    await expect(page.getByRole('heading', { name: '狼、羊和白菜' })).toBeVisible();
    await expect(page.locator('#ruleList')).toContainText('狼 会欺负 羊');
    await expect(page.locator('#ruleList')).toContainText('羊 会欺负 白菜');

    // A crossing that would strand a dangerous pair is rewound instead of accepted.
    const unsafe = unsafeCrossing(scene);
    expect(unsafe, 'the opening scene leaves a crossing that the rules reject').toBeTruthy();
    await page.getByRole('button', { name: new RegExp(`^${nameOf(scene, unsafe.id)}在`) }).click();
    await page.locator('#sailBtn').click();
    await expect(page.locator('#status')).toContainText(/被单独留下|时光倒流/, { timeout: 3000 });

    for (const passenger of crossingNames(scene)) {
      await sailWith(page, passenger);
    }
    await expect(page.getByRole('heading', { name: '所有乘客都安全抵达！' })).toBeVisible();
    await page.getByRole('button', { name: '翻到下一章' }).click();

    await expect(page.getByRole('heading', { name: '鹦鹉停战日' })).toBeVisible();
    for (const passenger of crossingNames(await levelInstance(page, 'ferry-tales', 1))) {
      await sailWith(page, passenger);
    }
    await page.getByRole('button', { name: '翻到下一章' }).click();

    await expect(page.getByRole('heading', { name: '森林庆典队' })).toBeVisible();
    for (const passenger of crossingNames(await levelInstance(page, 'ferry-tales', 2))) {
      await sailWith(page, passenger);
    }

    await expect(page.getByRole('heading', { name: '金色摆渡人' })).toBeVisible();
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.ferry-tales') || 'null')?.status)).toBe('completed');
  });

  test('offers state-aware hints, undo, sound, language, and theme controls', async ({ page }) => {
    const scene = await levelInstance(page, 'ferry-tales', 0);
    await page.getByRole('button', { name: /轻提示/ }).click();
    // The hint names one of the passengers that is currently waiting on this bank.
    await expect(page.locator('#status')).toContainText(/试试带上|先观察船这一边/);

    const first = crossingNames(scene)[0];
    expect(first, 'the classic solution starts by carrying one passenger').toBeTruthy();
    await sailWith(page, first);
    await page.getByRole('button', { name: /退一步/ }).click();
    await expect(page.locator('#status')).toContainText('退回上一步');
    await expect(page.getByRole('button', { name: new RegExp(`^${first}在`) })).toBeVisible();

    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');

    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#langBtn').click();
    await expect(page.getByRole('heading', { name: 'The Wolf, Goat & Cabbage' })).toBeVisible();
    await expect(page.locator('#sailBtn')).toHaveText('Sail to festival bank');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');
  });

  test('keeps the story readable inside both target viewports', async ({ page }) => {
    await expectFitsViewport(page);
  });
});
