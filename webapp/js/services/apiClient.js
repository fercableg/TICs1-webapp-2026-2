// ============================================================================
// apiClient.js — Centralized data access layer.
//
// EVERY network call in the app goes through this module. Views and UI code
// never touch `fetch()` directly, so if the backend or endpoint shapes change,
// only this file needs editing.
//
//   * USE_MOCK_DATA === true  → answers from the in-browser mock (no network).
//   * USE_MOCK_DATA === false → real Supabase REST calls (PostgREST syntax).
//
// Supabase REST conventions used here:
//   - Filter:  ?device_id=eq.{id}
//   - Sort:    &order=ts.desc
//   - Limit:   &limit={n}
//   - Headers: apikey + Authorization: Bearer <anon-key>
//   - PATCH:   Prefer: return=representation (so the updated row comes back)
// ============================================================================

import { CONFIG } from '../config.js';
import * as mock from './mockData.js';

const REQUEST_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(message, status = 0, isTimeout = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isTimeout = isTimeout;
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Simulated network latency in mock mode so loading states are visible.
async function mockLatency() {
  await delay(60 + Math.floor(Math.random() * 120));
  if (mock.isFailing()) {
    throw new ApiError('Fallo de red simulado (Supabase no disponible).', 0, false);
  }
}

async function supabaseFetch(path, { method = 'GET', body, query = '' } = {}) {
  const url = `${CONFIG.API_BASE_URL}/${path}${query ? `?${query}` : ''}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        apikey: CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...(method === 'PATCH' ? { Prefer: 'return=representation' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new ApiError(`Error del servidor (HTTP ${res.status}).`, res.status);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('La solicitud excedió el tiempo de espera.', 0, true);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export async function listDevices() {
  if (CONFIG.USE_MOCK_DATA) {
    await mockLatency();
    return mock.listDevices();
  }
  return supabaseFetch('devices', { query: 'select=*&order=last_seen.desc' });
}

// ---------------------------------------------------------------------------
// Readings
// ---------------------------------------------------------------------------

export async function getReadings(deviceId, { limit = 200 } = {}) {
  if (CONFIG.USE_MOCK_DATA) {
    await mockLatency();
    return mock.getReadings(deviceId, { limit });
  }
  return supabaseFetch('readings', {
    query: `device_id=eq.${encodeURIComponent(deviceId)}&order=ts.desc&limit=${limit}`,
  });
}

export async function postReading(payload) {
  if (CONFIG.USE_MOCK_DATA) {
    await mockLatency();
    return mock.postReading(payload);
  }
  return supabaseFetch('readings', { method: 'POST', body: payload });
}

// ---------------------------------------------------------------------------
// Position events
// ---------------------------------------------------------------------------

export async function listPositionEvents(deviceId) {
  if (CONFIG.USE_MOCK_DATA) {
    await mockLatency();
    return mock.listPositionEvents(deviceId);
  }
  return supabaseFetch('position_events', {
    query: `device_id=eq.${encodeURIComponent(deviceId)}&order=timestamp.desc`,
  });
}

export async function postPositionEvent(payload) {
  if (CONFIG.USE_MOCK_DATA) {
    await mockLatency();
    return mock.postPositionEvent(payload);
  }
  return supabaseFetch('position_events', { method: 'POST', body: payload });
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function listAlerts(deviceId, { ack = false } = {}) {
  if (CONFIG.USE_MOCK_DATA) {
    await mockLatency();
    return mock.listAlerts(deviceId, { ack });
  }
  const filter = ack ? 'ack=is.true' : 'ack=is.false';
  return supabaseFetch('alerts', {
    query: `device_id=eq.${encodeURIComponent(deviceId)}&${filter}&order=ts.desc`,
  });
}

export async function ackAlert(id, by) {
  if (CONFIG.USE_MOCK_DATA) {
    await mockLatency();
    return mock.ackAlert(id, by);
  }
  return supabaseFetch('alerts', {
    method: 'PATCH',
    query: `id=eq.${encodeURIComponent(id)}`,
    body: { ack: true, ack_by: by, ack_ts: new Date().toISOString() },
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(deviceId) {
  if (CONFIG.USE_MOCK_DATA) {
    await mockLatency();
    return mock.getSettings(deviceId);
  }
  const rows = await supabaseFetch('settings', {
    query: `device_id=eq.${encodeURIComponent(deviceId)}&limit=1`,
  });
  return rows?.[0] ?? null;
}

export async function updateSettings(deviceId, patch) {
  if (CONFIG.USE_MOCK_DATA) {
    await mockLatency();
    return mock.updateSettings(deviceId, patch);
  }
  const rows = await supabaseFetch('settings', {
    method: 'PATCH',
    query: `device_id=eq.${encodeURIComponent(deviceId)}`,
    body: { ...patch, updated_at: new Date().toISOString() },
  });
  return rows?.[0] ?? null;
}
