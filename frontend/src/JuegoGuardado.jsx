import { useState } from 'react'
import { ETIQUETAS_ESTADO } from './estados'

// Tarjeta de un juego que ya está en la biblioteca del usuario. Tiene dos
// modos: lectura (por defecto) y edición (formulario con los campos que admite
// PATCH /games/:id). onActualizar y onBorrar son funciones async del padre que
// lanzan un Error si el backend falla.

function JuegoGuardado({ juego, onActualizar, onBorrar }) {
  const [editando, setEditando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState("")

  // Los campos del formulario son strings; null (vacío en la BD) pasa a ""
  const [status, setStatus] = useState(juego.status)
  const [rating, setRating] = useState(juego.rating ?? "")
  const [platform, setPlatform] = useState(juego.platform ?? "")
  const [review, setReview] = useState(juego.review ?? "")

  function empezarEdicion() {
    // Partimos siempre de los datos actuales: así "Cancelar" descarta los cambios
    setStatus(juego.status)
    setRating(juego.rating ?? "")
    setPlatform(juego.platform ?? "")
    setReview(juego.review ?? "")
    setError("")
    setEditando(true)
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setOcupado(true)
    setError("")
    try {
      // Un campo vacío se envía como null: el backend lo borra de la BD
      await onActualizar({
        status,
        rating: rating === "" ? null : Number(rating),
        platform: platform.trim() || null,
        review: review.trim() || null,
      })
      setEditando(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }

  async function handleBorrar() {
    if (!window.confirm(`¿Quitar "${juego.name}" de tu biblioteca?`)) return

    setOcupado(true)
    setError("")
    try {
      await onBorrar()
      // La tarjeta desaparece al quitarse de la lista del padre
    } catch (err) {
      setError(err.message)
      setOcupado(false)
    }
  }

  const portada = (
    <div className="portada">
      {juego.cover_url
        ? <img src={juego.cover_url} alt={juego.name} loading="lazy" />
        : <span className="portada__vacia">Sin portada</span>}
      {!editando && juego.rating && <span className="nota">★ {juego.rating}</span>}
    </div>
  )

  if (editando) {
    return (
      <li className="tarjeta tarjeta--editando">
        {portada}

        <div className="tarjeta__cuerpo">
          <h3 className="tarjeta__titulo">{juego.name}</h3>

          <form className="formulario formulario--edicion" onSubmit={handleGuardar}>
            <label className="campo">
              <span>Estado</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(ETIQUETAS_ESTADO).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>{etiqueta}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Nota (1-10)</span>
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
              <span>Plataforma</span>
              <input
                type="text"
                maxLength="100"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              />
            </label>
            <label className="campo campo--ancho">
              <span>Reseña</span>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} />
            </label>

            {error && (
              <p className="mensaje mensaje--error campo--ancho" role="alert">{error}</p>
            )}

            <div className="tarjeta__acciones campo--ancho">
              <button type="submit" className="btn btn--primario" disabled={ocupado}>
                {ocupado ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                className="btn btn--secundario"
                onClick={() => setEditando(false)}
                disabled={ocupado}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </li>
    )
  }

  return (
    <li className="tarjeta">
      {portada}

      <div className="tarjeta__cuerpo">
        <h3 className="tarjeta__titulo">{juego.name}</h3>

        <span className={`chip chip--${juego.status}`}>
          {ETIQUETAS_ESTADO[juego.status] ?? juego.status}
        </span>

        {juego.platform && <p className="tarjeta__meta">{juego.platform}</p>}
        {juego.review && <p className="tarjeta__resena">{juego.review}</p>}

        {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}

        <div className="tarjeta__acciones">
          <button className="btn btn--secundario" onClick={empezarEdicion} disabled={ocupado}>
            Editar
          </button>
          <button className="btn btn--peligro" onClick={handleBorrar} disabled={ocupado}>
            Quitar
          </button>
        </div>
      </div>
    </li>
  )
}

export default JuegoGuardado
