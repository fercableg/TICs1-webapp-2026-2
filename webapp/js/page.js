// ============================================================================
// page.js — Monta la vista de la página actual. Lee `body[data-view]`, hace un
// `import()` dinámico de `views/<view>.js` y llama a `init(#view-root)`.
//
// Cada vista exporta `init(root) -> cleanupFn?`. El cleanup (suscripciones al
// store, chart.destroy, etc.) se ejecuta al abandonar la página (`pagehide`),
// aunque en una MPA el navegador también descarta el contexto por completo.
// ============================================================================

const view = document.body.dataset.view;
const root = document.getElementById('view-root');

if (!view || !root) {
  throw new Error('page.js requiere <body data-view="..."> y #view-root');
}

const mod = await import(`./views/${view}.js`);
const cleanup = typeof mod.init === 'function' ? mod.init(root) : null;

if (typeof cleanup === 'function') {
  window.addEventListener('pagehide', cleanup, { once: true });
}
