import { useState, useEffect, useRef } from 'react'
import Cargando from './Cargando'
import { useVentana } from './useVentana'
import { useIdioma } from './IdiomaContext'

// El backend manda las capturas en tamaño medio (t_screenshot_big, 889x500), pensado
// para la rejilla. Para verlas grandes pido a IGDB la misma imagen en 1080p
// cambiando solo el nombre de la plantilla en la URL.
function ampliar(url) {
  return url.replace('/t_screenshot_big/', '/t_1080p/')
}

// Visor a pantalla completa de las capturas de un juego.
//  - urls: todas las capturas (para poder pasar de una a otra)
//  - indice: cuál se está viendo
//  - onCambiar(nuevoIndice) / onCerrar(): los gestiona quien lo abre
function VisorCapturas({ urls, indice, onCambiar, onCerrar }) {
  const { t } = useIdioma()
  const dialogRef = useRef(null)
  // Cierre con animación de salida (ver useVentana.js)
  const { saliendo, cerrar, alCancelar } = useVentana(onCerrar)
  // URL de la última imagen que ha terminado de cargar. Si no coincide con la que
  // toca ver, todavía estoy cargando (así se reinicia sola al cambiar de captura).
  const [urlCargada, setUrlCargada] = useState(null)

  // Igual que la ficha, un <dialog> modal nativo. Al abrirse encima de otro modal,
  // Esc cierra solo el de arriba (este) y no la ficha.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
  }, [])

  const hayVarias = urls.length > 1
  const urlActual = ampliar(urls[indice])
  const cargada = urlCargada === urlActual

  // Uso el módulo para que tras la última se vuelva a la primera y viceversa
  function mover(paso) {
    onCambiar((indice + paso + urls.length) % urls.length)
  }

  function alPulsarTecla(e) {
    if (!hayVarias) return
    if (e.key === 'ArrowLeft') mover(-1)
    if (e.key === 'ArrowRight') mover(1)
  }

  // Un clic en el fondo oscuro (::backdrop) tiene como objetivo el propio dialog
  function cerrarSiEsElFondo(e) {
    if (e.target === e.currentTarget) cerrar()
  }

  return (
    <dialog
      ref={dialogRef}
      className={saliendo ? "visor ventana--saliendo" : "visor"}
      aria-label={t('visor.captura', { n: indice + 1, total: urls.length })}
      onClose={onCerrar}
      onCancel={alCancelar}
      onMouseDown={cerrarSiEsElFondo}
      onKeyDown={alPulsarTecla}
    >
      {/* El marco tiene desde el principio el tamaño final (16:9): así el diálogo no
          se encoge mientras llega la imagen y los botones no se descolocan */}
      <div className="visor__marco">
        {!cargada && (
          <div className="visor__cargando">
            <Cargando tamano="grande" />
          </div>
        )}
        <img
          className={cargada ? "visor__imagen visor__imagen--lista" : "visor__imagen"}
          src={urlActual}
          alt=""
          onLoad={() => setUrlCargada(urlActual)}
          onError={() => setUrlCargada(urlActual)} // si falla no dejo el indicador para siempre
        />
      </div>

      <button
        type="button"
        className="btn-icono visor__boton visor__cerrar"
        onClick={() => cerrar()}
        aria-label={t('comun.cerrar')}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      {hayVarias && (
        <>
          <button
            type="button"
            className="btn-icono visor__boton visor__anterior"
            onClick={() => mover(-1)}
            aria-label={t('visor.anterior')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>

          <button
            type="button"
            className="btn-icono visor__boton visor__siguiente"
            onClick={() => mover(1)}
            aria-label={t('visor.siguiente')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <span className="visor__contador contador">{indice + 1} / {urls.length}</span>
        </>
      )}
    </dialog>
  )
}

export default VisorCapturas
