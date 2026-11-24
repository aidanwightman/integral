import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(require.resolve('playwright', {paths: [process.cwd(), resolve(dirname(process.execPath), '..')]}));
const landing = readFileSync(new URL('../../docs/index.html', import.meta.url), 'utf8');
const origin = 'https://integral.test/';
const themes = ['glass', 'forest', 'editorial', 'signal', 'bento'];
const browser = await chromium.launch({channel: 'chrome'});

async function openSettings(page, keyboard = false) {
  const launcher = page.locator('.glass-design-launcher');
  if (keyboard) {
    await launcher.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#site-design').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#shuffle-design').evaluate(el => el === document.activeElement), true);
  } else {
    await launcher.click();
  }
  assert.equal(await launcher.getAttribute('aria-expanded'), 'true');
  const panel = page.locator('.appearance-controls');
  await panel.evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
}

async function launchPage({width, height, mobile = false, fallback = false, hash = ''}) {
  const page = await browser.newPage({viewport: {width, height}, hasTouch: mobile, isMobile: mobile});
  await page.addInitScript(({themes, fallback, mobile}) => {
    if (fallback) delete HTMLElement.prototype.showPopover;
    if (mobile && !localStorage.getItem('data-saver-glass-site-v1')) {
      localStorage.setItem('data-saver-glass-site-v1', JSON.stringify({design: 'glass', mode: 'dark'}));
    }
    const shuffle = {
      queue: [], samples: [], clicks: 0,
      rect() {
        const button = document.querySelector('#shuffle-design');
        const {left, top, width, height} = button.getBoundingClientRect();
        return {left, top, width, height};
      },
      sample() { this.samples.push(this.rect()); }
    };
    window.shuffleTest = shuffle;
    // Only choose the RNG result for a trusted shuffle activation. The production
    // handler still selects the design, dispatches its events and persists it.
    const random = Math.random;
    document.addEventListener('click', event => {
      if (!event.target.closest('#shuffle-design') || !event.isTrusted) return;
      const others = themes.filter(theme => theme !== document.documentElement.dataset.design);
      const index = others.indexOf(shuffle.queue.shift());
      Math.random = () => (index + 0.5) / others.length;
      shuffle.clicks++;
    }, true);
    document.addEventListener('click', event => {
      if (!event.target.closest('#shuffle-design')) return;
      Math.random = random;
      shuffle.sample();
    });
  }, {themes, fallback, mobile});
  await page.route('**/*', route => route.request().url() === origin
    ? route.fulfill({contentType: 'text/html', body: landing}) : route.abort());
  await page.goto(origin + hash);
  return page;
}

async function activate(page, opening, targets, input, label) {
  const clicks = await page.evaluate(targets => {
    const test = window.shuffleTest;
    test.queue = [...targets];
    test.samples = [];
    function frame() {
      test.sample();
      test.frameId = requestAnimationFrame(frame);
    }
    frame();
    return test.clicks;
  }, targets);
  const x = opening.left + opening.width / 2;
  const y = opening.top + opening.height / 2;
  for (const target of targets) {
    if (input === 'keyboard') await page.keyboard.press('Space');
    else if (input === 'touch') await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    assert.equal(await page.locator('html').getAttribute('data-design'), target, label + ' activation');
  }
  // The header can still be interpolating padding after a synchronous style change.
  await page.waitForTimeout(350);
  const result = await page.evaluate(() => {
    const test = window.shuffleTest;
    cancelAnimationFrame(test.frameId);
    test.sample();
    return {
      samples: test.samples, clicks: test.clicks, active: document.activeElement.id,
      open: document.querySelector('.glass-design-launcher').getAttribute('aria-expanded'),
      stored: JSON.parse(localStorage.getItem('data-saver-glass-site-v1')).design
    };
  });
  assert.equal(result.clicks - clicks, targets.length, label + ' trusted clicks');
  assert.equal(result.active, 'shuffle-design', label + ' focus');
  assert.equal(result.open, 'true', label + ' settings remain open');
  assert.equal(result.stored, targets.at(-1), label + ' persisted design');
  for (const key of Object.keys(opening)) {
    const drift = Math.max(...result.samples.map(sample => Math.abs(sample[key] - opening[key])));
    assert.ok(drift <= 1, label + ': ' + key + ' moved ' + drift.toFixed(2) + 'px from opening');
  }
}

async function matrix(mobile) {
  const page = await launchPage(mobile ? {width: 390, height: 844, mobile} : {width: 1725, height: 836});
  try {
    await openSettings(page, !mobile);
    const opening = await page.evaluate(() => window.shuffleTest.rect());
    let current = 0;
    // Four five-edge circuits cover every ordered pair while the same panel stays open.
    for (const offset of [1, 2, 3, 4]) {
      for (let step = 0; step < themes.length; step++) {
        const next = (current + offset) % themes.length;
        const label = [mobile ? 'mobile' : 'desktop', themes[current], themes[next]].join(' ');
        await activate(page, opening, [themes[next]], mobile ? 'touch' : 'mouse', label);
        assert.equal(await page.evaluate(() => scrollY), 0, label + ' top of page');
        current = next;
      }
    }
    await activate(page, opening, ['editorial', 'glass', 'signal'], mobile ? 'touch' : 'mouse', 'rapid clicks');
    await activate(page, opening, ['bento'], 'keyboard', 'keyboard shuffle');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.glass-design-launcher').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('.glass-design-launcher').getAttribute('aria-expanded'), 'false');
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-design'), 'bento', 'reload uses the shuffled design');
  } finally { await page.close(); }
}

async function shuffleDuringReveal() {
  const page = await launchPage({width: 1725, height: 836});
  try {
    const launcher = page.locator('.glass-design-launcher');
    await launcher.evaluate(button => {
      button.addEventListener('click', () => {
        const panel = document.querySelector('.appearance-controls');
        const reveal = panel.getAnimations().find(animation =>
          animation.effect.getKeyframes().some(frame => frame.opacity !== undefined));
        if (!reveal) return;
        // Hold an early, visible frame so a busy test runner cannot miss the reveal.
        // Resume the production animation as soon as the visitor activates Randomise.
        reveal.pause();
        reveal.currentTime = reveal.effect.getTiming().duration * .1;
        window.shuffleTest.earlyRect = window.shuffleTest.rect();
        document.querySelector('#shuffle-design').addEventListener('click', event => {
          if (!event.isTrusted) return;
          window.shuffleTest.activationOpacity = Number(getComputedStyle(panel).opacity);
          reveal.play();
        }, {once: true, capture: true});
      }, {once: true});
    });
    await launcher.click();
    const opening = await page.evaluate(() => window.shuffleTest.earlyRect);
    assert.ok(opening, 'Settings must have a running reveal to exercise early activation');
    await activate(page, opening, ['editorial'], 'mouse', 'shuffle during initial reveal');
    const opacity = await page.evaluate(() => window.shuffleTest.activationOpacity);
    assert.ok(opacity > 0 && opacity < 1, 'Randomise was activated while the settings were visible and still fading in');
  } finally { await page.close(); }
}

async function resizeAndScroll(fallback) {
  const page = await launchPage({width: 1280, height: 800, fallback, hash: '#faq'});
  try {
    await openSettings(page, true);
    assert.equal(await page.locator('.appearance-controls').evaluate(el => el.hasAttribute('popover')), !fallback);
    // The initial #faq fragment and the compact header can still move the page
    // after navigation. Establish that the visitor is actually reading this title.
    const heading = page.locator('#faq-title');
    await page.evaluate(() => document.fonts.ready.then(() => {}));
    await heading.evaluate(async el => {
      let settledSince = null;
      const deadline = performance.now() + 3000;
      while (performance.now() < deadline) {
        await new Promise(requestAnimationFrame);
        const rect = el.getBoundingClientRect();
        const readingLine = innerHeight / 3;
        const distance = rect.top + rect.height / 2 - readingLine;
        if (Math.abs(distance) > 1) {
          scrollBy({top: distance, behavior: 'instant'});
          settledSince = null;
          continue;
        }
        if (!el.contains(document.elementFromPoint(innerWidth * .45, readingLine))) {
          throw new Error('FAQ heading is obscured at its intended reading position');
        }
        settledSince ??= performance.now();
        if (performance.now() - settledSince > 300) return;
      }
      throw new Error('FAQ heading did not settle at the reading line');
    });
    const before = await heading.boundingBox();
    let opening = await page.evaluate(() => window.shuffleTest.rect());
    await activate(page, opening, ['editorial'], 'keyboard', 'scrolled FAQ');
    const after = await heading.boundingBox();
    assert.ok(Math.abs(after.y - before.y) <= 2,
      'FAQ heading should retain reading position: ' + before.y + 'px → ' + after.y + 'px');

    // A true resize starts a new panel position, still usable at the narrow width.
    await page.setViewportSize({width: 320, height: 667});
    await page.waitForTimeout(350);
    opening = await page.evaluate(() => window.shuffleTest.rect());
    assert.ok(opening.left >= 0 && opening.left + opening.width <= 320 && opening.top + opening.height <= 667);
    await page.evaluate(() => scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
    await page.waitForTimeout(350);
    opening = await page.evaluate(() => window.shuffleTest.rect());
    await activate(page, opening, ['forest'], 'keyboard', '320px bottom' + (fallback ? ' without popovers' : ''));
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY <= 2), 'remains at page bottom');
  } finally { await page.close(); }
}

try {
  await Promise.all([matrix(false), matrix(true), resizeAndScroll(false), resizeAndScroll(true), shuffleDuringReveal()]);
  console.log('PASS: shuffle during initial reveal, 40 directed design changes, repeated pointer/touch clicks, keyboard focus, persistence, FAQ reading position, viewport resize and popover fallback.');
} finally { await browser.close(); }
