// ============================================================================
// alerts.js — Active / resolved alerts with severity + acknowledgment (ACK).
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { fmtDateTime } from '../core/utils.js';
import { pageHeader, card, severityBadge, emptyState } from './helpers.js';
import * as api from '../services/apiClient.js';
import { toast } from '../core/ui.js';
import * as poller from '../services/poller.js';

export function render(container) {
  const activeBody = el('tbody');
  const resolvedBody = el('tbody');
  const activePanel = el('div', {},
    el('div', { class: 'table-wrap' },
      el('table', { class: 'table' },
        el('thead', {}, el('tr', {},
          el('th', { text: 'Severidad' }),
          el('th', { text: 'Mensaje' }),
          el('th', { text: 'Fecha' }),
          el('th', { text: 'Acción' }))),
        activeBody)));
  const resolvedPanel = el('div', {},
    el('div', { class: 'table-wrap' },
      el('table', { class: 'table' },
        el('thead', {}, el('tr', {},
          el('th', { text: 'Severidad' }),
          el('th', { text: 'Mensaje' }),
          el('th', { text: 'Fecha' }),
          el('th', { text: 'Confirmada por' }))),
        resolvedBody)));

  const tabs = el('div', { class: 'tabs', role: 'tablist' },
    el('button', { class: 'tab tab--active', role: 'tab', 'aria-selected': 'true', text: 'Activas', onclick: () => switchTab('active') }),
    el('button', { class: 'tab', role: 'tab', 'aria-selected': 'false', text: 'Resueltas', onclick: () => switchTab('resolved') }),
  );

  const root = el('div', { class: 'page' },
    pageHeader('Alertas', 'Alertas activas y resueltas del dispositivo. Las alertas son orientativas, no un diagnóstico.'),
    card('', el('div', {}, tabs, activePanel)),
  );
  container.replaceChildren(root);

  let currentTab = 'active';
  const resolvedCache = new Map();

  function switchTab(tab) {
    currentTab = tab;
    root.querySelectorAll('.tab').forEach((t, i) => {
      const isActive = (i === 0 && tab === 'active') || (i === 1 && tab === 'resolved');
      t.classList.toggle('tab--active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });
    activePanel.hidden = tab !== 'active';
    resolvedPanel.hidden = tab !== 'resolved';
    // Mount the resolved panel lazily on first switch.
    if (tab === 'resolved' && !resolvedPanel.parentElement) {
      root.querySelector('.card__body').appendChild(resolvedPanel);
    }
    if (tab === 'resolved') loadResolved();
  }

  function renderActive(alerts) {
    // Dedup by id — polling can deliver the same alert across cycles.
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
      poller.pollNow(); // refresh active alerts in the store
      loadResolved();    // move it into the resolved tab immediately
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

  // Wire up the lazy resolved panel mount.
  const body = root.querySelector('.card__body');
  body.appendChild(activePanel);

  return () => unsubscribe();
}
