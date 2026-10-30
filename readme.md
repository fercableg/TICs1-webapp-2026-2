# Monitoreo de Colchón Inteligente

> Proyecto en TICs 1 · Universidad Diego Portales · Escuela de Informática y
> Telecomunicaciones · 2.º semestre de 2026

Interfaz web para una **capa inteligente de monitoreo** orientada a la
prevención de **lesiones por presión (LPP)**. La capa se instala sobre un
colchón antiescaras existente (sin reemplazarlo) y mide presión, temperatura y
humedad mediante un **ESP32** con **6 sensores de presión FSR406** y un sensor
**AHT20**. Los datos se transmiten por Wi-Fi y se visualizan aquí en tiempo
real, con alertas y recordatorios de cambio de posición.

Este repositorio contiene el **front-end web estático**. Funciona sin backend
(usa un generador de datos simulado *mock*); para conectar el hardware real,
la capa de acceso a datos está centralizada en `apiClient.js` y la vista
`#/apis` documenta los endpoints REST para el ESP32.

---

## Stack

HTML5 semántico · CSS3 (custom properties) · Vanilla JavaScript (ES Modules).
**Sin frameworks, sin bundler, sin dependencias.** 100 % archivos estáticos,
desplegables directamente en Cloudflare Pages.

## Ejecución local

La app es totalmente estática. Para servirla localmente:

```bash
# Opción 1 — servidor de Python (recomendada)
python3 -m http.server 8080 -d webapp
# Abrir http://localhost:8080

# Opción 2 — npx serve
npx serve webapp
```

> ⚠️ Ejecuta el comando desde la **raíz del repositorio** (con `-d webapp`),
> no desde dentro de `webapp/`.

Si no ves los cambios reflejados, haz una recarga forzada (`Ctrl+Shift+R`):
el servidor de Python no envía cabeceras `no-cache`.

## Verificación (sin navegador)

```bash
npm run check   # node --check sobre todos los módulos JS
npm run smoke   # smoke test (imports, store, RBAC, API, render de vistas)
```

## Credenciales demo

| Usuario    | Contraseña   | Rol          |
|------------|--------------|--------------|
| `admin`    | `admin123`   | Administrador |
| `cliente`  | `cliente123` | Cuidador/a    |

## Vistas

`#/dashboard` · `#/monitoreo` · `#/positions` · `#/alerts` · `#/history` ·
`#/settings` (solo administrador) · `#/apis` · `#/manual` · `#/contact` ·
`#/about`

## Estructura

```
webapp/
  index.html          # único documento
  css/                # tokens, base, componentes, vistas
  js/
    config.js         # CONFIG + SENSORS + catálogos (fuente de verdad)
    app.js            # bootstrap + tabla de rutas
    core/             # dom, router, ui, utils, chart
    services/         # store, auth, theme, apiClient, mockData, poller
    components/       # navbar
    views/            # login, dashboard, monitoreo, ..., apis
scripts/              # smoke test + DOM shim
```

## Integrantes

- **Fernando Cabrera Legue** — Jefe de proyecto
- **Cinthya Fuentealba Bravo** — Aplicación y comunicaciones
- **Gonzalo Letelier Muñoz** — Hardware y sensores
