// ============================================================================
// navbar.js — Persistent application header: brand, device selector, theme
// switch, live connection status, user badge + logout, and role-aware nav.
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
  { path: '/dashboard', label: 'Panel', icon: '📊' },
  { path: '/monitoreo', label: 'Monitoreo', icon: '🧭' },
  { path: '/positions', label: 'Posiciones', icon: '🛏️' },
  { path: '/alerts', label: 'Alertas', icon: '🔔' },
  { path: '/history', label: 'Historial', icon: '📈' },
  { path: '/settings', label: 'Ajustes', icon: '⚙️', adminOnly: true },
  { path: '/apis', label: 'APIs', icon: '🔌' },
  { path: '/manual', label: 'Manual', icon: '📖' },
  { path: '/contact', label: 'Contacto', icon: '✉️' },
  { path: '/about', label: 'Acerca de', icon: 'ℹ️' },
];

export function renderNavbar(container) {
  const header = el('header', { class: 'navbar' });

  // --- Top row ----------------------------------------------------------
  const brand = el('div', { class: 'brand' },
    el('span', { class: 'brand__logo', 'aria-hidden': 'true', text: '🛏️' }),
    el('div', { class: 'brand__text' },
      el('strong', { text: CONFIG.APP_NAME }),
      el('small', { text: CONFIG.APP_SHORT })),
  );

  const deviceSelect = el('select', {
    id: 'device-select',
    class: 'device-select',
    'aria-label': 'Dispositivo',
    onchange: onDeviceChange,
  });

  const themeInput = el('input', {
    type: 'checkbox',
    id: 'theme-switch',
    class: 'theme-switch__input',
    onchange: () => toggleTheme(),
  });
  themeInput.checked = currentTheme() === 'dark';
  const themeSwitch = el('label', { class: 'theme-switch', title: 'Cambiar tema claro/oscuro' },
    themeInput,
    el('span', { class: 'theme-switch__slider' }),
  );

  const connDot = el('span', { class: 'conn-dot' });
  const connText = el('span', { class: 'conn-text', text: 'Conectando…' });
  const connStatus = el('div', { class: 'conn-status', id: 'conn-status' }, connDot, connText);

  const userBadge = el('div', { class: 'user-badge', id: 'user-badge' });

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

  const actions = el('div', { class: 'navbar__actions' },
    el('div', { class: 'device-select-wrap' }, el('label', { class: 'visually-hidden', for: 'device-select', text: 'Dispositivo' }), deviceSelect),
    themeSwitch,
    connStatus,
    userBadge,
    logoutBtn,
    menuToggle,
  );

  const topRow = el('div', { class: 'navbar__top' }, brand, actions);

  // --- Nav links ----------------------------------------------------------
  const nav = el('nav', { class: 'navbar__nav', id: 'nav-links', 'aria-label': 'Navegación principal' });

  header.append(topRow, nav);
  container.replaceChildren(header);

  // --- State-driven updates ------------------------------------------------
  let ticker = null;

  function renderLinks(user) {
    const links = LINKS.filter((l) => !l.adminOnly || isAdmin(user));
    nav.replaceChildren(
      ...links.map((l) =>
        el('a', {
          class: 'nav-link',
          href: `#${l.path}`,
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
    userBadge.replaceChildren(
      el('span', { class: 'user-badge__avatar', text: initials }),
      el('span', { class: 'user-badge__meta' },
        el('strong', { text: user.name || user.username }),
        el('small', { text: isAdmin(user) ? 'Administrador' : 'Cliente / Cuidador' })),
    );
  }

  function renderDeviceOptions(devices, selected) {
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
    nav.querySelectorAll('[data-nav]').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === location.hash);
    });
  }

  function onStore(state, patch) {
    const user = state.user;
    header.hidden = !user;
    if (user) {
      if ('user' in patch) renderLinks(user);
      if ('user' in patch) renderBadge(user);
      if ('devices' in patch || 'deviceId' in patch) renderDeviceOptions(state.devices, state.deviceId);
      if ('devices' in patch && !state.deviceId && state.devices?.length) {
        // First load: adopt the first online device (or the first device).
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
    location.hash = '#/login';
  }

  const unsubscribe = subscribe(onStore);
  const onHash = () => updateActiveLink();
  window.addEventListener('hashchange', onHash);
  ticker = setInterval(updateConn, 1000);

  // Initial paint.
  const st = getState();
  onStore(st, { user: st.user, devices: st.devices, deviceId: st.deviceId });
  updateConn();

  // Pre-select a persisted device once devices load.
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
    window.removeEventListener('hashchange', onHash);
    clearInterval(ticker);
  };
}
