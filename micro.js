/* Peripheral, opt-out wordplay. Never observes article content or changes the brand link. */
(() => {
  'use strict';
  if (window.UnderstandingMicro) return;
  const copy = {
    zh: {
      brand: ['数学，会一点。理解，还在路上。', '懂了。等一下，真的懂了吗？'],
      dark: ['灯关了，那个“显然”还亮着。', '屏幕暗下来了，问题没有。'],
      light: ['灯开了，“显然”也得交代清楚。', '灯亮了，再看一眼那个“于是”。'],
      quietOn: '安静阅读已开启，小机关已收起。',
      quietOff: '小机关已开启。',
      saveFailed: '此浏览器未能保存设置，本页仍然生效。'
    },
    en: {
      brand: ['Still working on the “understanding” part.', 'Got it. Wait. Have I?'],
      dark: ['Lights out. “Clearly” is still doing a lot of work.', 'Dark mode. Same old question marks.'],
      light: ['Lights on. “Clearly” still owes us an explanation.', 'Brighter screen. One more look at “therefore”.'],
      quietOn: 'Quiet reading is on. The little asides are off.',
      quietOff: 'The little asides are on.',
      saveFailed: 'This browser could not save the setting. It still applies on this page.'
    }
  };
  const language = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'zh';
  const words = copy[language];
  const key = 'math-understanding.peripheral-wordplay.quiet.v1';
  const brand = document.querySelector('[data-mm-brand]');
  const brandArea = document.querySelector('[data-mm-brand-area]') || brand;
  const brandButton = document.querySelector('[data-mm-brand-button]');
  const brandNote = document.querySelector('[data-mm-brand-note]');
  const quietButton = document.querySelector('[data-mm-quiet]');
  const preferenceStatus = document.querySelector('[data-mm-preference-status]');
  const themeBox = document.querySelector('[data-mm-theme-box]');
  const themeText = document.querySelector('[data-mm-theme-text]');
  const themeClose = document.querySelector('[data-mm-theme-close]');
  // Each locale is authored separately. Keep translation engines out of these tiny jokes.
  [brand, brandButton, brandNote, quietButton, preferenceStatus, themeBox, themeText, themeClose].forEach(element => {
    if (element) { element.setAttribute('translate', 'no'); element.setAttribute('lang', language === 'en' ? 'en' : 'zh-CN'); }
  });
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let quiet = false;
  try { quiet = localStorage.getItem(key) === 'true'; } catch { /* Current-page controls still work. */ }
  let pinned = false;
  let hovering = false;
  let focused = false;
  let brandIndex = 0;
  let successfulToggles = 0;
  let previousTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const themeIndex = { dark: 0, light: 0 };
  let flip = null;
  const stopFlip = () => { if (flip) flip.cancel(); flip = null; };
  function showBrand() {
    if (!brandNote) return;
    const visible = !quiet && (pinned || hovering || focused);
    const opening = visible && brandNote.hidden;
    brandNote.hidden = !visible;
    if (brandButton) brandButton.setAttribute('aria-expanded', String(visible));
    if (!visible) { stopFlip(); return; }
    brandNote.textContent = words.brand[brandIndex % words.brand.length];
    if (opening && !motion.matches && typeof brandNote.animate === 'function') {
      stopFlip();
      flip = brandNote.animate([{transform:'rotateX(-9deg) translateY(2px)'},{transform:'none'}], {duration:180,easing:'ease-out'});
    }
  }
  function applyQuiet() {
    if (quietButton) quietButton.setAttribute('aria-pressed', String(quiet));
    if (brandButton) brandButton.hidden = quiet;
    if (quiet) { pinned = false; if (themeBox) themeBox.hidden = true; }
    showBrand();
  }
  if (brand && brandNote) {
    brandArea.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovering = true; showBrand(); } });
    brandArea.addEventListener('pointerleave', () => { hovering = false; showBrand(); });
    brand.addEventListener('focus', () => { focused = true; showBrand(); });
    brand.addEventListener('blur', () => { focused = false; showBrand(); });
    // No click handler on the brand: its original href, SVG, and navigation remain intact.
  }
  if (brandButton && brandNote) brandButton.addEventListener('click', () => {
    if (quiet) return;
    pinned = !pinned;
    if (pinned) { hovering = false; focused = false; } else { brandIndex++; }
    showBrand();
  });
  if (quietButton) quietButton.addEventListener('click', () => {
    quiet = !quiet;
    let saved = true;
    try { localStorage.setItem(key, String(quiet)); } catch { saved = false; }
    applyQuiet();
    if (preferenceStatus) preferenceStatus.textContent = (quiet ? words.quietOn : words.quietOff) + (saved ? '' : ' ' + words.saveFailed);
  });
  if (themeClose) themeClose.addEventListener('click', () => {
    if (themeBox) themeBox.hidden = true;
    const toggle = document.querySelector('[data-mm-theme-toggle]');
    if (toggle) toggle.focus();
  });
  if (motion.addEventListener) motion.addEventListener('change', stopFlip);
  applyQuiet();
  window.UnderstandingMicro = Object.freeze({
    // Call only after a successful user-initiated theme change, never at initialization.
    onThemeToggle(theme) {
      if (theme !== 'light' && theme !== 'dark') return;
      if (theme === previousTheme) return;
      previousTheme = theme;
      successfulToggles++;
      if (themeBox) themeBox.hidden = true;
      if (quiet || !themeBox || !themeText || successfulToggles % 3 !== 1) return;
      themeBox.hidden = false;
      themeText.textContent = words[theme][themeIndex[theme]++ % words[theme].length];
    }
  });
})();

/* Isolated, first-party page-view counter. Never runs inside report frames. */
(() => { try { if (window.__OFFLINE_MATH__ || location.origin !== 'https://lijieokok-hub.github.io' || !location.pathname.startsWith('/understanding-math/') || window.top !== window.self || document.querySelector('script[data-site-views]')) return; const s = document.createElement('script'); s.dataset.siteViews = ''; s.src = '/understanding-math/visitor-count.js'; s.async = true; document.head.append(s); } catch {} })();
