import { useState } from 'react'

// Botón "Añadir a mi biblioteca" con sus estados. Lo usan la tarjeta de la
// búsqueda (GameCard) y la ficha del juego (DetalleJuego), así el
// comportamiento es idéntico en los dos sitios.
//
// onAnadir es una función async que pasa el padre: guarda el juego en el
// backend y lanza un Error si algo falla. Este componente solo se ocupa de
// mostrar el estado del botón: "idle" (por defecto), "guardando", "anadido" o
// "error". yaGuardado lo calcula el padre (el juego ya estaba en la biblioteca).
// Se combina con el estado propio en vez de copiarlo al useState, porque la
// lista de guardados puede llegar después de pintar el botón.
function BotonAnadir({ yaGuardado, onAnadir, bloque = true }) {
  const [estadoPropio, setEstado] = useState("idle")
  const [mensaje, setMensaje] = useState("")

  const estado = yaGuardado ? "anadido" : estadoPropio

  async function handleAnadir() {
    setEstado("guardando")
    setMensaje("")
    try {
      await onAnadir()
      setEstado("anadido")
    } catch (err) {
      // 409 = el backend dice que ya lo tienes: no es un fallo, el juego está
      if (err.status === 409) {
        setEstado("anadido")
        return
      }
      setEstado("error")
      setMensaje(err.message)
    }
  }

  const variante = estado === "anadido" ? "btn btn--ok" : "btn btn--primario"

  return (
    <>
      <button
        type="button"
        className={bloque ? `${variante} btn--block` : variante}
        onClick={handleAnadir}
        disabled={estado === "guardando" || estado === "anadido"}
      >
        {estado === "guardando" && "Guardando..."}
        {estado === "anadido" && "✓ En tu biblioteca"}
        {(estado === "idle" || estado === "error") && "Añadir a mi biblioteca"}
      </button>

      {estado === "error" && (
        <p className="mensaje mensaje--error" role="alert">{mensaje}</p>
      )}
    </>
  )
}

export default BotonAnadir
