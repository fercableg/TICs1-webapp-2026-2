// ============================================================================
// settingsForm.js — Shared, reusable configuration form (thresholds, alert
// detection, sampling and transmission). Used by both the Monitoreo view
// (live tuning) and the Ajustes view (initial setup). ADMIN ONLY — the caller
// decides where/whether to mount it; the form itself loads and saves through
// the apiClient so changes apply at runtime without reflashing the ESP32.
// ============================================================================

import { el } from '../core/dom.js';
import { getState, setState, subscribe } from '../services/store.js';
import { CONFIG, POSTURES } from '../config.js';
import { safeNum } from '../core/utils.js';
import * as api from '../services/apiClient.js';
import { toast } from '../core/ui.js';

function numberField(id, label, { min = 1, step = 1, max = null, hint = '' } = {}) {
  const input = el('input', { id, type: 'number', class: 'input', min: String(min), step: String(step), required: true });
  if (max != null) input.max = String(max);
  return el('div', { class: 'field' },
    el('label', { for: id, text: label }),
    input,
    hint ? el('small', { class: 'field__hint', text: hint }) : null);
}

function readNumber(id) {
  const input = document.getElementById(id);
  // No explicit min/max: safeNum with defaults accepts any finite number,
  // leaving the `> 0` / `<= 100` policy checks to save(). (Passing null here
  // would coerce to 0 in the comparison and reject every positive value.)
  return safeNum(input?.value);
}

// Returns `{ node, cleanup }`: the rendered <form> and an unsubscribe fn.
export function renderSettingsForm() {
  // Patient info.
  const patientName = el('input', { id: 'patient_name', type: 'text', class: 'input' });
  const patientWeight = numberField('patient_weight', 'Peso del paciente (kg)', { min: 1, hint: 'Dato complementario, no medido por sensores.' });
  const initialPos = el('select', { id: 'initial_position', class: 'select' },
    ...Object.entries(POSTURES).map(([k, v]) => el('option', { value: k, text: v })));

  // Thresholds / alert detection.
  const emptyBed = numberField('empty_bed_min_weight', 'Umbral cama vacía (suma ADC)', { min: 1, hint: 'Suma p1..p6 bajo la cual se considera cama vacía.' });
  const sideDiff = numberField('side_diff_pct', 'Diferencia lateral (%)', { min: 1, max: 100, hint: 'Diferencia mínima entre izquierda (p2+p5) y derecha (p3+p6) para asignar un lado.' });
  const deltaTemp = numberField('delta_temp_c', 'Variación de temperatura (°C)', { min: 0.1, step: 0.1, hint: 'Variación que dispara alerta por presión excesiva.' });
  const confirmMin = numberField('confirm_min', 'Confirmación de postura (min)', { min: 1, hint: 'Tiempo para confirmar una postura.' });
  const alertMin = numberField('alert_min', 'Alerta por tiempo (min)', { min: 1, hint: 'Tiempo máximo en la misma postura antes de alertar.' });
  const reposition = numberField('reposition_interval_min', 'Intervalo de reposicionamiento (min)', { min: 1, hint: 'Cadencia recomendada de rotación de la persona.' });

  // Sampling / transmission.
  const sampleRate = numberField('sample_rate_s', 'Frecuencia de muestreo (s)', { min: 1, max: 60, hint: 'Intervalo entre lecturas de los sensores.' });
  const txInterval = numberField('tx_interval_s', 'Intervalo de transmisión (s)', { min: 1, max: 3600, hint: 'Cada cuánto el ESP32 envía una lectura al servidor.' });

  const form = el('form', {
    class: 'settings-form',
    onsubmit: (e) => {
      e.preventDefault();
      save();
    },
  },
  el('fieldset', {},
    el('legend', { text: 'Información del paciente' }),
    el('div', { class: 'form-grid' },
      el('div', { class: 'field' }, el('label', { for: 'patient_name', text: 'Nombre del paciente' }), patientName),
      patientWeight,
      el('div', { class: 'field' }, el('label', { for: 'initial_position', text: 'Posición inicial' }), initialPos))),
  el('fieldset', {},
    el('legend', { text: 'Umbrales y detección de alertas' }),
    el('div', { class: 'form-grid' }, emptyBed, sideDiff, deltaTemp, confirmMin, alertMin, reposition)),
  el('fieldset', {},
    el('legend', { text: 'Muestreo y transmisión' }),
    el('div', { class: 'form-grid' }, sampleRate, txInterval)),
  el('div', { class: 'form-actions' },
    el('button', { class: 'btn btn--primary', type: 'submit', text: 'Guardar cambios' }),
    el('button', { class: 'btn btn--ghost', type: 'button', text: 'Restablecer', onclick: load })),
  );

  async function load() {
    const deviceId = getState().deviceId;
    if (!deviceId) return;
    try {
      const s = await api.getSettings(deviceId);
      if (!s) {
        toast('Sin configuración para este dispositivo.', 'warning');
        return;
      }
      patientName.value = s.patient_name ?? '';
      patientWeight.querySelector('input').value = s.patient_weight_kg ?? '';
      initialPos.value = s.initial_position || 'supina';
      emptyBed.querySelector('input').value = s.empty_bed_min_weight ?? CONFIG.FIRMWARE.EMPTY_BED_MIN_WEIGHT;
      sideDiff.querySelector('input').value = s.side_diff_pct ?? CONFIG.FIRMWARE.SIDE_DIFF_PCT;
      deltaTemp.querySelector('input').value = s.delta_temp_c ?? CONFIG.FIRMWARE.DELTA_TEMP_C;
      confirmMin.querySelector('input').value = s.confirm_min ?? CONFIG.FIRMWARE.CONFIRM_MIN;
      alertMin.querySelector('input').value = s.alert_min ?? CONFIG.FIRMWARE.ALERT_MIN;
      reposition.querySelector('input').value = s.reposition_interval_min ?? CONFIG.FIRMWARE.REPOSITION_MIN;
      sampleRate.querySelector('input').value = s.sample_rate_s ?? 4;
      txInterval.querySelector('input').value = s.tx_interval_s ?? CONFIG.FIRMWARE.TX_INTERVAL_S;
      setState({ settings: s });
    } catch (err) {
      toast(`Error al cargar configuración: ${err.message}`, 'error');
    }
  }

  async function save() {
    const deviceId = getState().deviceId;
    if (!deviceId) return;

    const nums = {
      patient_weight_kg: readNumber('patient_weight'),
      empty_bed_min_weight: readNumber('empty_bed_min_weight'),
      side_diff_pct: readNumber('side_diff_pct'),
      delta_temp_c: readNumber('delta_temp_c'),
      confirm_min: readNumber('confirm_min'),
      alert_min: readNumber('alert_min'),
      reposition_interval_min: readNumber('reposition_interval_min'),
      sample_rate_s: readNumber('sample_rate_s'),
      tx_interval_s: readNumber('tx_interval_s'),
    };
    const invalid = Object.entries(nums).find(([, v]) => v == null || v <= 0);
    if (invalid) {
      toast(`Valor inválido en «${invalid[0]}»: debe ser un número mayor que cero.`, 'error');
      return;
    }
    if (nums.side_diff_pct > 100) {
      toast('La diferencia lateral (%) no puede superar 100.', 'error');
      return;
    }

    const patch = {
      patient_name: patientName.value.trim() || '—',
      initial_position: initialPos.value,
      ...nums,
    };
    try {
      const updated = await api.updateSettings(deviceId, patch);
      setState({ settings: updated });
      toast('Configuración guardada correctamente.', 'success');
    } catch (err) {
      toast(`No se pudo guardar: ${err.message}`, 'error');
    }
  }

  // Reload when the selected device changes.
  const unsubscribe = subscribe((_state, patch) => {
    if ('deviceId' in patch) load();
  });
  load();

  return { node: form, cleanup: () => unsubscribe() };
}
