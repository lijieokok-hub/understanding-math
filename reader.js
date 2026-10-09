'use strict';
(()=>{
const en=document.documentElement.lang==='en', L=(zh,english)=>en?english:zh;
const PREF_KEY='math-understanding.preferences.v1',RECORD_KEY='math-understanding.reading.v1';
const defaults={theme:'light',scale:1,leading:1.9};
const $=id=>document.getElementById(id);
function normalizePreferences(raw){return {theme:raw?.theme==='dark'?'dark':'light',scale:[1,1.12,1.25,1.5,2].includes(Number(raw?.scale))?Number(raw.scale):1,leading:[1.7,1.9,2.15].includes(Number(raw?.leading))?Number(raw.leading):1.9};}
function normalizeRecord(raw){if(!raw||typeof raw!=='object'||typeof raw.page!=='string'||!/^(?:en\/)?(?:popular|graduate|topic|lecture|method|demo|close-reading|standard-factor|reading-[a-z0-9]+|reading-h10-appendix|reading-h11-(?:spatial|detection|predictor|parameters)|reading-h12-history|reading-h13-(?:technical|sources))\.html$/.test(raw.page)||!Number.isFinite(raw.percent)||raw.percent<0||raw.percent>100||!Number.isFinite(raw.updatedAt))return null;return {page:raw.page,title:typeof raw.title==='string'?raw.title.slice(0,160):raw.page,percent:raw.percent,y:Math.max(0,Number(raw.y)||0),heading:typeof raw.heading==='string'?raw.heading.slice(0,120):'',offset:Math.max(0,Number(raw.offset)||0),updatedAt:raw.updatedAt};}
function resumeDestination(record){
 const titles=window.MATH_DOCUMENT_TITLES||{},canonical=record.page.replace(/^en\//,''),preferred=(en?'en/':'')+canonical;
 const translated=typeof titles[preferred]==='string'&&titles[preferred].length>0;
 const target=translated?preferred:record.page;let anchor='';try{if(record.heading)anchor='#'+encodeURIComponent(record.heading)}catch{}
 return {href:(en?'../':'')+target+anchor,title:translated?titles[preferred]:L('上次阅读的页面','Last reading page'),originalLanguage:!translated&&target.startsWith('en/')!==en};
}
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
let storageWorks=true;function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{storageWorks=false;showStorage(L('此浏览器暂不能保存本地记录；当前页面的阅读设置仍然有效。','This browser cannot save reading history. Current reading settings still apply.'));return false}}
function showStorage(text){if($('reader-storage-note'))$('reader-storage-note').textContent=text}
let preferences=normalizePreferences(read(PREF_KEY,defaults));
function applyPreferences(p,persist=true){preferences=normalizePreferences(p);document.documentElement.dataset.theme=preferences.theme;document.documentElement.style.setProperty('--reader-size',`${1.125*preferences.scale}rem`);document.documentElement.style.setProperty('--reader-leading',String(preferences.leading));if($('reader-size'))$('reader-size').value=String(preferences.scale);if($('reader-leading'))$('reader-leading').value=String(preferences.leading);if($('theme-toggle')){$('theme-toggle').textContent=preferences.theme==='dark'?L('切换浅色','Light mode'):L('切换暗色','Dark mode');$('theme-toggle').setAttribute('aria-pressed',String(preferences.theme==='dark'));}if(persist)save(PREF_KEY,preferences);queueUpdate(false);}
let scheduled=false,everInteracted=false,saveTimer=null;const page=document.body.dataset.page||'index.html';
const tocLinks=Array.from(document.querySelectorAll('.reading-toc a[href^="#"]'));
const headings=tocLinks.map(a=>document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)))).filter(Boolean);
// A heading without its own ID navigates to its section, so measure that target too.
const detailedHeadings=Array.from(document.querySelectorAll('main h2,main h3')).map(heading=>{const el=heading.id?heading:heading.closest('section[id]');return el?{el,id:el.id,heading}:null}).filter(Boolean);
function visibleAnchor(el){return !el.closest('details:not([open]),[hidden]')&&el.getClientRects().length>0&&!['hidden','collapse'].includes(getComputedStyle(el).visibility);}
function cssPixels(value){const n=parseFloat(value);return Number.isFinite(n)?n*(String(value).endsWith('%')?window.innerHeight/100:1):0;}
function readingGeometry(){
 const padding=cssPixels(getComputedStyle(document.scrollingElement||document.documentElement).scrollPaddingTop);
 const tolerance=1/(window.devicePixelRatio||1);let covered=0;
 for(const el of document.querySelectorAll('.site-header,.reader-tools,.progress-track')){
  const style=getComputedStyle(el),rect=el.getBoundingClientRect();
  if(['sticky','fixed'].includes(style.position)&&style.top!=='auto'&&visibleAnchor(el)&&rect.bottom>0&&rect.top<=cssPixels(style.top)+tolerance)covered=Math.max(covered,rect.bottom);
 }
 return {padding,covered,tolerance};
}
function hashTarget(){try{return document.getElementById(decodeURIComponent(location.hash.slice(1)))}catch{return null}}
function nearestReadingAnchor(){
 const geometry=readingGeometry(),candidates=detailedHeadings.length?detailedHeadings:headings.map(el=>({el,id:el.id}));
 const incoming=hashTarget();
 // Keep an exact native hash landing (including page-end clamping) on a pure
 // language roundtrip. Geometry, rather than a sticky flag, releases it on scroll.
 if(incoming?.closest('main')&&incoming.matches('h2,h3,section')&&visibleAnchor(incoming)){
  const margin=cssPixels(getComputedStyle(incoming).scrollMarginTop),top=incoming.getBoundingClientRect().top;
  const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  const landing=Math.max(0,Math.min(max,top+window.scrollY-geometry.padding-margin));
  if(Math.abs(window.scrollY-landing)<=geometry.tolerance)return {el:incoming,id:incoming.id};
 }
 let found=null;
 for(const x of candidates){
  if(!visibleAnchor(x.heading||x.el)||!visibleAnchor(x.el))continue;
  const margin=cssPixels(getComputedStyle(x.el).scrollMarginTop);
  const start=Math.max(geometry.padding+margin,geometry.covered);
  if(x.el.getBoundingClientRect().top<=start+geometry.tolerance)found=x;
 }
 return found;
}
function activeTocAnchor(id){
 const target=$(id);let active=headings.find(visibleAnchor)?.id||'';
 if(!target)return active;
 for(const h of headings){
  if(!visibleAnchor(h))continue;
  if(h===target||h.contains(target)||target.contains(h))return h.id;
  if(h.compareDocumentPosition(target)&Node.DOCUMENT_POSITION_FOLLOWING)active=h.id;
 }
 return active;
}
let records=read(RECORD_KEY,{});if(!records||typeof records!=='object'||Array.isArray(records))records={};
records=Object.fromEntries(Object.entries(records).map(([k,v])=>[k,normalizeRecord(v)]).filter(([k,v])=>v&&k===v.page));
const stored=records[page];
function currentPosition(){const span=Math.max(0,document.documentElement.scrollHeight-window.innerHeight),y=Math.max(0,window.scrollY),anchor=nearestReadingAnchor();return {page,title:document.title.split('｜')[0],percent:span?Math.max(0,Math.min(100,y/span*100)):100,y,heading:anchor?.id||'',offset:anchor?Math.max(0,y-(anchor.el.getBoundingClientRect().top+y)):0,updatedAt:Date.now()};}
function persistPosition(){if(!everInteracted||page.endsWith('index.html'))return;const pos=currentPosition();if(pos.y<60&&pos.percent<5)return;records[page]=pos;save(RECORD_KEY,records);}
function updateProgress(persist){scheduled=false;const pos=currentPosition();if($('reading-progress')){$('reading-progress').setAttribute('aria-valuenow',String(Math.round(pos.percent)));$('reading-progress').setAttribute('aria-valuetext',L(`页面位置 ${Math.round(pos.percent)}%`,`Page position: ${Math.round(pos.percent)}%`));}if($('reading-progress-fill'))$('reading-progress-fill').style.width=`${pos.percent}%`;if($('reading-progress-text'))$('reading-progress-text').textContent=page.endsWith('index.html')?L('免费阅读','Free to read'):L(`页面 ${Math.round(pos.percent)}%`,`Page ${Math.round(pos.percent)}%`);const active=activeTocAnchor(pos.heading);tocLinks.forEach(a=>{if(a.getAttribute('href')===`#${active}`)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});if(persist){clearTimeout(saveTimer);saveTimer=setTimeout(persistPosition,350);}}
function queueUpdate(persist){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>updateProgress(persist));}
function revealAnchor(){for(let p=hashTarget()?.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;}revealAnchor();window.addEventListener('hashchange',()=>{revealAnchor();queueUpdate(false)});
if('scrollRestoration' in history)history.scrollRestoration='manual';
if(stored&&stored.percent>3&&$('resume-banner')){$('resume-banner').hidden=false;$('resume-description').textContent=L(`上次停在约 ${Math.round(stored.percent)}%。点击“继续上次阅读”后才恢复位置。`,`Last position: about ${Math.round(stored.percent)}%. Select “Resume reading” to return there.`);}
$('resume-reading')?.addEventListener('click',()=>{if(!stored)return;$('resume-banner').hidden=true;const h=stored.heading?document.getElementById(stored.heading):null;const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);const target=h?h.getBoundingClientRect().top+window.scrollY+stored.offset:max*stored.percent/100;everInteracted=true;window.scrollTo({top:Math.max(0,Math.min(max,target)),behavior:'auto'});$('resume-banner').hidden=true;queueUpdate(true);});
const recent=Object.values(records).filter(r=>r.percent>3).sort((a,b)=>b.updatedAt-a.updatedAt)[0];if(page.endsWith('index.html')&&recent&&$('home-resume')){const destination=resumeDestination(recent);$('home-resume').hidden=false;$('home-resume-link').href=destination.href;$('home-resume-link').textContent=L(`继续阅读：${destination.title}`,`Continue reading: ${destination.title}`);$('home-resume-position').textContent=L(`上次记录位置约 ${Math.round(recent.percent)}%`,`Last recorded position: about ${Math.round(recent.percent)}%`)+(destination.originalLanguage?L(' · 打开原阅读语言的页面',' · Opens in the saved reading language'):'');}
$('theme-toggle')?.addEventListener('click',()=>{applyPreferences({...preferences,theme:preferences.theme==='dark'?'light':'dark'});window.UnderstandingMicro?.onThemeToggle(document.documentElement.dataset.theme);});
$('reader-size')?.addEventListener('change',e=>applyPreferences({...preferences,scale:Number(e.target.value)}));
$('reader-leading')?.addEventListener('change',e=>applyPreferences({...preferences,leading:Number(e.target.value)}));
$('reader-reset-settings')?.addEventListener('click',()=>{applyPreferences(defaults);showStorage(L('已恢复默认阅读设置。设置与进度只保存在这个浏览器。','Default settings restored. Settings and reading history stay in this browser.'));});
$('reader-clear-progress')?.addEventListener('click',()=>{try{localStorage.removeItem(RECORD_KEY);records={};everInteracted=false;clearTimeout(saveTimer);if($('resume-banner'))$('resume-banner').hidden=true;if($('home-resume'))$('home-resume').hidden=true;showStorage(L('本地阅读记录已清除。再次滚动阅读后会重新记录。','Local reading history cleared. It will be recorded again when reading resumes.'));}catch{showStorage(L('此浏览器暂不能清除本地记录。','This browser cannot clear reading history at the moment.'));}});
tocLinks.forEach(a=>a.addEventListener('click',()=>{everInteracted=true;queueUpdate(true);}));
const toc=$('page-toc-details');if(toc&&matchMedia('(max-width: 760px)').matches)toc.open=false;
for(const name of ['wheel','touchstart','keydown'])window.addEventListener(name,()=>{everInteracted=true;},{passive:true});
window.addEventListener('scroll',()=>queueUpdate(everInteracted),{passive:true});window.addEventListener('resize',()=>queueUpdate(false),{passive:true});window.addEventListener('pagehide',persistPosition);
const input=$('reference-search'),items=Array.from(document.querySelectorAll('[data-reference-item]'));
function filterReferences(){if(!input)return;const tokens=input.value.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);let count=0;for(const item of items){const hay=item.textContent.normalize('NFKC').toLocaleLowerCase();const shown=tokens.every(t=>hay.includes(t));item.hidden=!shown;if(shown)count++;}$('reference-count').textContent=L(`显示 ${count} / ${items.length} 项来源`,`Showing ${count} of ${items.length} references`);$('reference-empty').hidden=count!==0;}
input?.addEventListener('input',filterReferences);$('reference-clear')?.addEventListener('click',()=>{input.value='';filterReferences();input.focus();});
if(page.endsWith('index.html')&&['#references','#resources','#topic'].includes(location.hash)){location.replace('topic.html'+(location.hash==='#resources'?'#intro-video':location.hash));}
document.querySelectorAll('[data-language]').forEach(a=>{const base=a.getAttribute('href');let captured=null;function currentHash(){const anchor=nearestReadingAnchor();return anchor?'#'+anchor.id:''}function sync(hash=currentHash()){a.href=base+hash}sync();window.addEventListener('hashchange',()=>sync());a.addEventListener('pointerdown',()=>{captured=currentHash();sync(captured)});a.addEventListener('pointercancel',()=>{captured=null});a.addEventListener('blur',()=>{captured=null});a.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')captured=null});a.addEventListener('click',e=>{sync(e.detail===0?currentHash():(captured??currentHash()));captured=null;try{localStorage.setItem('math-understanding.language.v1',a.dataset.language)}catch{}})});
applyPreferences(preferences,false);filterReferences();queueUpdate(false);
})();
