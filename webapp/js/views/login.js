// ============================================================================
// login.js — Full-screen login view (shown whenever there is no session), with
// a registration form that creates a local account (persisted in localStorage).
// ============================================================================

import { el } from '../core/dom.js';
import { login, register, DEMO_USERS } from '../services/auth.js';
import { setState } from '../services/store.js';
import { CONFIG } from '../config.js';
import * as poller from '../services/poller.js';
import { toast } from '../core/ui.js';

function brand() {
  return el('div', { class: 'login-card__brand' },
    el('span', { class: 'login-card__logo', 'aria-hidden': 'true', text: '🛏️' }),
    el('h1', { text: CONFIG.APP_NAME }),
    el('p', { text: CONFIG.APP_SHORT }));
}

export function render(container) {
  // --- Login form ------------------------------------------------------------
  const loginError = el('p', { class: 'login-error', hidden: true, role: 'alert' });

  const userInput = el('input', {
    id: 'login-user',
    type: 'text',
    class: 'input',
    placeholder: 'Usuario',
    autocomplete: 'username',
    required: true,
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
          loginError.hidden = true;
        },
      },
      el('span', { text: u.username }),
      el('code', { text: u.password }),
      el('em', { text: u.role === 'admin' ? 'Administrador' : 'Cliente' })),
    ));

  const loginForm = el('form', {
    class: 'login-card',
    onsubmit: (e) => {
      e.preventDefault();
      loginError.hidden = true;
      const res = login(userInput.value, passInput.value);
      if (!res.ok) {
        loginError.textContent = res.error;
        loginError.hidden = false;
        return;
      }
      setState({ user: res.user });
      poller.startPoller();
      location.hash = '#/dashboard';
      toast(`Bienvenido/a, ${res.user.name}.`, 'success');
    },
  },
    brand(),
    el('div', { class: 'field' }, el('label', { for: 'login-user', text: 'Usuario' }), userInput),
    el('div', { class: 'field' }, el('label', { for: 'login-pass', text: 'Contraseña' }), passInput),
    loginError,
    el('button', { class: 'btn btn--primary btn--block', type: 'submit', text: 'Iniciar sesión' }),
    demoTip,
    el('button', { class: 'btn btn--ghost btn--block', type: 'button', text: '¿No tienes cuenta? Regístrate', onclick: () => switchMode('register') }),
  );

  // --- Register form ---------------------------------------------------------
  const registerError = el('p', { class: 'login-error', hidden: true, role: 'alert' });

  const regNameInput = el('input', {
    id: 'reg-name', type: 'text', class: 'input',
    placeholder: 'Nombre y apellido', autocomplete: 'name', required: true,
  });
  const regUserInput = el('input', {
    id: 'reg-user', type: 'text', class: 'input',
    placeholder: 'Usuario', autocomplete: 'username', required: true,
  });
  const regPassInput = el('input', {
    id: 'reg-pass', type: 'password', class: 'input',
    placeholder: 'Contraseña (mín. 6 caracteres)', autocomplete: 'new-password',
    required: true, minlength: '6',
  });
  const regPass2Input = el('input', {
    id: 'reg-pass2', type: 'password', class: 'input',
    placeholder: 'Repetir contraseña', autocomplete: 'new-password', required: true,
  });

  const registerForm = el('form', {
    class: 'login-card',
    onsubmit: (e) => {
      e.preventDefault();
      registerError.hidden = true;
      if (regPassInput.value !== regPass2Input.value) {
        registerError.textContent = 'Las contraseñas no coinciden.';
        registerError.hidden = false;
        return;
      }
      const res = register({
        name: regNameInput.value,
        username: regUserInput.value,
        password: regPassInput.value,
      });
      if (!res.ok) {
        registerError.textContent = res.error;
        registerError.hidden = false;
        return;
      }
      toast('Cuenta creada. Ya puedes iniciar sesión.', 'success');
      switchMode('login');
      userInput.value = res.user.username;
      passInput.value = '';
    },
  },
    brand(),
    el('div', { class: 'field' }, el('label', { for: 'reg-name', text: 'Nombre' }), regNameInput),
    el('div', { class: 'field' }, el('label', { for: 'reg-user', text: 'Usuario' }), regUserInput),
    el('div', { class: 'field' }, el('label', { for: 'reg-pass', text: 'Contraseña' }), regPassInput),
    el('div', { class: 'field' }, el('label', { for: 'reg-pass2', text: 'Repetir contraseña' }), regPass2Input),
    registerError,
    el('button', { class: 'btn btn--primary btn--block', type: 'submit', text: 'Crear cuenta' }),
    el('button', { class: 'btn btn--ghost btn--block', type: 'button', text: '¿Ya tienes cuenta? Inicia sesión', onclick: () => switchMode('login') }),
  );

  const screen = el('main', { class: 'login-screen' });

  function switchMode(mode) {
    if (mode === 'register') {
      screen.replaceChildren(registerForm);
      regNameInput.focus();
    } else {
      screen.replaceChildren(loginForm);
      userInput.focus();
    }
  }

  container.replaceChildren(screen);
  switchMode('login');
  return () => {};
}
