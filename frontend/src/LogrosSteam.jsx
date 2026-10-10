import { useState, useEffect } from 'react'
import { apiFetch } from './api'
import { useIdioma } from './IdiomaContext'
import Cargando from './Cargando'
import Mensaje from './Mensaje'

// Lista de logros de Steam de un juego de mi biblioteca: icono, nombre, descripción
// y, si ya lo tengo, el día en que lo conseguí. Primero salen los desbloqueados (el
// más reciente arriba) y luego los pendientes, con el icono en gris.
//  - juego: la fila de user_games (necesito su "id" para pedir los logros al backend)
//
// La lista no está en la BD: se pide a Steam al montarse, así que siempre está al día.
// Si cambio de idioma con la ficha abierta se vuelve a pedir, porque Steam traduce
// los nombres y las descripciones.
function LogrosSteam({ juego }) {
  const { t, idioma, locale } = useIdioma()
  const [logros, setLogros] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false

    apiFetch(`/accounts/steam/games/${juego.id}/achievements?lang=${idioma}`)
      .then((data) => {
        if (!cancelado) setLogros(ordenar(data.achievements))
      })
      .catch((err) => {
        if (!cancelado) setError(err.message)
      })

    // Si se cierra la ficha antes de que llegue la respuesta, la ignoro
    return () => { cancelado = true }
  }, [juego.id, idioma])

  function formatearFecha(segundos) {
    return new Date(segundos * 1000).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (!logros && !error) return <Cargando texto={t('logros.cargando')} />

  return (
    <>
      <Mensaje texto={error} />

      {logros?.length === 0 && <p className="estado">{t('logros.vacio')}</p>}

      {logros?.length > 0 && (
        <ul className="logros">
          {logros.map((logro) => {
            // Un logro oculto no cuenta qué hay que hacer hasta que lo consigues
            const descripcion = logro.oculto && !logro.desbloqueado
              ? t('logros.oculto')
              : logro.descripcion

            return (
              <li
                key={logro.id}
                className={logro.desbloqueado ? "logro logro--desbloqueado" : "logro"}
              >
                {logro.icono
                  ? <img className="logro__icono" src={logro.icono} alt="" loading="lazy" />
                  : <span className="logro__icono" aria-hidden="true" />}

                <div className="logro__texto">
                  <p className="logro__nombre">{logro.nombre}</p>
                  {descripcion && <p className="logro__descripcion">{descripcion}</p>}
                </div>

                <span className="logro__estado">
                  {logro.desbloqueado
                    ? (logro.fecha ? formatearFecha(logro.fecha) : t('logros.desbloqueado'))
                    : t('logros.pendiente')}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

// Desbloqueados primero y, entre ellos, el más reciente arriba. Los pendientes
// conservan el orden que da Steam. sort() es estable: lo que "empata" no se mueve.
function ordenar(logros) {
  return [...logros].sort((a, b) => {
    if (a.desbloqueado !== b.desbloqueado) return a.desbloqueado ? -1 : 1
    return (b.fecha ?? 0) - (a.fecha ?? 0)
  })
}

export default LogrosSteam
