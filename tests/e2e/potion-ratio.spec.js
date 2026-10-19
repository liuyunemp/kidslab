import { expect } from '@playwright/test';
import {numberJourneyCases} from './random-task-helpers.js';

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
    sceneHeight: document.querySelector('#brewScene:not([hidden]), #coinScene:not([hidden])').getBoundingClientRect().height,
  }));

  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.controls.filter(({ width, height }) => width < 44 || height < 44)).toEqual([]);
  expect(layout.controls.filter(({ font }) => font < 16)).toEqual([]);
  expect(layout.statusFont).toBeGreaterThanOrEqual(16);
  expect(layout.sceneHeight).toBeGreaterThanOrEqual(120);
}

numberJourneyCases('potion-ratio',expectFitsViewport);
