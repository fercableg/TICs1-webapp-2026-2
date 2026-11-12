// ============================================================================
// smoke.mjs — Node smoke test for the static web app (no DOM required).
//
// Verifies, in order:
//   1. Every module imports cleanly (import-time errors surface here, which
//      `node --check` cannot catch for ES modules).
//   2. Pure helpers (utils) behave.
//   3. The reactive store (pub/sub) works.
//   4. RBAC auth (demo users, roles, isAdmin) behaves.
//   5. The mock backend + apiClient contract (devices, readings, alerts,
//      position events, settings, ack).
//   6. The poller happy path (which also guards against the bootstrap bug
//      where devices never load without a pre-selected device).
//
// Views now export init(root) and hydrate their own static HTML; they are
// exercised end-to-end by scripts/check-pages.mjs (Chromium headless), not here.
//
// Run:  node scripts/smoke.mjs   (or `npm run smoke`)
// ============================================================================

import { strict as assert } from 'node:assert';

// --- 1. Import every module ---------------------------------------------------
// Static imports: any import-time failure aborts here with a clear stack.
import { CONFIG, POSTURES, SEVERITIES, SOURCES, SENSORS, SENSOR_KEYS } from '../webapp/js/config.js';
import * as utils from '../webapp/js/core/utils.js';
import * as dom from '../webapp/js/core/dom.js';
import * as store from '../webapp/js/services/store.js';
import * as ui from '../webapp/js/core/ui.js';
import * as chart from '../webapp/js/core/chart.js';
import * as theme from '../webapp/js/services/theme.js';
import * as auth from '../webapp/js/services/auth.js';
import * as mockData from '../webapp/js/services/mockData.js';
import * as apiClient from '../webapp/js/services/apiClient.js';
import * as poller from '../webapp/js/services/poller.js';
import * as navbar from '../webapp/js/components/navbar.js';
import * as helpers from '../webapp/js/views/helpers.js';
import * as settingsForm from '../webapp/js/views/settingsForm.js';
import * as authCard from '../webapp/js/views/authCard.js';
import * as vLanding from '../webapp/js/views/landing.js';
import * as vLogin from '../webapp/js/views/login.js';
import * as vRegistro from '../webapp/js/views/registro.js';
import * as vProfile from '../webapp/js/views/profile.js';
import * as vDashboard from '../webapp/js/views/dashboard.js';
import * as vMonitoreo from '../webapp/js/views/monitoreo.js';
import * as vPositions from '../webapp/js/views/positions.js';
import * as vAlerts from '../webapp/js/views/alerts.js';
import * as vHistory from '../webapp/js/views/history.js';
import * as vSettings from '../webapp/js/views/settings.js';
import * as vApis from '../webapp/js/views/apis.js';
import * as vManual from '../webapp/js/views/manual.js';
import * as vContact from '../webapp/js/views/contact.js';
import * as vAbout from '../webapp/js/views/about.js';

const IMPORTED = [
  'config', 'utils', 'dom', 'store', 'ui', 'chart', 'theme', 'auth',
  'mockData', 'apiClient', 'poller', 'navbar', 'helpers', 'settingsForm',
  'authCard', 'landing', 'login', 'registro', 'profile', 'dashboard',
  'monitoreo', 'positions', 'alerts', 'history', 'settings', 'apis', 'manual',
  'contact', 'about',
];

// --- Test harness -------------------------------------------------------------
let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
}

// --- Run ----------------------------------------------------------------------
console.log('Smoke test — Monitoreo de Colchón Inteligente\n');

console.log(`[1] Module imports (${IMPORTED.length})`);
check(`all ${IMPORTED.length} modules imported`, () => {
  assert.ok(IMPORTED.length === 29, 'expected 29 modules');
  assert.equal(typeof CONFIG, 'object');
  assert.equal(typeof vDashboard.init, 'function');
  assert.equal(typeof vMonitoreo.init, 'function');
  assert.equal(typeof vApis.init, 'function');
});

console.log('\n[2] config');
check('mock mode is enabled', () => assert.equal(CONFIG.USE_MOCK_DATA, true));
check('firmware constants present', () => {
  assert.equal(CONFIG.FIRMWARE.ADC_MAX, 4095);
  assert.equal(CONFIG.FIRMWARE.EMPTY_BED_MIN_WEIGHT, 300);
  assert.equal(CONFIG.FIRMWARE.ALERT_MIN, 120);
  assert.equal(CONFIG.FIRMWARE.TX_INTERVAL_S, 60);
  assert.equal(CONFIG.FIRMWARE.REPOSITION_MIN, 120);
});
check('sensor catalogue has 6 zones (Fase 2)', () => {
  assert.equal(SENSORS.length, 6);
  assert.equal(SENSOR_KEYS.length, 6);
  assert.deepEqual(SENSOR_KEYS, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
});
check('posture catalogue has 5 entries', () => assert.equal(Object.keys(POSTURES).length, 5));
check('severity catalogue has 3 entries', () => assert.equal(Object.keys(SEVERITIES).length, 3));
check('source catalogue has 2 entries', () => assert.equal(Object.keys(SOURCES).length, 2));

console.log('\n[3] utils');
check('safeNum coerces and clamps', () => {
  assert.equal(utils.safeNum('12', 0, 100), 12);
  assert.equal(utils.safeNum(500, 0, 100), null);
  assert.equal(utils.safeNum('abc'), null);
  assert.equal(utils.safeNum(null), null);
});
check('totalPressure sums the 6 channels', () => {
  assert.equal(utils.totalPressure({ p1: 1, p2: 2, p3: 3, p4: 4, p5: 5, p6: 6 }), 21);
  assert.equal(utils.totalPressure(null), 0);
});
check('totalPressure ignores out-of-range channels', () => {
  assert.equal(utils.totalPressure({ p1: 99999, p2: 5, p3: null, p4: NaN, p5: 5, p6: 6 }), 16);
});
check('clamp bounds values', () => {
  assert.equal(utils.clamp(150, 0, 100), 100);
  assert.equal(utils.clamp(-5, 0, 100), 0);
});
check('esc escapes HTML', () => {
  assert.equal(utils.esc('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});
check('uid prefixes', () => assert.ok(utils.uid('dev').startsWith('dev-')));
check('safeNum: omit bounds for "no limit" (null coerces to 0)', () => {
  // Regression guard for settings.js readNumber: passing null as min/max does
  // NOT mean "unbounded" — it coerces to 0 and rejects every positive value.
  assert.equal(utils.safeNum('72', null, null), null);
  assert.equal(utils.safeNum('72'), 72);
  assert.equal(utils.safeNum('-5'), -5);
});

console.log('\n[4] store (pub/sub)');
check('setState/getState round-trip', () => {
  store.setState({ loading: true });
  assert.equal(store.getState().loading, true);
});
check('subscribe fires and unsubscribes', () => {
  let calls = 0;
  const un = store.subscribe(() => { calls += 1; });
  store.setState({ loading: false });
  un();
  store.setState({ loading: true });
  assert.equal(calls, 1);
});

console.log('\n[5] auth (RBAC)');
check('admin login succeeds and is admin', () => {
  const res = auth.login('admin', 'admin123');
  assert.equal(res.ok, true);
  assert.equal(res.user.role, auth.ROLES.ADMIN);
  assert.equal(auth.isAdmin(res.user), true);
});
check('client login succeeds and is not admin', () => {
  const res = auth.login('cliente', 'cliente123');
  assert.equal(res.ok, true);
  assert.equal(res.user.role, auth.ROLES.CLIENT);
  assert.equal(auth.isAdmin(res.user), false);
});
check('wrong password fails', () => {
  assert.equal(auth.login('admin', 'nope').ok, false);
});
check('login is case-insensitive on username', () => {
  assert.equal(auth.login('ADMIN', 'admin123').ok, true);
});
check('getSession is null without browser storage', () => {
  assert.equal(auth.getSession(), null);
});
check('register rejects a duplicate username', () => {
  const res = auth.register({ name: 'X', username: 'admin', password: 'secret123' });
  assert.equal(res.ok, false);
});
check('register rejects a short password', () => {
  const res = auth.register({ name: 'X', username: 'nuevo', password: '123' });
  assert.equal(res.ok, false);
});
check('register rejects a missing name', () => {
  const res = auth.register({ name: '  ', username: 'nuevo', password: 'secret123' });
  assert.equal(res.ok, false);
});
check('register stores the password so the account can log in', () => {
  const r = auth.register({ name: 'Ana Test', username: 'ana', password: 'secret123', email: 'ana@test.com' });
  assert.equal(r.ok, true);
  const l = auth.login('ana', 'secret123');
  assert.equal(l.ok, true);
  assert.equal(l.user.email, 'ana@test.com');
});
check('updateProfile changes name/email/photo', () => {
  const res = auth.updateProfile('ana', { name: 'Ana Actualizada', email: 'nueva@test.com', photo: 'data:image/png;base64,AAA' });
  assert.equal(res.ok, true);
  assert.equal(res.user.name, 'Ana Actualizada');
  assert.equal(res.user.email, 'nueva@test.com');
  assert.equal(res.user.photo, 'data:image/png;base64,AAA');
});
check('updateProfile can rename a registered user', () => {
  const res = auth.updateProfile('ana', { username: 'ana2' });
  assert.equal(res.ok, true);
  assert.equal(res.user.username, 'ana2');
});
check('updateProfile rejects a duplicate username', () => {
  const res = auth.updateProfile('ana2', { username: 'admin' });
  assert.equal(res.ok, false);
});
check('updateProfile rejects renaming a demo account', () => {
  const res = auth.updateProfile('admin', { username: 'otro' });
  assert.equal(res.ok, false);
});

console.log('\n[6] mock backend + apiClient contract');
await checkAsync('listDevices returns 3 devices (online + offline + empty)', async () => {
  const devs = await apiClient.listDevices();
  assert.equal(devs.length, 3);
  assert.ok(devs.some((d) => d.online));
  assert.ok(devs.some((d) => !d.online));
  assert.ok(devs.every((d) => d.id && d.name));
});
await checkAsync('getReadings returns reading-shaped rows', async () => {
  const rows = await apiClient.getReadings('esp32-001', { limit: 10 });
  assert.ok(Array.isArray(rows) && rows.length > 0);
  const r = rows[0];
  for (const k of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'ts', 'posture', 'temp', 'hum']) {
    assert.ok(k in r, `missing field ${k}`);
  }
});
await checkAsync('empty-bed device reports low total pressure', async () => {
  const rows = await apiClient.getReadings('esp32-003', { limit: 1 });
  const total = utils.totalPressure(rows[0]);
  assert.ok(total < CONFIG.FIRMWARE.EMPTY_BED_MIN_WEIGHT, `total ${total} >= threshold`);
});
await checkAsync('listAlerts filters active (ack=false)', async () => {
  const alerts = await apiClient.listAlerts('esp32-001', { ack: false });
  assert.ok(Array.isArray(alerts));
  assert.ok(alerts.every((a) => a.ack === false));
});
await checkAsync('ackAlert marks an alert as acknowledged', async () => {
  const a = await apiClient.ackAlert('a1', 'admin');
  assert.equal(a.ack, true);
  assert.equal(a.ack_by, 'admin');
});
await checkAsync('listPositionEvents returns events sorted newest-first', async () => {
  const evts = await apiClient.listPositionEvents('esp32-001');
  assert.ok(Array.isArray(evts) && evts.length > 0);
  for (let i = 1; i < evts.length; i++) assert.ok(evts[i - 1].timestamp >= evts[i].timestamp);
});
await checkAsync('getSettings returns patient + thresholds', async () => {
  const s = await apiClient.getSettings('esp32-001');
  assert.equal(typeof s.patient_name, 'string');
  assert.ok(s.empty_bed_min_weight > 0);
  assert.ok(s.tx_interval_s > 0, 'missing tx_interval_s');
  assert.ok(s.reposition_interval_min > 0, 'missing reposition_interval_min');
});
await checkAsync('updateSettings persists and clamps', async () => {
  const updated = await apiClient.updateSettings('esp32-001', { sample_rate_s: 7 });
  assert.equal(updated.sample_rate_s, 7);
  const bad = await apiClient.updateSettings('esp32-001', { empty_bed_min_weight: -5 });
  assert.ok(bad.empty_bed_min_weight >= 1, 'negative threshold not clamped');
});
await checkAsync('unknown device id throws', async () => {
  let threw = false;
  try {
    await apiClient.getReadings('nope');
  } catch {
    threw = true;
  }
  assert.ok(threw);
});

console.log('\n[7] poller happy path (mock)');
await checkAsync('poller loads devices and a reading once a device is selected', async () => {
  store.setState({ deviceId: 'esp32-001', lastReading: null });
  await poller.pollNow();
  const st = store.getState();
  assert.equal(st.devices.length, 3);
  assert.ok(st.lastReading, 'no lastReading after poll');
  assert.equal(st.connectionStatus, 'connected');
  assert.ok(Array.isArray(st.recentReadings) && st.recentReadings.length > 0);
});
check('poller clamps interval to >= 1000ms', () => {
  poller.setIntervalMs(250);
  assert.equal(poller.getIntervalMs(), 1000);
  poller.setIntervalMs(CONFIG.DEFAULT_POLL_INTERVAL_MS);
});
check('poller can be stopped cleanly', () => {
  poller.stopPoller();
  assert.ok(true);
});

// --- Summary -------------------------------------------------------------------
console.log(`\n${'-'.repeat(48)}`);
console.log(`Result: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('All checks passed ✓');
}
