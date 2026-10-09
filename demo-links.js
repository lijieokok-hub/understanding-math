(() => {
  'use strict';
  function revealLinkedSection() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const lesson = document.getElementById('lesson');
    const target = id && document.getElementById(id);
    if (!lesson || !target || !lesson.contains(target)) return;
    lesson.hidden = false;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
  window.addEventListener('hashchange', revealLinkedSection);
  revealLinkedSection();
})();
