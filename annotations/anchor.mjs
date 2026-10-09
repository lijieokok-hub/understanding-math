/** Canonical text v1: UTF-16 offsets; whitespace collapsed; each formula is one LaTeX token. */
function anchorError(code, message) {const error = new Error(message); error.code = code; return error;}
export const CANONICAL_VERSION = 'text-latex-v1';
const SKIP = 'script,style,noscript,button,input,textarea,select,nav,[contenteditable="true"],[data-annotation-ignore],[hidden]';
const BLOCK = /^(P|DIV|SECTION|ARTICLE|H[1-6]|LI|BLOCKQUOTE|PRE|TR|BR)$/;
export function canonicalize(section) {
  const raw = [];
  const append = (text, node, math = null) => {
    for (let i = 0; i < text.length; i++) raw.push({char: text[i], node, offset: i, math});
  };
  function walk(node) {
    if (node.nodeType === 3) { append(node.data, node); return; }
    if (node.nodeType !== 1 || node.matches(SKIP)) return;
    const isMath = node.matches('[data-latex],.katex,math');
    if (isMath) {
      const latex = node.getAttribute('data-latex') ?? node.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
      if (latex != null) { append(`\\(${latex}\\)`, node, {latex, display: node.matches('[data-display="true"],.katex-display') || !!node.closest('.katex-display')}); return; }
      // Unknown math markup is not silently flattened into duplicated/misleading glyph text.
      throw anchorError('MISSING_LATEX', '公式缺少 LaTeX 源码，暂不能可靠定位。');
    }
    if (node.getAttribute('aria-hidden') === 'true') return;
    if (BLOCK.test(node.tagName)) append(' ', null);
    for (const child of node.childNodes) walk(child);
    if (BLOCK.test(node.tagName)) append(' ', null);
  }
  walk(section);
  const units = [];
  for (const unit of raw) {
    if (/\s/u.test(unit.char)) {
      if (units.length && units.at(-1).char !== ' ') units.push({...unit, char: ' '});
    } else units.push(unit);
  }
  if (units.at(-1)?.char === ' ') units.pop();
  return {text: units.map(u => u.char).join(''), units};
}
const elementOf = node => node?.nodeType === 1 ? node : node?.parentElement;
function overlaps(range, node) {
  const other = node.ownerDocument.createRange();
  other.selectNodeContents(node);
  // The names are reversed: END_TO_START compares this start vs other end.
  return range.compareBoundaryPoints(3, other) < 0 && range.compareBoundaryPoints(1, other) > 0;
}
export function captureSelection(root, selection = root.ownerDocument.getSelection()) {
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const startEl = elementOf(range.startContainer), endEl = elementOf(range.endContainer);
  if (startEl?.closest(SKIP) || endEl?.closest(SKIP)) return null;
  const section = startEl?.closest('[data-annotation-section]');
  if (!section || section !== endEl?.closest('[data-annotation-section]') || !root.contains(section)) return null;
  const model = canonicalize(section);
  let start = -1, end = -1;
  const mathNodes = new Set();
  for (let i = 0; i < model.units.length; i++) {
    const unit = model.units[i];
    if (!unit.node) continue;
    let selected = false;
    if (unit.math) selected = overlaps(range, unit.node);
    else if (range.intersectsNode(unit.node)) {
      const low = range.startContainer === unit.node ? range.startOffset : 0;
      const high = range.endContainer === unit.node ? range.endOffset : unit.node.length;
      selected = unit.offset >= low && unit.offset < high;
    }
    if (selected) { if (start < 0) start = i; end = i + 1; if (unit.math) mathNodes.add(unit.node); }
  }
  if (start < 0) return null;
  while (start < end && model.text[start] === ' ') start++;
  while (end > start && model.text[end - 1] === ' ') end--;
  if (start === end) return null;
  const exact = model.text.slice(start, end);
  if (exact.length > 4000) throw anchorError('SELECTION_TOO_LONG', '所选段落太长，请缩小到 4000 字符以内。');
  const formulas = [...mathNodes].map(node => {
    const first = model.units.findIndex(u => u.node === node);
    const last = model.units.findLastIndex(u => u.node === node) + 1;
    return {...model.units[first].math, start: first - start, end: last - start};
  });
  const sectionId = section.dataset.annotationSection;
  return {docId: root.dataset.docId, version: root.dataset.docVersion, lang: root.dataset.docLang || root.lang,
    canonical: CANONICAL_VERSION, sectionId, sectionTitle: section.dataset.sectionTitle || sectionId,
    quote: {exact, prefix: model.text.slice(Math.max(0, start - 80), start), suffix: model.text.slice(end, end + 80)},
    position: {start, end}, formulas};
}
/** Never approximate/fuzzy match. Unique contextual candidate only; no stale offset fallback across versions. */
export function reanchor(anchor, {text, version, sectionId}) {
  if (anchor.canonical !== CANONICAL_VERSION || anchor.sectionId !== sectionId) return {state: 'orphaned', reasonCode: 'INCOMPATIBLE_ANCHOR', reason: '章节已移除或定位格式不兼容'};
  const exact = anchor.quote.exact;
  if (!exact) return {state: 'orphaned', reasonCode: 'EMPTY_QUOTE', reason: '原文为空'};
  const candidates = [];
  for (let i = text.indexOf(exact); i !== -1; i = text.indexOf(exact, i + 1)) candidates.push(i);
  if (version === anchor.version && text.slice(anchor.position.start, anchor.position.end) === exact &&
      text.slice(Math.max(0, anchor.position.start - anchor.quote.prefix.length), anchor.position.start) === anchor.quote.prefix &&
      text.slice(anchor.position.end, anchor.position.end + anchor.quote.suffix.length) === anchor.quote.suffix) {
    return {state: 'anchored', start: anchor.position.start, end: anchor.position.end};
  }
  if (candidates.length === 0) return {state: 'orphaned', reasonCode: 'QUOTE_CHANGED', reason: '原文已修改，需作者人工关联修订'};
  if (candidates.length === 1) return {state: 'reanchored', start: candidates[0], end: candidates[0] + exact.length};
  const contextual = candidates.filter(i => (!anchor.quote.prefix || text.slice(Math.max(0, i - anchor.quote.prefix.length), i) === anchor.quote.prefix) &&
    (!anchor.quote.suffix || text.slice(i + exact.length, i + exact.length + anchor.quote.suffix.length) === anchor.quote.suffix));
  if (contextual.length === 1) return {state: 'reanchored', start: contextual[0], end: contextual[0] + exact.length};
  return {state: 'ambiguous', reasonCode: 'MULTIPLE_MATCHES', reason: '有多个可能位置，尚未重新定位'};
}
export function rangeForOffsets(section, start, end) {
  const {units} = canonicalize(section);
  const a = units.slice(start, end).find(u => u.node), b = units.slice(start, end).findLast(u => u.node);
  if (!a || !b) return null;
  const range = section.ownerDocument.createRange();
  if (a.math) range.setStartBefore(a.node); else range.setStart(a.node, a.offset);
  if (b.math) range.setEndAfter(b.node); else range.setEnd(b.node, b.offset + 1);
  return range;
}
export function collectManifest(root) {
  return {docId: root.dataset.docId, version: root.dataset.docVersion, lang: root.dataset.docLang || root.lang,
    canonical: CANONICAL_VERSION, sections: [...root.querySelectorAll('[data-annotation-section]')].map(section => ({
      id: section.dataset.annotationSection, title: section.dataset.sectionTitle || section.dataset.annotationSection,
      text: canonicalize(section).text}))};
}
