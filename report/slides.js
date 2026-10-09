(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const slides = Array.from(document.querySelectorAll('section.slide'));
  if (!slides.length) return;
  const faces = slides.map(slide => Array.from(slide.querySelectorAll(':scope > .slide-face')));
  const total = slides.length;
  const mainCount = Number(document.body.dataset.mainCount) || 22;
  const en = (document.body.dataset.lang || document.documentElement.lang || document.body.lang || '').startsWith('en');
  const tr = (zh, english) => en ? english : zh;
  const PROTOCOL = 'recovered-report-presenter-v1';
  const currentURL = new URL(window.location.href);
  const detachedView = currentURL.searchParams.get('presenter') === '1';
  const expectedOrigin = currentURL.protocol === 'file:' ? 'null' : currentURL.origin;
  const targetOrigin = expectedOrigin === 'null' ? '*' : expectedOrigin;
  let session = currentURL.searchParams.get('rp-session') || '';
  let openerWindow = detachedView ? window.opener : null;
  let childWindow = null;
  let connected = false;
  let hasLostConnection = false;
  let lastRemoteRevision = -1;
  let lastRemoteTime = -1;
  let revision = 0;
  let sequence = 0;
  let lastCommandSequence = -1;
  let current = 0;
  let step = 0;
  let presenter = false;
  let overviewHome = null;
  let printSnapshot = null;
  let focusedBeforeHelp = null;
  let theme = 'light';
  const timer = { running: false, elapsed: 0, topicElapsed: 0, anchor: Date.now() };
  const overview = $('overview');
  const bind = (id, fn) => { const node = $(id); if (node) node.addEventListener('click', fn); };
  const setText = (id, value) => { const node = $(id); if (node) node.textContent = value; };
  const setAttr = (id, key, value) => { const node = $(id); if (node) node.setAttribute(key, String(value)); };
  const now = () => Date.now();
  const clientId = uniqueSession();
  let childClient = '';
  const stepCount = index => Math.max(1, faces[index].length);
  const hashFor = (index = current, face = step) => '#slide-' + (index + 1) + (face ? '-step-' + (face + 1) : '');
  const titleFor = index => slides[index].dataset.title || slides[index].querySelector('h1,h2')?.textContent || '';
  const slotFor = index => slides[index].dataset.kind === 'backup' || index >= mainCount
    ? tr('备查 ', 'Backup ') + (index - mainCount + 1) + ' / ' + (total - mainCount)
    : tr('主线 ', 'Main ') + (index + 1) + ' / ' + mainCount;
  const durationFor = index => {
    const minutes = Number(slides[index].dataset.duration);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  };
  function elapsed(at = now()) {
    const delta = timer.running ? Math.max(0, at - timer.anchor) : 0;
    return { elapsed: timer.elapsed + delta, topicElapsed: timer.topicElapsed + delta };
  }
  function settleTimer(at = now()) {
    const values = elapsed(at);
    timer.elapsed = values.elapsed;
    timer.topicElapsed = values.topicElapsed;
    timer.anchor = at;
  }
  function formatTime(milliseconds) {
    const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
    const minutes = Math.floor(seconds / 60);
    return String(minutes).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  function announce(message) { setText('live', message); }
  function updateLanguageLinks() {
    document.querySelectorAll('a#report-language, a.report-language, .report-language a').forEach(link => {
      try {
        const url = new URL(link.getAttribute('href'), window.location.href);
        url.hash = hashFor();
        // Keep an independent presenter's role and authenticated session across language changes.
        const href = link.getAttribute('href');
        if (detachedView && session && url.origin === expectedOrigin) {
          url.searchParams.set('presenter', '1');
          url.searchParams.set('rp-session', session);
          link.setAttribute('href', href.split(/[?#]/)[0] + url.search + url.hash);
        } else link.setAttribute('href', href.split('#')[0] + url.hash);
      } catch (_) { /* Ignore an unusable link, never invent a destination. */ }
    });
  }
  function nextPosition() {
    if (step + 1 < stepCount(current)) return { index: current, step: step + 1 };
    if (current + 1 < total) return { index: current + 1, step: 0 };
    return null;
  }
  function previousPosition() {
    if (step > 0) return { index: current, step: step - 1 };
    if (current > 0) return { index: current - 1, step: stepCount(current - 1) - 1 };
    return null;
  }
  function cleanClone(node) {
    const clone = node.cloneNode(true);
    [clone, ...clone.querySelectorAll('[id]')].forEach(item => item.removeAttribute('id'));
    clone.removeAttribute('hidden');
    clone.removeAttribute('aria-hidden');
    clone.classList.remove('reveal-hidden');
    return clone;
  }
  function preview(host, index, face) {
    host.replaceChildren();
    const wrapper = document.createElement('div');
    wrapper.className = 'presenter-preview';
    wrapper.appendChild(cleanClone(faces[index][face]));
    host.appendChild(wrapper);
  }
  function renderPresenter() {
    if (!presenter) return;
    setText('presenter-current-label', tr('当前 · ', 'Current · ') + slotFor(current) + ' · ' + (step + 1) + '/' + stepCount(current));
    preview($('presenter-current'), current, step);
    const following = nextPosition();
    if (following) {
      setText('presenter-next-label', tr('下一步 · ', 'Next · ') + slotFor(following.index) + ' · ' + (following.step + 1) + '/' + stepCount(following.index));
      preview($('presenter-next'), following.index, following.step);
    } else {
      setText('presenter-next-label', tr('报告结束', 'End of report'));
      $('presenter-next').replaceChildren();
      const message = document.createElement('p');
      message.className = 'presenter-end';
      message.textContent = tr('已到最后一页。', 'You have reached the last page.');
      $('presenter-next').appendChild(message);
    }
    const notes = slides[current].querySelector('.notes-content');
    const container = $('presenter-notes');
    container.replaceChildren();
    if (notes) container.appendChild(cleanClone(notes));
    else container.textContent = tr('本主题没有讲述稿。', 'No speaker notes for this topic.');
    $('presenter-prev').disabled = !previousPosition();
    $('presenter-next-button').disabled = !following;
    updateTimerDisplay();
  }
  function updateTimerDisplay() {
    const values = elapsed();
    setText('presenter-total-time', formatTime(values.elapsed));
    setText('presenter-topic-time', formatTime(values.topicElapsed));
    const budget = durationFor(current);
    setText('presenter-topic-budget', budget ? tr('建议 ', 'Target ') + budget + tr(' 分钟', ' min') : tr('未设建议时长', 'No target duration'));
    $('presenter-topic-clock')?.classList.toggle('over-budget', budget > 0 && values.topicElapsed > budget * 60000);
    const start = $('timer-start'), pause = $('timer-pause');
    if (start) start.disabled = timer.running;
    if (pause) pause.disabled = !timer.running;
    setText('presenter-timer-state', timer.running ? tr('计时中', 'Running') : tr('已暂停', 'Paused'));
  }
  function show(index, face = 0, options = {}) {
    index = Number.isFinite(index) ? Math.trunc(index) : current;
    index = Math.max(0, Math.min(total - 1, index));
    face = Number.isFinite(face) ? Math.trunc(face) : 0;
    face = Math.max(0, Math.min(stepCount(index) - 1, face));
    if (index !== current && !options.keepTopicTimer) {
      settleTimer();
      timer.topicElapsed = 0;
    }
    current = index;
    step = face;
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === current);
      slide.setAttribute('aria-hidden', String(i !== current));
      faces[i].forEach((node, j) => {
        node.classList.toggle('reveal-hidden', j !== (i === current ? step : 0));
        node.setAttribute('aria-hidden', String(i !== current || j !== step));
      });
    });
    const page = $('page');
    if (page) { page.value = String(current + 1); page.max = String(total); }
    setText('total', total);
    setText('step-counter', (step + 1) + ' / ' + stepCount(current));
    if ($('prev')) $('prev').disabled = !previousPosition();
    if ($('next')) $('next').disabled = !nextPosition();
    const totalFaces = faces.reduce((sum, group) => sum + group.length, 0);
    const visibleOrdinal = faces.slice(0, current).reduce((sum, group) => sum + group.length, 0) + step + 1;
    if ($('progress-fill')) $('progress-fill').style.width = visibleOrdinal / totalFaces * 100 + '%';
    document.querySelectorAll('.overview-grid button[data-index]').forEach(button => {
      const selected = Number(button.dataset.index) === current;
      button.classList.toggle('current', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    announce(slotFor(current) + ' · ' + titleFor(current) + ' · ' + tr('步骤 ', 'Step ') + (step + 1) + '/' + stepCount(current));
    if (options.hash !== false && window.location.hash !== hashFor()) {
      window.history.replaceState(null, '', hashFor());
    }
    updateLanguageLinks();
    renderPresenter();
  }
  function parseHash() {
    const match = window.location.hash.match(/^#slide-(\d+)(?:-step-(\d+))?$/);
    return match ? { index: Number(match[1]) - 1, step: Number(match[2] || 1) - 1 } : { index: 0, step: 0 };
  }
  function setTheme(value) {
    theme = value === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    setAttr('theme', 'aria-pressed', theme === 'dark');
    try {
      const raw = JSON.parse(window.localStorage.getItem('math-understanding.preferences.v1') || '{}');
      const preferences = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      window.localStorage.setItem('math-understanding.preferences.v1', JSON.stringify({ ...preferences, theme }));
    } catch (_) { /* A blocked or malformed store must not break the report. */ }
  }
  function toggleOverview(force) {
    if (!overview) return;
    const open = typeof force === 'boolean' ? force : !overview.classList.contains('open');
    overview.classList.toggle('open', open);
    setAttr('overview-toggle', 'aria-expanded', open);
    setAttr('presenter-overview-toggle', 'aria-expanded', open);
    if (open) overview.querySelector('.current')?.focus?.();
  }
  function moveOverview(intoPresenter) {
    if (!overview) return;
    if (intoPresenter && !overviewHome) {
      overviewHome = document.createComment('presenter-overview-home');
      overview.parentNode.insertBefore(overviewHome, overview);
      $('presenter-overview-host').appendChild(overview);
    } else if (!intoPresenter && overviewHome) {
      overviewHome.parentNode.insertBefore(overview, overviewHome);
      overviewHome.remove();
      overviewHome = null;
    }
  }
  function setPresenter(active) {
    presenter = Boolean(active);
    ensurePresenter();
    moveOverview(presenter);
    document.body.classList.toggle('presenter-mode', presenter);
    $('presenter-panel').hidden = !presenter;
    setAttr('presenter-toggle', 'aria-pressed', presenter);
    if ($('main')) $('main').setAttribute('aria-hidden', String(presenter));
    if (presenter) renderPresenter();
  }
  function connectionText() {
    if (hasLostConnection) return tr('已断连：投影窗口已关闭或离开。保留最后页面、步骤及计时状态，现可独立继续。', 'Disconnected: the projection window closed or left. The last page, step and timer state are retained; continue independently.');
    if (detachedView && connected) return tr('已连接投影窗口 · 双向同步', 'Connected to projection · two-way sync');
    if (detachedView && openerWindow) return tr('正在连接投影窗口…', 'Connecting to projection…');
    if (detachedView) return tr('独立讲者窗口 · 可本地操作与计时', 'Standalone presenter · local navigation and timer');
    return childWindow && !childWindow.closed ? tr('讲者窗口已打开 · 双向同步', 'Presenter window open · two-way sync') : tr('同窗讲者模式', 'Presenter in this window');
  }
  function updateConnection() { setText('presenter-connection', connectionText()); }
  function ensurePresenter() {
    if ($('presenter-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'presenter-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', tr('讲者视图', 'Presenter view'));
    panel.innerHTML = `<div class="presenter-toolbar"><div><strong>${tr('讲者视图', 'Presenter view')}</strong><p id="presenter-connection" role="status"></p></div><div class="presenter-actions"><button id="presenter-overview-toggle" aria-controls="overview" aria-expanded="false">${tr('目录', 'Overview')}</button><button id="presenter-exit">${tr('返回投影片', 'Back to slides')}</button></div></div>
      <div id="presenter-overview-host"></div>
      <div class="presenter-grid"><section class="presenter-current-pane"><h2 id="presenter-current-label"></h2><div id="presenter-current"></div></section><section class="presenter-next-pane"><h2 id="presenter-next-label"></h2><div id="presenter-next"></div></section>
      <section class="presenter-notes-pane"><h2>${tr('本主题讲述稿与技术备注', 'Speaker notes and technical details')}</h2><div id="presenter-notes"></div></section>
      <section class="presenter-timing-pane" aria-label="${tr('报告计时', 'Presentation timer')}"><h2>${tr('计时', 'Timer')}</h2><div class="presenter-clock"><span>${tr('总用时', 'Total')}</span><output id="presenter-total-time">00:00</output></div><div id="presenter-topic-clock" class="presenter-clock"><span>${tr('本主题', 'This topic')}</span><output id="presenter-topic-time">00:00</output><small id="presenter-topic-budget"></small></div><p id="presenter-timer-state"></p><div class="presenter-actions"><button id="timer-start">${tr('开始', 'Start')}</button><button id="timer-pause">${tr('暂停', 'Pause')}</button><button id="timer-reset">${tr('重置计时', 'Reset timers')}</button></div><p class="presenter-timer-help">${tr('换主题重置本主题时间；展开第二步不重置。重置会清零两个计时并暂停。', 'Changing topic resets its timer; revealing the next step does not. Reset clears both timers and pauses.')}</p><div class="presenter-actions presenter-navigation"><button id="presenter-prev">${tr('← 上一步', '← Previous')}</button><button id="presenter-next-button">${tr('下一步 →', 'Next →')}</button></div></section></div>
`;
    document.body.appendChild(panel);
    bind('presenter-overview-toggle', () => toggleOverview());
    bind('presenter-exit', () => setPresenter(false));
    bind('presenter-prev', () => command({ name: 'previous' }));
    bind('presenter-next-button', () => command({ name: 'next' }));
    bind('timer-start', () => command({ name: 'start' }));
    bind('timer-pause', () => command({ name: 'pause' }));
    bind('timer-reset', () => command({ name: 'reset' }));
    updateConnection();
  }
  function snapshot() {
    const at = now();
    return { index: current, step, theme, timer: { ...elapsed(at), running: timer.running }, at, revision };
  }
  function validSnapshot(value) {
    return value && Number.isInteger(value.index) && value.index >= 0 && value.index < total &&
      Number.isInteger(value.step) && value.step >= 0 && value.step < stepCount(value.index) &&
      ['light', 'dark'].includes(value.theme) && Number.isFinite(value.at) &&
      Number.isSafeInteger(value.revision) && value.revision >= 0 && value.timer &&
      typeof value.timer.running === 'boolean' && ['elapsed', 'topicElapsed'].every(key =>
        Number.isFinite(value.timer[key]) && value.timer[key] >= 0 && value.timer[key] < 1e12);
  }
  function applySnapshot(value) {
    if (!validSnapshot(value)) return false;
    if (value.revision < lastRemoteRevision || (value.revision === lastRemoteRevision && value.at < lastRemoteTime)) return false;
    lastRemoteRevision = value.revision;
    lastRemoteTime = value.at;
    const at = now();
    const transit = value.timer.running ? Math.max(0, at - value.at) : 0;
    timer.elapsed = value.timer.elapsed + transit;
    timer.topicElapsed = value.timer.topicElapsed + transit;
    timer.running = value.timer.running;
    timer.anchor = at;
    const changed = current !== value.index || step !== value.step;
    setTheme(value.theme);
    if (changed) show(value.index, value.step, { keepTopicTimer: true });
    else updateTimerDisplay();
    return true;
  }
  function send(target, kind, payload = {}) {
    if (!target || target.closed) return false;
    try {
      target.postMessage({ protocol: PROTOCOL, session, client: clientId, kind, ...payload }, targetOrigin);
      return true;
    } catch (_) { return false; }
  }
  function sendState() {
    if (childWindow && !childWindow.closed) send(childWindow, 'state', { state: snapshot() });
  }
  function disconnect() {
    if (!openerWindow) return;
    // Timer already contains the latest snapshot and continues from its local anchor.
    settleTimer();
    openerWindow = null;
    connected = false;
    hasLostConnection = true;
    updateConnection();
    announce(connectionText());
  }
  function checkOpener() {
    if (!openerWindow) return false;
    try { if (openerWindow.closed) { disconnect(); return false; } }
    catch (_) { disconnect(); return false; }
    return true;
  }
  function validCommand(value) {
    if (!value || !['next', 'previous', 'go', 'start', 'pause', 'reset', 'theme'].includes(value.name)) return false;
    return value.name !== 'go' || (Number.isInteger(value.index) && value.index >= 0 && value.index < total &&
      Number.isInteger(value.step) && value.step >= 0 && value.step < stepCount(value.index));
  }
  function execute(value) {
    if (!validCommand(value)) return;
    if (value.name === 'next' || value.name === 'previous') {
      const target = value.name === 'next' ? nextPosition() : previousPosition();
      if (target) show(target.index, target.step);
    } else if (value.name === 'go') show(value.index, value.step);
    else if (value.name === 'theme') setTheme(theme === 'dark' ? 'light' : 'dark');
    else {
      settleTimer();
      if (value.name === 'start') timer.running = true;
      if (value.name === 'pause') timer.running = false;
      if (value.name === 'reset') { timer.running = false; timer.elapsed = 0; timer.topicElapsed = 0; }
      updateTimerDisplay();
    }
    revision += 1;
    sendState();
  }
  function command(value) {
    if (!validCommand(value)) return;
    if (detachedView && checkOpener()) {
      if (send(openerWindow, 'command', { command: value, sequence: ++sequence })) return;
      disconnect();
    }
    execute(value);
  }
  function uniqueSession() {
    try { return window.crypto.randomUUID(); }
    catch (_) { return 'r-' + now().toString(36) + '-' + Math.random().toString(36).slice(2); }
  }
  function openPresenterWindow() {
    if (detachedView) { setPresenter(true); return; }
    if (childWindow && !childWindow.closed) {
      childWindow.focus?.();
      sendState();
      return;
    }
    const url = new URL(window.location.href);
    session = uniqueSession();
    url.searchParams.set('presenter', '1');
    url.searchParams.set('rp-session', session);
    url.hash = hashFor();
    lastCommandSequence = -1;
    childClient = '';
    // This must stay directly inside the user's click/keyboard gesture.
    childWindow = window.open(url.href, 'report-presenter-' + session, 'popup,width=1440,height=960');
    if (!childWindow) announce(tr('讲者窗口被浏览器拦截。请允许弹出窗口，或按 P 使用同窗模式。', 'Presenter popup was blocked. Allow popups, or press P for the same-window view.'));
    updateConnection();
  }
  window.addEventListener('message', event => {
    const data = event.data;
    // Opaque file origins require wildcard sending, never wildcard receiving.
    if (event.origin !== expectedOrigin || !data || data.protocol !== PROTOCOL || data.session !== session || !session) return;
    if (detachedView) {
      if (!openerWindow || event.source !== openerWindow) return;
      if (data.kind !== 'state' && data.kind !== 'disconnect') return;
      if (!applySnapshot(data.state)) return;
      connected = true;
      updateConnection();
      if (data.kind === 'disconnect') disconnect();
    } else {
      if (!childWindow || event.source !== childWindow) return;
      if (data.kind === 'hello' && typeof data.client === 'string' && data.client.length > 0 && data.client.length <= 128) {
        // A reload or same-origin language change is a new document in the same WindowProxy.
        if (data.client !== childClient) { childClient = data.client; lastCommandSequence = -1; }
        sendState();
      }
      else if (data.kind === 'command' && data.client === childClient && childClient && Number.isSafeInteger(data.sequence) && data.sequence > lastCommandSequence && validCommand(data.command)) {
        lastCommandSequence = data.sequence;
        execute(data.command);
      }
    }
  });
  function ensureHelp() {
    if ($('presenter-help')) return;
    const help = document.createElement('section');
    help.id = 'presenter-help';
    help.hidden = true;
    help.setAttribute('role', 'dialog');
    help.setAttribute('aria-modal', 'true');
    help.setAttribute('aria-label', tr('键盘帮助', 'Keyboard help'));
    help.innerHTML = `<div><h2>${tr('键盘与讲者操作', 'Keyboard and presenter controls')}</h2><ul><li>${tr('→ / 空格 / PageDown：下一步；← / PageUp：上一步。', '→ / Space / PageDown: next step; ← / PageUp: previous step.')}</li><li>${tr('Home / End：开头 / 结尾。目录和页码按逻辑主题跳转，进入第一步。', 'Home / End: beginning / end. Overview and page number jump to the first step of a topic.')}</li><li>${tr('P：切换同窗讲者；W：打开独立讲者窗口。', 'P: same-window presenter; W: open a separate presenter window.')}</li><li>${tr('O：目录；N：讲述稿；T：明暗；F：全屏；?：帮助。', 'O: overview; N: notes; T: theme; F: fullscreen; ?: help.')}</li><li>${tr('Escape：依次关闭帮助、目录、讲者模式。', 'Escape: close help, then overview, then presenter view.')}</li><li>${tr('方向键在公式、表格和输入控件内保留原有功能。', 'Arrow keys retain their native behavior in formulas, tables and input controls.')}</li><li>${tr('打印投影片包含所有展开步骤；含讲述稿打印会临时展开技术备注，结束后恢复。', 'Slide printing includes every reveal step; printing with notes temporarily expands technical details and restores them afterward.')}</li></ul><button id="presenter-help-close">${tr('关闭', 'Close')}</button></div>`;
    document.body.appendChild(help);
    bind('presenter-help-close', () => toggleHelp(false));
  }
  function toggleHelp(force) {
    ensureHelp();
    const help = $('presenter-help');
    const open = typeof force === 'boolean' ? force : help.hidden;
    if (open) focusedBeforeHelp = document.activeElement;
    help.hidden = !open;
    setAttr('help-toggle', 'aria-expanded', open);
    if (open) $('presenter-help-close').focus?.();
    else focusedBeforeHelp?.focus?.();
  }
  function fullscreen() {
    try {
      const result = document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
      if (result?.catch) result.catch(() => announce(tr('浏览器未允许全屏。', 'Fullscreen was not allowed by this browser.')));
    } catch (_) { announce(tr('此浏览器无法进入全屏。', 'Fullscreen is unavailable in this browser.')); }
  }
  function preparePrint(withNotes = false) {
    if (printSnapshot) return;
    printSnapshot = {
      details: Array.from(document.querySelectorAll('details')).map(node => [node, node.open]),
      withNotes: document.body.classList.contains('print-notes')
    };
    document.body.classList.toggle('print-notes', withNotes);
    if (withNotes) printSnapshot.details.forEach(([node]) => { node.open = true; });
  }
  function restorePrint() {
    if (!printSnapshot) return;
    printSnapshot.details.forEach(([node, open]) => { node.open = open; });
    document.body.classList.toggle('print-notes', printSnapshot.withNotes);
    printSnapshot = null;
  }
  function printReport(withNotes) {
    preparePrint(withNotes);
    try { window.print(); }
    catch (_) { restorePrint(); announce(tr('浏览器未能打开打印窗口。', 'The browser could not open the print dialog.')); }
    // afterprint (including Cancel) restores state; no timing-based early restoration.
  }
  bind('prev', () => command({ name: 'previous' }));
  bind('next', () => command({ name: 'next' }));
  if ($('page')) $('page').addEventListener('change', event => {
    const parsed = Number(event.target.value);
    if (!Number.isFinite(parsed)) { event.target.value = String(current + 1); return; }
    command({ name: 'go', index: Math.max(0, Math.min(total - 1, Math.trunc(parsed) - 1)), step: 0 });
  });
  bind('overview-toggle', () => toggleOverview());
  document.querySelectorAll('.overview-grid button[data-index]').forEach(button => button.addEventListener('click', () => {
    command({ name: 'go', index: Number(button.dataset.index), step: 0 });
    toggleOverview(false);
    window.scrollTo?.(0, 0);
  }));
  bind('presenter-toggle', () => setPresenter(!presenter));
  bind('presenter-window', openPresenterWindow);
  bind('theme', () => command({ name: 'theme' }));
  bind('fullscreen', fullscreen);
  bind('help-toggle', () => toggleHelp());
  bind('print', () => printReport(false));
  bind('print-notes', () => printReport(true));
  window.addEventListener('beforeprint', () => preparePrint(document.body.classList.contains('print-notes')));
  window.addEventListener('afterprint', restorePrint);
  try { window.matchMedia('print').addEventListener('change', event => { if (!event.matches) restorePrint(); }); } catch (_) { /* afterprint fallback */ }
  window.addEventListener('hashchange', () => {
    const target = parseHash();
    target.index = Math.max(0, Math.min(total - 1, target.index));
    target.step = Math.max(0, Math.min(stepCount(target.index) - 1, target.step));
    command({ name: 'go', ...target });
  });
  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (event.key === 'Escape') {
      if ($('presenter-help') && !$('presenter-help').hidden) toggleHelp(false);
      else if (overview?.classList.contains('open')) toggleOverview(false);
      else if (presenter) setPresenter(false);
      return;
    }
    if ($('presenter-help') && !$('presenter-help').hidden && event.key === 'Tab') {
      event.preventDefault(); $('presenter-help-close').focus?.(); return;
    }
    if (event.target?.isContentEditable || event.target?.closest?.('input,textarea,select,button,a,summary,[contenteditable="true"],.matrix-scroll,.formula,.shared-figure')) return;
    if ($('presenter-help') && !$('presenter-help').hidden) return;
    const key = event.key.toLowerCase();
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); command({ name: 'next' }); }
    else if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); command({ name: 'previous' }); }
    else if (event.key === 'Home') { event.preventDefault(); command({ name: 'go', index: 0, step: 0 }); }
    else if (event.key === 'End') { event.preventDefault(); command({ name: 'go', index: total - 1, step: stepCount(total - 1) - 1 }); }
    else if (key === 'p') setPresenter(!presenter);
    else if (key === 'w') { event.preventDefault(); openPresenterWindow(); }
    else if (key === 'o') toggleOverview();
    else if (key === 't') command({ name: 'theme' });
    else if (key === 'f') fullscreen();
    else if (key === '?' || key === 'h') toggleHelp();
    else if (key === 'n') {
      if (presenter) { const notes = $('presenter-notes'); notes.hidden = !notes.hidden; }
      else { const notes = slides[current].querySelector('details.notes'); if (notes) notes.open = !notes.open; }
    }
  });
  window.addEventListener('pagehide', () => {
    if (!detachedView && childWindow) send(childWindow, 'disconnect', { state: snapshot() });
  });
  try {
    const preferences = JSON.parse(window.localStorage.getItem('math-understanding.preferences.v1') || '{}');
    theme = preferences?.theme === 'dark' ? 'dark' : 'light';
  } catch (_) { /* Match the site's light default when storage is unavailable. */ }
  // The Presenter owns href/hash/session updates; this single listener only saves language.
  document.querySelectorAll('a#report-language, a.report-language, .report-language a').forEach(link => {
    link.addEventListener('click', () => {
      try { window.localStorage.setItem('math-understanding.language.v1', en ? 'zh' : 'en'); } catch (_) { /* optional preference */ }
    });
  });
  setTheme(theme);
  window.__mathStatus = { errors: [], ready: false };
  if (typeof window.renderMathInElement === 'function') {
    try {
      window.renderMathInElement(document.body, {
        delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
        throwOnError: false, strict: 'error', trust: false,
        errorCallback: message => window.__mathStatus.errors.push(String(message))
      });
      window.__mathStatus.ready = true;
    } catch (error) { window.__mathStatus.errors.push(String(error)); }
  }
  if (!window.__mathStatus.ready) setText('math-status', tr('公式引擎未载入，请保留 assets 文件夹后重开。', 'Math engine unavailable. Keep the assets folder with this file and reopen.'));
  else if (window.__mathStatus.errors.length) setText('math-status', tr('部分公式未能正确渲染。', 'Some formulas could not be rendered.'));
  const initial = parseHash();
  show(initial.index, initial.step);
  ensurePresenter();
  ensureHelp();
  if (detachedView) {
    setPresenter(true);
    if (checkOpener() && session) send(openerWindow, 'hello');
    else if (openerWindow && !session) disconnect();
  }
  window.setInterval(() => {
    updateTimerDisplay();
    if (detachedView) {
      if (checkOpener() && !connected) send(openerWindow, 'hello');
    } else if (childWindow) {
      if (childWindow.closed) { childWindow = null; updateConnection(); }
      else sendState();
    }
  }, 500);
  // Read-only diagnostic snapshot for model QA; not a prior-release fingerprint.
  window.__reportPresenter = Object.freeze({
    getState: () => ({ ...snapshot(), presenter, connected, hasLostConnection, total, mainCount, faceCount: faces.reduce((sum, group) => sum + group.length, 0) })
  });
})();
