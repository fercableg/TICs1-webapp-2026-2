// ============================================================================
// history.js — Lecturas históricas con filtro por rango de fechas y export CSV.
// El esqueleto (filtros, canvas y tabla) vive en history.html; aquí se hidrata.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { CONFIG, POSTURES, SENSORS } from '../config.js';
import { fmtTime, totalPressure, downloadCSV } from '../core/utils.js';
import { LineChart, cssVar } from '../core/chart.js';
import { emptyState, readingTimeLabel } from './helpers.js';
import * as api from '../services/apiClient.js';
import { toast } from '../core/ui.js';

function toLocalInput(ms) {
  const d = new Date(ms);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function init(root) {
  const fromInput = root.querySelector('#hist-from');
  const toInput = root.querySelector('#hist-to');
  const applyBtn = root.querySelector('#hist-apply');
  const exportBtn = root.querySelector('#hist-export');
  const countNote = root.querySelector('#hist-count');
  const tableBody = root.querySelector('#hist-body');
  const chartCanvas = root.querySelector('#hist-chart');

  fromInput.value = toLocalInput(Date.now() - 6 * 60 * 60 * 1000);
  toInput.value = toLocalInput(Date.now());

  const chart = new LineChart(chartCanvas, { height: 220 });
  let lastRows = [];

  applyBtn.addEventListener('click', apply);
  exportBtn.addEventListener('click', exportCSV);

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

  // Re-aplicar el filtro actual cuando cambia el dispositivo seleccionado.
  const unsubscribe = subscribe((_state, patch) => {
    if ('deviceId' in patch) apply();
  });
  apply();

  return () => {
    unsubscribe();
    chart.destroy();
  };
}
