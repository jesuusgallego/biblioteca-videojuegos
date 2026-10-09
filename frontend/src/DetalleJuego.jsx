import { useState, useEffect, useRef } from 'react'
import { apiFetch } from './api'
import { ETIQUETAS_ESTADO } from './estados'
import BotonAnadir from './BotonAnadir'
import VisorCapturas from './VisorCapturas'
import Cargando from './Cargando'
import { useVentana } from './useVentana'
import Mensaje from './Mensaje'

// "2015-05-19" -> "19 de mayo de 2015". Con timeZone UTC evito que, según la zona
// horaria del usuario, la fecha salga un día antes.
function formatearFecha(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', {
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

    // lang=es: el backend traduce la descripción (IGDB solo la da en inglés)
    apiFetch(`/games/details/${juego.igdb_id}?lang=es`)
      .then((data) => {
        if (!cancelado) setDatos(data.game)
      })
      .catch((err) => {
        if (!cancelado) setError(err.message)
      })

    // Si se cierra la ventana antes de que llegue la respuesta, la ignoro
    return () => { cancelado = true }
  }, [juego.igdb_id])

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
        aria-label="Cerrar"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div className="detalle__cabecera">
        <div className="detalle__portada">
          {portada
            ? <img src={portada} alt="" />
            : <span className="portada__vacia">Sin portada</span>}
        </div>

        <div className="detalle__info">
          <h2 id="detalle-titulo" className="detalle__titulo">{juego.name}</h2>

          {onAnadir && (
            <div className="detalle__anadir">
              <BotonAnadir yaGuardado={Boolean(guardado)} onAnadir={onAnadir} bloque={false} />
            </div>
          )}

          {cargando && <Cargando texto="Cargando información..." />}

          <Mensaje texto={error} />

          {datos && (
            <>
              {datos.rating !== null && (
                <p className="detalle__nota">
                  <span className="contador">IGDB {datos.rating}</span>
                  <span className="estado">{datos.rating_count} valoraciones</span>
                </p>
              )}

              <dl className="detalle__datos">
                {datos.release_date && (
                  <div className="detalle__fila">
                    <dt>Lanzamiento</dt>
                    <dd>{formatearFecha(datos.release_date)}</dd>
                  </div>
                )}
                <Fila etiqueta="Desarrolladora" valores={datos.developers} />
                <Fila etiqueta="Publisher" valores={datos.publishers} />
                <Fila etiqueta="Géneros" valores={datos.genres} />
                <Fila etiqueta="Modos de juego" valores={datos.game_modes} />
                <Fila etiqueta="Plataformas" valores={datos.platforms} />
              </dl>
            </>
          )}
        </div>
      </div>

      {guardado && (
        <section className="detalle__biblioteca" aria-labelledby="detalle-mi-biblioteca">
          <h3 id="detalle-mi-biblioteca" className="titulo-seccion">En tu biblioteca</h3>

          <div className="detalle__biblioteca-datos">
            <span className={`chip chip--${guardado.status}`}>
              {ETIQUETAS_ESTADO[guardado.status] ?? guardado.status}
            </span>
            {guardado.rating && <span className="contador">★ {guardado.rating}/10</span>}
            {guardado.platform && <span className="tarjeta__meta">{guardado.platform}</span>}
          </div>

          {guardado.review
            ? <p className="detalle__texto">{guardado.review}</p>
            : <p className="estado">Todavía no has escrito ninguna reseña.</p>}
        </section>
      )}

      {datos?.summary && (
        <section className="detalle__seccion">
          <h3 className="titulo-seccion">Descripción</h3>
          <p className="detalle__texto">{datos.summary}</p>
          <small className="estado">
            {datos.summary_lang === "es"
              ? "Traducida automáticamente del inglés. Descripción original de IGDB."
              : "Descripción original de IGDB, en inglés."}
          </small>
        </section>
      )}

      {datos?.screenshots.length > 0 && (
        <section className="detalle__seccion">
          <h3 className="titulo-seccion">Capturas</h3>
          <ul className="detalle__capturas">
            {datos.screenshots.map((url, i) => (
              <li key={url}>
                <button
                  type="button"
                  className="detalle__captura"
                  onClick={() => setCapturaAbierta(i)}
                  aria-label={`Ampliar captura ${i + 1}`}
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
          <a href={datos.igdb_url} target="_blank" rel="noreferrer">Ver en IGDB</a>
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
