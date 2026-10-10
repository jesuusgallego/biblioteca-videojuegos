// Proceso principal de la app de escritorio (Electron). Electron junta dos mundos:
//  - este archivo corre en Node, con acceso al sistema (ventanas, archivos...)
//  - la interfaz (la misma app React de la web) corre dentro de la ventana, aislada
//    como una página web normal, sin acceso al sistema.
// Este archivo solo abre la ventana, sirve la interfaz y protege la navegación. La
// app NO lleva backend dentro: llama por internet al servidor cuya dirección se fijó
// al compilar (VITE_API_URL, ver scripts/build-web.mjs).
const { app, BrowserWindow, Menu, protocol, net, shell, session, screen } = require('electron')
const { autoUpdater } = require('electron-updater')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

// La interfaz compilada vive en desktop/app (la deja ahí scripts/build-web.mjs)
const RAIZ_WEB = path.join(__dirname, 'app')

// La interfaz se sirve con un protocolo propio, app://gamehub/..., en vez de abrir el
// index.html como archivo (file://). Un archivo local tiene "origen nulo" y los
// navegadores le limitan cosas básicas (módulos ES, fetch, almacenamiento); con un
// protocolo propio la interfaz se comporta como una web normal.
const ESQUEMA = 'app'
const ORIGEN = `${ESQUEMA}://gamehub`

// En desarrollo se puede apuntar a un servidor de Vite: GAMEHUB_DEV_URL=http://localhost:5173
const URL_DESARROLLO = app.isPackaged ? null : process.env.GAMEHUB_DEV_URL

// Esto tiene que ir ANTES de que la app esté lista
protocol.registerSchemesAsPrivileged([
  { scheme: ESQUEMA, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

// ---- Instancia única -----------------------------------------------------------
// Si el usuario abre la app por segunda vez, no se abre otra ventana: se enfoca la
// que ya hay.
let ventana = null
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!ventana) return
    if (ventana.isMinimized()) ventana.restore()
    ventana.focus()
  })
}

// ---- Tamaño y posición de la ventana, recordados entre ejecuciones ---------------
const ARCHIVO_ESTADO = () => path.join(app.getPath('userData'), 'ventana.json')

function leerEstadoVentana() {
  const porDefecto = { width: 1280, height: 820 }
  try {
    const guardado = JSON.parse(fs.readFileSync(ARCHIVO_ESTADO(), 'utf8'))
    // Si el monitor donde estaba ya no existe, la ventana podría quedar fuera de la
    // pantalla: compruebo que cae dentro de alguno de los que hay ahora.
    const visible = screen.getAllDisplays().some(({ bounds: b }) =>
      guardado.x >= b.x && guardado.y >= b.y && guardado.x < b.x + b.width && guardado.y < b.y + b.height
    )
    return { ...porDefecto, ...guardado, ...(visible ? {} : { x: undefined, y: undefined }) }
  } catch {
    return porDefecto
  }
}

function guardarEstadoVentana() {
  if (!ventana || ventana.isDestroyed()) return
  try {
    // getNormalBounds es el tamaño "normal", aunque ahora esté maximizada
    const estado = { ...ventana.getNormalBounds(), maximizada: ventana.isMaximized() }
    fs.writeFileSync(ARCHIVO_ESTADO(), JSON.stringify(estado))
  } catch {
    // No guardar el tamaño no es grave
  }
}

// ---- Política de contenido (CSP) ---------------------------------------------------
// Le dice a la ventana de qué sitios puede cargar cosas. Es una segunda barrera: aunque
// algún día se colara código ajeno en la interfaz, no podría cargar scripts de fuera ni
// mandar datos a un sitio cualquiera.
function direccionApi() {
  try {
    return new URL(JSON.parse(fs.readFileSync(path.join(RAIZ_WEB, 'config.json'), 'utf8')).apiUrl).origin
  } catch {
    return null
  }
}

// index.html lleva un <script> en línea (aplica el tema antes de pintar, para que no
// parpadee). Una CSP estricta lo bloquearía, así que le doy permiso por su huella
// (hash): solo ese texto exacto puede ejecutarse.
function huellaScriptEnLinea() {
  try {
    const html = fs.readFileSync(path.join(RAIZ_WEB, 'index.html'), 'utf8')
    const guion = html.match(/<script>([\s\S]*?)<\/script>/)
    if (!guion) return null
    return `'sha256-${crypto.createHash('sha256').update(guion[1]).digest('base64')}'`
  } catch {
    return null
  }
}

function construirCsp() {
  const api = direccionApi()
  const huella = huellaScriptEnLinea()
  return [
    "default-src 'self'",
    `script-src 'self' ${huella ?? ''}`.trim(),
    // Los estilos en línea los usa React en atributos style (barras de progreso...)
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    // Portadas, capturas e iconos vienen de IGDB y Steam (https); data: y blob: son la
    // foto de perfil y el recortador
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${api ?? 'https:'} https://images.igdb.com`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ')
}

// ---- La ventana ------------------------------------------------------------------
function crearVentana() {
  const estado = leerEstadoVentana()

  ventana = new BrowserWindow({
    x: estado.x,
    y: estado.y,
    width: estado.width,
    height: estado.height,
    minWidth: 900,
    minHeight: 600,
    title: 'GameHub',
    icon: path.join(__dirname, 'build', 'icon.png'),
    // Mismo color que el fondo del tema oscuro: así no hay un fogonazo blanco antes
    // de que cargue la interfaz
    backgroundColor: '#111a27',
    show: false,
    webPreferences: {
      contextIsolation: true, // la página no ve las APIs de Electron
      nodeIntegration: false, // ni puede usar Node
      sandbox: true,
    },
  })

  if (estado.maximizada) ventana.maximize()
  // La enseño cuando ya hay algo que pintar, no en blanco
  ventana.once('ready-to-show', () => ventana.show())

  // Cualquier enlace que intente abrir una ventana nueva (los de IGDB, Steam...) va al
  // navegador del usuario, no a una ventana de Electron
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  // La ventana nunca navega a otro sitio: solo se queda en la interfaz de la app
  ventana.webContents.on('will-navigate', (evento, url) => {
    const interno = url.startsWith(ORIGEN) || (URL_DESARROLLO && url.startsWith(URL_DESARROLLO))
    if (interno) return
    evento.preventDefault()
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
  })

  ventana.on('close', guardarEstadoVentana)
  ventana.on('closed', () => { ventana = null })

  ventana.loadURL(URL_DESARROLLO ?? `${ORIGEN}/index.html`)
}

// ---- Arranque --------------------------------------------------------------------
app.whenReady().then(() => {
  // Sirvo los archivos de desktop/app para las direcciones app://gamehub/...
  protocol.handle(ESQUEMA, (peticion) => {
    let ruta = decodeURIComponent(new URL(peticion.url).pathname)
    if (ruta === '/') ruta = '/index.html'

    // Evito que una dirección con "../" salga de la carpeta de la interfaz
    const archivo = path.normalize(path.join(RAIZ_WEB, ruta))
    if (!archivo.startsWith(RAIZ_WEB + path.sep)) {
      return new Response('Prohibido', { status: 403 })
    }
    return net.fetch(pathToFileURL(archivo).toString())
  })

  // Añado la CSP a lo que sirve la propia app (no toca a IGDB ni al servidor de la API)
  const csp = construirCsp()
  session.defaultSession.webRequest.onHeadersReceived((detalles, devolver) => {
    const cabeceras = { ...detalles.responseHeaders }
    if (detalles.url.startsWith(ORIGEN)) cabeceras['Content-Security-Policy'] = [csp]
    devolver({ responseHeaders: cabeceras })
  })

  // Sin menú de aplicación al instalarla; en desarrollo se conserva (tiene las
  // herramientas de desarrollador)
  if (app.isPackaged) Menu.setApplicationMenu(null)

  crearVentana()

  // Actualizaciones automáticas: mira las Releases de GitHub (ver "publish" en
  // package.json). Si no hay conexión o no hay versión nueva, simplemente no hace nada.
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  }
})

app.on('window-all-closed', () => app.quit())
