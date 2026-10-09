(()=>{
 const host=document.getElementById('dialogHost');if(!host)return;
 function update(){const tools=host.querySelector('.progress-tools');if(!tools)return;let p=tools.querySelector('[data-migration-help]');if(!p){p=document.createElement('p');p.className='fine';p.dataset.migrationHelp='';p.append(document.createElement('a'));tools.append(p);}const en=document.documentElement.lang==='en',a=p.firstElementChild;a.href=en?'../en/migration.html':'../migration.html';a.textContent=en?'Moving from the original site? Export and import your progress.':'从原站搬来？查看进度导出与导入方法。';}
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches?.('[data-migration-help]'))))update();}).observe(host,{childList:true,subtree:true});
 new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});update();
})();
