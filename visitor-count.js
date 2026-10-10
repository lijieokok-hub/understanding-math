/* First-party page-view count. No cookies, storage, article data or user identity. */
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
        explanation.textContent = L('从功能上线起统计；打开或刷新页面计一次，不代表人数。首页约每分钟刷新，刷新统计数字不增加次数。本计数功能不采集或保存 IP 地址，不使用 Cookie。每日（UTC）最多记入 5,000 次浏览，以保护免费服务配额。', 'Counted from launch. Opening or reloading a page adds one view; this is not a visitor count. This total refreshes about once a minute without adding a view. This counter does not collect or store IP addresses and does not use cookies. At most 5,000 views are recorded per UTC day to protect the free service allowance.');
        panel.append(summary, explanation);
        footer.append(panel);
        const style = document.createElement('style');
        style.textContent = '.site-footer{flex-wrap:wrap}.visitor-count{flex-basis:100%;font-size:.875rem;line-height:1.7;margin-top:.3rem}.visitor-count summary{cursor:pointer;width:fit-content;max-width:100%;padding:.3rem 0}.visitor-count summary:focus-visible{outline:2px solid currentColor;outline-offset:3px}.visitor-count span{font-variant-numeric:tabular-nums}.site-footer .visitor-count p{max-width:58em;margin:.35rem 0 0;font-size:.85rem}.visitor-count[open]{padding-bottom:.2rem}';
        document.head.append(style);
      }
    }
    let eventId, uuid;
    try { uuid = crypto.randomUUID(); } catch { /* No weak or persistent identifier fallback. */ }
    let createdAt = Date.now(), initialized = false, reads = 0;
    let terminalPostFailure = !uuid;
    let recorded = false, attempts = 0, timer = null, active = null, disposed = false;
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
      explanation.textContent = (start ? L('自 ', 'Since ') + start + ' UTC' + L(' 起统计。', '. ') : L('从功能上线起统计。', 'Counted from launch. ')) + L('打开或刷新页面计一次，不代表人数。首页约每分钟刷新，刷新统计数字不增加次数。本计数功能不采集或保存 IP 地址，不使用 Cookie。每日（UTC）最多记入 5,000 次浏览，以保护免费服务配额。', 'Opening or reloading a page adds one view; this is not a visitor count. This total refreshes about once a minute without adding a view. This counter does not collect or store IP addresses and does not use cookies. At most 5,000 views are recorded per UTC day to protect the free service allowance.');
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
          ...(post ? {headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId})} : {})
        });
        if (!response.ok) { if (response.status === 400 || response.status === 429) { attempts = 3; terminalPostFailure = true; } throw new Error('Counter unavailable'); }
        const data = validate(await response.json(), post);
        if (disposed || controller.signal.aborted) return;
        if (post) { recorded = true; terminalPostFailure = false; }
        display(data);
        if (!initialized) { initialized = true; if (uuid) { eventId = `${Date.parse(data.serverTime)}.${uuid}`; createdAt = Date.now(); } }
      } catch { if (post && attempts >= 3) terminalPostFailure = true; if (!disposed && !document.hidden) unavailable(); }
      finally { clearTimeout(timeout); if (active === controller) active = null; schedule(); }
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearTimer(); active?.abort(); }
      else schedule();
    });
    window.addEventListener('pagehide', () => { disposed = true; clearTimer(); active?.abort(); });
    window.addEventListener('pageshow', e => { if (e.persisted) { disposed = false; schedule(); } });
    if (!document.hidden) void run();
  } catch { /* Analytics must never interrupt reading, presentation or gameplay. */ }
})();
