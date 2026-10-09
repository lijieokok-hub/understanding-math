/* Local deterministic chapter search. No network, persistence, or query evaluation. */
(function (root) {
  'use strict';
  const MAX_QUERY = 160;
  const aliases = [
    [/(?<![a-z])(?:theorems?|thm\.?|定理)\s*(\d+(?:\s*\.\s*\d+)*)(?![a-z0-9]|\s*\.\s*\d)/giu, ' theorem$1 '],
    [/(?<![a-z])(?:propositions?|prop\.?|命题)\s*(\d+(?:\s*\.\s*\d+)*)(?![a-z0-9]|\s*\.\s*\d)/giu, ' proposition$1 '],
    [/(?<![a-z])(?:lemmas?|lem\.?|引理)\s*(\d+(?:\s*\.\s*\d+)*)(?![a-z0-9]|\s*\.\s*\d)/giu, ' lemma$1 '],
    [/(?<![a-z])(?:corollar(?:y|ies)|cor\.?|推论)\s*(\d+(?:\s*\.\s*\d+)*)(?![a-z0-9]|\s*\.\s*\d)/giu, ' corollary$1 ']
  ];
  function normalize(value) {
    let text = String(value || '').normalize('NFKC').toLowerCase().replace(/[，。；：、！？]/g, ' ')
      .replace(/[–—−]/g, '-')
      .replace(/\\[\[\]()]/g, ' ');
    for (const [pattern, replacement] of aliases) text = text.replace(pattern, (_,number)=>' '+replacement.trim().replace('$1',number.replace(/\s/g,''))+' ');
    return text.replace(/\s+/g, ' ').trim();
  }
  function compact(value) { return normalize(value).replace(/\s+/g, ''); }
  function isNumbered(term) {
    return /^(?:(?:theorem|proposition|lemma|corollary)|number:)\d+(?:\.\d+)*$/.test(term);
  }
  function sourcePaper(item) {
    // Only public source metadata can establish these editorial paper codes.
    // Never infer a code from prose, a word ending, a filename, or a number.
    const found=/^([ABCDHR])(?=\s+(?:[§·]|(?:Theorems?|Propositions?|Lemmas?|Corollar(?:y|ies))\b))/i.exec(item.source.normalize('NFKC'));
    return found ? found[1].toLowerCase() : '';
  }
  function normalizeQuery(value, paperIds) {
    const known=[...new Set(paperIds.map(normalize))].sort((a,b)=>b.length-a.length);
    if (!known.length) return normalize(value);
    const paper=known.map(id=>id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
    const kind='(?:theorems?|thm\\.?|定理|propositions?|prop\\.?|命题|lemmas?|lem\\.?|引理|corollar(?:y|ies)|cor\\.?|推论)';
    const number='\\d+(?:\\s*\\.\\s*\\d+)*';
    const pattern=new RegExp('(^|\\s)('+paper+')\\s*('+kind+'\\s*)?('+number+')(?![a-z0-9]|\\s*\\.\\s*\\d)','gi');
    // Quotes keep their existing literal-phrase semantics. A bare paper+number
    // is type-neutral; an explicit Theorem/Lemma/etc. keeps that exact type.
    return value.normalize('NFKC').split('"').map((part,i)=>normalize(i%2 ? part : part.replace(pattern,
      (_,boundary,id,label,n)=>boundary+id+' '+(label||'number:')+n.replace(/\s/g,'')))).join('"');
  }
  function withPaperPreferences(parsed, paperIds=[]) {
    const allTerms=parsed.allTerms||parsed.terms;
    const known=new Set(paperIds.map(normalize));
    const numbered=allTerms.some(isNumbered);
    const paperTerms=numbered?allTerms.filter(term=>known.has(term)):[];
    return {...parsed,allTerms,paperTerms,terms:allTerms.filter(term=>!paperTerms.includes(term))};
  }
  function parseQuery(raw, paperIds=[]) {
    const value = String(raw || '');
    if (value.length > MAX_QUERY) return { error: 'long', terms: [], value };
    const normalized = normalizeQuery(value.replace(/[“”]/g, '"'), paperIds);
    const pieces = []; let buffer = ''; let quoted = false;
    for (const ch of normalized) {
      if (ch === '"') { if (buffer.trim()) pieces.push(buffer.trim()); buffer = ''; quoted = !quoted; }
      else if (/\s/.test(ch) && !quoted) { if (buffer) pieces.push(buffer); buffer = ''; }
      else buffer += ch;
    }
    if (buffer.trim()) pieces.push(buffer.trim());
    return withPaperPreferences({ value, terms: [...new Set(pieces)], error: null },paperIds);
  }
  function safePath(path) {
    return /^(?:en\/)?(?:index|topic|popular|close-reading|standard-factor|graduate|lecture|method|demo|reading-[0-9]{2}[a-z]?|reading-r(?:0[1-5])?|reading-h(?:0[1-9]|10(?:-appendix)?|11(?:-(?:spatial|detection|predictor|parameters))?|12(?:-history)?|13(?:-(?:technical|sources))?)?)\.html$/.test(path)
      || /^(?:en\/)?report\/index\.html$/.test(path);
  }
  function safeRecord(item, locale) {
    return item && typeof item.path === 'string' && safePath(item.path)
      && (item.path.startsWith('en/') ? 'en' : 'zh') === locale
      && typeof item.anchor === 'string' && /^[\w.:-]+$/.test(item.anchor)
      && typeof item.id === 'string' && item.id === item.path + '#' + item.anchor
      && ['title','heading','body','source'].every(key => typeof item[key] === 'string')
      && (item.relatedRefs === undefined || (Array.isArray(item.relatedRefs) && item.relatedRefs.every(ref=>typeof ref==='string')))
      && (item.primaryRefs === undefined || (Array.isArray(item.primaryRefs) && item.primaryRefs.every(ref =>
        ref && ['ref','paper','kind','sourceUrl'].every(key=>typeof ref[key]==='string')
        && /^(?:Theorem|Proposition|Lemma|Corollary) [0-9]+(?:\.[0-9]+)*$/.test(ref.ref)
        && /^[A-Za-z][A-Za-z0-9.-]{0,31}$/.test(ref.paper) && ['reading','statement'].includes(ref.kind)
        && typeof ref.sourceUrl === 'string' && /^https:\/\/[A-Za-z0-9.-]+(?::[0-9]+)?\/[^?#\s]*$/.test(ref.sourceUrl)
        && matches(normalize(item.heading+' '+item.body), normalize(ref.ref)))))
      && Array.isArray(item.refs) && item.refs.every(ref => typeof ref === 'string');
  }
  function prepare(index, locale) {
    if (!index || index.schema !== 1 || index.locale !== locale || !Array.isArray(index.records)) throw new Error('index');
    const ids = new Set();
    const prepared=index.records.filter(item => {
      if (!safeRecord(item, locale)) throw new Error('record');
      const id = item.path + '#' + item.anchor;
      if (ids.has(id)) return false;
      ids.add(id); return true;
    }).map(item => ({ item,
      title:normalize(item.title), heading:normalize(item.heading),
      source:normalize(item.source+' '+item.refs.join(' ')+' '+(item.relatedRefs||[]).join(' ')),
      text:normalize(item.body), compactText:compact(item.body),
      all:normalize([item.title,item.heading,item.source,item.refs.join(' '),(item.relatedRefs||[]).join(' '),item.body].join(' '))
    }));
    // Known identities come only from validated public editorial provenance.
    prepared.paperIds=[...new Set(prepared.flatMap(entry=>[sourcePaper(entry.item),...(entry.item.primaryRefs||[]).map(ref=>normalize(ref.paper))]).filter(Boolean))];
    return prepared;
  }
  function matches(field, term) {
    // A paper+number query also finds bare section/equation identifiers in
    // passage text and references, without guessing a statement type.
    if (/^number:\d+(?:\.\d+)*$/.test(term)) return new RegExp('(?:^|[^a-z0-9.])(?:(?:theorem|proposition|lemma|corollary))?'+term.slice(7).replaceAll('.', '\\.')+'(?![a-z0-9]|\\.\\d)').test(field);
    // Numbered statements are exact identifiers: 3.2 must not match 3.20.
    if (/^(?:theorem|proposition|lemma|corollary)\d+(?:\.\d+)*$/.test(term)) return new RegExp('(?:^|[^a-z0-9])'+term.replaceAll('.', '\\.')+'(?![a-z0-9]|\\.\\d)').test(field);
    return field.includes(term);
  }
  function subnumber(field,term) {
    if (/^number:\d+(?:\.\d+)*$/.test(term)) return new RegExp('(?:^|[^a-z0-9.])(?:(?:theorem|proposition|lemma|corollary))?'+term.slice(7).replaceAll('.', '\\.')+'\\.\\d').test(field);
    return /^(?:theorem|proposition|lemma|corollary)\d+(?:\.\d+)*$/.test(term)
      && new RegExp('(?:^|[^a-z0-9])'+term.replaceAll('.', '\\.')+'\\.\\d').test(field);
  }
  function matchBasis(item,terms) {
    const direct=normalize([item.heading,item.body].join(' '));
    const all=normalize([item.heading,item.body,item.title,item.source,item.refs.join(' '),(item.relatedRefs||[]).join(' ')].join(' '));
    if(terms.some(t=>!matches(all,t)&&subnumber(all,t)))return 'subnumber';
    if(terms.every(t=>matches(direct,t)))return 'direct';
    return 'scope';
  }
  function score(entry, terms) {
    let points=0;
    for (const term of terms) {
      if (!matches(entry.all,term) && !subnumber(entry.all,term) && !(term.includes('\\') && entry.compactText.includes(compact(term)))) return -1;
      if (subnumber(entry.all,term) && !matches(entry.all,term)) {points+=0;continue;}
      if (matches(entry.heading,term)) points+=30;
      else if (matches(entry.title,term)) points+=14;
      else if (matches(entry.text,term)) points+=9;
      else if (matches(entry.source,term)) points+=1;
      else points+=3;
    }
    return points;
  }
  function primaryMatches(item,terms) {
    const numbered=terms.filter(isNumbered);
    if(!numbered.length)return [];
    const refs=(item.primaryRefs||[]).filter(ref=>numbered.some(term=>matches(normalize(ref.ref),term)));
    // Exact annotated targets only; do not transfer authority by number or paper.
    // A multi-identifier query must have an annotation for every identifier.
    return numbered.every(term=>refs.some(ref=>matches(normalize(ref.ref),term)))?refs:[];
  }
  function primaryPriority(item,terms,paperTerms=[]) {
    const refs=primaryMatches(item,terms);
    if(!refs.length)return 0;
    // A separate paper token is a ranking preference, never a corpus filter.
    // Match the verified editorial identity exactly; do not guess from a number.
    return refs.some(ref=>paperTerms.includes(normalize(ref.paper)))?2:1;
  }
  function compareHits(a,b,terms,paperTerms=[]) {
    const aChild=matchBasis(a.item,terms)==='subnumber', bChild=matchBasis(b.item,terms)==='subnumber';
    return Number(aChild)-Number(bChild)
      || primaryPriority(b.item,terms,paperTerms)-primaryPriority(a.item,terms,paperTerms)
      || Number(paperTerms.includes(sourcePaper(b.item)))-Number(paperTerms.includes(sourcePaper(a.item)))
      || b.score-a.score || a.item.id.localeCompare(b.item.id);
  }
  function search(prepared, query) {
    const parsed=typeof query==='string'?parseQuery(query,prepared.paperIds||[]):
      typeof query.value==='string'?parseQuery(query.value,prepared.paperIds||[]):withPaperPreferences(query,prepared.paperIds||[]);
    if (parsed.error || !parsed.terms.length) return [];
    return prepared.map(entry=>({item:entry.item,score:score(entry,parsed.terms)}))
      .filter(hit=>hit.score>=0).sort((a,b)=>compareHits(a,b,parsed.terms,parsed.paperTerms));
  }
  function mathTokens(value) {
    const parts=[];let cursor=0;
    while(cursor<value.length) {
      const inline=value.indexOf('\\(',cursor), display=value.indexOf('\\[',cursor);
      const start=inline<0?display:display<0?inline:Math.min(inline,display);
      if(start<0) {parts.push({text:value.slice(cursor)});break;}
      if(start>cursor)parts.push({text:value.slice(cursor,start)});
      const close=value.slice(start,start+2)==='\\('? '\\)' : '\\]';
      const end=value.indexOf(close,start+2);
      if(end<0) {parts.push({text:value.slice(start)});break;}
      parts.push({math:value.slice(start+2,end), display:close==='\\]'});cursor=end+2;
    }
    return parts;
  }
  function snippet(item, terms, locale) {
    const paragraphs=item.body.split('\n').filter(Boolean);
    let best=paragraphs[0]||'', bestScore=-1;
    for(const paragraph of paragraphs) {
      const normal=normalize(paragraph), cmp=compact(paragraph);
      const weight=terms.reduce((s,t)=>s+(matches(normal,t)||subnumber(normal,t)||(t.includes('\\')&&cmp.includes(compact(t)))?1:0),0);
      if(weight>bestScore) {best=paragraph;bestScore=weight;}
    }
    const tokens=mathTokens(best); let first=-1;
    for(let i=0;i<tokens.length;i++) if(terms.some(t=>(matches(normalize(tokens[i].text||tokens[i].math),t)||subnumber(normalize(tokens[i].text||tokens[i].math),t)))) {first=i;break;}
    const start=first>0?Math.max(0,first-1):0, result=[];
    if(start>0)result.push({text:'… '});
    let budget=230;
    for(let i=start;i<tokens.length&&budget>0;i++) {
      const token=tokens[i];
      if(token.math!==undefined) {
        const short=token.math.length<=100 && !/\\(?:tag|begin|end|label)\b/.test(token.math) && !token.display;
        if(short) {result.push({math:token.math});budget-=Math.min(65,token.math.length);}
        else {
          const hit=terms.some(t=>compact(token.math).includes(compact(t)));
          result.push({text:locale==='zh'?(hit?'［本节公式匹配］':'［公式见原节］'):(hit?'[Formula match in this section]':'[See formula in the section]')});budget-=35;
        }
      } else {
        let text=token.text;
        // Slice text only. TeX is an indivisible token and never cut or highlighted.
        if(i===start && text.length>budget) {
          const normal=normalize(text);let match=-1;
          for(const term of terms) {const pos=normal.indexOf(term);if(pos>=0&&(match<0||pos<match))match=pos;}
          if(match>70)text='… '+text.slice(Math.max(0,match-55));
        }
        if(text.length>budget) {result.push({text:text.slice(0,budget)+'…'});budget=0;}
        else {result.push({text});budget-=text.length;}
      }
      if(budget<=0 && i<tokens.length-1)result.push({text:' …'});
    }
    return result;
  }
  root.MathChapterSearch={MAX_QUERY,isNumbered,normalize,compact,parseQuery,prepare,score,search,snippet,mathTokens,safePath,matches,subnumber,matchBasis,primaryMatches,primaryPriority,compareHits};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MathChapterSearch;
})(typeof window==='undefined'?globalThis:window);
