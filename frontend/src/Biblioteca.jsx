import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import JuegoGuardado from './JuegoGuardado'
import { apiFetch } from './api'

// "Mi biblioteca": los juegos que el usuario ha guardado (GET /games).
function Biblioteca({ setToken }) {
  const [juegos, setJuegos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelado = false

    apiFetch('/games')
      .then((data) => {
        if (!cancelado) setJuegos(data.games)
      })
      .catch((err) => {
        if (cancelado) return

        if (err.status === 401) {
          // Token caducado o inválido: cerramos sesión y RutaProtegida redirige al login
          localStorage.removeItem("token")
          setToken("")
          return
        }

        setError(err.message)
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    // Si el componente se desmonta antes de que llegue la respuesta, la ignoramos
    return () => { cancelado = true }
  }, [setToken])

  if (cargando) return <p>Cargando tu biblioteca...</p>
  if (error) return <p>{error}</p>

  if (juegos.length === 0) {
    return (
      <p>
        Aún no tienes juegos. <Link to="/buscar">Busca alguno</Link> para empezar.
      </p>
    )
  }

  return (
    <div>
      <h2>Mi biblioteca ({juegos.length})</h2>
      <ul>
        {juegos.map((juego) => (
          <JuegoGuardado key={juego.id} juego={juego} />
        ))}
      </ul>
    </div>
  )
}

export default Biblioteca
