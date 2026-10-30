// ============================================================================
// config.js — Application-level configuration and feature flags.
// The single source of truth for endpoints, defaults and firmware constants.
// ============================================================================

export const CONFIG = {
  // When `true`, every apiClient call resolves against the in-browser mock
  // generator (js/services/mockData.js) and no network is required.
  // Flip to `false` once the Supabase backend is provisioned.
  USE_MOCK_DATA: true,

  // Supabase REST endpoint — only consulted when USE_MOCK_DATA === false.
  API_BASE_URL: 'https://YOUR-PROJECT.supabase.co/rest/v1',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY-HERE',

  // Runtime defaults.
  DEFAULT_DEVICE_ID: 'esp32-001',
  DEFAULT_POLL_INTERVAL_MS: 4000, // 4 s — dashboard polling cadence.
  CONNECTION_STALE_MS: 15000,     // last-reading age considered "stale".
  HISTORY_PAGE_SIZE: 500,

  // Firmware thresholds documented in the project report (kept in sync with
  // the ESP32 sketch so the UI defaults match the hardware behaviour).
  FIRMWARE: {
    ADC_MAX: 4095,              // ESP32 12-bit ADC range.
    EMPTY_BED_MIN_WEIGHT: 300,  // UMBRAL_TOTAL: sum(p1..p6) below → empty bed.
    SIDE_DIFF_PCT: 15,          // DIF_LADO: min % difference to pick a side
                                //   (left = p2+p5, right = p3+p6).
    DELTA_TEMP_C: 1.5,          // DELTA_TEMP: °C change → pressure alert.
    CONFIRM_MIN: 10,            // T_CONFIRMAR: minutes to confirm a posture.
    ALERT_MIN: 120,             // T_ALERTA: minutes before stationary alert (2 h).
    TX_INTERVAL_S: 60,          // TX_INTERVAL: seconds between ESP32 uploads.
    REPOSITION_MIN: 120,        // T_REPOSICION: minutes between recommended turns.
  },

  APP_NAME: 'Monitoreo de Colchón Inteligente',
  APP_SHORT: 'Proyecto TICs 1',
  APP_VERSION: '0.2.0',
};

// Pressure sensor zones (Fase 2 distribution: 6 FSR406 over bony prominences).
// `key` maps to the readings fields p1..p6; `x`/`y` are the % position on the
// bed map (head at top, feet at bottom). Keep in sync with the ESP32 sketch.
// Side detection compares left (p2 + p5) vs right (p3 + p6).
export const SENSORS = [
  { key: 'p1', name: 'Occipital', x: 50, y: 12 },
  { key: 'p2', name: 'Escápula izquierda', x: 20, y: 30 },
  { key: 'p3', name: 'Escápula derecha', x: 80, y: 30 },
  { key: 'p4', name: 'Sacro', x: 50, y: 52 },
  { key: 'p5', name: 'Talón izquierdo', x: 20, y: 82 },
  { key: 'p6', name: 'Talón derecho', x: 80, y: 82 },
];

export const SENSOR_KEYS = SENSORS.map((s) => s.key); // ['p1' .. 'p6']

// Human-facing posture catalogue (internal keys → Spanish labels).
export const POSTURES = {
  supina: 'Boca arriba',
  prono: 'Boca abajo',
  lateral_izq: 'Lado izquierdo',
  lateral_der: 'Lado derecho',
  fuera_cama: 'Fuera de cama',
};

// Event source labels.
export const SOURCES = {
  sensor: 'Automático',
  cuidador: 'Cuidador',
};

// Alert severity catalogue (keys match the backend enum).
export const SEVERITIES = {
  critical: { label: 'Crítica', order: 0 },
  warning: { label: 'Advertencia', order: 1 },
  info: { label: 'Informativa', order: 2 },
};
