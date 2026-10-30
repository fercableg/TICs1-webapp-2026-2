// ============================================================================
// store.js — Minimal reactive store (pub/sub). A single source of truth for the
// session-scoped UI state; views subscribe and re-render on change.
// ============================================================================

const state = {
  user: null,           // { username, role, name } | null
  devices: [],          // Device[]
  deviceId: null,       // selected device id
  settings: null,       // Settings for the selected device
  lastReading: null,    // latest Reading
  recentReadings: [],   // newest-first Reading[] (for trend charts)
  alerts: [],           // Alert[] from the latest poll
  connectionStatus: 'connecting', // connecting | connected | stale | error
  lastSuccessAt: null,  // epoch ms of the last successful poll
  pollIntervalMs: null, // current polling cadence
  loading: false,
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) {
    try {
      fn(state, patch);
    } catch (err) {
      console.error('[store] subscriber error', err);
    }
  }
}

// Subscribe to state changes. Returns an unsubscribe function.
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
