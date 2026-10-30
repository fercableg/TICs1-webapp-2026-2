// ============================================================================
// router.js — Lightweight hash-based SPA router with role guards.
//
// Each route is `{ title, adminOnly?, render(container) -> cleanup? }`.
// `render` returns an optional cleanup function invoked before the next route
// renders, so views can tear down intervals/subscriptions.
// ============================================================================

import { CONFIG } from '../config.js';
import { getSession, isAdmin } from '../services/auth.js';
import { getState } from '../services/store.js';
import { toast } from './ui.js';

let container = null;
let routes = new Map();
let loginRoute = null;
let currentCleanup = null;
let currentPath = null;

export function configureRoutes(table) {
  routes = new Map(Object.entries(table));
  loginRoute = routes.get('/login') || null;
}

export function initRouter(viewContainer, table) {
  container = viewContainer;
  configureRoutes(table);
  window.addEventListener('hashchange', onHashChange);
  onHashChange();
}

export function navigate(path) {
  if (location.hash === `#${path}`) onHashChange();
  else location.hash = path;
}

export function currentRoute() {
  return currentPath;
}

function pathFromHash() {
  const raw = location.hash.replace(/^#/, '') || '/dashboard';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function onHashChange() {
  const path = pathFromHash();
  const session = getSession();

  // Not authenticated → force the login view.
  if (!session) {
    if (path !== '/login') history.replaceState(null, '', '#/login');
    currentPath = '/login';
    mountLogin();
    return;
  }

  // Authenticated → resolve route, enforce role guards.
  let route = routes.get(path) || routes.get('/dashboard');
  if (route.adminOnly && !isAdmin(session)) {
    toast('No tienes permisos para acceder a esa sección.', 'warning');
    history.replaceState(null, '', '#/dashboard');
    route = routes.get('/dashboard');
  }

  currentPath = route ? path : '/dashboard';
  document.title = `${route.title} · ${CONFIG.APP_NAME}`;
  mount(route, container);
}

function mount(route, target) {
  if (currentCleanup) {
    try {
      currentCleanup();
    } catch (err) {
      console.error('[router] cleanup error', err);
    }
    currentCleanup = null;
  }
  target.replaceChildren();
  try {
    currentCleanup = route.render(target) || null;
  } catch (err) {
    console.error('[router] render error', err);
    target.replaceChildren(
      Object.assign(document.createElement('div'), {
        className: 'empty-state',
        textContent: 'No se pudo cargar la vista.',
      }),
    );
  }
  // Update active nav link (navbar listens to hashchange too, but belt & braces).
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === `#${currentPath}`);
  });
}

function mountLogin() {
  if (currentCleanup) {
    try {
      currentCleanup();
    } catch {
      /* ignore */
    }
    currentCleanup = null;
  }
  container.replaceChildren();
  document.title = `Iniciar sesión · ${CONFIG.APP_NAME}`;
  if (loginRoute) currentCleanup = loginRoute.render(container) || null;
}

// Re-run the current route (used after login/logout to refresh chrome).
export function reRender() {
  onHashChange();
}

export function isAuthed() {
  return !!getSession();
}

export function currentUser() {
  return getState().user;
}
