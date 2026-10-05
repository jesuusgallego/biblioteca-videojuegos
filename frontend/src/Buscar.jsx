import { useState, useEffect } from 'react'
import GameCard from './GameCard'
import { apiFetch } from './api'

const RETARDO_BUSQUEDA_MS = 400

function Buscar({ setToken }) {
  const [nombreJuego, setNombreJuego] = useState("")
  const [resultados, setResultados] = useState([])
  const [error, setError] = useState("")
  // IDs de IGDB de los juegos que el usuario ya tiene guardados
  const [guardados, setGuardados] = useState(new Set())

  const termino = nombreJuego.trim()

  // Al entrar, cargamos la biblioteca para marcar los juegos ya guardados.
  // Si falla no pasa nada grave: los botones salen como "Añadir" y el 409 del
  // backend cubre el caso de pulsar uno que ya tenías.
  useEffect(() => {
    let cancelado = false

    apiFetch('/games')
      .then((data) => {
        if (!cancelado) setGuardados(new Set(data.games.map((g) => g.igdb_id)))
      })
      .catch((err) => {
        if (err.status === 401) {
          localStorage.removeItem("token")
          setToken("")
        }
      })

    return () => { cancelado = true }
  }, [setToken])

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

  // Guarda un juego en la biblioteca del usuario. Los errores se relanzan para
  // que la GameCard los muestre; solo el 401 se gestiona aquí (cerrar sesión).
  async function anadirJuego(juego) {
    try {
      await apiFetch('/games', {
        method: 'POST',
        body: { igdb_id: juego.igdb_id, name: juego.name, cover_url: juego.cover_url },
      })
      setGuardados((prev) => new Set(prev).add(juego.igdb_id))
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem("token")
        setToken("")
      }
      throw err
    }
  }

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
            yaGuardado={guardados.has(juego.igdb_id)}
            onAnadir={() => anadirJuego(juego)}
          />
        ))}
      </ul>
    </div>
  )
}

export default Buscar
