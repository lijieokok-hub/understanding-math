import {CANONICAL_VERSION} from './anchor.mjs';
import {ARTICLE_PATHS} from './public-documents.mjs';
export const API_URL = 'https://understanding-math.lijieokok.chatgpt.site/api/annotations';
export const PUBLIC_ORIGIN = 'https://lijieokok-hub.github.io';
export const PUBLIC_PREFIX = '/understanding-math/';
const token = x => typeof x === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(x);
const text = (x,n,empty=false) => typeof x === 'string' && x.length<=n && (empty||!!x.trim()) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(x);
const object = x => !!x && typeof x==='object' && !Array.isArray(x);
const status = x => ['pending','confirmed','resolved'].includes(x);
const resolution = x => x==null || ['revised','answered'].includes(x);
const safePath = p => typeof p==='string' && p.length<=300 && /^\/[a-zA-Z0-9/_\-.]+(?:#[a-zA-Z0-9_\-]+)?$/.test(p) && !p.startsWith('//') && !p.includes('..');
export function publicRevisionHref(path) {
 if(!safePath(path))return null;
 const relative=path.startsWith(PUBLIC_PREFIX)?path.slice(PUBLIC_PREFIX.length):path.slice(1);
 const [file]=relative.split('#');
 return ARTICLE_PATHS.includes(file) ? PUBLIC_PREFIX+relative : null;
}
export function validatePublicPage(data,docId,lang){
 if(!object(data)||!Array.isArray(data.items)||data.items.length>50||(data.nextCursor!=null&&!text(data.nextCursor,2048)))return false;
 return data.items.every(item=>{
  if(!object(item)||!token(item.id)||item.visibility!=='approved'||!status(item.status)||!resolution(item.resolutionKind)||!text(item.body,4000)||!text(item.createdAt,64)||('reviewVersion' in item))return false;
  const a=item.anchor;
  if(!object(a)||a.docId!==docId||a.lang!==lang||!token(a.version)||a.canonical!==CANONICAL_VERSION||!token(a.sectionId)||!text(a.sectionTitle,300)||!object(a.quote)||!text(a.quote.exact,4000)||!text(a.quote.prefix,80,true)||!text(a.quote.suffix,80,true)||!object(a.position)||!Number.isSafeInteger(a.position.start)||!Number.isSafeInteger(a.position.end)||a.position.start<0||a.position.end<=a.position.start||a.position.end-a.position.start!==a.quote.exact.length||!Array.isArray(a.formulas)||a.formulas.length>100)return false;
  if(!a.formulas.every(f=>object(f)&&text(f.latex,4000)&&typeof f.display==='boolean'&&Number.isSafeInteger(f.start)&&Number.isSafeInteger(f.end)&&f.start>=0&&f.end>f.start&&f.end<=a.quote.exact.length))return false;
  if(item.currentPath!=null&&!safePath(item.currentPath))return false;
  if(!Array.isArray(item.events)||item.events.length>1000)return false;
  return item.events.every(e=>object(e)&&token(e.id)&&e.visibility==='approved'&&status(e.status)&&resolution(e.resolutionKind)&&text(e.createdAt,64)&&(e.reply==null||text(e.reply,4000,true))&&!('reviewVersion' in e)&&(e.revision==null||(object(e.revision)&&token(e.revision.id)&&token(e.revision.version)&&safePath(e.revision.path))));
 });
}
