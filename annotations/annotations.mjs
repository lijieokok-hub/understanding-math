import {captureSelection, canonicalize, reanchor, rangeForOffsets} from './anchor.mjs';
import {getStrings, errorText, codedError} from './locales.mjs';
const el = (doc, tag, text, className) => { const node = doc.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
export function createHttpTransport(base = '/api/annotations', {locale = globalThis.document?.documentElement.lang || 'zh'} = {}) {
  const t = getStrings(locale);
  const url = new URL(base, globalThis.location.href);
  if (url.origin !== globalThis.location.origin || url.search || url.hash) throw codedError('UNSAFE_API_URL', t.errors.UNSAFE_API_URL);
  async function request(suffix, options = {}) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url.href + suffix, {credentials: 'same-origin', redirect: 'error', ...options, signal: controller.signal});
      const data = await response.json().catch(() => null);
      if (!response.ok) throw codedError(data?.code || 'NETWORK_ERROR', t.locale === 'en' ? (t.errors[data?.code] || t.errors.NETWORK_ERROR) : (data?.message || t.errors.NETWORK_ERROR));
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw codedError('TIMEOUT', t.errors.TIMEOUT);
      throw error;
    } finally {clearTimeout(timeout);} 
  }
  return {
    async submit(payload) {
      const data = await request('', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Annotation-Request': '1'}, body: JSON.stringify(payload)});
      if (data?.stored !== true || data.visibility !== 'private' || data.status !== 'pending' || typeof data.id !== 'string') throw codedError('BAD_RESPONSE', t.errors.BAD_RESPONSE);
      return data;
    },
    async list(docId, lang, cursor=null) { const data = await request(`?docId=${encodeURIComponent(docId)}&lang=${encodeURIComponent(lang)}${cursor?'&cursor='+encodeURIComponent(cursor):''}`); if (!Array.isArray(data?.items)||(data.nextCursor!=null&&typeof data.nextCursor!=='string')) throw codedError('BAD_LIST', t.errors.BAD_LIST); return {items:data.items,nextCursor:data.nextCursor||null}; }
  };
}
/** A small native-DOM component. No localStorage, telemetry, HTML interpolation or author controls. */
export function mountAnnotations({root, panel, transport = null, locale, feedbackUrl = null}) {
  const t = getStrings(locale || root?.dataset.docLang || root?.lang || root?.ownerDocument.documentElement.lang);
  if (!root || !panel) throw codedError('ROOT_REQUIRED', t.errors.ROOT_REQUIRED);
  for (const key of ['docId', 'docVersion']) if (!root.dataset[key]) throw codedError('META_REQUIRED', t.errors.META_REQUIRED);
  if (!root.dataset.docLang && !root.lang) throw codedError('META_REQUIRED', t.errors.META_REQUIRED);
  const doc = root.ownerDocument, win = doc.defaultView, cleanup = [], drafts = new Map(), requestKeys = new Map();
  const on = (target, type, handler, options) => {target.addEventListener(type, handler, options); cleanup.push(() => target.removeEventListener(type, handler, options));};
  const live = el(doc, 'p', '', 'annotation-live'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  const button = el(doc, 'button', t.add, 'annotation-selection-button'); button.type = 'button'; button.hidden = true; button.setAttribute('aria-haspopup', 'dialog');
  const menu = el(doc, 'div', undefined, 'annotation-menu'); menu.hidden = true; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', t.selectedText);
  const menuButton = el(doc, 'button', t.add); menuButton.type = 'button'; menuButton.setAttribute('role', 'menuitem'); menu.append(menuButton);
  const dialog = el(doc, 'dialog', undefined, 'annotation-dialog');
  const title = el(doc, 'h2', t.title); title.id = `annotation-title-${Math.random().toString(36).slice(2)}`; dialog.setAttribute('aria-labelledby', title.id);
  const location = el(doc, 'p', '', 'annotation-location'), quote = el(doc, 'blockquote', '', 'annotation-quote');
  const label = el(doc, 'label', t.label);
  const textarea = el(doc, 'textarea'); textarea.rows = 5; textarea.maxLength = 4000; textarea.required = true; textarea.name = 'comment'; label.append(textarea);
  const privacy = el(doc, 'p', t.privacy, 'annotation-help');
  const serviceNote = el(doc, 'p', transport ? '' : t.offlineEditor, 'annotation-help');
  const english=(locale||root.dataset.docLang||'').startsWith('en');
  let feedbackLink=null;
  if(feedbackUrl){
    const target=new URL(feedbackUrl);
    if(target.origin!=='https://understanding-math.lijieokok.chatgpt.site'||target.search||target.hash)throw new Error('Invalid feedback destination');
    feedbackLink=el(doc,'a',english?'Open this section on the original site':'到原站本节提交建议');
    feedbackLink.href=feedbackUrl;feedbackLink.target='_blank';feedbackLink.rel='noopener noreferrer';
    label.hidden=true;
    privacy.textContent=english?'Suggestions and discussions are hosted on the original site. This static edition does not submit or save notes.':'建议与讨论保留在原站。本静态站点不会提交或保存建议。';
    serviceNote.textContent=english?'The link opens the same section in this language. Select the passage again there to submit your suggestion. No selected text is sent by this link.':'链接会打开同语种的原文小节。请在那里重新选取段落后提交建议；链接不会传送这里选中的文字。';
    serviceNote.append(feedbackLink);
  }
  const status = el(doc, 'p', ''); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const actions = el(doc, 'div', undefined, 'annotation-actions'), cancel = el(doc, 'button', t.close), submit = el(doc, 'button', t.save);
  cancel.type = submit.type = 'button'; submit.disabled = !transport; actions.append(cancel); if(!feedbackLink)actions.append(submit);
  dialog.append(title, location, quote, label, privacy, serviceNote, status, actions);
  const host = el(doc, 'div', undefined, 'annotation-ui'); host.dataset.annotationIgnore = ''; host.append(button, menu, dialog, live); doc.body.append(host);
  let current = null, active = null, returnFocus = null, saving = false, destroyed = false, suppressed = false, listEpoch = 0;
  const keyOf = a => JSON.stringify([a.docId, a.version, a.lang, a.sectionId, a.position]);
  function snapshot() { try {return captureSelection(root);} catch (error) { live.textContent = errorText(error, t); return null; } }
  function updateSelection() {
    if (dialog.open || menu.contains(doc.activeElement)) return;
    current = snapshot();
    if (suppressed || !current) { button.hidden = true; return; }
    button.hidden = false;
    const range = doc.getSelection().getRangeAt(0), rect = range.getBoundingClientRect();
    const width = Math.max(140, button.getBoundingClientRect().width), height = button.getBoundingClientRect().height;
    button.style.left = `${Math.max(8, Math.min(win.innerWidth - width - 8, rect.left))}px`;
    button.style.top = `${Math.max(8, Math.min(win.innerHeight - height - 8, rect.bottom + 8))}px`;
  }
  function hideMenu(restore = false) {menu.hidden = true; if (restore) (returnFocus?.isConnected ? returnFocus : root).focus({preventScroll: true});}
  function openEditor(anchor = current) {
    if (!anchor || dialog.open) return;
    active = structuredClone(anchor); returnFocus = root.contains(doc.activeElement) ? doc.activeElement : root;
    hideMenu(); button.hidden = true;
    location.textContent = t.location(active);
    quote.textContent = active.quote.exact; win.MathNotes?.render(quote);
    textarea.value = drafts.get(keyOf(active)) || ''; status.textContent = ''; textarea.disabled = false; submit.disabled = !transport;
    if(feedbackLink){
      const section=[...root.querySelectorAll('[data-annotation-section]')].find(s=>s.dataset.annotationSection===active.sectionId);
      const target=new URL(feedbackUrl);target.hash=section?.id||'';feedbackLink.href=target.href;
    }
    dialog.showModal(); (feedbackLink||textarea).focus();
  }
  function closeEditor() {
    if (saving) {status.textContent = t.waiting; return;}
    if (active && textarea.value) drafts.set(keyOf(active), textarea.value);
    dialog.close(); active = null; suppressed = true; hideMenu(true);
  }
  on(textarea, 'input', () => {if (active) drafts.set(keyOf(active), textarea.value);});
  on(button, 'pointerdown', e => e.preventDefault());
  on(menuButton, 'pointerdown', e => e.preventDefault());
  on(button, 'click', () => openEditor()); on(menuButton, 'click', () => openEditor());
  on(cancel, 'click', closeEditor);
  on(dialog, 'cancel', e => {e.preventDefault(); closeEditor();});
  on(submit, 'click', async () => {
    if (saving || !active || !transport) return;
    const originalText = textarea.value;
    if (!originalText.trim()) {status.textContent = t.empty; textarea.focus(); return;}
    saving = true; submit.disabled = true; textarea.disabled = true; cancel.disabled = true;
    status.textContent = t.saving;
    try {
      const fingerprint = keyOf(active) + '\n' + originalText;
      if (!requestKeys.has(fingerprint)) requestKeys.set(fingerprint, crypto.randomUUID());
      const receipt = await transport.submit({anchor: active, body: originalText, requestKey: requestKeys.get(fingerprint)});
      if (receipt?.stored !== true || receipt.visibility !== 'private' || receipt.status !== 'pending') throw codedError('BAD_RESPONSE', t.errors.BAD_RESPONSE);
      drafts.delete(keyOf(active)); textarea.value = ''; dialog.close(); active = null; suppressed = true;
      live.textContent = t.saved; hideMenu(true);
    } catch (error) {status.textContent = `${errorText(error, t)} ${t.retained}`;}
    finally {saving = false; if (!destroyed) {submit.disabled = !transport; textarea.disabled = false; cancel.disabled = false;}}
  });
  on(doc, 'selectionchange', () => {if (!dialog.open) {suppressed = false; updateSelection();}});
  on(root, 'contextmenu', event => {
    const candidate = snapshot();
    if (!candidate || !root.contains(event.target)) return;
    const keyboard = event.clientX === 0 && event.clientY === 0;
    if (!keyboard) {
      const rects = [...doc.getSelection().getRangeAt(0).getClientRects()];
      if (!rects.some(r => event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom)) return;
    }
    event.preventDefault(); current = candidate; returnFocus = doc.activeElement;
    button.hidden = true; menu.hidden = false;
    menu.style.left = `${Math.max(8, Math.min(win.innerWidth - menu.getBoundingClientRect().width - 8, event.clientX || 16))}px`;
    menu.style.top = `${Math.max(8, Math.min(win.innerHeight - menu.getBoundingClientRect().height - 8, event.clientY || 80))}px`;
    menuButton.focus();
  });
  on(doc, 'keydown', event => {
    if (dialog.open) return;
    if (event.key === 'Escape') {suppressed = true; button.hidden = true; hideMenu(true); return;}
    if (!menu.hidden && ['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {event.preventDefault(); menuButton.focus();}
    if (!menu.hidden && event.key === 'Tab') hideMenu();
    if ((event.ctrlKey && event.altKey && event.key.toLowerCase() === 'm') || (event.shiftKey && event.key === 'F10')) {
      const candidate = snapshot(); if (!candidate) return; event.preventDefault(); current = candidate; openEditor(candidate);
    }
  });
  on(doc, 'pointerdown', event => {if (!menu.contains(event.target)) hideMenu();}, true);
  on(win, 'scroll', () => {hideMenu(); updateSelection();}, {passive: true}); on(win, 'resize', updateSelection, {passive: true});
  let nextPage=null,pageBusy=false,listTail=null,pageStatus=null,moreButton=null;const shown=new Set();
  async function loadPage(cursor,epoch){
    if(pageBusy)return;pageBusy=true;moreButton.disabled=true;pageStatus.textContent=t.loading;
    try{
      const result=await transport.list(root.dataset.docId,root.dataset.docLang||root.lang,cursor);
      if(destroyed||epoch!==listEpoch)return;
      const data=Array.isArray(result)?{items:result,nextCursor:null}:result;
      for(const item of data.items.filter(item=>item.visibility==='approved'))if(!shown.has(item.id)){shown.add(item.id);renderThread(item)}
      nextPage=data.nextCursor||null;pageStatus.textContent=shown.size?'':t.noItems;moreButton.hidden=!nextPage;
    }catch(error){if(!destroyed&&epoch===listEpoch)pageStatus.textContent=t.loadError+errorText(error,t)}
    finally{if(epoch===listEpoch){pageBusy=false;moreButton.disabled=false}}
  }
  async function refresh() {
    const epoch=++listEpoch;panel.replaceChildren();panel.append(el(doc,'h2',t.discussion));shown.clear();nextPage=null;pageBusy=false;
    if(!transport){
      if(feedbackLink){
        panel.append(el(doc,'p',english?'Suggestions and discussions remain on the original site; this static edition does not submit or synchronize them.':'建议和讨论保留在原站；本静态站点不会提交或同步这些内容。'));
        const link=el(doc,'a',english?'Read discussions or send a suggestion on the original site':'到原站查看讨论或提交建议');
        const target=new URL(feedbackUrl);target.hash='article-discussion';link.href=target.href;link.target='_blank';link.rel='noopener noreferrer';panel.append(link);
      }else panel.append(el(doc,'p',t.offlineDiscussion));
      return;
    }
    listTail=el(doc,'div',undefined,'annotation-pages');pageStatus=el(doc,'p');pageStatus.setAttribute('role','status');
    moreButton=el(doc,'button',t.more);moreButton.type='button';moreButton.hidden=true;
    on(moreButton,'click',()=>{if(nextPage)loadPage(nextPage,listEpoch)});listTail.append(pageStatus,moreButton);panel.append(listTail);
    await loadPage(null,epoch);
  }
  function renderThread(item) {
    const card = el(doc, 'article', undefined, 'annotation-thread'); card.dataset.annotationId = item.id;
    const section = [...root.querySelectorAll('[data-annotation-section]')].find(s => s.dataset.annotationSection === item.anchor.sectionId);
    const result = section ? reanchor(item.anchor, {text: canonicalize(section).text, version: root.dataset.docVersion, sectionId: section.dataset.annotationSection}) : {state: 'orphaned', reasonCode: 'SECTION_MISSING'};
    card.append(el(doc, 'p', `${t.states[item.resolutionKind || item.status] || t.unknownState} · ${t.states[result.state]}`), el(doc, 'blockquote', item.anchor.quote.exact), el(doc, 'p', item.body));
    if (result.state === 'anchored' || result.state === 'reanchored') {
      const jump = el(doc, 'button', t.viewPassage); jump.type = 'button'; jump.addEventListener('click', () => {
        const range = rangeForOffsets(section, result.start, result.end); if (!range) return;
        section.scrollIntoView({behavior: 'auto', block: 'center'}); doc.getSelection().removeAllRanges(); doc.getSelection().addRange(range); section.focus({preventScroll: true});
      }); card.append(jump);
    } else card.append(el(doc, 'p', t.reasons[result.reasonCode] || t.reasons.INCOMPATIBLE_ANCHOR, 'annotation-anchor-warning'));
    for (const event of item.events || []) {
      if (event.reply) card.append(el(doc, 'p', t.authorReply + event.reply));
      if (event.revision) { const row = el(doc, 'p', `${t.revision}${event.revision.version} `);
        // Links originate from server-registered relative paths; revalidate before assigning href.
        if (/^\/[a-zA-Z0-9/_\-.]+(?:#[a-zA-Z0-9_\-]+)?$/.test(event.revision.path) && !event.revision.path.startsWith('//')) {
          const link = el(doc, 'a', t.viewRevision); link.href = event.revision.path; row.append(link);
        } card.append(row); }
    }
    if(listTail)panel.insertBefore(card,listTail);else panel.append(card); win.MathNotes?.render(card);
  }
  refresh();
  return {refresh, capture: snapshot, open: () => openEditor(snapshot()), destroy() {destroyed = true; cleanup.forEach(fn => fn()); host.remove(); drafts.clear();}};
}
