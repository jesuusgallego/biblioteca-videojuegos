import { useState } from 'react'
import { ESTADOS } from './estados'
import { useIdioma } from './IdiomaContext'
import DialogoConfirmar from './DialogoConfirmar'
import EditarJuego from './EditarJuego'
import Mensaje from './Mensaje'
import Desplegable from './Desplegable'
import IconoResena from './IconoResena'

// Tarjeta de un juego que ya está en mi biblioteca. "Editar" abre la ventana
// EditarJuego y "Quitar" pide confirmación antes de borrar. onActualizar y
// onBorrar son funciones async del padre que lanzan un Error si el backend falla.
// El chip de estado es un desplegable: cambiar el estado guarda al momento, sin
// pasar por la ventana de edición.
// Toda la tarjeta es clicable, pero solo hay UN botón de verdad (el del título):
// su ::after (ver App.css) se estira por toda la tarjeta. Los controles de dentro
// (estado, Editar, Quitar) van por encima con z-index, así no anido botones.

function JuegoGuardado({ juego, onActualizar, onBorrar, onVerDetalle }) {
  const { t } = useIdioma()
  const opcionesEstado = ESTADOS.map((valor) => ({ valor, etiqueta: t(`estado.${valor}`), punto: valor }))
  const [editando, setEditando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState("")
  // true mientras se enseña la ventana de "¿Quitar este juego?"
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false)
  // Estado elegido en el chip mientras se guarda (null = no hay cambio en curso).
  // Lo enseño ya en el chip y, si el backend falla, vuelvo al que tenía.
  const [estadoPendiente, setEstadoPendiente] = useState(null)

  async function handleCambiarEstado(status) {
    if (status === juego.status) return
    setEstadoPendiente(status)
    setError("")
    try {
      await onActualizar({ status })
    } catch (err) {
      setError(err.message)
    } finally {
      setEstadoPendiente(null)
    }
  }

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
        {/* La portada no lleva foco propio: el botón del título ya abre la ficha */}
        <button
          type="button"
          className="boton-portada boton-portada--llena"
          onClick={onVerDetalle}
          tabIndex={-1}
          aria-hidden="true"
        >
          {juego.cover_url
            ? <img src={juego.cover_url} alt="" loading="lazy" />
            : <span className="portada__vacia">{t('comun.sinPortada')}</span>}
        </button>
        {juego.rating && <span className="nota">★ {juego.rating}</span>}
      </div>

      <div className="tarjeta__cuerpo">
        <h3 className="tarjeta__titulo">
          <button type="button" className="enlace-titulo" onClick={onVerDetalle}>{juego.name}</button>
        </h3>

        {juego.platform && <p className="tarjeta__meta">{juego.platform}</p>}

        <Mensaje texto={error} />

        {/* El estado y los botones van siempre juntos y abajo del todo, así el chip
            queda en el mismo sitio en todas las tarjetas */}
        <div className="tarjeta__pie">
          <div className="tarjeta__estado">
            <Desplegable
              variante="chip"
              etiqueta={t('juego.estadoDe', { nombre: juego.name })}
              opciones={opcionesEstado}
              valor={estadoPendiente ?? juego.status}
              onChange={handleCambiarEstado}
              disabled={ocupado}
              cargando={estadoPendiente !== null}
            />

            {juego.review && <IconoResena />}
          </div>

          <div className="tarjeta__acciones">
            <button className="btn btn--secundario" onClick={() => setEditando(true)} disabled={ocupado}>
              {t('juego.editar')}
            </button>
            <button className="btn btn--peligro" onClick={() => setConfirmandoBorrar(true)} disabled={ocupado}>
              {t('juego.quitar')}
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
          titulo={t('juego.quitarTitulo')}
          mensaje={t('juego.quitarMensaje', { nombre: juego.name })}
          textoConfirmar={t('juego.quitar')}
          onConfirmar={handleBorrar}
          onCancelar={() => setConfirmandoBorrar(false)}
        />
      )}
    </li>
  )
}

export default JuegoGuardado
