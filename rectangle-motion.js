// A finite, opt-in sweep through a family of rectangles on a circle.
(() => {
  const slider = document.getElementById('angle');
  const button = document.getElementById('diagonal-play');
  const output = document.getElementById('angle-output');
  if (!slider || !button) return;
  const en = document.documentElement.lang === 'en';
  let active = false, tickId = 0, start = 0, writing = false;
  const label = () => { button.textContent = active ? (en ? 'Pause rotation' : '暂停旋转') : (en ? 'Animate the diagonals' : '播放对角线变化'); };
  function stop() { active = false; cancelAnimationFrame(tickId); start = 0; output?.setAttribute('aria-live', 'polite'); label(); }
  function show(v) {
    writing = true; slider.value = String(Math.round(v));
    slider.dispatchEvent(new Event('input', {bubbles: true})); writing = false;
  }
  function tick(now) {
    if (!active) return;
    if (!start) start = now;
    const p = Math.min(1, (now - start) / 7000);
    show(20 + 140 * p);
    if (p === 1) { stop(); return; }
    tickId = requestAnimationFrame(tick);
  }
  button.addEventListener('click', () => {
    if (active) { stop(); return; }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(90); return; }
    active = true; output?.setAttribute('aria-live', 'off'); label(); tickId = requestAnimationFrame(tick);
  });
  slider.addEventListener('input', () => { if (!writing) stop(); });
  document.getElementById('square')?.addEventListener('click', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && active) stop();
  }).observe(document.getElementById('lab'));
})();
