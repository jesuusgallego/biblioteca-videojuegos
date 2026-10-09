import { useEffect, useRef } from 'react'
import { useVentana } from './useVentana'
import { useIdioma } from './IdiomaContext'

// Ventana de confirmación para acciones que no se pueden deshacer. Sustituye a
// window.confirm, que sale con el aspecto del navegador y no se puede estilar.
//  - titulo / mensaje: lo que se le pregunta al usuario
//  - textoConfirmar: lo que pone el botón rojo (por ejemplo "Quitar")
//  - onConfirmar() / onCancelar(): los gestiona quien la abre
function DialogoConfirmar({ titulo, mensaje, textoConfirmar, onConfirmar, onCancelar }) {
  const { t } = useIdioma()
  const dialogRef = useRef(null)
  const cancelarRef = useRef(null)
  // Cierre con animación de salida (ver useVentana.js). Cancelar, Esc y el fondo
  // llaman a onCancelar; Confirmar llama a onConfirmar, las dos al terminar la animación.
  const { saliendo, cerrar, alCancelar } = useVentana(onCancelar)

  // Igual que la ficha: <dialog> modal nativo (Esc y foco atrapado incluidos).
  // Doy el foco a "Cancelar" y no al botón rojo, para que un Enter sin pensar
  // no borre nada.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    cancelarRef.current.focus()
  }, [])

  // Un clic en el fondo oscuro (::backdrop) tiene como objetivo el propio dialog
  function cancelarSiEsElFondo(e) {
    if (e.target === e.currentTarget) cerrar()
  }

  return (
    <dialog
      ref={dialogRef}
      className={saliendo ? "dialogo ventana--saliendo" : "dialogo"}
      aria-labelledby="dialogo-titulo"
      aria-describedby="dialogo-mensaje"
      onClose={onCancelar}
      onCancel={alCancelar}
      onMouseDown={cancelarSiEsElFondo}
    >
      <h2 id="dialogo-titulo" className="dialogo__titulo">{titulo}</h2>
      <p id="dialogo-mensaje" className="dialogo__mensaje">{mensaje}</p>

      <div className="dialogo__acciones">
        <button ref={cancelarRef} type="button" className="btn btn--secundario" onClick={() => cerrar()}>
          {t('comun.cancelar')}
        </button>
        <button type="button" className="btn btn--peligro-solido" onClick={() => cerrar(onConfirmar)}>
          {textoConfirmar}
        </button>
      </div>
    </dialog>
  )
}

export default DialogoConfirmar
