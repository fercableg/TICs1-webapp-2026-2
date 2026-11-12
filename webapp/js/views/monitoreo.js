// ============================================================================
// monitoreo.js — Mapa de presión visual de las 6 zonas FSR (p1..p6) + lecturas
// en vivo + panel de configuración (solo administrador). El esqueleto (cards,
// leyenda y el panel de configuración) vive en monitoreo.html; aquí se generan
// las celdas del mapa y las tarjetas por sensor desde SENSORS y se hidratan.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { CONFIG, SENSORS } from '../config.js';
import { totalPressure, safeNum } from '../core/utils.js';
import { pressureColor } from './helpers.js';
import { renderSettingsForm } from './settingsForm.js';
import { isAdmin } from '../services/auth.js';

export function init(root) {
  const emptyBanner = root.querySelector('#monitoreo-empty');
  const map = root.querySelector('.bed-map');
  const detailGrid = root.querySelector('.sensor-grid');
  const settingsCard = root.querySelector('#monitoreo-settings');
  const settingsFormMount = root.querySelector('#monitoreo-settings-form');

  // --- Celdas del mapa de presión (posicionadas sobre el colchón estilizado).
  const cells = {};
  for (const z of SENSORS) {
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
    map.appendChild(cell);
  }

  // --- Tarjetas de detalle por sensor (lectura numérica + barra de intensidad).
  const bars = {};
  for (const z of SENSORS) {
    const bar = el('div', { class: 'sensor-bar__fill' });
    const num = el('strong', { text: '—' });
    bars[z.key] = { bar, num };
    detailGrid.appendChild(el('div', { class: 'sensor-card' },
      el('div', { class: 'sensor-card__head' },
        el('span', { class: 'sensor-card__name', text: z.name }),
        el('code', { text: z.key })),
      num,
      el('div', { class: 'sensor-bar' }, bar)));
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
    if (settingsSection) settingsSection.cleanup();
  };
}
