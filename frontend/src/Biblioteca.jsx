import { useState, useEffect } from 'react'
import GameCard from './GameCard'
import { apiFetch } from './api'

const RETARDO_BUSQUEDA_MS = 400

function Biblioteca({ setToken }) {
  const [nombreJuego, setNombreJuego] = useState("")
  const [resultados, setResultados] = useState([])
  const [error, setError] = useState("")

  const termino = nombreJuego.trim()

  useEffect(() => {

    if (termino === "") return

    // Debounce: esperamos a que el usuario deje de escribir antes de buscar.
    // El AbortController cancela la petición anterior si llega una nueva.
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch(
          `/games/search?q=${encodeURIComponent(termino)}`,
          { signal: controller.signal }
        )

        setResultados(data.results ?? [])
        setError("")
      } catch (err) {
        if (err.name === "AbortError") return

        if (err.status === 401) {
          // Token caducado o inválido: cerramos sesión y RutaProtegida redirige al login
          localStorage.removeItem("token")
          setToken("")
          return
        }

        setResultados([])
        setError(err.message)
      }
    }, RETARDO_BUSQUEDA_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [termino, setToken])

  return (
    <div>
      <input
        type="text"
        value={nombreJuego}
        onChange={(e) => setNombreJuego(e.target.value)}
        placeholder="Buscar un juego..."
      />

      {termino && error && <p>{error}</p>}

      <ul>
        {termino && resultados.map((juego) => (
          <GameCard
            key={juego.igdb_id}
            nombre={juego.name}
            portada={juego.cover_url}
          />
        ))}
      </ul>
    </div>
  )
}

export default Biblioteca
