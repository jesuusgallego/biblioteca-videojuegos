import { useState } from 'react'
import { ETIQUETAS_ESTADO } from './estados'
import DialogoConfirmar from './DialogoConfirmar'
import EditarJuego from './EditarJuego'
import Mensaje from './Mensaje'

// Tarjeta de un juego que ya está en mi biblioteca. "Editar" abre la ventana
// EditarJuego y "Quitar" pide confirmación antes de borrar. onActualizar y
// onBorrar son funciones async del padre que lanzan un Error si el backend falla.

function JuegoGuardado({ juego, onActualizar, onBorrar, onVerDetalle }) {
  const [editando, setEditando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState("")
  // true mientras se enseña la ventana de "¿Quitar este juego?"
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false)

  async function handleBorrar() {
    setConfirmandoBorrar(false)
    setOcupado(true)
    setError("")
    try {
      await onBorrar()
      // La tarjeta desaparece sola al quitarse el juego de la lista del padre
    } catch (err) {
      setError(err.message)
      setOcupado(false)
    }
  }

  return (
    <li className="tarjeta">
      <div className="portada">
        <button
          type="button"
          className="boton-portada boton-portada--llena"
          onClick={onVerDetalle}
          aria-label={`Ver detalles de ${juego.name}`}
        >
          {juego.cover_url
            ? <img src={juego.cover_url} alt="" loading="lazy" />
            : <span className="portada__vacia">Sin portada</span>}
        </button>
        {juego.rating && <span className="nota">★ {juego.rating}</span>}
      </div>

      <div className="tarjeta__cuerpo">
        <h3 className="tarjeta__titulo">
          <button type="button" className="enlace-titulo" onClick={onVerDetalle}>{juego.name}</button>
        </h3>

        {juego.platform && <p className="tarjeta__meta">{juego.platform}</p>}
        {juego.review && <p className="tarjeta__resena">{juego.review}</p>}

        <Mensaje texto={error} />

        {/* El estado y los botones van siempre juntos y abajo del todo, así el chip
            queda en el mismo sitio en todas las tarjetas */}
        <div className="tarjeta__pie">
          <span className={`chip chip--${juego.status}`}>
            {ETIQUETAS_ESTADO[juego.status] ?? juego.status}
          </span>

          <div className="tarjeta__acciones">
            <button className="btn btn--secundario" onClick={() => setEditando(true)} disabled={ocupado}>
              Editar
            </button>
            <button className="btn btn--peligro" onClick={() => setConfirmandoBorrar(true)} disabled={ocupado}>
              Quitar
            </button>
          </div>
        </div>
      </div>

      {editando && (
        <EditarJuego
          juego={juego}
          onActualizar={onActualizar}
          onCerrar={() => setEditando(false)}
        />
      )}

      {confirmandoBorrar && (
        <DialogoConfirmar
          titulo="Quitar juego"
          mensaje={`¿Quitar "${juego.name}" de tu biblioteca? Se perderán su estado, nota y reseña.`}
          textoConfirmar="Quitar"
          onConfirmar={handleBorrar}
          onCancelar={() => setConfirmandoBorrar(false)}
        />
      )}
    </li>
  )
}

export default JuegoGuardado
