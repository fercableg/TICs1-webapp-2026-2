// ============================================================================
// positions.js — Posture event log with manual (caregiver) recording.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { POSTURES } from '../config.js';
import { fmtDateTime } from '../core/utils.js';
import { pageHeader, card, postureBadge, sourceBadge, emptyState } from './helpers.js';
import * as api from '../services/apiClient.js';
import { toast } from '../core/ui.js';
import * as poller from '../services/poller.js';

export function render(container) {
  const tableBody = el('tbody');
  const tableWrap = el('div', { class: 'table-wrap' },
    el('table', { class: 'table' },
      el('thead', {}, el('tr', {},
        el('th', { text: 'Fecha y hora' }),
        el('th', { text: 'Posición' }),
        el('th', { text: 'Fuente' }))),
      tableBody));

  const registerButtons = Object.entries(POSTURES).map(([key, label]) =>
    el('button', {
      class: 'btn btn--outline btn--sm',
      type: 'button',
      text: label,
      onclick: () => registerPosition(key),
    }),
  );

  const root = el('div', { class: 'page' },
    pageHeader('Posiciones', 'Registro de cambios de postura detectados o registrados por el cuidador.'),
    card('Registrar cambio de posición',
      el('div', { class: 'chip-group' }, ...registerButtons),
      el('p', { class: 'muted' }, 'Registra manualmente un cambio de posición (se guarda con fuente «Cuidador»).')),
    card('Historial de posiciones', tableWrap),
  );
  container.replaceChildren(root);

  async function load() {
    const deviceId = getState().deviceId;
    tableBody.replaceChildren(el('tr', {}, el('td', { colspan: '3', text: 'Cargando…' })));
    if (!deviceId) {
      tableBody.replaceChildren(el('tr', {}, el('td', { colspan: '3' }, emptyState('No hay dispositivo seleccionado.'))));
      return;
    }
    try {
      const events = await api.listPositionEvents(deviceId);
      if (!events?.length) {
        tableBody.replaceChildren(el('tr', {}, el('td', { colspan: '3' }, emptyState('Sin registros de posición.'))));
        return;
      }
      tableBody.replaceChildren(
        ...events.map((e) =>
          el('tr', {},
            el('td', { class: 'mono', text: fmtDateTime(e.timestamp) }),
            el('td', {}, postureBadge(e.position)),
            el('td', {}, sourceBadge(e.source)))),
      );
    } catch (err) {
      tableBody.replaceChildren(el('tr', {}, el('td', { colspan: '3' }, emptyState(`Error al cargar: ${err.message}`))));
    }
  }

  async function registerPosition(position) {
    const deviceId = getState().deviceId;
    const user = getState().user;
    if (!deviceId) return;
    try {
      await api.postPositionEvent({
        device_id: deviceId,
        position,
        source: 'cuidador',
        timestamp: Date.now(),
        ack_by: user?.username,
      });
      toast(`Posición «${POSTURES[position]}» registrada.`, 'success');
      poller.pollNow();
      load();
    } catch (err) {
      toast(`No se pudo registrar: ${err.message}`, 'error');
    }
  }

  // Re-fetch when the selected device changes (the navbar keeps the store's
  // deviceId current), otherwise the table would show a previous device's log.
  const unsubscribe = subscribe((_state, patch) => {
    if ('deviceId' in patch) load();
  });
  load();

  return () => unsubscribe();
}
