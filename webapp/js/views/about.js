// ============================================================================
// about.js — Información del proyecto (estática en about.html) + herramientas
// de desarrollo (solo con mock). Aquí se cablea el botón de fallo simulado y
// el reinicio de datos demo.
// ============================================================================

import { CONFIG } from '../config.js';
import { setFailing, isFailing } from '../services/mockData.js';
import { toast } from '../core/ui.js';

export function init(root) {
  const devTools = root.querySelector('#about-dev-tools');
  const failBtn = root.querySelector('#about-fail-btn');
  const resetBtn = root.querySelector('#about-reset-btn');

  // El bloque de desarrollo solo aplica en modo mock.
  if (!CONFIG.USE_MOCK_DATA) {
    devTools.hidden = true;
    return () => {};
  }

  function updateFailBtn() {
    failBtn.textContent = isFailing() ? 'Restablecer conexión (mock)' : 'Simular fallo de red';
  }
  updateFailBtn();

  failBtn.addEventListener('click', () => {
    setFailing(!isFailing());
    updateFailBtn();
    toast(isFailing() ? 'Fallo de red simulado activado.' : 'Conexión restablecida.', isFailing() ? 'warning' : 'success');
  });

  resetBtn.addEventListener('click', () => location.reload());

  return () => {};
}
