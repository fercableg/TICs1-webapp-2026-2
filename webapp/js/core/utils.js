// ============================================================================
// utils.js — Pure helper functions (no DOM, no state). Safe to import anywhere,
// including the Node smoke test.
// ============================================================================

import { SENSOR_KEYS } from '../config.js';

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Escape a value for safe interpolation into innerHTML. Use for ANY dynamic
// string that may originate from user input or the backend.
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Coerce to a finite number inside [min, max]; otherwise null. Used to render
// out-of-bounds / NaN / null sensor values as "—" instead of nonsense.
// (Note: `Number(null) === 0`, so null/undefined/'' are rejected explicitly.)
export function safeNum(v, min = -Infinity, max = Infinity) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

const pad = (x) => String(x).padStart(2, '0');

export function fmtDateTime(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fmtDate(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtTime(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function timeAgo(ms, now = Date.now()) {
  if (!ms) return '—';
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 5) return 'ahora';
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// Build a CSV from an array-of-arrays and trigger a browser download.
export function downloadCSV(filename, rows) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Total pressure of a reading (sum of the FSR channels).
export function totalPressure(reading) {
  if (!reading) return 0;
  return SENSOR_KEYS
    .map((k) => safeNum(reading[k], 0, 4095) ?? 0)
    .reduce((a, b) => a + b, 0);
}
