// ============================================================================
// dashboard.js — High-level overview: live metrics, posture, trends and alerts.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, subscribe } from '../services/store.js';
import { CONFIG, POSTURES } from '../config.js';
import { LineChart, cssVar } from '../core/chart.js';
import { timeAgo, totalPressure, safeNum } from '../core/utils.js';
import { pageHeader, statCard, severityBadge, card, readingTimeLabel, emptyState } from './helpers.js';
import * as poller from '../services/poller.js';

export function render(container) {
  // --- Static skeleton (values patched in place on each store update) -------
  const postureValue = el('strong', { text: '—' });
  const tempValue = el('strong', { text: '—' });
  const humValue = el('strong', { text: '—' });
  const totalValue = el('strong', { text: '—' });
  const seenValue = el('strong', { text: '—' });

  const statusBanner = el('div', { class: 'status-banner', hidden: true });

  const alertList = el('div', { class: 'alert-list' });
  const pressureCanvas = el('canvas', { class: 'chart', style: 'height:220px' });
  const tempCanvas = el('canvas', { class: 'chart', style: 'height:150px' });
  const humCanvas = el('canvas', { class: 'chart', style: 'height:150px' });

  const pollSelect = el('select', {
    class: 'select',
    'aria-label': 'Intervalo de sondeo',
    onchange: (e) => poller.setIntervalMs(Number(e.target.value) * 1000),
  }, ...[2, 3, 4, 5, 10].map((s) => el('option', { value: s, text: `${s} s` })));

  const grid = el('div', { class: 'stat-grid' },
    statCard('Postura actual', el('span', { class: 'badge badge--posture', text: '—' }, ), null, { icon: '🛏️' }),
    statCard('Temperatura', tempValue, '°C', { icon: '🌡️' }),
    statCard('Humedad', humValue, '%', { icon: '💧' }),
    statCard('Presión total', totalValue, '', { icon: '⚖️' }),
    statCard('Última lectura', seenValue, '', { icon: '📡' }),
  );
  // Patch the posture badge (first stat card) to expose a ref.
  const postureBadge = grid.querySelector('.badge--posture');

  const root = el('div', { class: 'page' },
    pageHeader('Panel', 'Resumen en vivo del colchón seleccionado.'),
    statusBanner,
    grid,
    el('div', { class: 'grid grid--2' },
      card('Tendencia de presión', pressureCanvas),
      card('Alertas activas', el('div', {},
        alertList,
        el('a', { class: 'link', href: '#/alerts', text: 'Ver todas las alertas →' }))),
    ),
    el('div', { class: 'grid grid--2' },
      card('Temperatura (°C)', tempCanvas),
      card('Humedad relativa (%)', humCanvas),
    ),
    card('Intervalo de sondeo',
      el('div', { class: 'inline-control' },
        el('span', { text: 'Actualizar cada' }),
        pollSelect,
        el('span', { class: 'muted', text: '(el panel se refresca automáticamente)' }))),
  );
  container.replaceChildren(root);

  const charts = [
    new LineChart(pressureCanvas, { height: 220 }),
    new LineChart(tempCanvas, { height: 150 }),
    new LineChart(humCanvas, { height: 150 }),
  ];

  // Reflect current poll interval into the select (falls back to 4 s).
  const currentMs = getState().pollIntervalMs || CONFIG.DEFAULT_POLL_INTERVAL_MS;
  const currentSec = Math.round(currentMs / 1000);
  if ([2, 3, 4, 5, 10].includes(currentSec)) pollSelect.value = String(currentSec);

  // --- Update ----------------------------------------------------------------
  function refresh() {
    const st = getState();
    const r = st.lastReading;

    // Posture.
    if (r?.posture) {
      postureBadge.textContent = POSTURES[r.posture] || r.posture;
    } else {
      postureBadge.textContent = '—';
    }

    // Temperature / humidity (guarded against null/NaN/out-of-range).
    const temp = safeNum(r?.temp, -40, 125);
    const hum = safeNum(r?.hum, 0, 100);
    tempValue.textContent = temp != null ? temp.toFixed(1) : '—';
    humValue.textContent = hum != null ? hum.toFixed(0) : '—';

    // Total pressure.
    const total = r ? totalPressure(r) : 0;
    totalValue.textContent = r ? String(total) : '—';

    // Last seen.
    seenValue.textContent = r ? timeAgo(r.ts) : '—';

    // Status banner: empty bed / offline device.
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

    // Alert preview.
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

    // Charts.
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
