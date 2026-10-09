import { useState } from 'react'

// Estado de las dos acciones sobre un juego guardado: editarlo (ventana EditarJuego)
// y quitarlo de la biblioteca (ventana de confirmación). Lo comparten quienes las
// ofrecen: la tarjeta (con el clic derecho), "Jugando ahora" y la ficha. Cada uno
// pinta las ventanas con <VentanasJuego acciones={...} />.
//  - onBorrar(): función async de quien lo usa que borra el juego; si lanza un
//    Error, el mensaje queda en `error` para que lo enseñe
// Devuelve:
//  - editando / confirmandoBorrar: qué ventana está abierta
//  - borrando: true mientras se borra (para desactivar los controles). Si sale bien
//    se queda a true: la tarjeta desaparece sola al salir el juego de la lista.
//  - error: lo que ha fallado al borrar ("" si nada)
//  - editar() / quitar(): abren cada ventana
//  - cerrarEdicion() / cancelarBorrado() / confirmarBorrado(): los cierres
export function useAccionesJuego(onBorrar) {
  const [editando, setEditando] = useState(false)
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState("")

  async function confirmarBorrado() {
    setConfirmandoBorrar(false)
    setBorrando(true)
    setError("")
    try {
      await onBorrar()
    } catch (err) {
      setError(err.message)
      setBorrando(false)
    }
  }

  return {
    editando,
    confirmandoBorrar,
    borrando,
    error,
    editar: () => setEditando(true),
    quitar: () => setConfirmandoBorrar(true),
    cerrarEdicion: () => setEditando(false),
    cancelarBorrado: () => setConfirmandoBorrar(false),
    confirmarBorrado,
  }
}
