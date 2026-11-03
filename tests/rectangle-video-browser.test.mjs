import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// Requires Chromium and a server at VIDEO_BASE_URL (default http://127.0.0.1:4173/).
const root = (process.env.VIDEO_BASE_URL || 'http://127.0.0.1:4173/').replace(/\/?$/, '/');
const routes = [{ id: 'zh', path: 'rectangle.html' }, { id: 'en', path: 'en/rectangle.html' }];
const sizes = [
  { id: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
];
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
try {
  for (const route of routes) {
    for (const { id, width, height, isMobile, hasTouch } of sizes) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch });
      try {
        const page = await context.newPage();
        const response = await page.goto(new URL(route.path, root).href, { waitUntil: 'load' });
        assert.equal(response.status(), 200);
        const film = page.locator('#video');
        const video = film.locator('video');
        assert.equal(await video.count(), 1);
        assert.equal(await video.getAttribute('preload'), 'none');
        assert.equal(await video.getAttribute('autoplay'), null);
        assert.equal(await video.evaluate(v => v.paused), true, 'must not autoplay');
        await video.scrollIntoViewIfNeeded();
        const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
        assert.ok(dimensions.scroll <= dimensions.viewport + 3, `${route.id}/${id}: horizontal overflow`);
        const box = await video.boundingBox();
        assert.ok(box && box.width > 200 && box.width <= width, `${route.id}/${id}: player visible within viewport`);
        // User gesture first; play() then tests media decoding without depending on native-control layout.
        await video.click({ position: { x: 10, y: 10 } });
        await video.evaluate(v => v.play());
        await page.waitForFunction(() => document.querySelector('#video video').currentTime > 0.15, null, { timeout: 15000 });
        const media = await video.evaluate(v => ({ duration: v.duration, error: v.error?.code, paused: v.paused, width: v.videoWidth, height: v.videoHeight }));
        assert.equal(media.error, undefined);
        assert.equal(media.paused, false);
        assert.ok(media.duration > 370 && media.duration < 390, `${route.id}/${id}: duration`);
        assert.ok(media.width > 0 && media.height > 0, `${route.id}/${id}: decoded video dimensions`);
        await video.evaluate(v => v.pause());
        assert.equal(await video.evaluate(v => v.paused), true);
        const transcript = film.locator('a[href$="transcript-zh.txt"]');
        assert.equal(await transcript.isVisible(), true);
        const transcriptResponse = await context.request.get(await transcript.evaluate(a => a.href));
        assert.equal(transcriptResponse.status(), 200);
        assert.match(await transcriptResponse.text(), /正方形/);
        console.log('PASS', route.id, id, 'layout, playback, pause and transcript');
      } finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
