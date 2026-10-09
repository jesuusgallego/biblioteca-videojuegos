import { useState, useEffect, useRef } from 'react'
import { apiFetch } from './api'
import { ESTADOS } from './estados'
import { useIdioma } from './IdiomaContext'
import Desplegable from './Desplegable'
import Cargando from './Cargando'
import { useVentana } from './useVentana'
import Mensaje from './Mensaje'
import IconoPlataforma from './IconoPlataforma'

// Ventana (centrada en la pantalla) para editar un juego de mi biblioteca, con
// los campos que admite PATCH /games/:id.
//  - juego: la fila del juego en la biblioteca
//  - onActualizar(cambios): función async del padre; lanza un Error si el backend falla
//  - onCerrar(): la cierra (al guardar con éxito, al cancelar, con Esc...)
// Solo existe mientras estoy editando, así que los campos del formulario se
// inician con los datos actuales cada vez que la abro y "Cancelar" descarta todo.
function EditarJuego({ juego, onActualizar, onCerrar }) {
  const { t } = useIdioma()
  const opcionesEstado = ESTADOS.map((valor) => ({ valor, etiqueta: t(`estado.${valor}`) }))
  const dialogRef = useRef(null)
  // Cierre con animación de salida (ver useVentana.js)
  const { saliendo, cerrar, alCancelar } = useVentana(onCerrar)

  // Los campos del formulario son strings: null (vacío en la BD) pasa a ""
  const [status, setStatus] = useState(juego.status)
  const [rating, setRating] = useState(juego.rating ?? "")
  const [platform, setPlatform] = useState(juego.platform ?? "")
  const [review, setReview] = useState(juego.review ?? "")

  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState("")

  // Plataformas en las que sale el juego (según IGDB); null = aún sin recibir
  const [plataformas, setPlataformas] = useState(null)
  const [errorPlataformas, setErrorPlataformas] = useState(false)

  // <dialog> modal nativo, como en la ficha. Dejo el foco en el primer campo
  // en vez de en el botón de cerrar.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    dialog.querySelector('.desplegable__boton')?.focus()
  }, [])

  useEffect(() => {
    let cancelado = false

    apiFetch(`/games/details/${juego.igdb_id}`)
      .then((data) => {
        if (!cancelado) setPlataformas(data.game.platforms)
      })
      // No es grave: el desplegable seguirá mostrando la plataforma actual
      .catch(() => {
        if (!cancelado) setErrorPlataformas(true)
      })

    return () => { cancelado = true }
  }, [juego.igdb_id])

  async function handleGuardar(e) {
    e.preventDefault()
    setOcupado(true)
    setError("")
    try {
      // Un campo vacío lo envío como null: el backend lo borra de la BD
      await onActualizar({
        status,
        rating: rating === "" ? null : Number(rating),
        platform: platform || null,
        review: review.trim() || null,
      })
      cerrar()
    } catch (err) {
      setError(err.message)
      setOcupado(false)
    }
  }

  // Un clic en el fondo oscuro (::backdrop) tiene como objetivo el propio dialog.
  // Mientras guardo no dejo cerrarla, para ver cómo acaba.
  function cerrarSiEsElFondo(e) {
    if (e.target === e.currentTarget && !ocupado) cerrar()
  }

  // Solo se ofrecen las plataformas que IGDB da para este juego. Si el juego ya
  // tiene una que no está en la lista (por ejemplo, "Steam" en los importados, o
  // escrita a mano antes de existir el desplegable), la añado para no perderla
  // al guardar.
  const cargandoPlataformas = !plataformas && !errorPlataformas
  const nombresPlataforma = [...(plataformas ?? [])]
  if (platform && !nombresPlataforma.includes(platform)) {
    nombresPlataforma.unshift(platform)
  }
  const opcionesPlataforma = [
    { valor: "", etiqueta: cargandoPlataformas ? t('editar.cargando') : t('editar.sinEspecificar') },
    ...nombresPlataforma.map((nombre) => ({
      valor: nombre,
      etiqueta: nombre,
      icono: <IconoPlataforma nombre={nombre} tamano={16} decorativo />,
    })),
  ]

  return (
    <dialog
      ref={dialogRef}
      className={saliendo ? "editar ventana--saliendo" : "editar"}
      aria-labelledby="editar-titulo"
      onClose={onCerrar}
      // Esc nunca cierra de golpe; y mientras guardo no cierra en absoluto
      onCancel={(e) => { if (ocupado) e.preventDefault(); else alCancelar(e) }}
      onMouseDown={cerrarSiEsElFondo}
    >
      <button
        type="button"
        className="btn-icono editar__cerrar"
        onClick={() => cerrar()}
        disabled={ocupado}
        aria-label={t('comun.cerrar')}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div className="editar__cabecera">
        <div className="editar__portada">
          {juego.cover_url
            ? <img src={juego.cover_url} alt="" />
            : <span className="portada__vacia">{t('comun.sinPortada')}</span>}
        </div>
        <div>
          <p className="editar__etiqueta">{t('editar.etiqueta')}</p>
          <h2 id="editar-titulo" className="editar__titulo">{juego.name}</h2>
        </div>
      </div>

      <form className="formulario formulario--edicion" onSubmit={handleGuardar}>
        <label className="campo">
          <span>{t('editar.estado')}</span>
          <Desplegable opciones={opcionesEstado} valor={status} onChange={setStatus} />
        </label>
        <label className="campo">
          <span>{t('editar.nota')}</span>
          <input
            type="number"
            min="1"
            max="10"
            step="1"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
        </label>
        <label className="campo">
          <span>{t('editar.plataforma')}</span>
          <Desplegable
            opciones={opcionesPlataforma}
            valor={platform}
            onChange={setPlatform}
            disabled={cargandoPlataformas}
            cargando={cargandoPlataformas}
          />
          {errorPlataformas && (
            <small>{t('editar.errorPlataformas')}</small>
          )}
        </label>
        <label className="campo campo--ancho">
          <span>{t('editar.resena')}</span>
          <textarea value={review} onChange={(e) => setReview(e.target.value)} />
        </label>

        <Mensaje texto={error} className="campo--ancho" />

        <div className="editar__acciones campo--ancho">
          <button type="button" className="btn btn--secundario" onClick={() => cerrar()} disabled={ocupado}>
            {t('comun.cancelar')}
          </button>
          <button type="submit" className="btn btn--primario" disabled={ocupado}>
            {ocupado
              ? <><Cargando tamano="pequeno" /> {t('comun.guardando')}</>
              : t('editar.guardar')}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default EditarJuego
