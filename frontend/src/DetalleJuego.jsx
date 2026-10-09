import { useState, useEffect, useRef } from 'react'
import { apiFetch } from './api'
import { useIdioma } from './IdiomaContext'
import BotonAnadir from './BotonAnadir'
import VisorCapturas from './VisorCapturas'
import Cargando from './Cargando'
import { useVentana } from './useVentana'
import Mensaje from './Mensaje'
import ProgresoSteam from './ProgresoSteam'

// "2015-05-19" -> "19 de mayo de 2015" (o "19 May 2015", según el idioma). Con
// timeZone UTC evito que, según la zona horaria del usuario, la fecha salga un
// día antes.
function formatearFecha(iso, locale) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Una fila "Etiqueta: valor, valor". Si no hay datos no pinto nada, así no quedan
// filas vacías.
function Fila({ etiqueta, valores }) {
  if (!valores || valores.length === 0) return null

  return (
    <div className="detalle__fila">
      <dt>{etiqueta}</dt>
      <dd>{valores.join(', ')}</dd>
    </div>
  )
}

// Ventana con la ficha de un juego. "juego" trae lo que ya sé sin pedir nada
// (igdb_id, name, cover_url) para enseñarlo al instante mientras llega el resto
// desde GET /games/details/:igdbId.
//  - guardado: la fila del juego en mi biblioteca (o undefined si no lo tengo).
//    Si existe, enseño su estado, nota, plataforma y reseña.
//  - onAnadir: si se pasa, la ficha muestra el botón "Añadir a mi biblioteca"
//    (lo usa la búsqueda; en Mi biblioteca el juego ya está guardado).
function DetalleJuego({ juego, guardado, onAnadir, onCerrar }) {
  const { t, idioma, locale } = useIdioma()
  const dialogRef = useRef(null)
  // Cierre con animación de salida (ver useVentana.js)
  const { saliendo, cerrar, alCancelar } = useVentana(onCerrar)
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState("")
  // Índice de la captura que se ve en grande, o null si el visor está cerrado
  const [capturaAbierta, setCapturaAbierta] = useState(null)

  // <dialog> es la ventana modal nativa del navegador: showModal() la abre encima
  // de todo, oscurece el fondo, atrapa el foco y la cierra con Esc, sin librerías.
  // Compruebo "open" para evitar un error si React ejecuta este efecto dos veces
  // (modo estricto en desarrollo).
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    let cancelado = false

    // lang: el backend traduce la descripción al idioma de la interfaz (IGDB solo
    // la da en inglés). Si cambio de idioma con la ficha abierta se vuelve a pedir.
    apiFetch(`/games/details/${juego.igdb_id}?lang=${idioma}`)
      .then((data) => {
        if (!cancelado) setDatos(data.game)
      })
      .catch((err) => {
        if (!cancelado) setError(err.message)
      })

    // Si se cierra la ventana antes de que llegue la respuesta, la ignoro
    return () => { cancelado = true }
  }, [juego.igdb_id, idioma])

  // El fondo oscuro (::backdrop) cuenta como parte del <dialog>: un clic ahí tiene
  // como objetivo el propio dialog, no su contenido. Uso mousedown y no click para
  // que seleccionar texto y soltar fuera no cierre la ventana sin querer.
  function cerrarSiEsElFondo(e) {
    if (e.target === e.currentTarget) cerrar()
  }

  const portada = datos?.cover_url ?? juego.cover_url
  const cargando = !datos && !error

  return (
    <dialog
      ref={dialogRef}
      className={saliendo ? "detalle ventana--saliendo" : "detalle"}
      aria-labelledby="detalle-titulo"
      onClose={onCerrar}
      onCancel={alCancelar}
      onMouseDown={cerrarSiEsElFondo}
    >
      <button
        type="button"
        className="btn-icono detalle__cerrar"
        onClick={() => cerrar()}
        aria-label={t('comun.cerrar')}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div className="detalle__cabecera">
        <div className="detalle__portada">
          {portada
            ? <img src={portada} alt="" />
            : <span className="portada__vacia">{t('comun.sinPortada')}</span>}
        </div>

        <div className="detalle__info">
          <h2 id="detalle-titulo" className="detalle__titulo">{juego.name}</h2>

          {onAnadir && (
            <div className="detalle__anadir">
              <BotonAnadir yaGuardado={Boolean(guardado)} onAnadir={onAnadir} bloque={false} />
            </div>
          )}

          {cargando && <Cargando texto={t('detalle.cargando')} />}

          <Mensaje texto={error} />

          {datos && (
            <>
              {datos.rating !== null && (
                <p className="detalle__nota">
                  <span className="contador">IGDB {datos.rating}</span>
                  <span className="estado">{t('detalle.valoraciones', { n: datos.rating_count })}</span>
                </p>
              )}

              <dl className="detalle__datos">
                {datos.release_date && (
                  <div className="detalle__fila">
                    <dt>{t('detalle.lanzamiento')}</dt>
                    <dd>{formatearFecha(datos.release_date, locale)}</dd>
                  </div>
                )}
                <Fila etiqueta={t('detalle.desarrolladora')} valores={datos.developers} />
                <Fila etiqueta={t('detalle.publisher')} valores={datos.publishers} />
                <Fila etiqueta={t('detalle.generos')} valores={datos.genres} />
                <Fila etiqueta={t('detalle.modos')} valores={datos.game_modes} />
                <Fila etiqueta={t('detalle.plataformas')} valores={datos.platforms} />
              </dl>
            </>
          )}
        </div>
      </div>

      {guardado && (
        <section className="detalle__biblioteca" aria-labelledby="detalle-mi-biblioteca">
          <h3 id="detalle-mi-biblioteca" className="titulo-seccion">{t('detalle.enBiblioteca')}</h3>

          <div className="detalle__biblioteca-datos">
            <span className={`chip chip--${guardado.status}`}>
              {t(`estado.${guardado.status}`)}
            </span>
            {guardado.rating && <span className="contador">★ {guardado.rating}/10</span>}
            {guardado.platform && <span className="tarjeta__meta">{guardado.platform}</span>}
          </div>

          {guardado.playtime_minutes !== null && (
            <div className="detalle__steam">
              <h4 className="detalle__subtitulo">{t('progreso.titulo')}</h4>
              <ProgresoSteam juego={guardado} grande />
            </div>
          )}

          {guardado.review
            ? <p className="detalle__texto">{guardado.review}</p>
            : <p className="estado">{t('detalle.sinResena')}</p>}
        </section>
      )}

      {datos?.summary && (
        <section className="detalle__seccion">
          <h3 className="titulo-seccion">{t('detalle.descripcion')}</h3>
          <p className="detalle__texto">{datos.summary}</p>
          <small className="estado">
            {/* summary_lang es el idioma en que llegó el texto: "en" = el original */}
            {datos.summary_lang === "en"
              ? t('detalle.descripcionOriginal')
              : t('detalle.descripcionTraducida')}
          </small>
        </section>
      )}

      {datos?.screenshots.length > 0 && (
        <section className="detalle__seccion">
          <h3 className="titulo-seccion">{t('detalle.capturas')}</h3>
          <ul className="detalle__capturas">
            {datos.screenshots.map((url, i) => (
              <li key={url}>
                <button
                  type="button"
                  className="detalle__captura"
                  onClick={() => setCapturaAbierta(i)}
                  aria-label={t('detalle.ampliarCaptura', { n: i + 1 })}
                >
                  <img src={url} alt="" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {datos?.igdb_url && (
        <p className="detalle__pie">
          <a href={datos.igdb_url} target="_blank" rel="noreferrer">{t('detalle.verIgdb')}</a>
        </p>
      )}

      {capturaAbierta !== null && (
        <VisorCapturas
          urls={datos.screenshots}
          indice={capturaAbierta}
          onCambiar={setCapturaAbierta}
          onCerrar={() => setCapturaAbierta(null)}
        />
      )}
    </dialog>
  )
}

export default DetalleJuego
