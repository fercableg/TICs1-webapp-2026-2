// ============================================================================
// about.js — Project overview, version, stack, legal disclaimer and dev tools.
// ============================================================================

import { el } from '../core/dom.js';
import { CONFIG } from '../config.js';
import { pageHeader, card } from './helpers.js';
import { setFailing, isFailing } from '../services/mockData.js';
import { toast } from '../core/ui.js';

export function render(container) {
  const devTools = el('div', { class: 'dev-tools' });

  if (CONFIG.USE_MOCK_DATA) {
    const failBtn = el('button', {
      class: 'btn btn--outline btn--sm',
      type: 'button',
      text: isFailing() ? 'Restablecer conexión (mock)' : 'Simular fallo de red',
      onclick: () => {
        setFailing(!isFailing());
        failBtn.textContent = isFailing() ? 'Restablecer conexión (mock)' : 'Simular fallo de red';
        toast(isFailing() ? 'Fallo de red simulado activado.' : 'Conexión restablecida.', isFailing() ? 'warning' : 'success');
      },
    });
    devTools.replaceChildren(
      el('h3', { text: 'Herramientas de desarrollo' }),
      el('p', { class: 'muted', text: 'Modo mock activo. Estas opciones ayudan a probar la resiliencia de la interfaz.' }),
      failBtn,
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Reiniciar datos demo', onclick: () => location.reload() }),
    );
  }

  const disclaimer = el('aside', { class: 'disclaimer', role: 'note' },
    el('strong', { text: '⚠️ Aviso legal' }),
    el('p', { text: 'Este dispositivo NO entrega diagnóstico médico. Las mediciones, alertas y recomendaciones son orientativas y de apoyo al cuidado; no sustituyen la evaluación ni las indicaciones del personal de salud.' }),
  );

  const children = [
    pageHeader('Acerca de', 'Información del proyecto y avisos importantes.'),
    disclaimer,
    card('El proyecto', el('div', {},
      el('p', { text: 'Capa inteligente de monitoreo para la prevención de lesiones por presión (LPP), desarrollada como proyecto semestral de la asignatura Proyectos en TICs 1, Universidad Diego Portales.' }),
      el('p', { text: 'Complementa un colchón antiescaras existente midiendo presión, temperatura y humedad, y visualizándolas en esta interfaz web.' }),
    )),
    card('Datos del sistema', el('div', { class: 'kv' },
      el('div', {}, el('span', { text: 'Aplicación' }), el('strong', { text: CONFIG.APP_NAME })),
      el('div', {}, el('span', { text: 'Versión' }), el('strong', { text: CONFIG.APP_VERSION })),
      el('div', {}, el('span', { text: 'Modo de datos' }), el('strong', { text: CONFIG.USE_MOCK_DATA ? 'Mock (sin backend)' : 'Supabase REST' })),
      el('div', {}, el('span', { text: 'Hardware' }), el('strong', { text: 'ESP32 · 6× FSR406 · AHT20' })),
      el('div', {}, el('span', { text: 'Stack' }), el('strong', { text: 'HTML5 · CSS3 · Vanilla JS (ES Modules)' })),
    )),
    card('Equipo', el('ul', { class: 'list' },
      el('li', { text: 'Fernando Cabrera Legue — Jefe de proyecto' }),
      el('li', { text: 'Cinthya Fuentealba Bravo — Aplicación y comunicaciones' }),
      el('li', { text: 'Gonzalo Letelier Muñoz — Hardware y sensores' }),
    )),
  ];

  if (CONFIG.USE_MOCK_DATA) children.push(card('Desarrollo', devTools));

  const root = el('div', { class: 'page page--narrow' }, ...children);
  container.replaceChildren(root);
  return () => {};
}
