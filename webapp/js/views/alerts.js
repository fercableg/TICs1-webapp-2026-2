// ============================================================================
// alerts.js — Alertas activas / resueltas con severidad y confirmación (ACK).
// El esqueleto (tabs + dos tablas) vive en alerts.html; aquí se hidratan.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { fmtDateTime } from '../core/utils.js';
import { severityBadge, emptyState } from './helpers.js';
import * as api from '../services/apiClient.js';
import { toast } from '../core/ui.js';
import * as poller from '../services/poller.js';

export function init(root) {
  const tabActive = root.querySelector('#tab-active');
  const tabResolved = root.querySelector('#tab-resolved');
  const activePanel = root.querySelector('#alerts-active-panel');
  const resolvedPanel = root.querySelector('#alerts-resolved-panel');
  const activeBody = root.querySelector('#alerts-active-body');
  const resolvedBody = root.querySelector('#alerts-resolved-body');

  let currentTab = 'active';
  const resolvedCache = new Map();

  function switchTab(tab) {
    currentTab = tab;
    const isActive = tab === 'active';
    tabActive.classList.toggle('tab--active', isActive);
    tabResolved.classList.toggle('tab--active', !isActive);
    tabActive.setAttribute('aria-selected', String(isActive));
    tabResolved.setAttribute('aria-selected', String(!isActive));
    activePanel.hidden = !isActive;
    resolvedPanel.hidden = isActive;
    if (tab === 'resolved') loadResolved();
  }

  tabActive.addEventListener('click', () => switchTab('active'));
  tabResolved.addEventListener('click', () => switchTab('resolved'));

  function renderActive(alerts) {
    // Dedup por id — el sondeo puede entregar la misma alerta en ciclos.
    const byId = new Map((alerts || []).map((a) => [a.id, a]));
    const list = [...byId.values()].sort((a, b) => b.ts - a.ts);
    if (!list.length) {
      activeBody.replaceChildren(el('tr', {}, el('td', { colspan: '4' }, emptyState('No hay alertas activas.'))));
      return;
    }
    activeBody.replaceChildren(
      ...list.map((a) =>
        el('tr', { dataset: { id: a.id } },
          el('td', {}, severityBadge(a.severity)),
          el('td', {}, el('span', { class: 'alert-msg', text: a.message })),
          el('td', { class: 'mono', text: fmtDateTime(a.ts) }),
          el('td', {},
            el('button', {
              class: 'btn btn--sm btn--primary',
              type: 'button',
              text: 'Confirmar (ACK)',
              onclick: () => ack(a),
            })))),
    );
  }

  function renderResolved(alerts) {
    const list = [...new Map((alerts || []).map((a) => [a.id, a])).values()].sort((a, b) => b.ack_ts - a.ack_ts);
    if (!list.length) {
      resolvedBody.replaceChildren(el('tr', {}, el('td', { colspan: '4' }, emptyState('No hay alertas resueltas.'))));
      return;
    }
    resolvedBody.replaceChildren(
      ...list.map((a) =>
        el('tr', {},
          el('td', {}, severityBadge(a.severity)),
          el('td', {}, el('span', { class: 'alert-msg', text: a.message })),
          el('td', { class: 'mono', text: fmtDateTime(a.ts) }),
          el('td', {}, el('span', { class: 'muted', text: `${a.ack_by || '—'} · ${fmtDateTime(a.ack_ts)}` })))),
    );
  }

  async function ack(alert) {
    const user = getState().user;
    try {
      await api.ackAlert(alert.id, user?.username || 'admin');
      toast('Alerta confirmada.', 'success');
      poller.pollNow(); // refresca las alertas activas en el store
      loadResolved();    // la mueve al tab de resueltas de inmediato
    } catch (err) {
      toast(`No se pudo confirmar: ${err.message}`, 'error');
    }
  }

  async function loadResolved() {
    const deviceId = getState().deviceId;
    if (!deviceId) return;
    try {
      const resolved = await api.listAlerts(deviceId, { ack: true });
      resolvedCache.clear();
      (resolved || []).forEach((a) => resolvedCache.set(a.id, a));
      renderResolved(resolved);
    } catch (err) {
      resolvedBody.replaceChildren(el('tr', {}, el('td', { colspan: '4' }, emptyState(`Error: ${err.message}`))));
    }
  }

  function onStore(state, patch) {
    if ('alerts' in patch) renderActive(state.alerts);
  }

  const unsubscribe = subscribe(onStore);
  renderActive(getState().alerts);

  return () => unsubscribe();
}
