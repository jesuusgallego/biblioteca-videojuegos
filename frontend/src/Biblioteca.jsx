import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import JuegoGuardado from './JuegoGuardado'
import DetalleJuego from './DetalleJuego'
import { ESTADOS } from './estados'
import { useIdioma } from './IdiomaContext'
import { apiFetch } from './api'
import Cargando from './Cargando'
import JugandoAhora from './JugandoAhora'

// Muestro los juegos que el usuario ha guardado (GET /games).
function Biblioteca({ setToken }) {
  const { t } = useIdioma()
  const [juegos, setJuegos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  // Los filtros solo viven en el navegador: no piden nada al backend, los aplico
  // sobre la lista que ya tengo en "juegos".
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [consulta, setConsulta] = useState("")
  // Juego cuya ficha está abierta (null = ninguna). Un único estado en la página
  // vale para todas las tarjetas.
  const [detalle, setDetalle] = useState(null)

  useEffect(() => {
    let cancelado = false

    apiFetch('/games')
      .then((data) => {
        if (!cancelado) setJuegos(data.games)
      })
      .catch((err) => {
        if (cancelado) return

        if (err.status === 401) {
          // Token caducado o inválido: cierro sesión y RutaProtegida me redirige al login
          localStorage.removeItem("token")
          setToken("")
          return
        }

        setError(err.message)
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    // Si el componente se desmonta antes de que llegue la respuesta, la ignoro
    return () => { cancelado = true }
  }, [setToken])

  // Editar y borrar viven aquí porque este componente es el dueño de la lista:
  // al responder el backend actualizo el estado local sin volver a pedirla entera.
  // Relanzo los errores para que la tarjeta los muestre; solo gestiono aquí el
  // 401 (cerrar sesión).
  async function actualizarJuego(id, cambios) {
    try {
      const data = await apiFetch(`/games/${id}`, { method: 'PATCH', body: cambios })
      setJuegos((prev) => prev.map((j) => (j.id === id ? data.game : j)))
    } catch (err) {
      if (err.status === 401) cerrarSesion()
      throw err
    }
  }

  async function borrarJuego(id) {
    try {
      await apiFetch(`/games/${id}`, { method: 'DELETE' })
      setJuegos((prev) => prev.filter((j) => j.id !== id))
    } catch (err) {
      if (err.status === 401) cerrarSesion()
      throw err
    }
  }

  function cerrarSesion() {
    localStorage.removeItem("token")
    setToken("")
  }

  if (cargando) return <Cargando texto={t('biblioteca.cargando')} tamano="grande" centrado />

  if (error) return <p className="mensaje mensaje--error" role="alert">{error}</p>

  if (juegos.length === 0) {
    return (
      <div className="estado-vacio">
        <h1>{t('biblioteca.vaciaTitulo')}</h1>
        <p>{t('biblioteca.vaciaTexto')}</p>
        <Link to="/buscar" className="btn btn--primario">{t('comun.buscarJuegos')}</Link>
      </div>
    )
  }

  function abrirDetalle(juego) {
    setDetalle({ igdb_id: juego.igdb_id, name: juego.name, cover_url: juego.cover_url })
  }

  // La fila de mi biblioteca del juego cuya ficha está abierta (undefined si no hay
  // ninguna o si acaba de quitarse)
  const guardadoDelDetalle = detalle && juegos.find((j) => j.igdb_id === detalle.igdb_id)

  // Valores derivados: los calculo en cada render a partir del estado para que
  // nunca queden desactualizados (así no necesitan su propio useState).
  const jugandoAhora = juegos.filter((j) => j.status === "jugando")

  const texto = consulta.trim().toLowerCase()
  const visibles = juegos.filter(
    (j) =>
      (filtroEstado === "todos" || j.status === filtroEstado) &&
      j.name.toLowerCase().includes(texto)
  )

  // Un botón por filtro con su contador. Ojo: "todos" no existe como estado en la BD.
  const filtros = [
    { id: "todos", etiqueta: t('biblioteca.todos'), cuenta: juegos.length },
    ...ESTADOS.map((id) => ({
      id,
      etiqueta: t(`estado.${id}`),
      cuenta: juegos.filter((j) => j.status === id).length,
    })),
  ]

  return (
    <div className="biblioteca-pagina">
      {jugandoAhora.length > 0 && (
        <JugandoAhora
          juegos={jugandoAhora}
          onVerDetalle={abrirDetalle}
          onActualizar={actualizarJuego}
          onBorrar={borrarJuego}
        />
      )}

      <div className="biblioteca">
        <aside className="filtros" aria-label={t('biblioteca.filtrarPorEstado')}>
          <p className="filtros__titulo">{t('biblioteca.estado')}</p>
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filtroEstado === f.id ? "filtro filtro--activo" : "filtro"}
              aria-pressed={filtroEstado === f.id}
              onClick={() => setFiltroEstado(f.id)}
            >
              <span className="filtro__nombre">
                {f.id !== "todos" && <span className={`punto punto--${f.id}`} aria-hidden="true" />}
                {f.etiqueta}
              </span>
              <span className="filtro__cuenta">{f.cuenta}</span>
            </button>
          ))}
        </aside>

        <section className="biblioteca__contenido" aria-labelledby="titulo-biblioteca">
          <div className="biblioteca__cabecera">
            <h1 id="titulo-biblioteca" className="titulo-pagina">
              {t('biblioteca.titulo')} <span className="contador">{juegos.length}</span>
            </h1>

            <div className="caja-busqueda caja-busqueda--filtro">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder={t('biblioteca.filtrarJuegos')}
                aria-label={t('biblioteca.filtrarJuegos')}
              />
            </div>
          </div>

          <ul className="rejilla">
            {visibles.map((juego) => (
              <JuegoGuardado
                key={juego.id}
                juego={juego}
                onActualizar={(cambios) => actualizarJuego(juego.id, cambios)}
                onBorrar={() => borrarJuego(juego.id)}
                onVerDetalle={() => abrirDetalle(juego)}
              />
            ))}
          </ul>

          {visibles.length === 0 && (
            <div className="sin-resultados">
              <h2>{t('biblioteca.sinResultadosTitulo')}</h2>
              <p>
                {t('biblioteca.sinResultadosAntes')}
                <Link to="/buscar">{t('biblioteca.sinResultadosEnlace')}</Link>
                {t('biblioteca.sinResultadosDespues')}
              </p>
            </div>
          )}
        </section>
      </div>

      {detalle && (
        <DetalleJuego
          key={detalle.igdb_id}
          juego={detalle}
          guardado={guardadoDelDetalle}
          onActualizar={guardadoDelDetalle && ((cambios) => actualizarJuego(guardadoDelDetalle.id, cambios))}
          onBorrar={guardadoDelDetalle && (() => borrarJuego(guardadoDelDetalle.id))}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </div>
  )
}

export default Biblioteca
