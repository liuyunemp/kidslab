import {test,expect} from '@playwright/test';
for(const id of ['g1-weight-lab','g1-sort-laundry'])test(`${id}: retry, new task, finite family, seed and narration`,async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('kidslab.lang','zh'));
  await page.goto(`/courseware/${id}/?seed=987`);
  const saved=()=>page.evaluate(id=>JSON.parse(localStorage.getItem(`kidslab.random.v1.${id}.seed-987`)),id);
  const first=await saved(),key=first.active,entry=first.levels[key];
  await page.locator('[data-speak]').click();
  const wrong=id==='g1-weight-lab'?(entry.instance.task.answer==='left'?'right':'left'):entry.instance.task.choices.find(c=>c!==entry.instance.task.answer);
  await page.locator(`[data-answer="${wrong}"]`).click();
  await page.reload();expect((await saved()).levels[key].instance).toEqual(entry.instance);
  await page.locator('[data-round-action=retry]').click();await page.waitForLoadState();expect((await saved()).levels[key].instance).toEqual(entry.instance);
  await page.locator('[data-round-action=new]').click();await page.waitForLoadState();expect((await saved()).levels[key].fingerprint).not.toBe(entry.fingerprint);
  await page.locator('[data-round-action=classic]').click();await page.waitForLoadState();expect((await saved()).levels[key].mode).toBe('classic');
  await page.locator('#languageBtn').click();await expect(page.locator('[data-round-action=new]')).toHaveText('New round');
  await page.locator('[data-speak]').click();
});
