// ============================================================================
// check-pages.mjs — Verificación end-to-end de la MPA con Chromium headless.
//
// Levanta un servidor estático (`python3 -m http.server`) sobre `webapp/` y,
// para cada página `.html`, carga la URL en Chromium `--headless=new
// --dump-dom`, dejando que `app-shell.js` + `page.js` hidraten el HTML. Luego:
//   (a) falla si hubo errores de consola (`ERROR:CONSOLE` en stderr);
//   (b) verifica la presencia de elementos clave en el DOM resultante;
//   (c) verifica las redirecciones de autenticación (sin sesión → login;
//       cliente → settings redirige a dashboard; login con sesión → dashboard).
//
// Las páginas protegidas se cargan sembrando primero una sesión en
// `sessionStorage` mediante `_seed_check.html` (mismo origen), que redirige a
// la página objetivo en la misma pestaña.
//
// Run:  node scripts/check-pages.mjs
// ============================================================================

import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import net from 'node:net';
import http from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP = join(__dirname, '..', 'webapp');
const SEED_FILE = join(WEBAPP, '_seed_check.html');

// Sesión de administrador (sembrada en sessionStorage para páginas protegidas).
const ADMIN_SESSION = JSON.stringify({
  username: 'admin',
  role: 'admin',
  name: 'Administrador',
  email: 'admin@bedsense.cl',
  photo: null,
});

const CLIENT_SESSION = JSON.stringify({
  username: 'cliente',
  role: 'client',
  name: 'Cuidador/a',
  email: 'cliente@bedsense.cl',
  photo: null,
});

const CHROMIUM = process.env.CHROMIUM || 'chromium';

// --- Utilidades --------------------------------------------------------------

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function waitForServer(port, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/index.html', timeout: 1500 }, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error('servidor no respondió a tiempo'));
        else setTimeout(attempt, 150);
      });
      req.on('timeout', () => req.destroy());
    };
    attempt();
  });
}

// Devuelve { dom, stderr } tras cargar la URL y dejar correr el JS.
function dump(url) {
  return new Promise((resolve) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--virtual-time-budget=4000',
      '--enable-logging=stderr',
      '--log-level=0',
      '--dump-dom',
      url,
    ];
    const child = spawn(CHROMIUM, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let dom = '';
    let stderr = '';
    child.stdout.on('data', (d) => { dom += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', () => resolve({ dom, stderr }));
    child.on('error', (err) => resolve({ dom: '', stderr: `fallo al lanzar Chromium: ${err.message}` }));
  });
}

function consoleErrors(stderr) {
  return stderr
    .split('\n')
    .filter((line) => line.includes('ERROR:CONSOLE'))
    .map((line) => line.trim());
}

function bodyDataView(dom) {
  const m = dom.match(/<body[^>]*data-view="([^"]+)"/);
  return m ? m[1] : null;
}

// --- Harness -----------------------------------------------------------------

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function fail(name, detail) {
  failed += 1;
  console.error(`  ✗ ${name}\n      ${detail}`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function run() {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;

  // Página semilla que inyecta la sesión y redirige (mismo origen).
  writeFileSync(SEED_FILE, `<!doctype html><meta charset="utf-8"><script>
  const to = new URLSearchParams(location.search).get('to') || 'dashboard.html';
  const role = new URLSearchParams(location.search).get('role') || 'admin';
  const session = role === 'client' ? ${JSON.stringify(CLIENT_SESSION)} : ${JSON.stringify(ADMIN_SESSION)};
  sessionStorage.setItem('afic.session', session);
  location.replace(to);
</script>`);

  const server = spawn('python3', ['-m', 'http.server', String(port), '-d', WEBAPP], {
    stdio: 'ignore',
  });

  console.log(`\nServidor estático en ${base} (PID ${server.pid})`);
  try {
    await waitForServer(port);
  } catch (err) {
    fail('iniciar servidor', err.message);
    server.kill();
    cleanupSeed();
    return summary();
  }

  const seed = (page, role) => `${base}/_seed_check.html?to=${page}&role=${role}`;

  // --- (c) Redirecciones de autenticación -----------------------------------
  console.log('\n[1] Redirecciones de autenticación');
  try {
    const { dom } = await dump(`${base}/dashboard.html`);
    assert(bodyDataView(dom) === 'login', `sin sesión → login, se obtuvo "${bodyDataView(dom)}"`);
    ok('sin sesión, dashboard → login');
  } catch (err) { fail('sin sesión, dashboard → login', err.message); }

  try {
    const { dom } = await dump(seed('settings.html', 'client'));
    assert(bodyDataView(dom) === 'dashboard', `cliente → settings redirige a dashboard, se obtuvo "${bodyDataView(dom)}"`);
    ok('cliente, settings → dashboard (sin permisos)');
  } catch (err) { fail('cliente, settings → dashboard', err.message); }

  try {
    const { dom } = await dump(seed('login.html', 'admin'));
    assert(bodyDataView(dom) === 'dashboard', `con sesión, login → dashboard, se obtuvo "${bodyDataView(dom)}"`);
    ok('con sesión, login → dashboard');
  } catch (err) { fail('con sesión, login → dashboard', err.message); }

  // --- (a)+(b) Cada página: sin errores de consola + elementos clave ---------
  const PAGES = [
    ['index.html (landing)', `${base}/index.html`, (dom) => {
      assert((dom.match(/class="hero-dot"/g) || []).length === 6, 'se esperaban 6 .hero-dot en el mapa');
      assert((dom.match(/<li>/g) || []).length >= 6, 'la lista de sensores debería tener 6 <li>');
    }],
    ['login.html', `${base}/login.html`, (dom) => {
      assert(dom.includes('auth-card'), 'falta .auth-card');
      assert(dom.includes('id="login-user"'), 'falta #login-user');
    }],
    ['registro.html', `${base}/registro.html`, (dom) => {
      assert(dom.includes('auth-card'), 'falta .auth-card');
      assert(dom.includes('id="reg-name"'), 'falta #reg-name');
    }],
    ['profile.html', seed('profile.html', 'admin'), (dom) => {
      assert(dom.includes('id="profile-form"'), 'falta #profile-form');
      assert(dom.includes('id="profile-name"'), 'falta #profile-name');
    }],
    ['dashboard.html', seed('dashboard.html', 'admin'), (dom) => {
      assert(dom.includes('id="dash-posture"'), 'falta #dash-posture');
      assert(dom.includes('class="stat-grid"'), 'falta .stat-grid');
      assert(dom.includes('id="dash-pressure"'), 'falta #dash-pressure');
    }],
    ['monitoreo.html', seed('monitoreo.html', 'admin'), (dom) => {
      assert((dom.match(/class="bed-cell"/g) || []).length === 6, 'se esperaban 6 .bed-cell');
      assert((dom.match(/class="sensor-card"/g) || []).length === 6, 'se esperaban 6 .sensor-card');
    }],
    ['positions.html', seed('positions.html', 'admin'), (dom) => {
      assert(dom.includes('id="positions-chips"'), 'falta #positions-chips');
      assert((dom.match(/type="button"/g) || []).length >= 5, 'se esperaban 5 botones de postura');
    }],
    ['alerts.html', seed('alerts.html', 'admin'), (dom) => {
      assert(dom.includes('id="alerts-active-body"'), 'falta #alerts-active-body');
      assert(dom.includes('class="tabs"'), 'falta .tabs');
    }],
    ['history.html', seed('history.html', 'admin'), (dom) => {
      assert(dom.includes('id="hist-chart"'), 'falta #hist-chart');
      assert(dom.includes('id="hist-body"'), 'falta #hist-body');
    }],
    ['settings.html', seed('settings.html', 'admin'), (dom) => {
      assert(dom.includes('class="settings-form"') || dom.includes('id="settings-form"'), 'falta el formulario de ajustes');
      assert(dom.includes('id="settings-devices-body"'), 'falta #settings-devices-body');
    }],
    ['apis.html', seed('apis.html', 'admin'), (dom) => {
      assert((dom.match(/class="endpoint"/g) || []).length >= 6, 'se esperaban >= 6 tarjetas de endpoint');
    }],
    ['manual.html', seed('manual.html', 'admin'), (dom) => {
      assert((dom.match(/class="accordion"/g) || []).length === 5, 'se esperaban 5 secciones del acordeón');
    }],
    ['contact.html', seed('contact.html', 'admin'), (dom) => {
      assert(dom.includes('id="contact-form"'), 'falta #contact-form');
    }],
    ['about.html', seed('about.html', 'admin'), (dom) => {
      assert(dom.includes('class="disclaimer"'), 'falta .disclaimer');
      assert(dom.includes('id="about-dev-tools"'), 'falta #about-dev-tools');
    }],
  ];

  console.log(`\n[2] Páginas (${PAGES.length})`);
  for (const [name, url, verify] of PAGES) {
    const { dom, stderr } = await dump(url);
    const errs = consoleErrors(stderr);
    if (errs.length) {
      fail(`${name} (errores de consola)`, errs.join('\n      '));
      continue;
    }
    try {
      verify(dom);
      ok(name);
    } catch (err) {
      fail(name, err.message);
    }
  }

  server.kill();
  cleanupSeed();
  summary();
}

function cleanupSeed() {
  try { unlinkSync(SEED_FILE); } catch { /* ignore */ }
}

function summary() {
  console.log(`\n${'-'.repeat(48)}`);
  console.log(`Resultado: ${passed} aprobadas, ${failed} fallidas`);
  process.exitCode = failed > 0 ? 1 : 0;
}

run();
