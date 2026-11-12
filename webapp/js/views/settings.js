// ============================================================================
// settings.js — SOLO ADMINISTRADOR. Configuración inicial (formulario
// compartido) + tabla de dispositivos de solo lectura. El esqueleto vive en
// settings.html; aquí se monta el formulario y se hidrata la tabla.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { fmtDateTime } from '../core/utils.js';
import { emptyState } from './helpers.js';
import { renderSettingsForm } from './settingsForm.js';

export function init(root) {
  const formMount = root.querySelector('#settings-form');
  const deviceTableBody = root.querySelector('#settings-devices-body');

  const sf = renderSettingsForm();
  formMount.replaceChildren(sf.node);

  function renderDevices() {
    const devices = getState().devices || [];
    if (!devices.length) {
      deviceTableBody.replaceChildren(el('tr', {}, el('td', { colspan: '4' }, emptyState('Sin dispositivos registrados.'))));
      return;
    }
    deviceTableBody.replaceChildren(
      ...devices.map((d) =>
        el('tr', {},
          el('td', { class: 'mono', text: d.id }),
          el('td', { text: d.name }),
          el('td', {}, el('span', { class: `badge ${d.online ? 'badge--info' : 'badge--critical'}`, text: d.online ? 'En línea' : 'Desconectado' })),
          el('td', { class: 'mono', text: fmtDateTime(d.last_seen) }))),
    );
  }

  const unsubscribe = subscribe((_state, patch) => {
    if ('devices' in patch) renderDevices();
  });

  renderDevices();

  return () => {
    unsubscribe();
    sf.cleanup();
  };
}
