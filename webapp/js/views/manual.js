// ============================================================================
// manual.js — Interactive step-by-step user manual (accordion based).
// ============================================================================

import { el } from '../core/dom.js';
import { CONFIG } from '../config.js';
import { pageHeader } from './helpers.js';

function accordion(summary, content) {
  return el('details', { class: 'accordion' },
    el('summary', { class: 'accordion__summary' },
      el('span', { text: summary }),
      el('span', { class: 'accordion__chevron', 'aria-hidden': 'true', text: '▾' })),
    el('div', { class: 'accordion__content' }, content));
}

function stepList(items) {
  return el('ol', { class: 'steps' }, ...items.map((s) => el('li', { text: s })));
}

export function render(container) {
  const sections = [
    accordion('1. Cómo funciona el sistema', el('div', {},
      el('p', {}, 'La capa inteligente se instala sobre un colchón antiescaras existente y mide presión, temperatura y humedad en la superficie de contacto.'),
      el('p', {}, 'Un microcontrolador ESP32 adquiere las mediciones y las envía por Wi-Fi a esta interfaz, donde puedes consultarlas en tiempo real.'),
      el('pre', { class: 'code-block', text: 'Sensores → ESP32 → Wi-Fi → Servidor → Interfaz web' }),
    )),

    accordion('2. Distribución de sensores', el('div', {},
      el('ul', { class: 'list' },
        el('li', {}, el('strong', { text: 'Occipital (p1)' }), ' — parte posterior de la cabeza.'),
        el('li', {}, el('strong', { text: 'Escápula izquierda (p2) y derecha (p3)' }), ' — omóplatos, para detectar giros laterales.'),
        el('li', {}, el('strong', { text: 'Sacro (p4)' }), ' — zona sacra, la más relevante para la prevención.'),
        el('li', {}, el('strong', { text: 'Talón izquierdo (p5) y derecho (p6)' }), ' — talones, para detectar giros laterales.'),
        el('li', {}, 'Un sensor de temperatura y humedad (AHT20) ubicado al centro.'),
      ),
      el('p', { class: 'muted' }, 'Los valores se muestran como lecturas relativas (0–4095), no como presión clínica.'),
    )),

    accordion('3. Definición de alertas', el('div', {},
      el('ul', { class: 'list' },
        el('li', {}, el('strong', { text: 'Crítica' }), ' — dispositivo desconectado o condición que requiere revisión inmediata.'),
        el('li', {}, el('strong', { text: 'Advertencia' }), ' — tiempo máximo en la misma posición o variación de temperatura.'),
        el('li', {}, el('strong', { text: 'Informativa' }), ' — eventos de registro (cambio de posición, cama vacía).'),
      ),
      el('p', {}, 'Umbrales de referencia del firmware:'),
      el('ul', { class: 'list' },
        el('li', { text: `Confirmación de postura: ${CONFIG.FIRMWARE.CONFIRM_MIN} min.` }),
        el('li', { text: `Alerta por tiempo: ${CONFIG.FIRMWARE.ALERT_MIN} min.` }),
        el('li', { text: `Variación de temperatura: ±${CONFIG.FIRMWARE.DELTA_TEMP_C} °C.` }),
        el('li', { text: `Cama vacía: suma de presión < ${CONFIG.FIRMWARE.EMPTY_BED_MIN_WEIGHT}.` }),
      ),
    )),

    accordion('4. Pasos operativos', stepList([
      'Inicia sesión con tu cuenta (cuidador o administrador).',
      'Selecciona el dispositivo (colchón) que quieres supervisar.',
      'Revisa el Panel para ver postura, temperatura y humedad actuales.',
      'En «Monitoreo» observa el mapa de presión por zona.',
      'En «Alertas» confirma (ACK) las alertas que ya revisaste.',
      'En «Posiciones» registra manualmente un cambio de postura si corresponde.',
      'Si eres administrador, ajusta umbrales en «Monitoreo» o en «Ajustes».',
    ])),

    accordion('5. Solución de problemas', el('div', {},
      el('ul', { class: 'list' },
        el('li', {}, el('strong', { text: '«Sin conexión»' }), ' — verifica que el ESP32 esté encendido y con Wi-Fi disponible. La interfaz reintenta automáticamente.'),
        el('li', {}, el('strong', { text: '«Cama vacía»' }), ' — la presión total está bajo el umbral; revisa que la persona esté sobre el colchón.'),
        el('li', {}, el('strong', { text: 'Valores «—»' }), ' — lectura fuera de rango o no disponible; espera la siguiente muestra.'),
        el('li', {}, el('strong', { text: 'Alerta no se actualiza' }), ' — confirma (ACK) y espera el siguiente ciclo de sondeo.'),
      ),
    )),
  ];

  const root = el('div', { class: 'page page--narrow' },
    pageHeader('Manual de usuario', 'Guía paso a paso para cuidadores y familiares.'),
    ...sections,
  );
  container.replaceChildren(root);
  return () => {};
}
