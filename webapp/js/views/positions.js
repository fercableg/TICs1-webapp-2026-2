// ============================================================================
// positions.js — Registro de eventos de postura con registro manual (cuidador).
// El esqueleto (tabla y card) vive en positions.html; aquí se generan los
// botones de postura desde POSTURES y se hidrata el historial.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { POSTURES } from '../config.js';
import { fmtDateTime } from '../core/utils.js';
import { postureBadge, sourceBadge, emptyState } from './helpers.js';
import * as api from '../services/apiClient.js';
import { toast } from '../core/ui.js';
import * as poller from '../services/poller.js';

export function init(root) {
  const chips = root.querySelector('#positions-chips');
  const tableBody = root.querySelector('#positions-body');

  chips.replaceChildren(
    ...Object.entries(POSTURES).map(([key, label]) =>
      el('button', {
        class: 'btn btn--outline btn--sm',
        type: 'button',
        text: label,
        onclick: () => registerPosition(key),
      })),
  );

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

  // Refrescar cuando cambia el dispositivo seleccionado.
  const unsubscribe = subscribe((_state, patch) => {
    if ('deviceId' in patch) load();
  });
  load();

  return () => unsubscribe();
}
