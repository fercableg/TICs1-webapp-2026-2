// ============================================================================
// login.js — Full-screen login view (shown whenever there is no session).
// ============================================================================

import { el } from '../core/dom.js';
import { login, DEMO_USERS } from '../services/auth.js';
import { setState } from '../services/store.js';
import { CONFIG } from '../config.js';
import * as poller from '../services/poller.js';
import { toast } from '../core/ui.js';

export function render(container) {
  const errorBox = el('p', { class: 'login-error', hidden: true, role: 'alert' });

  const userInput = el('input', {
    id: 'login-user',
    type: 'text',
    class: 'input',
    placeholder: 'Usuario',
    autocomplete: 'username',
    required: true,
    value: '',
  });
  const passInput = el('input', {
    id: 'login-pass',
    type: 'password',
    class: 'input',
    placeholder: 'Contraseña',
    autocomplete: 'current-password',
    required: true,
  });

  const demoTip = el('div', { class: 'login-demo' },
    el('strong', { text: 'Cuentas de demostración' }),
    ...DEMO_USERS.map((u) =>
      el('button', {
        type: 'button',
        class: 'login-demo__row',
        onclick: () => {
          userInput.value = u.username;
          passInput.value = u.password;
          errorBox.hidden = true;
        },
      },
      el('span', { text: u.username }),
      el('code', { text: u.password }),
      el('em', { text: u.role === 'admin' ? 'Administrador' : 'Cliente' })),
    ));

  const form = el('form', {
    class: 'login-card',
    onsubmit: (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const res = login(userInput.value, passInput.value);
      if (!res.ok) {
        errorBox.textContent = res.error;
        errorBox.hidden = false;
        return;
      }
      setState({ user: res.user });
      poller.startPoller();
      location.hash = '#/dashboard';
      toast(`Bienvenido/a, ${res.user.name}.`, 'success');
    },
  },
  el('div', { class: 'login-card__brand' },
    el('span', { class: 'login-card__logo', 'aria-hidden': 'true', text: '🛏️' }),
    el('h1', { text: CONFIG.APP_NAME }),
    el('p', { text: CONFIG.APP_SHORT })),
  el('div', { class: 'field' }, el('label', { for: 'login-user', text: 'Usuario' }), userInput),
  el('div', { class: 'field' }, el('label', { for: 'login-pass', text: 'Contraseña' }), passInput),
  errorBox,
  el('button', { class: 'btn btn--primary btn--block', type: 'submit', text: 'Iniciar sesión' }),
  demoTip,
  );

  container.replaceChildren(el('main', { class: 'login-screen' }, form));
  userInput.focus();
  return () => {};
}
