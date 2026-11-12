// ============================================================================
// contact.js — Formulario de soporte técnico (envío simulado). El formulario
// vive en contact.html; aquí solo se cablea el submit y la validación.
// ============================================================================

import { toast } from '../core/ui.js';

export function init(root) {
  const form = root.querySelector('#contact-form');
  const name = root.querySelector('#c-name');
  const email = root.querySelector('#c-email');
  const message = root.querySelector('#c-message');

  form.addEventListener('submit', (e) => {
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
  });

  name.focus();

  return () => {};
}
