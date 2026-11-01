// Runs before the stylesheet paints: mark the document as scripted so the
// prelude can take over, and fall back to the plain page if the module never
// arrives. Kept in a file so the document needs no inline script.
(() => {
  const root = document.documentElement;
  root.classList.add('enhanced', 'prelude-boot');
  root.dataset.state = 'loading';
  history.scrollRestoration = 'manual';
  const abort = () => {
    root.classList.remove('enhanced', 'prelude-boot');
    delete root.dataset.state;
  };
  window.pebrilBoot = { start: performance.now(), abort, timer: setTimeout(abort, 14000) };
  window.addEventListener('error', event => {
    const target = event.target;
    if (target instanceof HTMLScriptElement && target.src.endsWith('/src/prelude.mjs')) abort();
  }, true);
})();
