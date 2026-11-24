import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(require.resolve('playwright', {paths: [process.cwd(), resolve(dirname(process.execPath), '..')]}));
const landing = readFileSync(new URL('../../docs/index.html', import.meta.url), 'utf8');
const browser = await chromium.launch({channel: 'chrome'});
const viewports = [[320, 568], [390, 844], [667, 320], [768, 1024], [1440, 900]];

try {
  for (const design of ['glass', 'forest', 'editorial', 'signal', 'bento']) {
    const page = await browser.newPage({reducedMotion: 'reduce'});
    await page.addInitScript(theme => {
      localStorage.setItem('data-saver-glass-site-v1', JSON.stringify({design: theme, mode: 'light'}));
    }, design);
    await page.route('https://integral.test/', route => route.fulfill({contentType: 'text/html', body: landing}));
    await page.goto('https://integral.test/');
    assert.equal(await page.locator('header a[href="#crm-examples"], .hero a[href="#crm-examples"]').count(), 0);
    assert.equal(await page.locator('#ownership #crm-open-workspace').isVisible(), true);

    for (const mode of ['light', 'dark']) {
      if (mode === 'dark') await page.locator('#site-mode').evaluate(button => button.click());
      for (const [width, height] of viewports) {
        await page.setViewportSize({width, height});
        const context = [design, mode, width, height].join(' ');
        const layout = await page.evaluate(() => {
          const buttons = [...document.querySelectorAll('.hero-main .actions > *')].map(button => button.getBoundingClientRect());
          const pricing = [...document.querySelectorAll('#savings-detail .faq summary')];
          return {
            design: document.documentElement.dataset.design,
            mode: document.documentElement.dataset.mode,
            pageFits: document.documentElement.scrollWidth <= innerWidth,
            buttonsFit: buttons.every(rect => rect.left >= 0 && rect.right <= innerWidth && rect.height >= 44),
            sameRow: Math.abs(buttons[0].top - buttons[1].top) < 2,
            buttonsBottom: Math.max(...buttons.map(rect => rect.bottom)),
            pricingTarget: Math.min(...pricing.map(summary => summary.getBoundingClientRect().height))
          };
        });
        assert.equal(layout.design, design, context);
        assert.equal(layout.mode, mode, context);
        assert.ok(layout.pageFits && layout.buttonsFit, context);
        assert.ok(layout.pricingTarget >= 44, context);
        if (width <= 390) assert.ok(layout.sameRow, context);
        if (height === 320) assert.ok(layout.buttonsBottom <= height, context);
      }
    }
    await page.setViewportSize({width: 320, height: 640});
    await page.addStyleTag({content: 'html {font-size: 200% !important}'});
    const ownershipFits = await page.locator('#crm-examples button').evaluate(button => {
      const bounds = button.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth && button.scrollWidth <= button.clientWidth + 1;
    });
    assert.ok(ownershipFits, design + ' enlarged CRM controls');
    await page.close();
  }
  console.log('PASS: lower CRM entry, mobile hero actions, pricing touch targets and page width in all five themes, light and dark.');
} finally {
  await browser.close();
}
