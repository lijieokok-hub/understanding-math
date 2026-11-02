import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

const base = 'http://127.0.0.1:4173/';
const browser = await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
await mkdir('rectangle-spatial-shots',{recursive:true});
const failures=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
const screens=[{w:320,h:720,mobile:true},{w:390,h:844,mobile:true},{w:768,h:1024,mobile:false},{w:1440,h:900,mobile:false}];

for(const lang of ['zh','en'])for(const s of screens){
  const context=await browser.newContext({viewport:{width:s.w,height:s.h},isMobile:s.mobile,hasTouch:s.mobile,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  try{
    const response=await page.goto(base+(lang==='zh'?'rectangle.html':'en/rectangle.html'),{waitUntil:'load'});
    assert.equal(response.status(),200);
    await page.locator('#spatial-story').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#spatial-story').dataset.engine==='canvas2d',null,{timeout:25000});
    const engine=await page.locator('#spatial-story').getAttribute('data-engine');
    assert.equal(await page.locator('#abstract-band-canvas canvas').count(),1);
    assert.equal(await page.locator('#spatial-canvas canvas').count(),1);
    assert.equal(await page.locator('#spatial-fallback').isVisible(),false);
    if(s.mobile){
      assert.equal(await page.locator('[data-spatial-panel="0"]').getAttribute('aria-pressed'),'true');
      await page.locator('[data-spatial-panel="1"]').tap();
      assert.equal(await page.locator('[data-spatial-panel="1"]').getAttribute('aria-pressed'),'true');
      const shown=await page.locator('#spatial-canvas').boundingBox(), container=await page.locator('.spatial-pair').boundingBox();
      assert.ok(Math.abs(shown.x-container.x)<3, 'mapped view fills the mobile panel');
    }
    await page.locator('[data-spatial-stage="35"]').click();
    assert.equal(await page.locator('#spatial-story').getAttribute('data-phase'),'2');
    const first=await page.locator('#spatial-canvas').screenshot();
    if(s.mobile)await page.locator('[data-spatial-stage="76"]').tap();else await page.locator('[data-spatial-stage="76"]').click();
    assert.equal(await page.locator('#spatial-progress').inputValue(),'76');
    assert.equal(await page.locator('#spatial-story').getAttribute('data-phase'),'3');
    const collision=await page.locator('#spatial-canvas').screenshot();
    assert.notEqual(hash(first),hash(collision),'the rendered canvas changes between stages');
    if(s.mobile){await page.locator('[data-spatial-panel="0"]').tap();assert.equal(await page.locator('#spatial-progress').inputValue(),'76');}
    const band=await page.locator('#abstract-band-canvas').screenshot();
    if(s.mobile)await page.locator('[data-spatial-panel="1"]').tap();
    await page.locator('[data-turn="right"]').click();
    const rotated=await page.locator('#spatial-canvas').screenshot();
    assert.notEqual(hash(collision),hash(rotated),'viewpoint button visibly rotates the 3D projection');
    await page.locator('[data-spatial-stage="100"]').click();
    assert.equal(await page.locator('#spatial-story').getAttribute('data-phase'),'4');
    const cap=await page.locator('#spatial-canvas').screenshot();
    assert.notEqual(hash(rotated),hash(cap),'the disk changes the projected picture');
    assert.ok(band.length>3000,'abstract Möbius band image exists');
    await page.locator('#spatial-reset').click();
    await page.locator('#spatial-play').click();
    await page.waitForFunction(()=>Number(document.querySelector('#spatial-progress').value)>=2,null,{timeout:12000});
    await page.locator('#spatial-play').click();
    assert.equal(await page.locator('#spatial-story').getAttribute('data-playing'),'false');
    await page.locator('.reader-tools summary').click();
    await page.locator('#reader-size').selectOption('2');
    await page.locator('#theme-toggle').click();
    const dim=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
    assert.ok(dim.scroll<=dim.view+3,`whole page overflow ${dim.scroll}/${dim.view}`);
    assert.equal(await page.locator('.katex-error').count(),0);
    await page.locator('#spatial-story').screenshot({path:`rectangle-spatial-shots/${lang}-${s.w}-dark.png`});
    assert.deepEqual(errors,[]);
    console.log('PASS',lang,s.w,engine,'both models, motion, rotation, themes and layout');
  }catch(e){
    failures.push(`${lang}/${s.w}: ${e}`);console.error('FAIL',failures.at(-1));
    await page.screenshot({path:`rectangle-spatial-shots/${lang}-${s.w}-failure.png`}).catch(()=>{});
  }finally{await context.close();}
}

// Force WebGL off: the synchronised projection must remain animated and rotatable.
for(const lang of ['zh','en']){
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await ctx.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'||type==='webgl2'?null:original.call(this,type,...args)};});
  const page=await ctx.newPage();
  try{
    await page.goto(base+(lang==='zh'?'rectangle.html':'en/rectangle.html'));
    await page.locator('#spatial-story').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#spatial-story').dataset.engine==='canvas2d',null,{timeout:10000});
    await page.locator('#spatial-play').tap();
    assert.equal(await page.locator('#spatial-progress').inputValue(),'100');
    assert.equal(await page.locator('#spatial-story').getAttribute('data-phase'),'4');
    await page.locator('#diagonal-play').tap();
    assert.equal(await page.locator('#angle').inputValue(),'90');
    console.log('PASS',lang,'GPU-free projection and reduced motion');
  }catch(e){failures.push(`${lang}/fallback: ${e}`);console.error('FAIL',failures.at(-1));}
  finally{await ctx.close();}
}

// Without JavaScript the diagram and its explanation remain available.
const nojs=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
const page=await nojs.newPage();
try{await page.goto(base+'rectangle.html');assert.equal(await page.locator('#spatial-fallback').isVisible(),true);assert.equal(await page.locator('.spatial-math').count(),1);assert.equal(await page.locator('#spatial-play').isVisible(),false);assert.equal(await page.locator('#diagonal-play').isVisible(),false);console.log('PASS static fallback');}
catch(e){failures.push(`no-js: ${e}`);console.error('FAIL',failures.at(-1));}
await nojs.close();
await browser.close();
if(failures.length){console.error('TOTAL FAILURES',failures.length,failures.join('\n'));process.exitCode=1;}
else console.log('Spatial visualisation checks passed.');
