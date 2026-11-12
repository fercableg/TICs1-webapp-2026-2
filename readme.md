# Bed Sense - Monitoreo de Colchón Inteligente (LPP)

> Proyecto en TICs 1 - Universidad Diego Portales · Escuela de Informática y
> Telecomunicaciones - 2° semestre de 2026

Interfaz web para una **capa inteligente de monitoreo** orientada a la
prevención de **lesiones por presión (LPP)**. La capa se instala sobre un
colchón antiescaras existente para medir la presión, temperatura y
humedad mediante un **ESP32** con **6 sensores de presión FSR406** y un sensor
**AHT20**. Los datos se transmiten por Wi-Fi y se visualizan en tiempo
real, con alertas y recordatorios de cambio de posición.

---

## Stack

HTML5 semántico con CSS3 y Vanilla JavaScript (ES Modules), desplegables en Cloudflare Pages.

## Ejecución local

La app es totalmente estática, se ejecuta de la siguiente forma:

```bash
python3 -m http.server 8080 -d webapp
# Abrir http://localhost:8080

```

> Ejecutar el comando desde el clone del repositorio.

Si no ves los cambios reflejados, haz una recarga forzada (`Ctrl+Shift+R`):
el servidor de Python no envía cabeceras `no-cache`.

## Verificación

```bash
npm run check    # node --check sobre todos los módulos JS
npm run smoke    # smoke test de Node (imports, config, utils, store, RBAC, API, poller)
node scripts/check-pages.mjs   # Chromium headless: carga las 14 páginas + redirecciones de auth
```

## Vistas (multi-page)

Cada vista es una **página HTML real** con su esqueleto estático y un
`<script>` equivalente en `js/views/` que la hidrata al cargar:

`index.html` (landing pública) · `login.html` · `registro.html` ·
`profile.html` (perfil) · `dashboard.html` · `monitoreo.html` ·
`positions.html` · `alerts.html` · `history.html` · `settings.html`
(solo administrador) · `apis.html` · `manual.html` · `contact.html` ·
`about.html`

> Las cuentas demo `admin` / `admin123` y `cliente` / `cliente123` siguen
> siendo válidas para iniciar sesión, pero ya no se muestran en la interfaz.
> La landing page termina con una llamada a la acción que redirige a
> `login.html` y `registro.html` (igual que la barra superior).

## Estructura

```
webapp/
  index.html          
  login.html 
  registro.html
  profile.html
  dashboard.html
  css/                
  js/
    config.js
    app-shell.js
    page.js
    core/
    services/
    components/
    views/       
scripts/              
```

## Integrantes

- **Fernando Cabrera Legue:** Jefe de proyecto.
- **Cinthya Fuentealba Bravo:** — Aplicación y comunicaciones.
- **Gonzalo Letelier Muñoz:** — Hardware y sensores.
