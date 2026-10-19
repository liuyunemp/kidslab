import { test, expect } from '@playwright/test';
import {roundRecord} from './random-task-helpers.js';

async function expectFitsViewport(page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    controls: [...document.querySelectorAll('button:not([hidden]), a:not([hidden])')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent.trim(),
          width: rect.width,
          height: rect.height,
          font: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      })
      .filter(({ width, height }) => width > 0 && height > 0),
    statusFont: Number.parseFloat(getComputedStyle(document.querySelector('#status')).fontSize),
    lessonFont: Number.parseFloat(getComputedStyle(document.querySelector('#lessonText')).fontSize),
    canvasHeight: document.querySelector('#evidenceCanvas').getBoundingClientRect().height,
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.controls.filter(({ width, height }) => width < 44 || height < 44)).toEqual([]);
  expect(layout.controls.filter(({ font, text }) => font < 14 && text)).toEqual([]);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.lessonFont).toBeGreaterThanOrEqual(16);
  expect(layout.canvasHeight).toBeGreaterThanOrEqual(98);
}

async function runTrial(page) {
  await page.locator('#trialBtn').click();
  await expect(page.locator('#machineState')).toContainText(/证据已生成|EVIDENCE READY/, { timeout: 5000 });
}

async function solveFirstCase(page) {
  await runTrial(page);
  await page.locator('[data-verdict="dishonest"]').click();
  await page.locator('#checkBtn').click();
  expect((await roundRecord(page,'carnival-truth')).play.solved).toBe(true);
  await page.locator('#nextBtn').click();
}

async function solveSecondCase(page) {
  await runTrial(page);
  await page.locator('[data-verdict="honest"]').click();
  await page.locator('#checkBtn').click();
  expect((await roundRecord(page,'carnival-truth')).play.solved).toBe(true);
  await page.locator('#nextBtn').click();
}

async function solveThirdCase(page) {
  {const r=await roundRecord(page,'carnival-truth'),n=r.play.prizeSlots;for(let j=0;j<Math.abs(n-r.instance.target);j++)await page.locator(n>r.instance.target?'#minusBtn':'#plusBtn').click();}
  await runTrial(page);
  await page.locator('#checkBtn').click();
  expect((await roundRecord(page,'carnival-truth')).play.solved).toBe(true);
  await page.locator('#nextBtn').click();
}

test.describe('carnival truth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
      localStorage.removeItem('kidslab.carnival-truth');
      localStorage.removeItem('kidslab.progress.carnival-truth');
      localStorage.removeItem('kidslab.sound.muted');
      sessionStorage.setItem('kidslab.starmap', JSON.stringify({ open: true }));
    });
    await page.goto('/courseware/carnival-truth/?seed=987');
  });

  test('recovers from unsupported verdicts and completes all three probability cases', async ({ page }) => {
    await expect(page.locator('#caseTitle')).not.toBeEmpty();
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText('1000 次');
    await runTrial(page);
    // The honest/dishonest split is generated per case, so the wrong verdict is derived from it.
    const first = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('kidslab.random.v1.carnival-truth'));
      const store = JSON.parse(localStorage.getItem(key));
      const instance = store.levels[store.active].instance;
      const claim = instance.claimWins ?? instance.wins;
      return claim === instance.wins ? 'honest' : 'dishonest';
    });
    const wrongFirst = first === 'honest' ? 'dishonest' : 'honest';
    await page.locator(`[data-verdict="${wrongFirst}"]`).click();
    await page.locator('#checkBtn').click();
    expect((await roundRecord(page,'carnival-truth')).play.feedback).toBe('wrong');
    await page.locator(`[data-verdict="${first}"]`).click();
    await page.locator('#checkBtn').click();
    await page.locator('#nextBtn').click();

    await expect(page.locator('#caseTitle')).not.toBeEmpty();
    await runTrial(page);
    await page.locator('[data-verdict="dishonest"]').click();
    await page.locator('#checkBtn').click();
    expect((await roundRecord(page,'carnival-truth')).play.solved).toBe(false);
    await page.locator('[data-verdict="honest"]').click();
    await page.locator('#checkBtn').click();
    await page.locator('#nextBtn').click();

    // The design case names itself after the target the model picked for it.
    await expect(page.locator('#caseTitle')).toContainText(/转盘|轮盘|wheel/i);
    await runTrial(page);
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText(/目标概率|调整到/);
    {const r=await roundRecord(page,'carnival-truth'),n=r.play.prizeSlots;for(let j=0;j<Math.abs(n-r.instance.target);j++)await page.locator(n>r.instance.target?'#minusBtn':'#plusBtn').click();}
    await page.locator('#checkBtn').click();
    await expect(page.locator('#status')).toContainText('旧数据不能证明新转盘');
    await runTrial(page);
    await page.locator('#checkBtn').click();
    await page.locator('#nextBtn').click();

    await expect(page.getByRole('heading', { name: '你成为了“游园会真相官”！' })).toBeVisible();
    await expect(page.locator('#playAgainBtn')).toBeFocused();
    await expect(page.locator('#course')).toHaveJSProperty('inert', true);
    await expect(page.locator('#topbar')).toHaveJSProperty('inert', true);
    await expect(page.locator('.kidslab-starmap-back')).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(page.locator('#finale')).toContainText('本局');
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('kidslab.progress.carnival-truth') || 'null')?.status)).toBe('completed');
  });

  test('persists progress and supports language, theme, sound, and target viewports', async ({ page }) => {
    await page.locator('#soundBtn').click();
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await runTrial(page);
    await page.locator('[data-verdict="dishonest"]').click();
    await page.locator('#langBtn').click();
    await expect(page.locator('#caseTitle')).toContainText('chance');
    await expect(page.locator('#status')).toContainText('experimental frequency');
    await expect(page.locator('#caseNav')).toHaveAttribute('aria-label', 'Case progress');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Turn sound on');
    await expect(page.locator('#minusBtn')).toHaveAttribute('aria-label', 'Remove a prize sector');
    await expectFitsViewport(page);

    await page.reload();
    await expect(page.locator('[data-verdict="dishonest"]')).toHaveClass(/is-selected/);
    await expect(page.locator('#experimentReadout')).not.toHaveText('—');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
    await expectFitsViewport(page);
  });

  test('restores completion and starts a fresh investigation', async ({ page }) => {
    await solveFirstCase(page);
    await solveSecondCase(page);
    await solveThirdCase(page);
    await page.reload();

    await expect(page.getByRole('heading', { name: '你成为了“游园会真相官”！' })).toBeVisible();
    await page.locator('#playAgainBtn').click();
    await expect(page.locator('#caseTitle')).not.toBeEmpty();
    await expect(page.locator('#experimentReadout')).toHaveText('—');
  });
});
