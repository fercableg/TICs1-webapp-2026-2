// ============================================================================
// settings.js — ADMIN ONLY. Initial configuration (shared settings form) plus a
// read-only device management table. The same form is also surfaced in the
// Monitoreo view for live tuning; see settingsForm.js.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { fmtDateTime } from '../core/utils.js';
import { pageHeader, card, emptyState } from './helpers.js';
import { renderSettingsForm } from './settingsForm.js';

export function render(container) {
  const sf = renderSettingsForm();

  const deviceTableBody = el('tbody');

  const root = el('div', { class: 'page' },
    pageHeader('Ajustes', 'Configuración del dispositivo y del paciente (solo administradores).'),
    card('Configuración', sf.node),
    card('Gestión de dispositivos',
      el('div', { class: 'table-wrap' },
        el('table', { class: 'table' },
          el('thead', {}, el('tr', {},
            el('th', { text: 'ID' }),
            el('th', { text: 'Nombre' }),
            el('th', { text: 'Estado' }),
            el('th', { text: 'Última lectura' }))),
          deviceTableBody))),
  );
  container.replaceChildren(root);

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
