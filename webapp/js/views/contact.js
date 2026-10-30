// ============================================================================
// contact.js — Technical support form and issue reporting (mock submission).
// ============================================================================

import { el } from '../core/dom.js';
import { pageHeader, card } from './helpers.js';
import { toast } from '../core/ui.js';

export function render(container) {
  const name = el('input', { id: 'c-name', type: 'text', class: 'input', required: true });
  const email = el('input', { id: 'c-email', type: 'email', class: 'input', required: true });
  const subject = el('select', { id: 'c-subject', class: 'select' },
    el('option', { value: 'consulta', text: 'Consulta general' }),
    el('option', { value: 'tecnico', text: 'Problema técnico' }),
    el('option', { value: 'sugerencia', text: 'Sugerencia' }),
    el('option', { value: 'otro', text: 'Otro' }));
  const message = el('textarea', { id: 'c-message', class: 'textarea', rows: 5, required: true });

  const form = el('form', {
    class: 'contact-form',
    onsubmit: (e) => {
      e.preventDefault();
      if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
        toast('Completa todos los campos obligatorios.', 'warning');
        return;
      }
      // Demo only — no backend; in production this POSTs to a support endpoint.
      toast('Mensaje enviado (demo). Te contactaremos a la brevedad.', 'success');
      name.value = '';
      email.value = '';
      message.value = '';
    },
  },
  el('div', { class: 'field' }, el('label', { for: 'c-name', text: 'Nombre' }), name),
  el('div', { class: 'field' }, el('label', { for: 'c-email', text: 'Correo electrónico' }), email),
  el('div', { class: 'field' }, el('label', { for: 'c-subject', text: 'Asunto' }), subject),
  el('div', { class: 'field' }, el('label', { for: 'c-message', text: 'Mensaje' }), message),
  el('button', { class: 'btn btn--primary', type: 'submit', text: 'Enviar mensaje' }),
  );

  const root = el('div', { class: 'page page--narrow' },
    pageHeader('Contacto', 'Soporte técnico y reporte de incidencias.'),
    card('Formulario de contacto', form),
    card('Información de soporte', el('div', { class: 'contact-info' },
      el('p', {}, el('strong', { text: 'Correo: ' }), el('a', { class: 'link', href: 'mailto:correo@mail.cl', text: 'correo@mail.cl' })),
      el('p', {}, el('strong', { text: 'Teléfono: ' }), '+56 2 1234 5678'),
      el('p', {}, el('strong', { text: 'Horario: ' }), 'Lunes a viernes, 9:00–18:00 hrs.'))),
  );
  container.replaceChildren(root);
  name.focus();
  return () => {};
}
