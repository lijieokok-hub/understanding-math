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
await browser.close();
if(failures.length){console.error('TOTAL FAILURES',failures.length,failures.join('\n'));process.exitCode=1;}
else console.log('All JAY math-site diagnostics passed ('+pages.length*sizes.length+' viewports).');
