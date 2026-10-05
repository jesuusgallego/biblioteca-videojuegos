import { useState } from 'react'

// onAnadir es una función async que pasa el padre: guarda el juego en el
// backend y lanza un Error si algo falla. La tarjeta solo se ocupa de mostrar
// el estado del botón: "idle" (por defecto), "guardando", "anadido" o "error".
// yaGuardado lo calcula el padre (el juego ya estaba en la biblioteca al cargar
// la página). Se combina con el estado propio en vez de copiarlo al useState,
// porque la lista de guardados puede llegar después de pintar la tarjeta.
function GameCard({ nombre, portada, yaGuardado, onAnadir }) {
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

  return (
    <li>
      {portada && <img src={portada} alt={nombre} width="80" />}
      <span>{nombre}</span>

      <button
        onClick={handleAnadir}
        disabled={estado === "guardando" || estado === "anadido"}
      >
        {estado === "guardando" && "Guardando..."}
        {estado === "anadido" && "✓ En tu biblioteca"}
        {(estado === "idle" || estado === "error") && "Añadir a mi biblioteca"}
      </button>

      {estado === "error" && <span> {mensaje}</span>}
    </li>
  )
}

export default GameCard
