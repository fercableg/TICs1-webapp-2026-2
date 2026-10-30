// ============================================================================
// helpers.js — Shared building blocks for the views (page headers, cards,
// badges, empty states). Keeps each view's DOM code terse and consistent.
// ============================================================================

import { el } from '../core/dom.js';
import { SEVERITIES, POSTURES } from '../config.js';

export function pageHeader(title, subtitle) {
  return el('div', { class: 'page-header' },
    el('h1', { text: title }),
    subtitle ? el('p', { class: 'page-subtitle', text: subtitle }) : null);
}

export function emptyState(message, actionLabel, onAction) {
  return el('div', { class: 'empty-state' },
    el('div', { class: 'empty-state__icon', 'aria-hidden': 'true', text: '🗒️' }),
    el('p', { text: message }),
    actionLabel
      ? el('button', { class: 'btn btn--primary', type: 'button', text: actionLabel, onclick: onAction })
      : null);
}

export function severityBadge(severity) {
  const meta = SEVERITIES[severity] || { label: severity || 'info' };
  return el('span', { class: `badge badge--${severity || 'info'}`, text: meta.label });
}

export function postureBadge(position) {
  return el('span', { class: 'badge badge--posture', text: POSTURES[position] || position || '—' });
}

export function sourceBadge(source) {
  const label = source === 'cuidador' ? 'Cuidador' : source === 'sensor' ? 'Automático' : source;
  return el('span', { class: `badge badge--source badge--source--${source || 'sensor'}`, text: label });
}

export function card(title, body, extra = {}) {
  return el('section', { class: `card ${extra.class || ''}` },
    title ? el('header', { class: 'card__header' }, el('h2', { text: title })) : null,
    el('div', { class: 'card__body' }, body));
}

export function statCard(label, value, unit, { tone = '', icon = '' } = {}) {
  const isNode = value && typeof value === 'object' && value.nodeType;
  const valueContent = isNode ? value : el('strong', { text: value ?? '—' });
  return el('div', { class: `stat-card ${tone ? `stat-card--${tone}` : ''}` },
    el('div', { class: 'stat-card__label', text: label }),
    el('div', { class: 'stat-card__value' },
      valueContent,
      unit ? el('span', { class: 'stat-card__unit', text: unit }) : null),
    icon ? el('div', { class: 'stat-card__icon', 'aria-hidden': 'true', text: icon }) : null);
}

// Map a 0..4095 ADC value to a green→yellow→red color (for the pressure map).
export function pressureColor(value, max = 4095) {
  const t = Math.max(0, Math.min(1, (value || 0) / max));
  const hue = 130 - 130 * t; // 130 (green) → 0 (red)
  return `hsl(${hue}, 72%, 46%)`;
}

export function readingTimeLabel(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
