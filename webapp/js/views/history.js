// ============================================================================
// history.js — Historical readings, filterable by date range, with CSV export.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { CONFIG, POSTURES, SENSORS } from '../config.js';
import { fmtTime, totalPressure, downloadCSV } from '../core/utils.js';
import { LineChart, cssVar } from '../core/chart.js';
import { pageHeader, card, emptyState, readingTimeLabel } from './helpers.js';
import * as api from '../services/apiClient.js';
import { toast } from '../core/ui.js';

function toLocalInput(ms) {
  const d = new Date(ms);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function render(container) {
  const fromInput = el('input', { type: 'datetime-local', class: 'input', value: toLocalInput(Date.now() - 6 * 60 * 60 * 1000) });
  const toInput = el('input', { type: 'datetime-local', class: 'input', value: toLocalInput(Date.now()) });

  const tableBody = el('tbody');
  const chartCanvas = el('canvas', { class: 'chart', style: 'height:220px' });
  const chart = new LineChart(chartCanvas, { height: 220 });
  let lastRows = [];

  const countNote = el('p', { class: 'muted' });

  const root = el('div', { class: 'page' },
    pageHeader('Historial', 'Consulta las lecturas históricas del dispositivo y exporta a CSV.'),
    card('Filtro de fechas',
      el('div', { class: 'form-row' },
        el('div', { class: 'field' }, el('label', { for: 'from', text: 'Desde' }), fromInput),
        el('div', { class: 'field' }, el('label', { for: 'to', text: 'Hasta' }), toInput),
        el('div', { class: 'field field--grow' },
          el('button', { class: 'btn btn--primary', type: 'button', text: 'Aplicar', onclick: apply }),
          el('button', { class: 'btn btn--outline', type: 'button', text: 'Exportar CSV', onclick: exportCSV }))),
      countNote),
    card('Tendencia de presión', chartCanvas),
    card('Registros',
      el('div', { class: 'table-wrap' },
        el('table', { class: 'table' },
          el('thead', {}, el('tr', {},
            el('th', { text: 'Hora' }),
            el('th', { text: 'Postura' }),
            ...SENSORS.map((s) => el('th', { text: s.key, title: s.name })),
            el('th', { text: 'Temp' }),
            el('th', { text: 'Hum' }))),
          tableBody))),
  );
  container.replaceChildren(root);

  async function apply() {
    const from = new Date(fromInput.value).getTime();
    const to = new Date(toInput.value).getTime();
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
      toast('Rango de fechas inválido.', 'warning');
      return;
    }
    const deviceId = getState().deviceId;
    if (!deviceId) return;
    tableBody.replaceChildren(el('tr', {}, el('td', { colspan: '10', text: 'Cargando…' })));
    try {
      const rows = await api.getReadings(deviceId, { limit: CONFIG.HISTORY_PAGE_SIZE });
      const filtered = (rows || [])
        .filter((r) => r.ts >= from && r.ts <= to)
        .sort((a, b) => a.ts - b.ts); // oldest → newest
      lastRows = filtered;
      countNote.textContent = `${filtered.length} registro(s) en el rango seleccionado.`;
      renderTable(filtered);
      chart.setData({
        labels: filtered.map((r) => readingTimeLabel(r.ts)),
        series: [{ name: 'Presión total', color: cssVar('--accent', '#2563eb'), fill: true, values: filtered.map(totalPressure) }],
      });
    } catch (err) {
      tableBody.replaceChildren(el('tr', {}, el('td', { colspan: '10' }, emptyState(`Error: ${err.message}`))));
    }
  }

  function renderTable(rows) {
    if (!rows.length) {
      tableBody.replaceChildren(el('tr', {}, el('td', { colspan: '10' }, emptyState('Sin registros en el rango seleccionado.'))));
      return;
    }
    tableBody.replaceChildren(
      ...rows.slice(0, 300).map((r) =>
        el('tr', {},
          el('td', { class: 'mono', text: fmtTime(r.ts) }),
          el('td', { text: POSTURES[r.posture] || r.posture || '—' }),
          ...SENSORS.map((s) => el('td', { text: r[s.key] ?? '—' })),
          el('td', { text: r.temp != null ? `${r.temp}°` : '—' }),
          el('td', { text: r.hum != null ? `${r.hum}%` : '—' }))),
    );
    if (rows.length > 300) {
      tableBody.appendChild(el('tr', {}, el('td', { colspan: '10', class: 'muted', text: `Mostrando 300 de ${rows.length} registros.` })));
    }
  }

  function exportCSV() {
    if (!lastRows.length) {
      toast('No hay datos para exportar. Aplica un filtro primero.', 'warning');
      return;
    }
    const header = ['hora', 'postura', ...SENSORS.map((s) => s.key), 'temp', 'hum'];
    const data = lastRows.map((r) => [fmtTime(r.ts), r.posture, ...SENSORS.map((s) => r[s.key]), r.temp, r.hum]);
    downloadCSV(`historial_${getState().deviceId || 'dispositivo'}.csv`, [header, ...data]);
    toast('CSV exportado.', 'success');
  }

  // Re-apply the current filter when the selected device changes.
  const unsubscribe = subscribe((_state, patch) => {
    if ('deviceId' in patch) apply();
  });
  apply();

  return () => {
    unsubscribe();
    chart.destroy();
  };
}
