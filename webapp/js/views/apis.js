// ============================================================================
// apis.js — API reference: the PostgREST/Supabase endpoints this app consumes,
// plus ready-to-use ESP32 (Arduino C++) snippets for the firmware side of the
// workflow. Purely informational (no store subscription, no network calls).
// ============================================================================

import { el } from '../core/dom.js';
import { CONFIG } from '../config.js';
import { pageHeader, card } from './helpers.js';

function methodBadge(method) {
  return el('span', { class: `method-badge method-badge--${method.toLowerCase()}`, text: method });
}

function code(text) {
  return el('pre', { class: 'code-block', text });
}

function endpointCard({ method, path, scope, description, snippet }) {
  return el('article', { class: 'endpoint' },
    el('header', { class: 'endpoint__head' },
      methodBadge(method),
      el('code', { class: 'endpoint__path', text: path }),
      el('span', { class: `endpoint__scope endpoint__scope--${scope}`, text: scope === 'esp32' ? 'ESP32' : 'Web' })),
    el('div', { class: 'endpoint__body' },
      el('p', { class: 'endpoint__desc', text: description }),
      code(snippet)),
  );
}

const GET_READINGS = `curl -H "apikey: $ANON_KEY" \\
     -H "Authorization: Bearer $ANON_KEY" \\
     "$BASE/readings?device_id=eq.esp32-001&order=ts.desc&limit=20"`;

const GET_DEVICES = `curl -H "apikey: $ANON_KEY" \\
     -H "Authorization: Bearer $ANON_KEY" \\
     "$BASE/devices?select=*&order=last_seen.desc"`;

const GET_ALERTS = `curl -H "apikey: $ANON_KEY" \\
     -H "Authorization: Bearer $ANON_KEY" \\
     "$BASE/alerts?device_id=eq.esp32-001&ack=is.false&order=ts.desc"`;

const PATCH_ALERT = `curl -X PATCH -H "apikey: $ANON_KEY" \\
     -H "Authorization: Bearer $ANON_KEY" \\
     -H "Content-Type: application/json" \\
     -H "Prefer: return=representation" \\
     -d '{"ack":true,"ack_by":"admin","ack_ts":"2026-10-30T12:00:00Z"}' \\
     "$BASE/alerts?id=eq.a1"`;

const ESP32_POST_READING = `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "tu_red";
const char* WIFI_PASS = "tu_clave";
const char* API_URL  = "https://TU-PROYECTO.supabase.co/rest/v1";
const char* ANON_KEY = "tu-anon-key";

// Envía una lectura de los 6 FSR + temperatura/humedad.
void postReading(int p1, int p2, int p3, int p4, int p5, int p6,
                 float temp, float hum, const char* posture) {
  HTTPClient http;
  http.begin(String(API_URL) + "/readings");
  http.addHeader("apikey", ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + ANON_KEY);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<512> doc;
  doc["device_id"] = "esp32-001";
  doc["ts"] = "2026-10-30T12:00:00Z";  // ISO 8601 (o deja que la DB use now())
  doc["posture"] = posture;            // supina | lateral_izq | lateral_der | fuera_cama
  doc["p1"] = p1; doc["p2"] = p2; doc["p3"] = p3;
  doc["p4"] = p4; doc["p5"] = p5; doc["p6"] = p6;
  doc["temp"] = temp;
  doc["hum"] = hum;

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  http.end();
}`;

const ESP32_GET_SETTINGS = `// Descarga la configuración (umbrales, intervalos) al arrancar o cada N min.
void fetchSettings() {
  HTTPClient http;
  http.begin(String(API_URL) + "/settings?device_id=eq.esp32-001&limit=1");
  http.addHeader("apikey", ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + ANON_KEY);

  int code = http.GET();
  if (code == 200) {
    StaticJsonDocument<1024> doc;
    deserializeJson(doc, http.getString());
    int   alertMin  = doc[0]["alert_min"];              // minutos
    float deltaTemp = doc[0]["delta_temp_c"];           // °C
    int   emptyBed  = doc[0]["empty_bed_min_weight"];   // suma ADC
    int   txEvery   = doc[0]["tx_interval_s"];          // segundos
    // … aplica estos valores a tu lógica de alertas y transmisión.
  }
  http.end();
}`;

const ESP32_POST_POSITION = `// Registra un cambio de posición detectado por el firmware.
void postPosition(const char* position, const char* source) {
  HTTPClient http;
  http.begin(String(API_URL) + "/position_events");
  http.addHeader("apikey", ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + ANON_KEY);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["device_id"] = "esp32-001";
  doc["position"]  = position;  // supina | lateral_izq | lateral_der | fuera_cama
  doc["source"]    = source;    // sensor | cuidador
  doc["timestamp"] = "2026-10-30T12:00:00Z";

  String body;
  serializeJson(doc, body);
  http.POST(body);
  http.end();
}`;

const HEADERS_NOTE = `Base:  ${CONFIG.API_BASE_URL}
Anon:  ${CONFIG.SUPABASE_ANON_KEY}

Cabeceras obligatorias en TODAS las peticiones:
  apikey:          <anon-key>
  Authorization:   Bearer <anon-key>
  Content-Type:    application/json
  Prefer:          return=representation   (solo en PATCH)`;

export function render(container) {
  const root = el('div', { class: 'page' },
    pageHeader('APIs', 'Endpoints del backend (Supabase / PostgREST) y código listo para el ESP32.'),
    card('Cómo conectarse',
      el('div', {},
        el('p', {}, 'Toda la red de la interfaz pasa por `apiClient.js`. Para apuntar al backend real, pon `CONFIG.USE_MOCK_DATA = false` y rellena `API_BASE_URL` y `SUPABASE_ANON_KEY` en `config.js`.'),
        el('p', { class: 'muted' }, 'La anon-key de Supabase es pública por diseño; el control de acceso fino se hace con políticas de fila (RLS).'),
        code(HEADERS_NOTE))),

    card('Firmware → servidor (ESP32)',
      el('div', {},
        endpointCard({
          method: 'POST',
          path: '/readings',
          scope: 'esp32',
          description: 'Envía una lectura de los 6 sensores de presión más temperatura y humedad.',
          snippet: ESP32_POST_READING,
        }),
        endpointCard({
          method: 'GET',
          path: '/settings?device_id=eq.{id}&limit=1',
          scope: 'esp32',
          description: 'Obtiene la configuración actual (umbrales, intervalos) para aplicarla sin reflashear.',
          snippet: ESP32_GET_SETTINGS,
        }),
        endpointCard({
          method: 'POST',
          path: '/position_events',
          scope: 'esp32',
          description: 'Registra un cambio de posición detectado por el firmware.',
          snippet: ESP32_POST_POSITION,
        }))),

    card('Servidor → interfaz (Web)',
      el('div', {},
        endpointCard({
          method: 'GET',
          path: '/readings?device_id=eq.{id}&order=ts.desc&limit={n}',
          scope: 'web',
          description: 'Lee las últimas lecturas (historial y tendencias).',
          snippet: GET_READINGS,
        }),
        endpointCard({
          method: 'GET',
          path: '/devices?select=*&order=last_seen.desc',
          scope: 'web',
          description: 'Lista los dispositivos registrados (selector de la navbar).',
          snippet: GET_DEVICES,
        }),
        endpointCard({
          method: 'GET',
          path: '/alerts?device_id=eq.{id}&ack=is.false&order=ts.desc',
          scope: 'web',
          description: 'Lista las alertas activas (sin confirmar).',
          snippet: GET_ALERTS,
        }),
        endpointCard({
          method: 'PATCH',
          path: '/alerts?id=eq.{id}',
          scope: 'web',
          description: 'Confirma una alerta (ACK): marca ack, ack_by y ack_ts.',
          snippet: PATCH_ALERT,
        }))),
  );
  container.replaceChildren(root);
  return () => {};
}
