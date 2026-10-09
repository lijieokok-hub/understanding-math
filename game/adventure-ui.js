import {availableChapters} from './campaign.js';
export function chapterChooser({lang,levels,records}){
 const tx=(zh,en)=>lang?en:zh;
 const entries=availableChapters(levels.length);
 const title=tx('挑一页接着飞。','Choose your next page.');
 const cards=entries.map(c=>{const r=records[c.id];return `<button data-level="${c.runtime}"><strong>${String(c.chapter).padStart(2,'0')}${r?.completed?' · ✓':''}</strong>${c.title[lang]}${r?.best?`<small>◇ ${r.best}</small>`:''}</button>`}).join('');
 return `<h2>${title}</h2><div class="level-grid">${cards}</div><div class="actions"><button id="resume">${tx('返回','Back')}</button></div><details class="progress-tools"><summary>${tx('保存这趟旅程','Keep this journey')}</summary><div class="actions"><button id="exportProgress">${tx('导出进度','Export progress')}</button><button id="importProgress">${tx('导入进度','Import progress')}</button><input id="progressFile" type="file" accept="application/json,.json" hidden></div><p class="fine">${tx('进度只保存在当前浏览器，不会按登录账号自动分开，也不会自动同步到其他浏览器或设备。共用这个浏览器的人会共用这份记录；清除此网站的浏览器数据可能使记录丢失。换设备前可先导出，再到新设备导入。','Progress is saved in this browser and shared by anyone using it. Signing into a different account does not create a separate game save. Progress does not sync across browsers or devices, and clearing this site’s browser data can erase it. To move your progress, export a save file and import it on the other device.')}</p><p class="fine">${tx('导入时保留更高记录。进度文件只包含游戏关卡与羽毛记录。','Import keeps the better records. Save files contain only game chapters and feather records.')}</p></details>`;
}
