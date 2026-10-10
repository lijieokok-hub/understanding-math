/* First-party page-view count. Anonymous short-lived tab sessions; no cookies, IP, article data or account identity. */
(() => {
  'use strict';
  try {
    if (window.__OFFLINE_MATH__ || location.origin !== 'https://lijieokok-hub.github.io' ||
        !location.pathname.startsWith('/understanding-math/') || window.top !== window.self ||
        window.__understandingViewCounter) return;
    window.__understandingViewCounter = true;
    const endpoint = 'https://understanding-math.lijieokok.chatgpt.site/api/visits';
    const home = /^\/understanding-math\/(?:en\/)?(?:index\.html)?$/.test(location.pathname);
    const en = document.documentElement.lang === 'en';
    const L = (zh, english) => en ? english : zh;
    let value, explanation;
    if (home) {
      const footer = document.querySelector('.site-footer');
      if (footer) {
        const panel = document.createElement('details');
        panel.className = 'visitor-count';
        const summary = document.createElement('summary');
        summary.textContent = L('累计浏览次数：', 'Total page views: ');
        value = document.createElement('span');
        value.textContent = L('读取中…', 'Loading…');
        summary.append(value);
        explanation = document.createElement('p');
        explanation.textContent = L('从功能上线起统计；打开或刷新页面计一次，不代表人数。首页约每分钟刷新，刷新统计数字不增加次数。本计数功能不采集或保存 IP 地址，不使用 Cookie；仅在当前标签页保存短期随机会话标识，30分钟无活动后，下一次页面浏览按新会话统计。另记录页面可见且窗口有焦点时的抽样停留时长，详细统计仅管理员可见。切换标签、网络中断与上报限额会造成缺测，不能据此识别人数。每日（UTC）最多记入 5,000 次浏览，以保护免费服务配额。', 'Counted from launch. Opening or reloading a page adds one view; this is not a visitor count. This total refreshes about once a minute without adding a view. This counter does not collect or store IP addresses and does not use cookies. A random session identifier is kept only in this tab, renewed for the next page view after 30 minutes without activity. Sampled time while the page is visible and the window focused is recorded for the private administrator dashboard. Tab changes, failed requests and reporting limits cause missing samples; these data do not identify people. At most 5,000 views are recorded per UTC day to protect the free service allowance.');
        panel.append(summary, explanation);
        footer.append(panel);
        const style = document.createElement('style');
        style.textContent = '.site-footer{flex-wrap:wrap}.visitor-count{flex-basis:100%;font-size:.875rem;line-height:1.7;margin-top:.3rem}.visitor-count summary{cursor:pointer;width:fit-content;max-width:100%;padding:.3rem 0}.visitor-count summary:focus-visible{outline:2px solid currentColor;outline-offset:3px}.visitor-count span{font-variant-numeric:tabular-nums}.site-footer .visitor-count p{max-width:58em;margin:.35rem 0 0;font-size:.85rem}.visitor-count[open]{padding-bottom:.2rem}';
        document.head.append(style);
      }
    }
    // A page event is separate from its short-lived anonymous tab session.
    const sessionKey = 'math-anonymous-session-v1';
    let sessionId = null;
    function touchSession(initial = false) {
      if (!sessionId) return;
      try {
        const now=Date.now(); const stored=JSON.parse(sessionStorage.getItem(sessionKey)||'null');
        const fresh=stored&&typeof stored.id==='string'&&Number.isFinite(stored.lastActive)&&now>=stored.lastActive&&now-stored.lastActive<1800000;
        // This page keeps its original session; expiry changes the next page's session.
        const nextId=initial?sessionId:fresh?stored.id:crypto.randomUUID();
        sessionStorage.setItem(sessionKey, JSON.stringify({id:nextId,lastActive:now}));
      } catch { /* Optional storage. */ }
    }
    try {
      const old = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
      const now = Date.now();
      const valid = old && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(old.id) && Number.isFinite(old.lastActive) && now >= old.lastActive && now-old.lastActive < 1800000;
      sessionId = valid ? old.id : crypto.randomUUID();
      touchSession(true);
    } catch { sessionId = null; }
    let eventId, uuid;
    try { uuid = crypto.randomUUID(); } catch { /* No weak or persistent identifier fallback. */ }
    let createdAt = Date.now(), initialized = false, reads = 0;
    let terminalPostFailure = !uuid;
    let recorded = false, attempts = 0, timer = null, active = null, disposed = false;
    let analyticsRecorded = false, activeMs = 0, lastTick = null, durationAttempts = 0, hideAttempts = 0;
    let lastSentMs = -1, everEnded = false, measuringTimer = null, maintenanceTimer = null, stoppedDuration = false;
    const passedCheckpoints = new Set();
    const isReading = () => analyticsRecorded && !disposed && !document.hidden && document.hasFocus();
    function sample() {
      const now = performance.now();
      if (lastTick !== null) {
        const delta = now-lastTick;
        // Suspend/background throttling/long stalls are unknown time, not reading.
        if (Number.isFinite(delta) && delta >= 0 && delta <= 60000) activeMs = Math.min(3600000,activeMs+delta);
      }
      lastTick = isReading() ? now : null;
      if (lastTick !== null) touchSession();
    }
    function stopMeasurementTimer() { if (measuringTimer !== null) clearTimeout(measuringTimer); measuringTimer = null; }
    function stopMaintenanceTimer() { if (maintenanceTimer !== null) clearTimeout(maintenanceTimer); maintenanceTimer = null; }
    function maintainSession() {
      stopMaintenanceTimer();
      if (!isReading()) return;
      touchSession();
      maintenanceTimer = setTimeout(maintainSession,60000);
    }
    function sendDuration(ended, hiding = false) {
      const ms = Math.floor(activeMs);
      if (!analyticsRecorded || !sessionId || !eventId || stoppedDuration || durationAttempts >= 5 || (ms === 0 && !hiding && !ended) || (ms <= lastSentMs && !(ended && !everEnded)) || (hiding && hideAttempts >= 2)) return;
      if (hiding) hideAttempts++;
      everEnded = everEnded || ended;
      durationAttempts++; lastSentMs = ms;
      // Never bridge cookies or author credentials to the public reader origin.
      void fetch(endpoint.replace(/visits$/, 'visit-duration'), {
        method:'POST', credentials:'omit', cache:'no-store', redirect:'error', referrerPolicy:'no-referrer',
        keepalive:true, headers:{'Content-Type':'application/json'},
        body:JSON.stringify({eventId,sessionId,activeMs:ms,ended:everEnded})
      }).then(async response => {
        if (response.status === 429 || response.status === 400 || response.status === 403) stoppedDuration = true;
        if (!response.ok) return;
        const data = await response.json();
        if (!data || data.schema !== 1 || data.accepted !== true || typeof data.duplicate !== 'boolean') stoppedDuration = true;
      }).catch(() => { /* Missing measurements are not zero and do not retry in a loop. */ });
    }
    function measure() {
      stopMeasurementTimer();
      sample();
      for (const checkpoint of [30000,300000,1800000,3600000]) {
        if (activeMs >= checkpoint && !passedCheckpoints.has(checkpoint)) {
          passedCheckpoints.add(checkpoint); sendDuration(checkpoint === 3600000);
        }
      }
      maintainSession();
      if (isReading() && activeMs < 3600000 && durationAttempts < 5 && !stoppedDuration) measuringTimer = setTimeout(measure,15000);
    }
    function unavailable() { if (value) value.textContent = L('暂不可用', 'Unavailable'); }
    function validate(data, post) {
      if (!data || data.schema !== 1 || data.metric !== 'page_views' || !Number.isSafeInteger(data.total) || data.total < 0 || data.dailyLimit !== 5000 || typeof data.serverTime !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(data.serverTime) || !Number.isFinite(Date.parse(data.serverTime)) ||
          ![data.startedAt,data.updatedAt].every(v => v === null || (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v)))) ||
          (post && (data.recorded !== true || typeof data.duplicate !== 'boolean'))) throw new Error('Invalid counter response');
      return data;
    }
    function display(data) {
      if (!value) return;
      value.textContent = data.total.toLocaleString(en ? 'en-US' : 'zh-CN') + (terminalPostFailure ? L('（本次计数未确认）', ' (this view unconfirmed)') : '');
      const start = data.startedAt ? new Date(data.startedAt).toLocaleDateString(en ? 'en-GB' : 'zh-CN', {timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'}) : null;
      explanation.textContent = (start ? L('自 ', 'Since ') + start + ' UTC' + L(' 起统计。', '. ') : L('从功能上线起统计。', 'Counted from launch. ')) + L('打开或刷新页面计一次，不代表人数。首页约每分钟刷新，刷新统计数字不增加次数。本计数功能不采集或保存 IP 地址，不使用 Cookie；仅在当前标签页保存短期随机会话标识，30分钟无活动后，下一次页面浏览按新会话统计。另记录页面可见且窗口有焦点时的抽样停留时长，详细统计仅管理员可见。切换标签、网络中断与上报限额会造成缺测，不能据此识别人数。每日（UTC）最多记入 5,000 次浏览，以保护免费服务配额。', 'Opening or reloading a page adds one view; this is not a visitor count. This total refreshes about once a minute without adding a view. This counter does not collect or store IP addresses and does not use cookies. A random session identifier is kept only in this tab, renewed for the next page view after 30 minutes without activity. Sampled time while the page is visible and the window focused is recorded for the private administrator dashboard. Tab changes, failed requests and reporting limits cause missing samples; these data do not identify people. At most 5,000 views are recorded per UTC day to protect the free service allowance.');
    }
    function clearTimer() { if (timer !== null) clearTimeout(timer); timer = null; }
    function schedule() {
      clearTimer();
      if (disposed || document.hidden) return;
      const bootstrap = !initialized && reads < 3;
      const retry = !recorded && eventId && attempts < 3 && Date.now() - createdAt < 600000;
      if (bootstrap || retry || value) timer = setTimeout(run, retry && attempts === 0 ? 0 : bootstrap || retry ? 15000 : 60000);
    }
    async function run() {
      clearTimer();
      if (disposed || document.hidden || active) return;
      if (!recorded && eventId && Date.now() - createdAt >= 600000) terminalPostFailure = true;
      const post = !recorded && Boolean(eventId) && attempts < 3 && Date.now() - createdAt < 600000;
      if (!post && !value && (initialized || reads >= 3)) return;
      if (!post && !initialized) reads++;
      if (post) attempts++;
      const controller = new AbortController(); active = controller;
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(endpoint, {
          method: post ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error',
          referrerPolicy: 'no-referrer', signal: controller.signal,
          ...(post ? {headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,...(sessionId ? {sessionId} : {})})} : {})
        });
        if (!response.ok) { if (response.status === 400 || response.status === 429) { attempts = 3; terminalPostFailure = true; } throw new Error('Counter unavailable'); }
        const data = validate(await response.json(), post);
        if (disposed || controller.signal.aborted) return;
        if (post) { recorded = true; terminalPostFailure = false; analyticsRecorded = data.analyticsRecorded === true && Boolean(sessionId); stoppedDuration = !analyticsRecorded; activeMs = 0; lastTick = null; measure(); }
        display(data);
        if (!initialized) { initialized = true; if (uuid) { eventId = `${Date.parse(data.serverTime)}.${uuid}`; createdAt = Date.now(); } }
      } catch { if (post && attempts >= 3) terminalPostFailure = true; if (!disposed && !document.hidden) unavailable(); }
      finally { clearTimeout(timeout); if (active === controller) active = null; schedule(); }
    }
    document.addEventListener('visibilitychange', () => {
      sample(); stopMeasurementTimer(); stopMaintenanceTimer();
      if (document.hidden) sendDuration(false,true); else measure();
      if (document.hidden) { clearTimer(); active?.abort(); }
      else schedule();
    });
    window.addEventListener('pagehide', () => { sample(); sendDuration(true,true); disposed = true; lastTick = null; stopMeasurementTimer(); stopMaintenanceTimer(); clearTimer(); active?.abort(); });
    window.addEventListener('pageshow', e => { if (e.persisted) { disposed = false; lastTick = null; measure(); schedule(); } });
    window.addEventListener('blur', () => { sample(); lastTick = null; stopMeasurementTimer(); stopMaintenanceTimer(); sendDuration(false,true); });
    window.addEventListener('focus', () => { lastTick = null; measure(); });
    measure();
    if (!document.hidden) void run();
  } catch { /* Analytics must never interrupt reading, presentation or gameplay. */ }
})();
