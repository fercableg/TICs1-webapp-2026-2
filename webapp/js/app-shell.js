// ============================================================================
// app-shell.js — Bootstrap compartido de toda la app (MPA). Corre en cada
// página HTML real: inicializa el tema, la UI (toasts + banner de red), la
// navbar y aplica el guard de autenticación antes de que `page.js` monte la
// vista concreta.
//
//   - Vistas públicas:        landing (index), login, registro.
//   - Vistas protegidas:      el resto (requieren sesión).
//   - `settings`:             además exige rol administrador.
//
// La sesión (sessionStorage) y el dispositivo (localStorage) persisten entre
// páginas; aquí se restauran en el store y se arranca el poller si hay sesión.
// ============================================================================

import { $ } from './core/dom.js';
import { initTheme } from './services/theme.js';
import { initUI } from './core/ui.js';
import { renderNavbar } from './components/navbar.js';
import { getSession, isAdmin } from './services/auth.js';
import { setState } from './services/store.js';
import { startPoller } from './services/poller.js';

const PUBLIC_VIEWS = new Set(['landing', 'login', 'registro']);

function currentView() {
  return document.body.dataset.view || 'landing';
}

function go(page) {
  location.replace(page);
}

initTheme();
initUI();

const view = currentView();
const session = getSession();
if (session) setState({ user: session });

// --- Guard de autenticación -------------------------------------------------
if (!session && !PUBLIC_VIEWS.has(view)) {
  go('login.html');
} else if (session && (view === 'login' || view === 'registro')) {
  go('dashboard.html');
} else if (view === 'settings' && (!session || !isAdmin(session))) {
  go('dashboard.html');
} else {
  renderNavbar($('#navbar-root'));

  // Los datos en vivo se re-hidratan en cada página protegida al cargar.
  if (session) startPoller();
}
