// ============================================================================
// monitoreo.js — Visual pressure map of the 6 FSR zones (p1..p6) + live
// readings + an inline configuration panel (admin only) so thresholds and
// alert detection can be tuned at runtime without reflashing the ESP32.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { CONFIG, SENSORS } from '../config.js';
import { totalPressure, safeNum } from '../core/utils.js';
import { pageHeader, card, pressureColor } from './helpers.js';
import { renderSettingsForm } from './settingsForm.js';
import { isAdmin } from '../services/auth.js';

export function render(container) {
  const emptyBanner = el('div', { class: 'status-banner status-banner--info', hidden: true, text: 'Cama vacía: presión total bajo el umbral.' });

  // Build the pressure-map cells (positioned over a stylised mattress).
  const cells = {};
  const map = el('div', { class: 'bed-map' },
    el('div', { class: 'bed-map__body', 'aria-hidden': 'true' }),
    ...SENSORS.map((z) => {
      const value = el('span', { class: 'bed-cell__value', text: '—' });
      const cell = el('div', {
        class: 'bed-cell',
        style: `left:${z.x}%;top:${z.y}%`,
        dataset: { key: z.key },
      },
      el('span', { class: 'bed-cell__label', text: z.name }),
      value,
      el('span', { class: 'bed-cell__key', text: z.key }));
      cells[z.key] = { cell, value };
      return cell;
    }),
  );

  // Sensor detail cards (numeric readout + intensity bar).
  const bars = {};
  const detailGrid = el('div', { class: 'sensor-grid' },
    ...SENSORS.map((z) => {
      const bar = el('div', { class: 'sensor-bar__fill' });
      const num = el('strong', { text: '—' });
      bars[z.key] = { bar, num };
      return el('div', { class: 'sensor-card' },
        el('div', { class: 'sensor-card__head' },
          el('span', { class: 'sensor-card__name', text: z.name }),
          el('code', { text: z.key })),
        num,
        el('div', { class: 'sensor-bar' }, bar));
    }),
  );

  const legend = el('div', { class: 'legend' },
    el('span', { class: 'legend__label', text: 'Baja' }),
    el('div', { class: 'legend__bar' }),
    el('span', { class: 'legend__label', text: 'Alta' }),
  );

  // --- Configuration panel (admin only, same form as Ajustes) -----------------
  const user = getState().user;
  let settingsSection = null;
  if (isAdmin(user)) {
    const sf = renderSettingsForm();
    settingsSection = { sf, node: card('Configuración en tiempo real', el('div', {},
      el('p', { class: 'muted' }, 'Ajusta umbrales, detección de alertas y muestreo sin pasar por el Arduino IDE. Los cambios se aplican al instante.'),
      sf.node)) };
  }

  const children = [
    pageHeader('Monitoreo', `Mapa de presión por zona instrumentada (${SENSORS.length} sensores FSR406).`),
    emptyBanner,
    card('Mapa de presión', el('div', {}, map, legend)),
    card('Lecturas por sensor', detailGrid),
    el('p', { class: 'muted' },
      'Los valores corresponden a lecturas relativas del conversor ADC (0–4095); no son mediciones clínicas de presión tisular.'),
  ];
  if (settingsSection) children.push(settingsSection.node);

  const root = el('div', { class: 'page' }, ...children);
  container.replaceChildren(root);

  function refresh() {
    const st = getState();
    const r = st.lastReading;
    const total = r ? totalPressure(r) : 0;
    const threshold = st.settings?.empty_bed_min_weight ?? CONFIG.FIRMWARE.EMPTY_BED_MIN_WEIGHT;
    emptyBanner.hidden = !(r && total < threshold);

    for (const z of SENSORS) {
      const raw = r?.[z.key];
      const v = safeNum(raw, 0, CONFIG.FIRMWARE.ADC_MAX);
      const { cell, value } = cells[z.key];
      const { bar, num } = bars[z.key];
      if (v == null) {
        cell.style.background = 'var(--surface-2)';
        cell.classList.add('bed-cell--empty');
        value.textContent = '—';
        bar.style.width = '0%';
        num.textContent = '—';
      } else {
        const color = pressureColor(v, CONFIG.FIRMWARE.ADC_MAX);
        cell.style.background = color;
        cell.classList.remove('bed-cell--empty');
        value.textContent = String(v);
        bar.style.width = `${Math.round((v / CONFIG.FIRMWARE.ADC_MAX) * 100)}%`;
        bar.style.background = color;
        num.textContent = String(v);
      }
    }
  }

  const unsubscribe = subscribe(refresh);
  refresh();

  return () => {
    unsubscribe();
    if (settingsSection) settingsSection.sf.cleanup();
  };
}
