# Monitoreo de Colchón Inteligente (LPP)

> Proyecto en TICs 1 - Universidad Diego Portales · Escuela de Informática y
> Telecomunicaciones - 2.º semestre de 2026

Interfaz web para una **capa inteligente de monitoreo** orientada a la
prevención de **lesiones por presión (LPP)**. La capa se instala sobre un
colchón antiescaras existente para medir la presión, temperatura y
humedad mediante un **ESP32** con **6 sensores de presión FSR406** y un sensor
**AHT20**. Los datos se transmiten por Wi-Fi y se visualizan en tiempo
real, con alertas y recordatorios de cambio de posición.

---

## Stack

HTML5 semántico con CSS3 y Vanilla JavaScript (ES Modules).

## Ejecución local

La app es totalmente estática, se ejecuta de la siguente forma:

```bash
python3 -m http.server 8080 -d webapp
# Abrir http://localhost:8080

```

> Ejecutar el comando desde el clone del repositorio.

Si no ves los cambios reflejados, haz una recarga forzada (`Ctrl+Shift+R`):
el servidor de Python no envía cabeceras `no-cache`.

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

- **Fernando Cabrera Legue** — Jefe de proyecto.
- **Cinthya Fuentealba Bravo** — Aplicación y comunicaciones.
- **Gonzalo Letelier Muñoz** — Hardware y sensores.
