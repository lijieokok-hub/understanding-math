import {mountAnnotations, createHttpTransport} from './annotations.mjs';
import {PUBLIC_ORIGIN, PUBLIC_PREFIX} from './public-contract.mjs';
const root=document.querySelector('main[data-doc-id]'),panel=document.getElementById('article-discussion');
if(root&&panel){
 const locale=root.dataset.docLang||document.documentElement.lang;
 const connected=!window.__OFFLINE_MATH__&&location.origin===PUBLIC_ORIGIN&&location.pathname.startsWith(PUBLIC_PREFIX);
 mountAnnotations({root,panel,locale,transport:connected?createHttpTransport(undefined,{locale}):null});
}
