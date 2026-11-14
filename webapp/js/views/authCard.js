// ============================================================================
// authCard.js — Tarjeta reutilizable de inicio de sesión / registro.
//
// Se usa en las vistas `/login` y `/registro`. Los botones de alternancia
// navegan a la otra ruta en lugar de cambiar el formulario en el mismo lugar.
// Solo existe una cuenta de demostración (`admin`) en auth.js; no se muestra
// en la interfaz. El resto de usuarios se registran desde esta misma página.
// ============================================================================

import { el } from '../core/dom.js';
import { login, register } from '../services/auth.js';
import { setState } from '../services/store.js';
import { CONFIG } from '../config.js';
import * as poller from '../services/poller.js';
import { toast } from '../core/ui.js';

// Último usuario registrado, para prellenar el campo de login tras crear cuenta.
let lastRegisteredUsername = null;

function brand() {
  return el('div', { class: 'login-card__brand' },
    el('span', { class: 'login-card__logo', 'aria-hidden': 'true', text: '🛏️' }),
    el('h1', { text: CONFIG.APP_BRAND }),
    el('p', { text: CONFIG.APP_NAME }));
}

// Devuelve { node, switchMode }. `mode` inicial: 'login' (por defecto) o
// 'register'. Los botones "¿No tienes cuenta?" / "¿Ya tienes cuenta?" navegan
// a la ruta contraria (#/registro o #/login).
export function authCard({ mode = 'login' } = {}) {
  // --- Formulario de login --------------------------------------------------
  const loginError = el('p', { class: 'login-error', hidden: true, role: 'alert' });

  const userInput = el('input', {
    id: 'login-user', type: 'text', class: 'input',
    placeholder: 'Usuario', autocomplete: 'username', required: true,
  });
  if (lastRegisteredUsername) userInput.value = lastRegisteredUsername;
  const passInput = el('input', {
    id: 'login-pass', type: 'password', class: 'input',
    placeholder: 'Contraseña', autocomplete: 'current-password', required: true,
  });

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
      location.href = 'dashboard.html';
      toast(`Bienvenido/a, ${res.user.name}.`, 'success');
    },
  },
    brand(),
    el('div', { class: 'field' }, el('label', { for: 'login-user', text: 'Usuario' }), userInput),
    el('div', { class: 'field' }, el('label', { for: 'login-pass', text: 'Contraseña' }), passInput),
    loginError,
    el('button', { class: 'btn btn--primary btn--block', type: 'submit', text: 'Iniciar sesión' }),
    el('button', { class: 'btn btn--ghost btn--block', type: 'button', text: '¿No tienes cuenta? Regístrate', onclick: () => { location.href = 'registro.html'; } }),
  );

  // --- Formulario de registro -----------------------------------------------
  const registerError = el('p', { class: 'login-error', hidden: true, role: 'alert' });

  const regNameInput = el('input', {
    id: 'reg-name', type: 'text', class: 'input',
    placeholder: 'Nombre y apellido', autocomplete: 'name', required: true,
  });
  const regUserInput = el('input', {
    id: 'reg-user', type: 'text', class: 'input',
    placeholder: 'Usuario', autocomplete: 'username', required: true,
  });
  const regEmailInput = el('input', {
    id: 'reg-email', type: 'email', class: 'input',
    placeholder: 'Correo (opcional)', autocomplete: 'email',
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
        email: regEmailInput.value,
      });
      if (!res.ok) {
        registerError.textContent = res.error;
        registerError.hidden = false;
        return;
      }
      toast('Cuenta creada. Ya puedes iniciar sesión.', 'success');
      lastRegisteredUsername = res.user.username;
      location.href = 'login.html';
    },
  },
    brand(),
    el('div', { class: 'field' }, el('label', { for: 'reg-name', text: 'Nombre' }), regNameInput),
    el('div', { class: 'field' }, el('label', { for: 'reg-user', text: 'Usuario' }), regUserInput),
    el('div', { class: 'field' }, el('label', { for: 'reg-email', text: 'Correo' }), regEmailInput),
    el('div', { class: 'field' }, el('label', { for: 'reg-pass', text: 'Contraseña' }), regPassInput),
    el('div', { class: 'field' }, el('label', { for: 'reg-pass2', text: 'Repetir contraseña' }), regPass2Input),
    registerError,
    el('button', { class: 'btn btn--primary btn--block', type: 'submit', text: 'Crear cuenta' }),
    el('button', { class: 'btn btn--ghost btn--block', type: 'button', text: '¿Ya tienes cuenta? Inicia sesión', onclick: () => { location.href = 'login.html'; } }),
  );

  const wrap = el('div', { class: 'auth-card' });

  function switchMode(mode) {
    if (mode === 'register') {
      wrap.replaceChildren(registerForm);
      regNameInput.focus();
    } else {
      wrap.replaceChildren(loginForm);
      userInput.focus();
    }
  }

  switchMode(mode === 'register' ? 'register' : 'login');

  return { node: wrap, switchMode };
}
