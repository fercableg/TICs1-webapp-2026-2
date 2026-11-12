// ============================================================================
// navbar.js — Encabezado persistente de la app: marca, selector de dispositivo,
// cambio de tema, estado de conexión en vivo, badge de usuario + salir, y
// navegación por rol. En MPA los enlaces apuntan a páginas `.html` reales.
// ============================================================================

import { CONFIG } from '../config.js';
import { el, $ } from '../core/dom.js';
import { getState, setState, subscribe } from '../services/store.js';
import { currentTheme, toggleTheme } from '../services/theme.js';
import { logout, isAdmin } from '../services/auth.js';
import { timeAgo } from '../core/utils.js';
import * as poller from '../services/poller.js';

const DEVICE_KEY = 'afic.deviceId';

const LINKS = [
  { file: 'dashboard.html', label: 'Panel', icon: '📊' },
  { file: 'monitoreo.html', label: 'Monitoreo', icon: '🧭' },
  { file: 'positions.html', label: 'Posiciones', icon: '🛏️' },
  { file: 'alerts.html', label: 'Alertas', icon: '🔔' },
  { file: 'history.html', label: 'Historial', icon: '📈' },
  { file: 'settings.html', label: 'Ajustes', icon: '⚙️', adminOnly: true },
  { file: 'apis.html', label: 'APIs', icon: '🔌' },
  { file: 'manual.html', label: 'Manual', icon: '📖' },
  { file: 'contact.html', label: 'Contacto', icon: '✉️' },
  { file: 'about.html', label: 'Acerca de', icon: 'ℹ️' },
];

function currentPage() {
  return location.pathname.split('/').pop() || 'index.html';
}

function buildBrand() {
  return el('a', { class: 'brand brand--link', href: 'index.html', title: 'Ir al inicio' },
    el('span', { class: 'brand__logo', 'aria-hidden': 'true', text: '🛏️' }),
    el('div', { class: 'brand__text' },
      el('strong', { text: CONFIG.APP_BRAND }),
      el('small', { text: CONFIG.APP_NAME })),
  );
}

// Interruptor de tema (claro/oscuro) con texto descriptivo. Se monta tanto en
// la barra de la landing (sin sesión) como en la barra autenticada, de modo que
// el modo nocturno sea global desde el inicio.
function buildThemeToggle() {
  const input = el('input', {
    type: 'checkbox',
    class: 'theme-switch__input',
    'aria-label': 'Modo nocturno',
    onchange: () => {
      toggleTheme();
      input.checked = currentTheme() === 'dark';
    },
  });
  input.checked = currentTheme() === 'dark';
  const label = el('label', {
    class: 'theme-switch',
    title: 'Modo nocturno (tema oscuro)',
  }, input, el('span', { class: 'theme-switch__slider' }));
  return el('span', { class: 'theme-control' },
    label,
    el('span', { class: 'theme-control__text', text: 'Modo nocturno' }));
}

export function renderNavbar(container) {
  const header = el('header', { class: 'navbar' });

  // --- Barra de la landing (sin sesión): solo acceso y registro --------------
  const landingBar = el('header', { class: 'navbar' },
    el('div', { class: 'navbar__top' },
      buildBrand(),
      el('div', { class: 'navbar__actions' },
        buildThemeToggle(),
        el('a', { class: 'btn btn--ghost btn--sm', href: 'login.html', text: 'Iniciar sesión' }),
        el('a', { class: 'btn btn--primary btn--sm', href: 'registro.html', text: 'Registrarse' }),
      ),
    ),
  );

  // --- Fila superior ---------------------------------------------------------
  const brand = buildBrand();

  const deviceSelect = el('select', {
    id: 'device-select',
    class: 'device-select',
    'aria-label': 'Dispositivo',
    onchange: onDeviceChange,
  });

  const themeSwitch = buildThemeToggle();

  const connDot = el('span', { class: 'conn-dot' });
  const connText = el('span', { class: 'conn-text', text: 'Conectando…' });
  const connStatus = el('div', { class: 'conn-status', id: 'conn-status' }, connDot, connText);

  const userBadge = el('a', { class: 'user-badge user-badge--link', id: 'user-badge', href: 'profile.html', title: 'Ver perfil' });

  const logoutBtn = el('button', {
    class: 'btn btn--ghost btn--sm',
    type: 'button',
    text: 'Salir',
    onclick: onLogout,
  });

  const menuToggle = el('button', {
    class: 'menu-toggle',
    type: 'button',
    'aria-label': 'Abrir menú',
    'aria-expanded': 'false',
    text: '☰',
    onclick: () => {
      const nav = $('#nav-links');
      const open = nav?.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(!!open));
    },
  });

  const deviceSelectWrap = el('div', { class: 'device-select-wrap' },
    el('label', { class: 'visually-hidden', for: 'device-select', text: 'Dispositivo' }), deviceSelect);

  const actions = el('div', { class: 'navbar__actions' },
    ...(CONFIG.SHOW_DEVICE_SELECTOR ? [deviceSelectWrap] : []),
    themeSwitch,
    connStatus,
    userBadge,
    logoutBtn,
    menuToggle,
  );

  const topRow = el('div', { class: 'navbar__top' }, brand, actions);

  // --- Enlaces de navegación ------------------------------------------------
  const nav = el('nav', { class: 'navbar__nav', id: 'nav-links', 'aria-label': 'Navegación principal' });

  header.append(topRow, nav);
  container.replaceChildren(landingBar, header);

  // --- Actualizaciones por estado -------------------------------------------
  let ticker = null;

  function renderLinks(user) {
    const links = LINKS.filter((l) => !l.adminOnly || isAdmin(user));
    nav.replaceChildren(
      ...links.map((l) =>
        el('a', {
          class: 'nav-link',
          href: l.file,
          'data-nav': '',
        }, el('span', { class: 'nav-link__icon', 'aria-hidden': 'true', text: l.icon }), el('span', { text: l.label })),
      ),
    );
    updateActiveLink();
  }

  function renderBadge(user) {
    if (!user) {
      userBadge.replaceChildren();
      return;
    }
    const initials = (user.name || user.username || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const avatar = user.photo
      ? el('img', { class: 'user-badge__avatar user-badge__avatar--img', src: user.photo, alt: '', width: '30', height: '30' })
      : el('span', { class: 'user-badge__avatar', text: initials });
    const subtitle = user.email || (isAdmin(user) ? 'Administrador' : 'Cliente / Cuidador');
    userBadge.replaceChildren(
      avatar,
      el('span', { class: 'user-badge__meta' },
        el('strong', { text: user.username }),
        el('small', { text: subtitle })),
    );
  }

  function renderDeviceOptions(devices, selected) {
    if (!CONFIG.SHOW_DEVICE_SELECTOR) return;
    const list = devices?.length ? devices : [];
    deviceSelect.replaceChildren(
      el('option', { value: '', text: 'Sin dispositivos', disabled: true, hidden: true, selected: true }),
      ...list.map((d) =>
        el('option', { value: d.id, text: `${d.name}${d.online ? '' : ' (desconectado)'}` })),
    );
    if (selected && list.some((d) => d.id === selected)) {
      deviceSelect.value = selected;
    }
  }

  function updateConn() {
    const st = getState();
    let cls = 'connecting';
    let text = 'Conectando…';
    if (st.connectionStatus === 'error') {
      cls = 'error';
      text = 'Sin conexión';
    } else if (st.lastReading) {
      const age = Date.now() - st.lastReading.ts;
      if (age > CONFIG.CONNECTION_STALE_MS) {
        cls = 'stale';
        text = `Desconectado · ${timeAgo(st.lastReading.ts)}`;
      } else {
        cls = 'online';
        text = `En línea · ${timeAgo(st.lastReading.ts)}`;
      }
    }
    connStatus.dataset.status = cls;
    connText.textContent = text;
  }

  function updateActiveLink() {
    const current = currentPage();
    nav.querySelectorAll('[data-nav]').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === current);
    });
  }

  function renderVisibility(user) {
    landingBar.hidden = !!user;
    header.hidden = !user;
  }

  function onStore(state, patch) {
    const user = state.user;
    renderVisibility(user);
    if (user) {
      if ('user' in patch) renderLinks(user);
      if ('user' in patch) renderBadge(user);
      if ('devices' in patch || 'deviceId' in patch) renderDeviceOptions(state.devices, state.deviceId);
      if ('devices' in patch && !state.deviceId && state.devices?.length) {
        // Primera carga: adoptar el primer dispositivo en línea (o el primero).
        const first = state.devices.find((d) => d.online) || state.devices[0];
        if (first) onDeviceChange({ target: { value: first.id } });
      }
    }
    updateConn();
  }

  function onDeviceChange(e) {
    const id = e.target.value;
    if (!id) return;
    setState({ deviceId: id, lastReading: null });
    try {
      localStorage.setItem(DEVICE_KEY, id);
    } catch {
      /* ignore */
    }
    poller.pollNow();
  }

  function onLogout() {
    logout();
    poller.stopPoller();
    setState({ user: null, devices: [], lastReading: null, alerts: [], connectionStatus: 'connecting' });
    location.href = 'index.html';
  }

  const unsubscribe = subscribe(onStore);
  ticker = setInterval(updateConn, 1000);

  // Pintado inicial.
  const st = getState();
  onStore(st, { user: st.user, devices: st.devices, deviceId: st.deviceId });
  updateConn();

  // Pre-seleccionar un dispositivo persistido una vez carguen los dispositivos.
  if (!st.deviceId) {
    try {
      const saved = localStorage.getItem(DEVICE_KEY);
      if (saved) setState({ deviceId: saved });
    } catch {
      /* ignore */
    }
  }

  return () => {
    unsubscribe();
    clearInterval(ticker);
  };
}
