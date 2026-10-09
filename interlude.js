/* Optional progressive enhancement. No requests, tracking, timers, or storage. */
(() => {
  'use strict';
  document.querySelectorAll('[data-interlude]').forEach(root => {
    if (root.dataset.miReady) return;
    root.dataset.miReady = 'true';
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = [...root.querySelectorAll('[role="tabpanel"]')];
    const tablist = root.querySelector('[role="tablist"]');
    const summary = root.querySelector('summary');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = 0;
    let animations = [];
    const stopMotion = () => { animations.forEach(a => a.cancel()); animations = []; };
    const select = (index, focusTab = false) => {
      if (index < 0 || index >= tabs.length) return;
      const changed = index !== active;
      active = index;
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === active));
        tab.tabIndex = i === active ? 0 : -1;
        panels[i].hidden = i !== active;
      });
      if (focusTab) tabs[active].focus();
      stopMotion();
      if (changed && !motion.matches && typeof Element.prototype.animate === 'function') {
        animations = [...panels[active].querySelectorAll('.mi-card')].map((card, i) => card.animate([
          { transform: 'rotateX(-12deg) translateY(2px)' },
          { transform: 'rotateX(0deg) translateY(0)' }
        ], { duration: 260, delay: i * 30, easing: 'ease-out', fill: 'backwards' }));
      }
    };
    tabs.forEach((tab, index) => tab.addEventListener('click', () => select(index)));
    // Arrow handling exists only on the tablist; page reading keys remain untouched.
    tablist.addEventListener('keydown', event => {
      const index = tabs.indexOf(event.target);
      if (index < 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(next, true);
    });
    root.querySelector('[data-mi-next]').addEventListener('click', () => select((active + 1) % tabs.length));
    root.querySelector('[data-mi-close]').addEventListener('click', () => { stopMotion(); root.open = false; summary.focus(); });
    root.addEventListener('toggle', () => { if (!root.open) stopMotion(); });
    if (motion.addEventListener) motion.addEventListener('change', stopMotion);
    tablist.hidden = false;
    root.querySelector('.mi-actions').hidden = false;
    root.querySelector('.mi-hint').hidden = false;
  });
})();
