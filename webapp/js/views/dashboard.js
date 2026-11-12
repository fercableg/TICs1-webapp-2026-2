// ============================================================================
// dashboard.js — Resumen de alto nivel: métricas en vivo, postura, tendencias
// y alertas. El esqueleto estático vive en dashboard.html; aquí se hidratan
// los valores, se crean los gráficos y se suscribe al store.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { CONFIG, POSTURES } from '../config.js';
import { LineChart, cssVar } from '../core/chart.js';
import { timeAgo, totalPressure, safeNum } from '../core/utils.js';
import { severityBadge, readingTimeLabel, emptyState } from './helpers.js';
import * as poller from '../services/poller.js';

export function init(root) {
  const postureBadge = root.querySelector('#dash-posture');
  const tempValue = root.querySelector('#dash-temp');
  const humValue = root.querySelector('#dash-hum');
  const totalValue = root.querySelector('#dash-total');
  const seenValue = root.querySelector('#dash-seen');
  const statusBanner = root.querySelector('#dash-status');
  const alertList = root.querySelector('#dash-alerts');
  const pollSelect = root.querySelector('#dash-poll');
  const pressureCanvas = root.querySelector('#dash-pressure');
  const tempCanvas = root.querySelector('#dash-temp-chart');
  const humCanvas = root.querySelector('#dash-hum-chart');

  pollSelect.addEventListener('change', (e) => poller.setIntervalMs(Number(e.target.value) * 1000));

  const charts = [
    new LineChart(pressureCanvas, { height: 220 }),
    new LineChart(tempCanvas, { height: 150 }),
    new LineChart(humCanvas, { height: 150 }),
  ];

  // Reflejar el intervalo de sondeo actual en el select (por defecto 4 s).
  const currentMs = getState().pollIntervalMs || CONFIG.DEFAULT_POLL_INTERVAL_MS;
  const currentSec = Math.round(currentMs / 1000);
  if ([2, 3, 4, 5, 10].includes(currentSec)) pollSelect.value = String(currentSec);

  function refresh() {
    const st = getState();
    const r = st.lastReading;

    // Postura.
    if (r?.posture) {
      postureBadge.textContent = POSTURES[r.posture] || r.posture;
    } else {
      postureBadge.textContent = '—';
    }

    // Temperatura / humedad (protegidas contra null/NaN/fuera de rango).
    const temp = safeNum(r?.temp, -40, 125);
    const hum = safeNum(r?.hum, 0, 100);
    tempValue.textContent = temp != null ? temp.toFixed(1) : '—';
    humValue.textContent = hum != null ? hum.toFixed(0) : '—';

    // Presión total.
    const total = r ? totalPressure(r) : 0;
    totalValue.textContent = r ? String(total) : '—';

    // Última lectura.
    seenValue.textContent = r ? timeAgo(r.ts) : '—';

    // Banner de estado: cama vacía / dispositivo desconectado.
    const threshold = st.settings?.empty_bed_min_weight ?? CONFIG.FIRMWARE.EMPTY_BED_MIN_WEIGHT;
    const device = st.devices.find((d) => d.id === st.deviceId);
    let banner = null;
    if (device && !device.online) {
      banner = { tone: 'warn', text: 'El dispositivo seleccionado está desconectado. Mostrando el último dato recibido.' };
    } else if (r && total < threshold) {
      banner = { tone: 'info', text: 'Cama vacía: la presión total está bajo el umbral configurado.' };
    }
    if (banner) {
      statusBanner.hidden = false;
      statusBanner.className = `status-banner status-banner--${banner.tone}`;
      statusBanner.textContent = banner.text;
    } else {
      statusBanner.hidden = true;
    }

    // Vista previa de alertas.
    const alerts = (st.alerts || []).slice(0, 4);
    if (alerts.length) {
      alertList.replaceChildren(
        ...alerts.map((a) =>
          el('div', { class: 'alert-item' },
            severityBadge(a.severity),
            el('div', { class: 'alert-item__body' },
              el('p', { class: 'alert-item__msg', text: a.message }),
              el('span', { class: 'alert-item__time', text: timeAgo(a.ts) })))),
      );
    } else {
      alertList.replaceChildren(emptyState('No hay alertas activas.'));
    }

    // Gráficos.
    const series = (st.recentReadings || []).slice().reverse(); // oldest → newest
    const labels = series.map((x) => readingTimeLabel(x.ts));
    charts[0].setData({
      labels,
      series: [{ name: 'Presión total', color: cssVar('--accent', '#2563eb'), fill: true, values: series.map(totalPressure) }],
    });
    charts[1].setData({
      labels,
      series: [{ name: 'Temperatura', color: cssVar('--chart-temp', '#f59e0b'), values: series.map((x) => safeNum(x.temp, -40, 125) ?? NaN) }],
    });
    charts[2].setData({
      labels,
      series: [{ name: 'Humedad', color: cssVar('--chart-hum', '#06b6d4'), fill: true, values: series.map((x) => safeNum(x.hum, 0, 100) ?? NaN) }],
    });
  }

  const unsubscribe = subscribe(refresh);
  refresh();

  return () => {
    unsubscribe();
    charts.forEach((c) => c.destroy());
  };
}
