import { expect } from '@playwright/test';
import { MESSAGES } from '../../scripts/speech/model.js';
import { praiseText } from '../../scripts/g1-games/model.js';

export async function captureSpeech(page) {
  await page.addInitScript(() => {
    Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true});
    if(localStorage.getItem('kidslab.speech')===null)localStorage.setItem('kidslab.speech','1');
    window.__speechEvents=[];
    window.addEventListener('speechplayback',event=>window.__speechEvents.push(event.detail));
  });
}
export async function expectNarrationStarted(page, complete) {
  const messages = typeof complete === 'boolean' ? [
    ...Object.values(complete ? MESSAGES.complete : MESSAGES.success).flat(),
    ...(complete ? ['zh','en'].flatMap(lang=>[0,1,2].map(i=>praiseText('clear',i,lang))) : []),
  ] : null;
  await expect.poll(()=>page.evaluate(messages=>window.__speechEvents.some(e=>e.state==='started' && (!messages || messages.includes(e.text))),messages),{timeout:15000}).toBe(true);
  expect(await page.evaluate(()=>window.__speechEvents.filter(e=>e.state==='error'))).toEqual([]);
}
