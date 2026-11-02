import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {balance} from '../rectangle-balance-model.mjs';
for (let i=0;i<500;i++) {
  const t=2*Math.PI*i/500;
  assert.ok(Math.abs(balance(t)-4*Math.sin(2*t))<1e-12,'square-height formula');
}
let sum=0; for(let i=0;i<500;i++)sum+=balance(2*Math.PI*i/500);
assert.ok(Math.abs(sum)<1e-10,'circular mean is zero');
for(const t of [0,Math.PI/2,Math.PI,3*Math.PI/2])assert.ok(Math.abs(balance(t))<1e-12,'zero at quarter turns');
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
for(const lang of ['zh','en']){
 const context=await browser.newContext({viewport:{width:320,height:720},isMobile:true,hasTouch:true});
 const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4173/'+(lang==='zh'?'rectangle.html':'en/rectangle.html'));
 const slider=page.locator('#mey-angle'); await slider.scrollIntoViewIfNeeded();
 await slider.evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.match(await page.locator('#mey-output').innerText(),/4\.00/);
 await slider.evaluate(el=>{el.value='135';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.match(await page.locator('#mey-output').innerText(),/-4\.00/);
 await slider.evaluate(el=>{el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.match(await page.locator('#mey-output').innerText(),/0\.00/);
 assert.ok(await page.locator('a[href*="dn14.pdf#page=10"]').count());
 assert.ok(await page.locator('a[href*="tp06107s.pdf#page=12"]').count());
 assert.ok(await page.locator('a[href*="BV1u5NAefE9W"]').count());
 const dimensions=await page.evaluate(()=>({w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(dimensions.scroll<=dimensions.w+3,`page must not overflow on mobile ${JSON.stringify(dimensions)}`);
 assert.deepEqual(errors,[]);await context.close();console.log('PASS',lang,'Meyerson example, mobile layout, citations');
}
await browser.close();
