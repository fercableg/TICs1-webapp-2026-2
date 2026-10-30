// ============================================================================
// app.js — Application bootstrap. Wires together theme, UI chrome, navbar and
// the hash router, then restores any persisted session and starts polling.
// ============================================================================

import { $ } from './core/dom.js';
import { initTheme } from './services/theme.js';
import { initUI } from './core/ui.js';
import { initRouter } from './core/router.js';
import { renderNavbar } from './components/navbar.js';
import { getSession } from './services/auth.js';
import { setState } from './services/store.js';
import { startPoller } from './services/poller.js';

// Views (route table).
import { render as login } from './views/login.js';
import { render as dashboard } from './views/dashboard.js';
import { render as monitoreo } from './views/monitoreo.js';
import { render as positions } from './views/positions.js';
import { render as alerts } from './views/alerts.js';
import { render as history } from './views/history.js';
import { render as settings } from './views/settings.js';
import { render as apis } from './views/apis.js';
import { render as manual } from './views/manual.js';
import { render as contact } from './views/contact.js';
import { render as about } from './views/about.js';

const routes = {
  '/login': { title: 'Iniciar sesión', render: login },
  '/dashboard': { title: 'Panel', render: dashboard },
  '/monitoreo': { title: 'Monitoreo', render: monitoreo },
  '/positions': { title: 'Posiciones', render: positions },
  '/alerts': { title: 'Alertas', render: alerts },
  '/history': { title: 'Historial', render: history },
  '/settings': { title: 'Ajustes', adminOnly: true, render: settings },
  '/apis': { title: 'APIs', render: apis },
  '/manual': { title: 'Manual', render: manual },
  '/contact': { title: 'Contacto', render: contact },
  '/about': { title: 'Acerca de', render: about },
};

function bootstrap() {
  initTheme();
  initUI();

  // Restore the session into the store BEFORE rendering the navbar so the user
  // badge and role-filtered links reflect it on a page reload.
  const session = getSession();
  if (session) setState({ user: session });

  renderNavbar($('#navbar-root'));
  initRouter($('#view-root'), routes);

  // Resume polling if already authenticated (e.g. reload); a fresh login calls
  // startPoller() from the login view instead.
  if (session) startPoller();
}

bootstrap();
