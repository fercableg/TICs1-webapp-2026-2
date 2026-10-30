// ============================================================================
// mockData.js — In-browser mock backend for offline/UI development.
//
// Generates realistic, time-varying data for three virtual devices so every
// view can be exercised before the Supabase backend exists:
//   esp32-001  online, patient in bed (drift + posture changes)
//   esp32-002  offline (stale data → exercises the "disconnected" state)
//   esp32-003  online but empty bed (pressure below the firmware threshold)
//
// The apiClient (js/services/apiClient.js) routes here when USE_MOCK_DATA=true,
// so the UI is completely unaware of whether data is mocked or live.
// ============================================================================

import { CONFIG, SENSOR_KEYS } from '../config.js';

// Relative pressure distribution per posture across the 6 FSR channels
// (order: p1=occipital, p2=escápula izq, p3=escápula der, p4=sacro,
//         p5=talón izq, p6=talón der). Each profile sums to ~1.0.
const PROFILES = {
  supina:       { p1: 0.10, p2: 0.16, p3: 0.16, p4: 0.30, p5: 0.14, p6: 0.14 },
  prono:        { p1: 0.08, p2: 0.18, p3: 0.18, p4: 0.20, p5: 0.18, p6: 0.18 },
  lateral_izq:  { p1: 0.10, p2: 0.26, p3: 0.06, p4: 0.18, p5: 0.30, p6: 0.10 },
  lateral_der:  { p1: 0.10, p2: 0.06, p3: 0.26, p4: 0.18, p5: 0.10, p6: 0.30 },
  fuera_cama:   { p1: 0.0, p2: 0.0, p3: 0.0, p4: 0.0, p5: 0.0, p6: 0.0 },
};

const round1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Seed the in-memory database once per session.
// ---------------------------------------------------------------------------
const DB = (() => {
  const anchor = Date.now();
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;

  const defs = [
    {
      id: 'esp32-001',
      name: 'Colchón 1 · Sala 4',
      online: true,
      empty: false,
      totalWeight: 2900,
      tempBase: 33.8,
      humBase: 48,
      posture: 'supina',
      events: [
        { position: 'supina', source: 'sensor', agoMin: 300 },
        { position: 'lateral_izq', source: 'sensor', agoMin: 240 },
        { position: 'supina', source: 'cuidador', agoMin: 200 },
        { position: 'lateral_der', source: 'sensor', agoMin: 150 },
        { position: 'supina', source: 'sensor', agoMin: 140 },
      ],
      alerts: [
        { id: 'a1', severity: 'warning', active: true, type: 'stationary', message: 'Tiempo máximo en la misma posición (2 h 20 min). Se recomienda cambio.' },
        { id: 'a3', severity: 'warning', active: true, type: 'temperature', message: 'Variación de temperatura (+1.8 °C) en la zona de contacto.' },
        { id: 'a2', severity: 'info', active: false, type: 'info', message: 'Cambio de posición registrado a lateral izquierdo.' },
      ],
      patient: 'María González',
      weight: 72,
    },
    {
      id: 'esp32-002',
      name: 'Colchón 2 · Sala 7',
      online: false,
      empty: false,
      totalWeight: 2600,
      tempBase: 34.2,
      humBase: 51,
      lastSeenAgoMs: 28 * MIN,
      posture: 'lateral_izq',
      events: [
        { position: 'supina', source: 'cuidador', agoMin: 180 },
        { position: 'lateral_izq', source: 'sensor', agoMin: 40 },
      ],
      alerts: [
        { id: 'a4', severity: 'critical', active: true, type: 'offline', message: 'Dispositivo desconectado: sin datos hace 28 min.' },
        { id: 'a5', severity: 'info', active: false, type: 'info', message: 'Reconexión exitosa.' },
      ],
      patient: 'Carlos Rojas',
      weight: 84,
    },
    {
      id: 'esp32-003',
      name: 'Colchón 3 · Sala 9',
      online: true,
      empty: true,
      totalWeight: 70,
      tempBase: 24.1,
      humBase: 40,
      posture: 'fuera_cama',
      events: [
        { position: 'lateral_der', source: 'sensor', agoMin: 400 },
        { position: 'fuera_cama', source: 'sensor', agoMin: 360 },
      ],
      alerts: [
        { id: 'a6', severity: 'info', active: true, type: 'empty', message: 'Cama vacía: presión total bajo el umbral.' },
      ],
      patient: '—',
      weight: null,
    },
  ];

  const devices = defs.map((d) => {
    const events = d.events.map((e, i) => ({
      id: `${d.id}-evt-${i}`,
      device_id: d.id,
      position: e.position,
      source: e.source,
      timestamp: anchor - e.agoMin * MIN,
    }));

    const alerts = d.alerts.map((a) => ({
      id: a.id,
      device_id: d.id,
      severity: a.severity,
      type: a.type,
      message: a.message,
      ack: !a.active,
      ack_by: a.active ? null : 'admin',
      ack_ts: a.active ? null : anchor - 2 * HOUR,
      ts: anchor - (a.active ? 20 * MIN : 3 * HOUR),
    }));

    const settings = {
      device_id: d.id,
      patient_name: d.patient,
      patient_weight_kg: d.weight,
      initial_position: d.posture,
      empty_bed_min_weight: CONFIG.FIRMWARE.EMPTY_BED_MIN_WEIGHT,
      side_diff_pct: CONFIG.FIRMWARE.SIDE_DIFF_PCT,
      delta_temp_c: CONFIG.FIRMWARE.DELTA_TEMP_C,
      confirm_min: CONFIG.FIRMWARE.CONFIRM_MIN,
      alert_min: CONFIG.FIRMWARE.ALERT_MIN,
      sample_rate_s: 4,
      tx_interval_s: CONFIG.FIRMWARE.TX_INTERVAL_S,
      reposition_interval_min: CONFIG.FIRMWARE.REPOSITION_MIN,
      updated_at: anchor - 24 * HOUR,
    };

    return {
      ...d,
      events,
      alerts,
      settings,
      last_seen: d.online ? anchor : anchor - d.lastSeenAgoMs,
      phase: Math.random() * Math.PI * 2,
      tick: 0,
      _history: null,
      _live: [], // rolling buffer of "live" points (newest first)
    };
  });

  let failing = false;
  return { devices, anchor, failing };
})();

function find(deviceId) {
  const d = DB.devices.find((x) => x.id === deviceId);
  if (!d) throw new Error(`Dispositivo no encontrado: ${deviceId}`);
  return d;
}

function postureAt(device, ts) {
  let p = device.events[0]?.position ?? 'fuera_cama';
  for (const e of device.events) if (e.timestamp <= ts) p = e.position;
  return p;
}

function sensorValues(device, posture, t, noise = true) {
  const profile = PROFILES[posture] || PROFILES.fuera_cama;
  const out = {};
  for (const k of SENSOR_KEYS) {
    const base = device.totalWeight * profile[k];
    const drift = 1 + 0.04 * Math.sin(t / 60000 + device.phase) + (noise ? (Math.random() - 0.5) * 0.06 : 0);
    out[k] = Math.max(0, Math.round(base * drift + (device.empty ? 8 : 25)));
  }
  out.temp = round1(device.tempBase + 0.3 * Math.sin(t / 90000 + device.phase) + (noise ? (Math.random() - 0.5) * 0.2 : 0));
  out.hum = round1(device.humBase + 1.2 * Math.sin(t / 70000 + device.phase) + (noise ? (Math.random() - 0.5) * 0.8 : 0));
  return out;
}

function history(device) {
  if (device._history) return device._history;
  const step = 60 * 1000; // 1 sample / min over 6 h
  const end = Date.now();
  const start = end - 6 * 60 * step;
  const list = [];
  for (let ts = start; ts <= end; ts += step) {
    const posture = postureAt(device, ts);
    list.push({ id: `${device.id}-${ts}`, device_id: device.id, ts, posture, ...sensorValues(device, posture, ts) });
  }
  device._history = list;
  return list;
}

// ---------------------------------------------------------------------------
// Public mock API (mirrors the apiClient method names).
// ---------------------------------------------------------------------------

export function isFailing() {
  return DB.failing;
}

export function setFailing(value) {
  DB.failing = !!value;
}

export async function listDevices() {
  return DB.devices.map((d) => ({
    id: d.id,
    name: d.name,
    last_seen: d.last_seen,
    online: d.online,
    empty: d.empty,
  }));
}

export async function getReadings(deviceId, { limit = 200 } = {}) {
  const device = find(deviceId);
  const hist = history(device);

  if (device.online) {
    const ts = Date.now();
    const live = {
      id: `${device.id}-live-${device.tick++}`,
      device_id: device.id,
      ts,
      posture: device.posture,
      ...sensorValues(device, device.posture, ts),
    };
    device._live.unshift(live);
    if (device._live.length > 120) device._live.length = 120;
    device.last_seen = ts;
  }

  const merged = hist.concat(device._live.slice().reverse());
  return merged.slice(-limit).reverse();
}

export async function postReading(payload) {
  return { id: `reading-${Date.now()}`, ...payload };
}

export async function listPositionEvents(deviceId) {
  const device = find(deviceId);
  return device.events.slice().sort((a, b) => b.timestamp - a.timestamp);
}

export async function postPositionEvent(payload) {
  const device = find(payload.device_id);
  const evt = { id: `${device.id}-evt-${Date.now()}`, ...payload };
  device.events.push(evt);
  device.posture = payload.position;
  return evt;
}

export async function listAlerts(deviceId, { ack = false } = {}) {
  const device = find(deviceId);
  return device.alerts
    .filter((a) => (ack ? a.ack : !a.ack))
    .sort((a, b) => b.ts - a.ts);
}

export async function ackAlert(id, by) {
  for (const device of DB.devices) {
    const alert = device.alerts.find((a) => a.id === id);
    if (alert) {
      alert.ack = true;
      alert.ack_by = by;
      alert.ack_ts = Date.now();
      return alert;
    }
  }
  throw new Error(`Alerta no encontrada: ${id}`);
}

export async function getSettings(deviceId) {
  const device = find(deviceId);
  return { ...device.settings };
}

export async function updateSettings(deviceId, patch) {
  const device = find(deviceId);
  const next = { ...device.settings, ...patch, updated_at: Date.now() };
  // Guard numeric sanity (zero/negative values are rejected at the form level,
  // but the backend also clamps as a second line of defence).
  for (const k of ['empty_bed_min_weight', 'side_diff_pct', 'delta_temp_c', 'confirm_min', 'alert_min', 'sample_rate_s', 'tx_interval_s', 'reposition_interval_min']) {
    if (next[k] != null) next[k] = Math.max(1, Number(next[k]));
  }
  device.settings = next;
  return { ...next };
}
