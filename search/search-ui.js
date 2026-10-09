(function () {
  'use strict';
  const root=document.querySelector('[data-chapter-search]');if(!root)return;
  const locale=root.dataset.locale==='en'?'en':'zh', en=locale==='en';
  const ui={
    empty:en?'Enter a word, phrase, theorem number, or LaTeX fragment.':'输入词语、短语、定理编号或 LaTeX 片段。',
    none:en?'No matching chapters. Try a shorter term or a theorem number.':'没有找到匹配章节。试试更短的词语或定理编号。',
    fail:en?'The local search index could not be loaded. Open the reading map, or keep the search files together when using an offline copy.':'本地检索索引未能加载。可先打开阅读地图；使用离线副本时，请保留完整的检索文件。',
    long:en?'Use at most 160 characters.':'最多可输入 160 个字符。',
    busy:en?'Searching chapters…':'正在检索章节……',
    formula:en?'[See formula in the section]':'［公式见原节］',
    source:en?'Source location: ':'原文定位：',
    section:en?'Open section':'打开本节',
    count:(n,shown)=>en?`${n} matching chapter${n===1?'':'s'}; ${shown} shown.`:`找到 ${n} 个匹配章节，已显示 ${shown} 个。`
  };
  const input=root.querySelector('input'), form=root.querySelector('form'), clear=root.querySelector('[data-search-clear]');
  const status=root.querySelector('[data-search-status]'), list=root.querySelector('[data-search-results]');
  const more=root.querySelector('[data-search-more]'), state=root.querySelector('[data-search-state]');
  const switcher=document.querySelector('[data-search-language]');
  const engine=window.MathChapterSearch;
  let prepared, hits=[], shown=0, generation=0, timer=0, parsed, composing=false;
  function text(tag,value,cls) {const node=document.createElement(tag);node.textContent=value;if(cls)node.className=cls;return node;}
  function announce(value) {status.dataset.visualHidden=String(!state.hidden);status.textContent=value;}
  function showState(value) {state.textContent=value;state.hidden=false;}
  function updateLanguage() {
    // Fragment-only URL, never sent to the server. No query telemetry or local query storage.
    try {history.replaceState(null,'',location.pathname+location.search+(input.value?'#q='+encodeURIComponent(input.value.slice(0,160)):''));}catch(error){}

    if(!switcher)return;
    const base=switcher.dataset.target;
    switcher.setAttribute('href',base+(input.value?'#q='+encodeURIComponent(input.value.slice(0,160)):''));
  }
  function renderTokens(container,tokens) {
    for(const token of tokens) {
      const span=document.createElement('span');
      if(token.math!==undefined) {
        // Data comes only from the generated public index, never from the query.
        if(window.MathNotes&&typeof window.renderMathInElement==='function') {
          window.MathNotes.setText(span,'\\('+token.math+'\\)');
          if(span.dataset.mathError||!span.querySelector('.katex'))span.textContent=ui.formula;
        } else span.textContent=ui.formula;
      } else span.textContent=token.text;
      container.append(span);
    }
  }
  function appendBatch(focusNew) {
    const stamp=generation, fragment=document.createDocumentFragment(), start=shown;
    for(const hit of hits.slice(shown,shown+20)) {
      if(stamp!==generation)return;
      const item=hit.item, li=document.createElement('li'), h=document.createElement('h2');
      const link=text('a','');link.setAttribute('aria-label',item.heading.replace(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g,(_,display,inline)=>(display??inline).trim()));link.href=(en?'../':'')+item.path+'#'+encodeURIComponent(item.anchor);
      renderTokens(link,engine.mathTokens(item.heading)); h.append(link);li.append(h);
      const primary=typeof engine.primaryMatches==='function'?engine.primaryMatches(item,parsed.terms):[];
      if(primary.length)li.append(text('p',primary.map(ref=>
        (ref.kind==='statement'?(en?'Statement entry (editor-marked): ':'正式陈述入口（编辑标注）：'):
          (en?'Dedicated reading entry (editor-marked): ':'专门讲解入口（编辑标注）：'))+ref.paper+' · '+ref.ref
      ).join(' · '),'search-result-source'));
      const basis=engine.matchBasis(item,parsed.terms);
      li.append(text('p',basis==='subnumber'?(en?'Related subnumber, not an exact identifier':'子编号相关，非精确编号'):
        basis==='direct'?(en?'Mentioned in this passage':'本段直接提及'):(en?'Chapter source scope / enclosing heading':'章节引用范围／上级标题关联'),'search-result-source'));
      const title=text('p','', 'search-result-title');renderTokens(title,engine.mathTokens(item.title));li.append(title);
      const preview=text('p','', 'search-result-context');renderTokens(preview,engine.snippet(item,parsed.terms,locale));li.append(preview);
      const refs=[...item.refs].sort((a,b)=>Number(parsed.terms.some(t=>engine.matches(engine.normalize(b),t)))-Number(parsed.terms.some(t=>engine.matches(engine.normalize(a),t))));
      const location=[item.source,...refs.slice(0,6)].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ');
      if(location){const source=text('p','', 'search-result-source');renderTokens(source,engine.mathTokens(ui.source+location));li.append(source);}
      fragment.append(li);
    }
    if(stamp!==generation)return;
    list.append(fragment);shown=Math.min(shown+20,hits.length);more.hidden=shown>=hits.length;
    let count=ui.count(hits.length,shown);
    if(parsed.terms.some(t=>/^(?:(?:theorem|proposition|lemma|corollary)|number:)\d+(?:\.\d+)*$/.test(t))) {
      const children=hits.filter(hit=>engine.matchBasis(hit.item,parsed.terms)==='subnumber').length;
      count+=en?` Exact identifier: ${hits.length-children}; related subnumber: ${children}.`:` 精确编号 ${hits.length-children} 个；子编号相关 ${children} 个。`;
    }
    announce(count);
    if(focusNew)list.children[start]?.querySelector('a')?.focus();
  }
  function begin() {
    clearTimeout(timer);root.removeAttribute('aria-busy');const stamp=++generation;hits=[];shown=0;list.replaceChildren();more.hidden=true;updateLanguage();
    input.removeAttribute('aria-invalid');parsed=engine.parseQuery(input.value,prepared.paperIds||[]);
    if(parsed.error) {input.setAttribute('aria-invalid','true');showState(ui.long);announce(ui.long);return;}
    if(!parsed.terms.length){showState(ui.empty);announce(ui.empty);return;}
    state.hidden=true;announce(ui.busy);root.setAttribute('aria-busy','true');
    let cursor=0;const found=[];
    function chunk() {
      if(stamp!==generation)return;
      const until=Math.min(cursor+100,prepared.length);
      for(;cursor<until;cursor++){const entry=prepared[cursor],score=engine.score(entry,parsed.terms);if(score>=0)found.push({item:entry.item,score});}
      if(cursor<prepared.length){timer=setTimeout(chunk,0);return;}
      if(stamp!==generation)return;
      hits=found.sort((a,b)=>engine.compareHits(a,b,parsed.terms,parsed.paperTerms));root.removeAttribute('aria-busy');
      if(!hits.length){showState(ui.none);announce(ui.none);return;}
      appendBatch(false);
    }
    timer=setTimeout(chunk,0);
  }
  function queue(){if(composing)return;clearTimeout(timer);++generation;root.removeAttribute('aria-busy');timer=setTimeout(begin,120);updateLanguage();}
  function reset(){clearTimeout(timer);++generation;input.value='';root.removeAttribute('aria-busy');begin();input.focus();}
  try {prepared=engine.prepare(window.MathChapterIndex,locale);}
  catch(error){showState(ui.fail);announce(ui.fail);input.disabled=true;form.querySelector('[type=submit]').disabled=true;clear.disabled=true;more.hidden=true;return;}
  form.addEventListener('submit',event=>{event.preventDefault();if(!composing)begin();});
  input.addEventListener('input',queue);
  input.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer);++generation;root.removeAttribute('aria-busy');});
  input.addEventListener('compositionend',()=>{composing=false;queue();});
  input.addEventListener('keydown',event=>{if(event.key==='Escape'&&!composing){event.preventDefault();reset();}});
  clear.addEventListener('click',reset);more.addEventListener('click',()=>appendBatch(true));
  // Fragments never travel in the HTTP request; they are not a persistence guarantee about browser history.
  if(location.hash.startsWith('#q=')) {
    try{const query=decodeURIComponent(location.hash.slice(3));if(query.length<=160)input.value=query;}catch(error){}
  }
  const coverage=root.querySelector('[data-search-coverage]');
  if(coverage) {
    const pages=new Map();for(const entry of prepared)if(!pages.has(entry.item.path))pages.set(entry.item.path,entry.item.title);
    for(const [path,title] of pages) {const li=document.createElement('li');const a=text('a',title);a.href=(en?'../':'')+path;li.append(a);coverage.append(li);}
  }
  begin();
})();
