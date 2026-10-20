import { test, expect } from '@playwright/test';

/** 接一杯再倒一杯；读数出现该杯序号即表示这一轮动画走完（倒满后两个按钮都会禁用） */
async function fillAndPour(page, cupNo) {
  await expect(page.locator('#fillCone')).toBeEnabled({ timeout: 15000 });
  await page.locator('#fillCone').click();
  await expect(page.locator('#pourCone')).toBeEnabled({ timeout: 15000 });
  await page.locator('#pourCone').click();
  await expect(page.locator('#tripleReadout')).toContainText(String(cupNo), { timeout: 15000 });
}

test.describe('icecream geometry', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kidslab.lang', 'zh');
      localStorage.setItem('kidslab.theme', 'light');
    });
  });

  test('旋转成型机在孩子量出之前不给圆锥的除数', async ({ page }) => {
    await page.goto('/courseware/icecream-geometry/');
    await page.locator('[data-shape="1"]').click();
    await page.locator('#spinBtn').click();
    await expect(page.locator('#latheFormula')).toContainText('÷ ？', { timeout: 10000 });
    await expect(page.locator('#latheFormula')).not.toContainText('÷3');
    await expect(page.locator('#tip')).not.toContainText('÷3');
  });

  /* 判据一：三种尺寸各自的实测并排留存，且倒杯过程不抢答 */
  test('倒满一组会进记录表，但离猜想还差两种尺寸', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/courseware/icecream-geometry/?station=triple');
    await expect(page.locator('#tripleGuess')).toBeHidden();

    for (let cup = 1; cup <= 3; cup += 1) await fillAndPour(page, cup);

    await expect(page.locator('#tripleTable .trow')).toHaveCount(2);
    await expect(page.locator('#tripleGuess')).toBeVisible();
    await expect(page.locator('#guessAsk')).toContainText('再换 2 种');
    await expect(page.locator('#guessRow')).toBeHidden();
    await expect(page.locator('#tripleReadout')).not.toContainText('⅓');
    await expect(page.locator('#tripleReadout')).not.toContainText('÷ 3');
  });

  /* 判据二：⅓ 只在孩子报出「3」之后出现，并回填到旋转成型机 */
  test('三种尺寸齐了才开放猜想，报出 3 才揭示三分之一', async ({ page }) => {
    await page.goto('/courseware/icecream-geometry/?state=guess');
    await expect(page.locator('#tripleTable .trow')).toHaveCount(4);
    await expect(page.locator('#guessRow')).toBeVisible();
    await expect(page.locator('#guessAsk')).not.toContainText('÷ 3');
    await expect(page.locator('#guessOut')).toBeHidden();

    await page.locator('#guessInput').fill('2');
    await page.locator('#guessBtn').click();
    await expect(page.locator('#guessOut')).toBeVisible();
    await expect(page.locator('#guessOut')).not.toContainText('÷ 3');
    await expect(page.locator('#guessOut')).not.toContainText('三分之一');
    await expect(page.locator('#guessRow')).toBeVisible();

    await page.locator('#guessInput').fill('3');
    await page.locator('#guessBtn').click();
    await expect(page.locator('#guessOut')).toContainText('三分之一');
    await expect(page.locator('#guessRow')).toBeHidden();

    await page.locator('.tab[data-station="lathe"]').click();
    await page.locator('[data-shape="1"]').click();
    await page.locator('#spinBtn').click();
    await expect(page.locator('#latheFormula')).toContainText('÷3', { timeout: 10000 });
  });

  /* 判据三：动画进行中打断（换尺寸/重来）后，面板必须回到可用状态，不能卡在动画里。
     倒杯动画由 requestAnimationFrame 推进，并发跑重型 WebGL 课件时帧率会被压低，
     动画因此比标称时长慢很多；这里只断言「打断后能否继续操作」，
     用宽松超时而不是固定等待，避免变成受机器负载影响的偶发用例。 */
  test('倒杯动画被换尺寸或重来打断后，按钮仍然可用', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/courseware/icecream-geometry/?station=triple');
    await expect(page.locator('#fillCone')).toBeEnabled({ timeout: 15000 });

    /* 接满 → 倒的过程中立刻换尺寸，取消动画 */
    await page.locator('#fillCone').click();
    await expect(page.locator('#pourCone')).toBeEnabled({ timeout: 30000 });
    await page.locator('#pourCone').dispatchEvent('click');
    await page.locator('[data-size="2"]').dispatchEvent('click');
    await expect(page.locator('#fillCone')).toBeEnabled({ timeout: 30000 });

    /* 换尺寸会清空当前杯：杯空时「倒」应当禁用，而不是两个都禁用 */
    await expect(page.locator('#pourCone')).toBeDisabled();

    /* 再走一遍完整倒入，在动画中按「重来一次」 */
    await page.locator('#fillCone').click();
    await expect(page.locator('#pourCone')).toBeEnabled({ timeout: 30000 });
    await page.locator('#pourCone').dispatchEvent('click');
    await page.locator('#resetTriple').dispatchEvent('click');
    await expect(page.locator('#fillCone')).toBeEnabled({ timeout: 30000 });

    /* 面板恢复后仍能正常完成一杯一倒 */
    await fillAndPour(page, 1);
  });

  test('切换语言后记录与猜想状态都还在', async ({ page }) => {
    await page.goto('/courseware/icecream-geometry/?state=guess');
    await page.locator('#langBtn').click();
    await expect(page.locator('#tripleTable .trow')).toHaveCount(4);
    await expect(page.locator('#guessAsk')).toContainText('how many cups');

    await page.locator('#guessInput').fill('3');
    await page.locator('#guessBtn').click();
    await expect(page.locator('#guessOut')).toContainText('one third');

    await page.locator('#langBtn').click();
    await expect(page.locator('#guessAsk')).toContainText('圆锥 = 圆柱 ÷ 3');
  });
});
