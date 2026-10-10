(()=>{
 const host=document.getElementById('dialogHost');if(!host)return;

 function previewEntry(){const dialog=host.querySelector('.dialog.hero');if(!dialog)return;let p=dialog.querySelector('[data-bird-preview-entry]');if(!p){p=document.createElement('p');p.dataset.birdPreviewEntry='';p.style.margin='0.8rem 0';const a=document.createElement('a');a.style.cssText='display:block;padding:12px 16px;border:1px solid currentColor;border-radius:10px;color:inherit;text-decoration:underline;line-height:1.5';p.append(a);const actions=dialog.querySelector('.actions');if(actions)actions.after(p);else dialog.append(p);}const en=document.documentElement.lang==='en',a=p.firstElementChild;a.href=en?'benjiu-c-preview/en.html':'benjiu-c-preview/';a.textContent=en?'Meet the new bird · separate preview':'笨啾的新模样 · 独立试玩';}
 function update(){previewEntry();}
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches?.('[data-bird-preview-entry]'))))update();}).observe(host,{childList:true,subtree:true});
 new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});update();
})();
