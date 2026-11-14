// ============================================================================
// theme-init.js — Aplica el tema guardado ANTES del primer pintado, para evitar
// el parpadeo "modo día → modo noche" al cambiar de página. Se carga como
// script clásico (síncrono, no module) en el <head> de todas las páginas.
//
// Replica la lógica de initTheme() en services/theme.js (misma clave
// `afic.theme`); ese módulo sigue corriendo después de forma idempotente.
// ============================================================================

(function () {
  try {
    var saved = localStorage.getItem('afic.theme');
    var theme = saved === 'dark' || saved === 'light'
      ? saved
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    /* localStorage no disponible: se conserva el tema por defecto del CSS. */
  }
})();
