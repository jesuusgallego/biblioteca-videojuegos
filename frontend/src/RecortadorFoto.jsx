import { useState, useRef, useEffect } from 'react'
import { recortarImagen } from './imagen'
import Mensaje from './Mensaje'
import { useIdioma } from './IdiomaContext'

const ZOOM_MAX = 4 // veces el tamaño en que la imagen justo cubre el cuadro
const PASO_FLECHAS = 0.05 // lo que mueven las flechas, como fracción del cuadro
const PASO_ZOOM = 0.25 // lo que cambian los botones + y - y las teclas + y -
const DURACION_SUAVE_MS = 300 // lo que dura la animación de los botones (debe cuadrar con el CSS)

const limitar = (valor, min, max) => Math.min(max, Math.max(min, valor))

// ---- Geometría --------------------------------------------------------------
// Todo se mide en "fracciones del cuadro": 1 es el lado del cuadro visible. Así
// el encuadre no cambia si el cuadro se hace más pequeño (móvil, ventana
// estrecha). El estado del encuadre son dos cosas:
//  - zoom: 1 = la imagen justo cubre el cuadro (por su lado corto); 2 = el doble
//    de grande. Por debajo de 1 la imagen no cubre todo el cuadro, y queda relleno.
//  - centro: dónde está el centro de la imagen respecto al centro del cuadro.
//    {x: 0, y: 0} = centrada.

// Escala (píxeles en pantalla por píxel de imagen) para un zoom dado
function escalaDe(imagen, lado, zoom) {
  return (lado / Math.min(imagen.naturalWidth, imagen.naturalHeight)) * zoom
}

// El zoom más pequeño: la imagen entera dentro del cuadro. En una apaisada
// (16:9), menos que eso sería hacerla diminuta sin motivo.
function zoomMinimo(imagen) {
  return Math.min(imagen.naturalWidth, imagen.naturalHeight) / Math.max(imagen.naturalWidth, imagen.naturalHeight)
}

// No dejo que se arrastre la imagen hasta que aparezca un hueco dentro del
// cuadro. Si en un eje la imagen es más pequeña que el cuadro, ahí no se puede
// mover: se queda centrada.
function ajustarCentro(imagen, lado, zoom, centro) {
  const escala = escalaDe(imagen, lado, zoom)
  const margenX = Math.max(0, (imagen.naturalWidth * escala - lado) / 2) / lado
  const margenY = Math.max(0, (imagen.naturalHeight * escala - lado) / 2) / lado
  return { x: limitar(centro.x, -margenX, margenX), y: limitar(centro.y, -margenY, margenY) }
}

// Calcula el encuadre nuevo cuando un gesto (arrastrar, pellizcar, rueda...) lleva
// el punto del cuadro que estaba en `inicio.foco` a `foco`, con otro zoom. La
// idea: el punto de la imagen que estaba bajo el dedo (o el cursor) tiene que
// seguir bajo él. Sin zoom (k = 1) es simplemente arrastrar; sin mover el foco
// es ampliar alrededor de ese punto.
function transformar(imagen, lado, inicio, zoomNuevo, foco) {
  const zoom = limitar(zoomNuevo, zoomMinimo(imagen), ZOOM_MAX)
  const k = zoom / inicio.zoom
  const centro = ajustarCentro(imagen, lado, zoom, {
    x: foco.x - (inicio.foco.x - inicio.centro.x) * k,
    y: foco.y - (inicio.foco.y - inicio.centro.y) * k,
  })
  return { zoom, centro }
}

const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const puntoMedio = (puntos) => ({
  x: puntos.reduce((suma, p) => suma + p.x, 0) / puntos.length,
  y: puntos.reduce((suma, p) => suma + p.y, 0) / puntos.length,
})

// Recortador de la foto de perfil: se arrastra la imagen para moverla y se amplía
// o reduce con la rueda, el deslizador, los botones, el pellizco (en pantallas
// táctiles) o las teclas. El círculo marca lo que se verá en el avatar.
//  - url: la imagen (una URL de IGDB o un blob: de un archivo del equipo)
//  - onUsar(dataUrl): recibe la foto ya recortada y reducida
//  - onVolver(): cancelar
//  - etiquetaVolver: lo que pone el botón de cancelar (por defecto, "Volver")
function RecortadorFoto({ url, onUsar, onVolver, etiquetaVolver }) {
  const { t } = useIdioma()
  const vistaRef = useRef(null)
  const [imagen, setImagen] = useState(null) // el <img> cuando ya ha cargado
  const [lado, setLado] = useState(0) // lo que mide el cuadro en pantalla, en px
  const [zoom, setZoom] = useState(1)
  const [centro, setCentro] = useState({ x: 0, y: 0 })
  const [arrastrando, setArrastrando] = useState(false)
  const [suave, setSuave] = useState(false) // true: los cambios se animan (botones)
  const [error, setError] = useState("")

  // El último estado, para los manejadores que no se vuelven a crear en cada pintado
  // (la rueda). Se actualiza tras cada pintado.
  const ultimo = useRef({ imagen: null, lado: 0, zoom: 1, centro: { x: 0, y: 0 } })
  useEffect(() => {
    ultimo.current = { imagen, lado, zoom, centro }
  })

  // Dedos o cursor que están pulsando ahora, y el encuadre del que parte el gesto
  const punteros = useRef(new Map())
  const gesto = useRef(null)
  const temporizadorSuave = useRef(null)
  useEffect(() => () => clearTimeout(temporizadorSuave.current), [])

  // Mido el cuadro. ResizeObserver avisa al empezar a observar y cada vez que
  // cambia de tamaño.
  useEffect(() => {
    const observador = new ResizeObserver(() => setLado(vistaRef.current.clientWidth))
    observador.observe(vistaRef.current)
    return () => observador.disconnect()
  }, [])

  const listo = Boolean(imagen) && lado > 0

  // ---- Cambios de encuadre ----------------------------------------------------
  // Posición de un punto de la pantalla dentro del cuadro: fracciones del cuadro
  // contadas desde su centro (-0.5 es el borde izquierdo o superior)
  function enElCuadro(punto) {
    const caja = vistaRef.current.getBoundingClientRect()
    return { x: (punto.x - caja.left) / caja.width - 0.5, y: (punto.y - caja.top) / caja.height - 0.5 }
  }

  function aplicar(nuevo) {
    setZoom(nuevo.zoom)
    setCentro(nuevo.centro)
  }

  // Zoom de los botones, el deslizador y las teclas: alrededor del centro del cuadro
  function cambiarZoom(zoomNuevo) {
    const centrado = { x: 0, y: 0 }
    aplicar(transformar(imagen, lado, { zoom, centro, foco: centrado }, zoomNuevo, centrado))
  }

  // Ejecuta un cambio animándolo (el CSS anima solo mientras `suave` sea true)
  function animado(cambio) {
    clearTimeout(temporizadorSuave.current)
    setSuave(true)
    cambio()
    temporizadorSuave.current = setTimeout(() => setSuave(false), DURACION_SUAVE_MS)
  }

  function restablecer() {
    animado(() => aplicar({ zoom: 1, centro: { x: 0, y: 0 } }))
  }

  // ---- Rueda -------------------------------------------------------------------
  // Tiene que ser un listener nativo "no pasivo": React registra la rueda como
  // pasiva y entonces no se puede evitar que la página haga scroll a la vez.
  useEffect(() => {
    const cuadro = vistaRef.current

    function alRodar(e) {
      const { imagen, lado, zoom, centro } = ultimo.current
      if (!imagen || !lado) return
      e.preventDefault()

      const caja = cuadro.getBoundingClientRect()
      const foco = { x: (e.clientX - caja.left) / caja.width - 0.5, y: (e.clientY - caja.top) / caja.height - 0.5 }
      // Exponencial: cada "muesca" de rueda cambia el zoom en la misma proporción
      const zoomNuevo = zoom * Math.exp(-e.deltaY * 0.0015)
      const nuevo = transformar(imagen, lado, { zoom, centro, foco }, zoomNuevo, foco)
      setZoom(nuevo.zoom)
      setCentro(nuevo.centro)
    }

    cuadro.addEventListener('wheel', alRodar, { passive: false })
    return () => cuadro.removeEventListener('wheel', alRodar)
  }, [])

  // ---- Arrastrar y pellizcar (ratón, dedo y lápiz con la misma API) --------------
  // Cada vez que cambia el número de dedos empieza un gesto nuevo, partiendo del
  // encuadre de ese momento.
  function iniciarGesto() {
    const puntos = [...punteros.current.values()]
    if (puntos.length === 0) {
      gesto.current = null
      return
    }
    gesto.current = {
      zoom,
      centro,
      foco: enElCuadro(puntoMedio(puntos)),
      separacion: puntos.length > 1 ? distancia(puntos[0], puntos[1]) : null,
    }
  }

  function alPulsar(e) {
    if (!listo) return
    // El puntero queda "capturado": sigue mandando eventos aunque salga del cuadro
    e.currentTarget.setPointerCapture(e.pointerId)
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    setSuave(false)
    setArrastrando(true)
    iniciarGesto()
  }

  function alMover(e) {
    if (!punteros.current.has(e.pointerId) || !gesto.current) return
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const puntos = [...punteros.current.values()]
    const inicio = gesto.current
    // Con dos dedos, el zoom es la proporción en que se han separado o juntado
    const zoomNuevo = inicio.separacion && puntos.length > 1
      ? inicio.zoom * (distancia(puntos[0], puntos[1]) / inicio.separacion)
      : inicio.zoom
    aplicar(transformar(imagen, lado, inicio, zoomNuevo, enElCuadro(puntoMedio(puntos))))
  }

  function alSoltar(e) {
    punteros.current.delete(e.pointerId)
    iniciarGesto()
    if (punteros.current.size === 0) setArrastrando(false)
  }

  // ---- Teclado -------------------------------------------------------------------
  function alPulsarTecla(e) {
    if (!listo) return
    const flechas = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }

    if (flechas[e.key]) {
      // La flecha mueve "la vista": hacia la derecha se ve más a la derecha de la
      // imagen, es decir, la imagen se desplaza a la izquierda
      const [dx, dy] = flechas[e.key]
      setCentro(ajustarCentro(imagen, lado, zoom, { x: centro.x + dx * PASO_FLECHAS, y: centro.y + dy * PASO_FLECHAS }))
    } else if (e.key === '+' || e.key === '=') {
      cambiarZoom(zoom + PASO_ZOOM)
    } else if (e.key === '-') {
      cambiarZoom(zoom - PASO_ZOOM)
    } else if (e.key === '0') {
      restablecer()
    } else {
      return
    }
    e.preventDefault()
  }

  // ---- Resultado -----------------------------------------------------------------
  // Datos para pintar y para recortar: la imagen mide `escala` veces su tamaño real
  const escala = listo ? escalaDe(imagen, lado, zoom) : 1
  const centroVisible = listo ? ajustarCentro(imagen, lado, zoom, centro) : { x: 0, y: 0 }

  function usar() {
    // Esquina del cuadro en píxeles de la imagen original, y lo que mide el cuadro allí
    const sx = imagen.naturalWidth / 2 - (lado / 2 + centroVisible.x * lado) / escala
    const sy = imagen.naturalHeight / 2 - (lado / 2 + centroVisible.y * lado) / escala
    try {
      onUsar(recortarImagen(imagen, sx, sy, lado / escala))
    } catch {
      setError(t('recortador.errorPreparar'))
    }
  }

  const clasesImagen = [
    "recortador__imagen",
    listo && "recortador__imagen--lista",
    suave && "recortador__imagen--suave",
  ].filter(Boolean).join(" ")

  return (
    <div className="recortador">
      <div
        ref={vistaRef}
        className={arrastrando ? "recortador__vista recortador__vista--arrastrando" : "recortador__vista"}
        tabIndex={0}
        role="group"
        aria-label={t('recortador.encuadre')}
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onKeyDown={alPulsarTecla}
      >
        {/* crossOrigin: IGDB permite leer sus imágenes desde otra web, pero hay que
            pedirlas así; si no, el canvas queda "contaminado" y no deja exportar */}
        <img
          className={clasesImagen}
          src={url}
          alt=""
          crossOrigin="anonymous"
          draggable={false}
          style={listo ? {
            width: imagen.naturalWidth * escala,
            height: imagen.naturalHeight * escala,
            transform: `translate(-50%, -50%) translate(${centroVisible.x * lado}px, ${centroVisible.y * lado}px)`,
          } : undefined}
          onLoad={(e) => setImagen(e.currentTarget)}
          onError={() => setError(t('recortador.errorCargar'))}
        />
        {/* El círculo: oscurece lo que quedará fuera del avatar */}
        <span className="recortador__guia" aria-hidden="true" />
      </div>

      <div className="recortador__controles">
        <div className="campo">
          <span>{t('recortador.zoom')}</span>
          <div className="recortador__zoom">
            <button
              type="button"
              className="btn-icono"
              aria-label={t('recortador.reducir')}
              disabled={!listo}
              onClick={() => animado(() => cambiarZoom(zoom - PASO_ZOOM))}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h14" />
              </svg>
            </button>
            <input
              type="range"
              aria-label={t('recortador.zoom')}
              min={listo ? zoomMinimo(imagen) : 0}
              max={ZOOM_MAX}
              step="0.01"
              value={zoom}
              disabled={!listo}
              onChange={(e) => cambiarZoom(Number(e.target.value))}
            />
            <button
              type="button"
              className="btn-icono"
              aria-label={t('recortador.ampliar')}
              disabled={!listo}
              onClick={() => animado(() => cambiarZoom(zoom + PASO_ZOOM))}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <small>{t('recortador.ayuda')}</small>
        </div>

        <Mensaje texto={error} />

        <div className="formulario__acciones">
          <button type="button" className="btn btn--secundario" onClick={restablecer} disabled={!listo}>
            {t('recortador.restablecer')}
          </button>
          <button type="button" className="btn btn--secundario" onClick={onVolver}>{etiquetaVolver ?? t('recortador.volver')}</button>
          <button type="button" className="btn btn--primario" onClick={usar} disabled={!listo}>
            {t('recortador.usar')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecortadorFoto
