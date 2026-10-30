// ============================================================================
// poller.js — Central polling loop. Owns the connection status state machine
// and keeps the store fresh with readings + alerts + devices.
//
// On failure it shows a non-intrusive banner (with manual retry) and keeps
// polling automatically so the app reconnects without user action.
// ============================================================================

import { CONFIG } from '../config.js';
import { getState, setState } from './store.js';
import * as api from './apiClient.js';
import { showNetworkBanner, hideNetworkBanner, isBannerVisible } from '../core/ui.js';

let timer = null;
let running = false;
let intervalMs = CONFIG.DEFAULT_POLL_INTERVAL_MS;

export function getIntervalMs() {
  return intervalMs;
}

export function setIntervalMs(ms) {
  intervalMs = Math.max(1000, Math.floor(Number(ms)) || CONFIG.DEFAULT_POLL_INTERVAL_MS);
  setState({ pollIntervalMs: intervalMs });
  if (running) {
    clearTimeout(timer);
    schedule();
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(tick, intervalMs);
}

async function tick() {
  const st = getState();
  try {
    // Always fetch devices so the selector can populate (and auto-adopt a
    // device) even before the user has picked one. Readings/alerts only make
    // sense once a device is selected.
    const devices = await api.listDevices();
    let readings = null;
    let alerts = [];
    if (st.deviceId) {
      [readings, alerts] = await Promise.all([
        api.getReadings(st.deviceId, { limit: 200 }),
        api.listAlerts(st.deviceId, { ack: false }),
      ]);
    }
    setState({
      lastReading: readings?.[0] ?? null,
      recentReadings: Array.isArray(readings) ? readings.slice(0, 60) : [],
      alerts: Array.isArray(alerts) ? alerts : [],
      devices: Array.isArray(devices) ? devices : st.devices,
      connectionStatus: 'connected',
      lastSuccessAt: Date.now(),
      loading: false,
    });
    hideNetworkBanner();
  } catch (err) {
    setState({ connectionStatus: 'error', loading: false });
    if (!isBannerVisible()) {
      showNetworkBanner(`Sin conexión con el servidor: ${err.message || 'error de red'}.`, () => pollNow(true));
    }
  } finally {
    schedule();
  }
}

export function pollNow(silent = false) {
  if (!running) {
    // One-shot manual refresh (still updates the store).
    setState({ connectionStatus: 'connecting' });
    return tick();
  }
  return tick();
}

export function startPoller() {
  if (running) return;
  running = true;
  setState({ connectionStatus: 'connecting' });
  tick();
}

export function stopPoller() {
  running = false;
  clearTimeout(timer);
  timer = null;
}
