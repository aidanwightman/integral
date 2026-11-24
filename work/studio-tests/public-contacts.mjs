import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(require.resolve('playwright', {paths:[process.cwd(), resolve(dirname(process.execPath), '..')]}));
const docs = new URL('../../docs/', import.meta.url);
const read = file => readFileSync(new URL(file, docs));
const pages = {'/':'index.html', '/privacy/':'privacy/index.html', '/integral-icon.png':'integral-icon.png'};
const email = 'mailto:ben@byintegral.com';
const telephone = 'tel:+447417373688';
assert.deepEqual(read('integral-icon.png'), read('../outputs/production-site/site-src/integral-icon.png'));
assert.deepEqual(read('privacy/index.html'), read('../outputs/production-site/site-src/privacy.html'));
assert.match(read('privacy/index.html').toString(), /Mailpool is our business mailbox provider/);
assert.match(read('privacy/index.html').toString(), /Porkbun is our domain registrar/);
for (const file of ['index.html', 'privacy/index.html']) {
  const html = read(file).toString();
  assert.doesNotMatch(html, /hello@byintegral\.com/iu);
  // Cloudflare must preserve both the address and its mailto link for readers without JavaScript.
  const protectedLinks = html.match(/<!--email_off--><a [^>]*href="mailto:ben@byintegral\.com[^"]*"[^>]*>ben@byintegral\.com<\/a><!--\/email_off-->/g);
  assert.equal(protectedLinks?.length, file === 'index.html' ? 2 : 4);
  assert.equal(protectedLinks.length, html.match(/href="mailto:/g).length);
}

async function serve(route) {
  const url = new URL(route.request().url());
  const file = url.origin === 'https://integral.test' && pages[url.pathname];
  if (!file) return route.abort();
  await route.fulfill({body:read(file), contentType:file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8'});
}

const browser = await chromium.launch({channel:'chrome'});
try {
  const plain = await browser.newPage({javaScriptEnabled:false, viewport:{width:390, height:844}});
  await plain.route('**/*', serve);
  await plain.goto('https://integral.test/');
  assert.deepEqual(await plain.locator('a[href^="mailto:"]').allInnerTexts(), ['ben@byintegral.com', 'ben@byintegral.com']);
  await plain.getByRole('navigation', {name:'Footer'}).getByRole('link', {name:'Privacy notice'}).click();
  assert.equal(await plain.locator('#opt-out a').innerText(), 'ben@byintegral.com');
  assert.equal(await plain.locator('#opt-out a').getAttribute('href'), email + '?subject=Stop%20marketing');
  await plain.close();
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({viewport:{width, height:840}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', serve);
    await page.goto('https://integral.test/');
    for (const design of ['glass', 'forest', 'editorial', 'signal', 'bento']) {
      await page.selectOption('#site-design', design, {force:true});
      for (const selector of ['#about .founder-contact a', '.site-footer .footer-links > *', '.site-footer .footer-email']) {
        const items = await page.locator(selector).evaluateAll(nodes => nodes.map(node => {
          const rect = node.getBoundingClientRect();
          return rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1 && rect.height >= 44;
        }));
        assert.ok(items.length && items.every(Boolean), [width, design, selector].join(' '));
      }
    }
    assert.equal(await page.locator('#about a[href^="mailto"]').getAttribute('href'), email);
    assert.equal(await page.locator('#about a[href^="tel"]').getAttribute('href'), telephone);
    assert.equal(await page.locator('.site-footer .footer-email').getAttribute('href'), email);
    const privacy = page.getByRole('navigation', {name:'Footer'}).getByRole('link', {name:'Privacy notice'});
    await privacy.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('https://integral.test/privacy/');
    assert.equal(await page.title(), 'Privacy notice · Integral');
    assert.equal(await page.locator('h1').innerText(), 'Privacy notice');
    assert.equal(await page.locator('#opt-out a').getAttribute('href'), email + '?subject=Stop%20marketing');
    assert.equal(await page.locator('a[href^="tel"]').getAttribute('href'), telephone);
    assert.equal(await page.locator('script, iframe').count(), 0);
    assert.equal(await page.locator('.wordmark img').evaluate(img => img.complete && img.naturalWidth === 176), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('skip')), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => location.hash), '#main');
    await page.addStyleTag({content:'html {font-size:200%}'});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally { await browser.close(); }
console.log('PASS: published contact links, signature icon, all five footer designs and standalone keyboard-accessible privacy notice at 320, 390 and 1440px.');
