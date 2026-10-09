import { useState } from 'react'
import Cargando from './Cargando'
import Mensaje from './Mensaje'

// Botón "Añadir a mi biblioteca" con sus estados. Lo uso en la tarjeta de la
// búsqueda (GameCard) y en la ficha (DetalleJuego) para que se comporte igual
// en los dos sitios.
//
// onAnadir es una función async del padre: guarda el juego en el backend y lanza
// un Error si falla. Aquí solo me ocupo de mostrar el estado del botón: "idle",
// "guardando", "anadido" o "error".
// yaGuardado lo calcula el padre y lo combino con el estado propio en vez de
// copiarlo al useState, porque la lista de guardados puede llegar después de
// pintar el botón.
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
      // Un 409 significa que ya lo tenía: no es un fallo, lo marco como añadido
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
        {estado === "guardando" && (
          <>
            <Cargando tamano="pequeno" />
            Guardando...
          </>
        )}
        {estado === "anadido" && "✓ En tu biblioteca"}
        {(estado === "idle" || estado === "error") && "Añadir a mi biblioteca"}
      </button>

      <Mensaje texto={estado === "error" ? mensaje : ""} />
    </>
  )
}

export default BotonAnadir
