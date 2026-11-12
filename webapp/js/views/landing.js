// ============================================================================
// landing.js — Página pública de inicio (sin sesión). El contenido textual vive
// en index.html; aquí solo se inyectan las piezas dinámicas derivadas de
// SENSORS: los 6 puntos del hero animado y la lista de distribución de zonas.
// ============================================================================

import { el } from '../core/dom.js';
import { SENSORS } from '../config.js';

export function init(root) {
  // Animación del colchón: los 6 puntos de presión (posiciones desde SENSORS).
  const bed = root.querySelector('.hero-bed');
  if (bed) {
    bed.append(
      ...SENSORS.map((zone, i) =>
        el('span', {
          class: 'hero-dot',
          style: `left:${zone.x}%;top:${zone.y}%;animation-delay:${i * 0.35}s`,
          title: zone.name,
          'aria-hidden': 'true',
        })),
    );
  }

  // Lista de distribución de sensores.
  const list = root.querySelector('#sensor-list');
  if (list) {
    list.replaceChildren(
      ...SENSORS.map((zone) =>
        el('li', {}, el('strong', { text: zone.name }), ` (${zone.key})`)),
    );
  }

  return () => {};
}
