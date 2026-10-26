import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const root='http://127.0.0.1:4173/';
const strict=process.env.JAY_STRICT==='true';
const failures=[];
const pages=[
 {id:'home',url:'index.html'},
 {id:'home-en',url:'en/index.html'},
 {id:'topic',url:'topic.html'},
 {id:'topic-en',url:'en/topic.html'},
 {id:'search',url:'search.html'},
 {id:'article',url:'reading-01.html'}
];
const sizes=[{id:'tiny',width:320,height:720},{id:'phone',width:390,height:844},{id:'tablet',width:768,height:1024},{id:'desktop',width:1440,height:900}];
await mkdir('jay-math-qa-shots',{recursive:true});
for(const p of pages)for(const size of sizes){
 const page=await browser.newPage({viewport:{width:size.width,height:size.height},deviceScaleFactor:1});
 const errs=[];
 page.on('pageerror',e=>errs.push(String(e)));
 try{
  const response=await page.goto(root+p.url,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response?.status(),200,p.id+' HTTP status');
  await page.waitForSelector('main',{timeout:12000});
  await page.waitForTimeout(p.id==='article'?750:260);
  const d=await page.evaluate(()=>{
   const sel=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect(),st=getComputedStyle(e);return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),display:st.display,font:st.fontSize,lines:st.lineHeight};};
   const overflow=Array.from(document.querySelectorAll('body *')).map(e=>{const r=e.getBoundingClientRect();return {name:e.tagName+'.'+String(e.className?.baseVal||e.className||'').slice(0,40),right:Math.round(r.right),left:Math.round(r.left),w:Math.round(r.width)};}).filter(v=>v.right>innerWidth+5 && v.left>=0).slice(0,8);
   return {pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,hero:sel('.home-hero'),brand:sel('.site-brand'),header:sel('.header-links'),toolbar:sel('.reader-tools'),reader:sel('.reading-shell'),title:sel('main h1'),math:sel('.math-display'),overflow};
  });
  const shot=['home','home-en','topic','article','search'].includes(p.id) && ['tiny','phone','desktop'].includes(size.id);
  if(shot)await page.screenshot({path:'jay-math-qa-shots/'+p.id+'-'+size.id+'.png',animations:'disabled'});
  console.log('METRIC',p.id,size.id,JSON.stringify(d));
  if(strict){
   assert.ok(d.pageWidth<=d.viewport+3,'horizontal overflow: '+p.id+' '+size.id+' '+d.pageWidth+'/'+d.viewport);
   assert.ok(d.header!==null,'header links');
   assert.ok(errs.length===0,p.id+' errors: '+errs.join('|'));
  }
  console.log('PASS',p.id,size.id);
 }catch(e){failures.push(p.id+'/'+size.id+': '+String(e));console.error('FAIL',failures.at(-1));}
 finally{await page.close();}
}
if(strict){
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{await p.goto(root+'index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(400);assert.equal(await p.locator('.jay-math-mote').count(),0);console.log('PASS reduced motion');}
 catch(e){failures.push('reduced motion '+String(e));}finally{await p.close();}
}

if(strict){
 for(const route of ['index.html','en/index.html','reading-01.html']){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
   await page.goto(root+route,{waitUntil:'domcontentloaded'});
   const toggle=page.locator('.jay-math-menu-toggle');
   const nav=page.locator('header.site-header nav.header-links');
   assert.equal(await toggle.isVisible(),true,route+' mobile menu button');
   assert.equal(await nav.isVisible(),false,route+' closed nav');
   await toggle.click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   assert.equal(await nav.isVisible(),true);
   const links=nav.locator('a[href]');
   assert.ok(await links.count()>=5,route+' complete navigation');
   for(let i=0;i<await links.count();i++){
    assert.equal(await links.nth(i).isVisible(),true,route+' visible link '+i);
   }
   await page.screenshot({path:'jay-math-qa-shots/'+route.replaceAll('/','-')+'-menu-phone.png',animations:'disabled'});
   await page.keyboard.press('Escape');
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   assert.equal(await nav.isVisible(),false);
   const focusData=await page.evaluate(()=>({active:document.activeElement?.outerHTML?.slice(0,280),toggle:document.querySelector('.jay-math-menu-toggle')?.outerHTML?.slice(0,240)}));
   console.log('FOCUS DETAIL',route,JSON.stringify(focusData));
   assert.equal(await toggle.evaluate(e=>e===document.activeElement),true,'focus returned after escape');
   console.log('PASS accessible mobile menu',route);
  }catch(e){failures.push('menu '+route+': '+String(e));console.error('FAIL',failures.at(-1));}
  finally{await page.close();}
 }
 const settings=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await settings.goto(root+'reading-01.html',{waitUntil:'domcontentloaded'});
  const before=await settings.locator('main h1').textContent();
  await settings.locator('summary').filter({hasText:'阅读设置'}).first().click();
  await settings.locator('#reader-size').selectOption('2');
  assert.equal(await settings.locator('#reader-size').inputValue(),'2','200% text setting');
  assert.equal(await settings.locator('main h1').textContent(),before,'mathematical title unchanged');
  await settings.locator('#theme-toggle').click();
  assert.equal(await settings.locator('html').getAttribute('data-theme'),'dark','dark mode works');
  await settings.screenshot({path:'jay-math-qa-shots/article-dark-phone.png',animations:'disabled'});
  const overflow=await settings.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
  const overflowData=await settings.evaluate(()=>({full:document.documentElement.scrollWidth,viewport:innerWidth,offenders:Array.from(document.querySelectorAll('body *')).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,cls:String(el.className?.baseVal||el.className||'').slice(0,85),w:Math.round(r.width),left:Math.round(r.left),right:Math.round(r.right),parent:el.parentElement?.className?.toString().slice(0,60)};}).filter(x=>x.right>innerWidth+3&&x.left>-3).slice(0,30)}));
  console.log('ZOOM DETAIL',JSON.stringify(overflowData));
  const overflowTrace=await settings.evaluate(()=>{
    const selectors=['html','body','.site-header','.brand-row','.reader-tools','.reader-tools-inner','.reading-shell','.reader-main','main','#article-discussion','.reader-main .math-display','.reader-main .formula'];
    const containers=selectors.map(selector=>{
      const e=document.querySelector(selector);
      if(!e)return {selector,missing:true};
      const r=e.getBoundingClientRect(),s=getComputedStyle(e);
      return {selector,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,right:Math.round(r.right),width:Math.round(r.width),overflowX:s.overflowX};
    });
    const candidates=Array.from(document.querySelectorAll('body *')).map(e=>({e,r:e.getBoundingClientRect()}))
    .filter(({e,r})=>r.right>innerWidth+2 && r.right<innerWidth+90 && r.left>-3 && !e.closest('.katex,.katex-mathml'))
    .slice(0,55).map(({e,r})=>({tag:e.tagName,cls:String(e.className?.baseVal||e.className||'').slice(0,60),right:Math.round(r.right),left:Math.round(r.left),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,parent:String(e.parentElement?.className||'').slice(0,60),overflowX:getComputedStyle(e).overflowX}));
    return {containers,candidates};
  });
  console.log('ZOOM TRACE',JSON.stringify(overflowTrace));
  assert.ok(overflow[0]<=overflow[1]+3,'200% text no horizontal overflow');
  console.log('PASS reading preferences 200%, theme, mathematical text');
 }catch(e){failures.push('reader preferences: '+String(e));console.error('FAIL',failures.at(-1));}
 finally{await settings.close();}
 const fallback=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});
 try{
  await fallback.goto(root+'index.html',{waitUntil:'domcontentloaded'});
  assert.equal(await fallback.locator('.header-links').isVisible(),true,'no-JS full nav');
  assert.equal(await fallback.locator('.jay-math-menu-toggle').count(),0);
  assert.equal(await fallback.locator('.jay-reading-card').count(),3);
  console.log('PASS no-JavaScript navigation and reading paths');
 }catch(e){failures.push('no-JS fallback: '+String(e));console.error('FAIL',failures.at(-1));}
 finally{await fallback.close();}
 const themePage=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  await themePage.goto(root+'index.html',{waitUntil:'domcontentloaded'});
  const titleMotion=await themePage.locator('.home-hero .hero-brand').evaluate(e=>getComputedStyle(e).animationName);
  assert.equal(titleMotion,'none','reduced motion homepage');
  const ways=themePage.locator('.jay-reading-card');
  assert.equal(await ways.count(),3);
  console.log('PASS reduced-motion editorial layout');
 }catch(e){failures.push('reduced-motion layout: '+String(e));console.error('FAIL',failures.at(-1));}
 finally{await themePage.close();}
}
await browser.close();
if(failures.length){console.error('TOTAL FAILURES',failures.length,failures.join('\n'));process.exitCode=1;}
else console.log('All JAY math-site diagnostics passed ('+pages.length*sizes.length+' viewports).');
