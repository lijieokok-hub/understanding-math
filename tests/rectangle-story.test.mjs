import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Target the same local server used by the repository's existing regression.
const root = 'http://127.0.0.1:4173/';
const routes = [
  { id: 'zh', path: 'rectangle.html', switchPath: '/en/rectangle.html' },
  { id: 'en', path: 'en/rectangle.html', switchPath: '/rectangle.html' },
];
const sizes = [
  { id: 'tiny', width: 320, height: 720, mobile: true },
  { id: 'phone', width: 390, height: 844, mobile: true },
  { id: 'tablet', width: 768, height: 1024, mobile: false },
  { id: 'desktop', width: 1440, height: 900, mobile: false },
];
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
await mkdir('rectangle-qa-shots', { recursive: true });
const failures = [];

async function noOverflow(page, label) {
  const dim = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  assert.ok(dim.scroll <= dim.viewport + 3, `${label}: horizontal overflow ${dim.scroll}/${dim.viewport}`);
}

for (const route of routes) {
  for (const size of sizes) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      isMobile: size.mobile,
      hasTouch: size.mobile,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    try {
      const response = await page.goto(root + route.path, { waitUntil: 'load' });
      assert.equal(response?.status(), 200, `${route.id} ${size.id}: HTTP status`);
      const brand = page.locator('header .story-brand');
      assert.equal(await brand.evaluate(el => getComputedStyle(el, '::before').content), 'none', `${route.id} ${size.id}: no added brand diamond in light mode`);
      await page.locator('header').screenshot({ path: `rectangle-qa-shots/logo-${route.id}-${size.id}-light.png`, animations: 'disabled' });
      await page.waitForFunction(() => document.querySelectorAll('.katex').length > 10);
      assert.equal(await page.locator('.katex-error').count(), 0, `${route.id}: KaTeX errors`);
      await noOverflow(page, `${route.id} ${size.id}`);

      // Exercise real touch on phone-sized pages and keyboard on every size.
      const square = page.locator('#square');
      if (size.mobile) await square.tap(); else await square.click();
      assert.equal(await page.locator('#angle').inputValue(), '90');
      assert.match(await page.locator('#angle-output').innerText(), /90°/);
      await page.locator('#angle').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#angle').inputValue(), '91');

      await page.locator('#seam-angle').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#seam-angle').inputValue(), '51');
      assert.match(await page.locator('#seam-output').innerText(), /51°/);
      const before = await page.locator('#swap-output').innerText();
      if (size.mobile) await page.locator('#swap').tap(); else await page.locator('#swap').click();
      assert.notEqual(await page.locator('#swap-output').innerText(), before, 'swap updates its accessible status');
      await page.locator('#animate-pair').click();
      assert.match(await page.locator('#swap-output').innerText(), /moving|正在移动/i);
      await page.locator('#animate-pair').click();
      assert.match(await page.locator('#swap-output').innerText(), /paused|暂停/i);

      await page.locator('.reader-tools summary').click();
      await page.locator('#reader-size').selectOption('2');
      await page.locator('#theme-toggle').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      assert.equal(await brand.evaluate(el => getComputedStyle(el, '::before').content), 'none', `${route.id} ${size.id}: no added brand diamond in dark mode`);
      await page.locator('header').screenshot({ path: `rectangle-qa-shots/logo-${route.id}-${size.id}-dark.png`, animations: 'disabled' });
      await noOverflow(page, `${route.id} ${size.id} at 200%`);
      assert.equal(await page.locator('.katex-error').count(), 0);
      await page.screenshot({ path: `rectangle-qa-shots/${route.id}-${size.id}-dark-200.png`, animations: 'disabled' });

      // Settings must survive reload and the language transition.
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      assert.equal(await page.locator('#reader-size').inputValue(), '2');
      await page.locator('nav[aria-label] a[data-language]').first().click();
      assert.equal(new URL(page.url()).pathname, route.switchPath);
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      assert.equal(await page.locator('#reader-size').inputValue(), '2');
      assert.deepEqual(errors, [], `${route.id} ${size.id}: uncaught page errors`);
      console.log('PASS', route.id, size.id, 'touch/keyboard, settings, language, layout and math');
    } catch (error) {
      const label = `${route.id}/${size.id}: ${error}`;
      failures.push(label);
      console.error('FAIL', label);
      await page.screenshot({ path: `rectangle-qa-shots/${route.id}-${size.id}-failure.png`, animations: 'disabled' }).catch(() => {});
    } finally {
      await context.close();
    }
  }
}

// Reduced motion must not start a frame animation; it still performs the exchange.
for (const route of routes) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await page.goto(root + route.path, { waitUntil: 'load' });
    const before = await page.locator('#swap-output').innerText();
    await page.locator('#animate-pair').tap();
    assert.match(await page.locator('#animate-pair').innerText(), /play|播放/i);
    assert.notEqual(await page.locator('#swap-output').innerText(), before);
    console.log('PASS', route.id, 'reduced motion');
  } catch (error) {
    failures.push(`${route.id}/reduced-motion: ${error}`);
    console.error('FAIL', failures.at(-1));
  } finally { await context.close(); }
}

// A deliberate scroll writes a resume record; reloading offers explicit resume.
for (const route of routes) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await page.goto(root + route.path, { waitUntil: 'load' });
    await page.keyboard.press('End');
    await page.waitForFunction(() => {
      const record = JSON.parse(localStorage.getItem('math-understanding.reading.v1') || '{}');
      return Object.values(record).some(value => value.percent > 3);
    }, null, { timeout: 8000 });
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.locator('#resume-banner').isVisible(), true);
    await page.locator('#resume-reading').click();
    assert.equal(await page.locator('#resume-banner').isVisible(), false);
    assert.ok(await page.evaluate(() => scrollY) > 60);
    console.log('PASS', route.id, 'reading progress and explicit resume');
  } catch (error) {
    failures.push(`${route.id}/resume: ${error}`);
    console.error('FAIL', failures.at(-1));
  } finally { await context.close(); }
}

// A previously cached unversioned stylesheet must not override the new URL.
for (const route of routes) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  let oldStylesheetRequested = false;
  await page.route('**/*', async request => {
    const url = new URL(request.request().url());
    if (url.pathname.endsWith('/rectangle.css') && !url.search) {
      oldStylesheetRequested = true;
      await request.fulfill({ contentType: 'text/css', body: '.story-brand::before{content:"◇"}' });
    } else await request.continue();
  });
  try {
    await page.goto(root + route.path, { waitUntil: 'load' });
    assert.equal(oldStylesheetRequested, false, `${route.id}: old cache URL was requested`);
    assert.equal(await page.locator('header .story-brand').evaluate(el => getComputedStyle(el, '::before').content), 'none');
    console.log('PASS', route.id, 'versioned stylesheet bypasses stale URL');
  } catch (error) {
    failures.push(`${route.id}/stylesheet-cache: ${error}`);
    console.error('FAIL', failures.at(-1));
  } finally { await context.close(); }
}

await browser.close();
if (failures.length) {
  console.error('TOTAL FAILURES', failures.length, failures.join('\n'));
  process.exitCode = 1;
} else console.log('Rectangle story checks passed.');
