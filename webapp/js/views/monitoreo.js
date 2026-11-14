// ============================================================================
// monitoreo.js — Gráfica en el tiempo de las 6 zonas FSR (p1..p6) + panel de
// configuración (solo administrador). El esqueleto (cards y el panel de
// configuración) vive en monitoreo.html; aquí se generan las tarjetas por
// sensor (cada una con su <canvas>) desde SENSORS y se hidratan con el store.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { CONFIG, SENSORS } from '../config.js';
import { totalPressure, safeNum } from '../core/utils.js';
import { LineChart, cssVar } from '../core/chart.js';
import { readingTimeLabel } from './helpers.js';
import { renderSettingsForm } from './settingsForm.js';
import { isAdmin } from '../services/auth.js';

export function init(root) {
  const emptyBanner = root.querySelector('#monitoreo-empty');
  const grid = root.querySelector('.sensor-grid');
  const settingsCard = root.querySelector('#monitoreo-settings');
  const settingsFormMount = root.querySelector('#monitoreo-settings-form');

  // --- Tarjetas por sensor: lectura actual + gráfica de su evolución reciente.
  const cards = {};
  for (const z of SENSORS) {
    const num = el('strong', { text: '—' });
    const canvas = el('canvas', { class: 'chart' });
    cards[z.key] = { num, chart: new LineChart(canvas, { height: 180 }) };
    grid.appendChild(el('div', { class: 'sensor-card' },
      el('div', { class: 'sensor-card__head' },
        el('span', { class: 'sensor-card__name', text: z.name }),
        el('code', { text: z.key })),
      num,
      canvas));
  }

  // --- Panel de configuración (solo administrador, mismo formulario que Ajustes).
  let settingsSection = null;
  const user = getState().user;
  if (isAdmin(user)) {
    const sf = renderSettingsForm();
    settingsFormMount.replaceChildren(sf.node);
    settingsCard.hidden = false;
    settingsSection = sf;
  }

  function refresh() {
    const st = getState();
    const r = st.lastReading;
    const total = r ? totalPressure(r) : 0;
    const threshold = st.settings?.empty_bed_min_weight ?? CONFIG.FIRMWARE.EMPTY_BED_MIN_WEIGHT;
    emptyBanner.hidden = !(r && total < threshold);

    // Serie temporal compartida (oldest → newest) para las 6 gráficas.
    const series = (st.recentReadings || []).slice().reverse();
    const labels = series.map((x) => readingTimeLabel(x.ts));

    for (const z of SENSORS) {
      const { num, chart } = cards[z.key];
      const raw = r?.[z.key];
      const v = safeNum(raw, 0, CONFIG.FIRMWARE.ADC_MAX);
      num.textContent = v != null ? String(v) : '—';
      chart.setData({
        labels,
        series: [{
          name: z.name,
          color: cssVar('--accent', '#2563eb'),
          fill: true,
          values: series.map((x) => safeNum(x[z.key], 0, CONFIG.FIRMWARE.ADC_MAX) ?? NaN),
        }],
      });
    }
  }

  const unsubscribe = subscribe(refresh);
  refresh();

  return () => {
    unsubscribe();
    for (const z of SENSORS) cards[z.key].chart.destroy();
    if (settingsSection) settingsSection.cleanup();
  };
}
