import { useState } from 'react'

// Tarjeta de un juego que ya está en la biblioteca del usuario. Tiene dos
// modos: lectura (por defecto) y edición (formulario con los campos que admite
// PATCH /games/:id). onActualizar y onBorrar son funciones async del padre que
// lanzan un Error si el backend falla.
const ETIQUETAS_ESTADO = {
  jugando: "Jugando",
  completado: "Completado",
  abandonado: "Abandonado",
  pendiente: "Pendiente",
}

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

  if (editando) {
    return (
      <li>
        <strong>{juego.name}</strong>
        <form onSubmit={handleGuardar}>
          <label>
            Estado{" "}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(ETIQUETAS_ESTADO).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>{etiqueta}</option>
              ))}
            </select>
          </label>
          <label>
            Nota (1-10){" "}
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </label>
          <label>
            Plataforma{" "}
            <input
              type="text"
              maxLength="100"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
          </label>
          <label>
            Reseña{" "}
            <textarea value={review} onChange={(e) => setReview(e.target.value)} />
          </label>

          <button type="submit" disabled={ocupado}>
            {ocupado ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" onClick={() => setEditando(false)} disabled={ocupado}>
            Cancelar
          </button>

          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      </li>
    )
  }

  return (
    <li>
      {juego.cover_url && <img src={juego.cover_url} alt={juego.name} width="80" />}
      <span>{juego.name}</span>
      <span> — {ETIQUETAS_ESTADO[juego.status] ?? juego.status}</span>
      {juego.rating && <span> — {juego.rating}/10</span>}
      {juego.platform && <span> — {juego.platform}</span>}
      {juego.review && <p>{juego.review}</p>}

      <button onClick={empezarEdicion} disabled={ocupado}>Editar</button>
      <button onClick={handleBorrar} disabled={ocupado}>Quitar</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </li>
  )
}

export default JuegoGuardado
