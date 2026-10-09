import { Link } from 'react-router-dom'
import { ESTADOS } from './estados'
import { useIdioma } from './IdiomaContext'

// Resumen de la biblioteca del usuario. Recibe lo que calcula GET /profile/stats:
//  - stats: { total, jugando, completado, abandonado, pendiente, valorados, nota_media }
//  - mejores: sus juegos mejor valorados (hasta 5)
function EstadisticasPerfil({ stats, mejores }) {
  const { t } = useIdioma()

  if (stats.total === 0) {
    return (
      <div className="estado-vacio">
        <p>{t('stats.vacio')}</p>
        <Link to="/buscar" className="btn btn--primario">{t('comun.buscarJuegos')}</Link>
      </div>
    )
  }

  // Porcentaje de juegos terminados, redondeado
  const porcentajeCompletado = Math.round((stats.completado / stats.total) * 100)

  return (
    <div className="estadisticas">
      <dl className="stats">
        <div className="stat">
          <dt className="stat__etiqueta">{t('stats.juegos')}</dt>
          <dd className="stat__valor">{stats.total}</dd>
        </div>
        <div className="stat">
          <dt className="stat__etiqueta">
            {t('stats.notaMedia')}{stats.valorados > 0 && t('stats.valorados', { n: stats.valorados })}
          </dt>
          <dd className="stat__valor">{stats.nota_media ?? "—"}</dd>
        </div>
        <div className="stat">
          <dt className="stat__etiqueta">{t('stats.completados')}</dt>
          <dd className="stat__valor">{porcentajeCompletado}%</dd>
        </div>
      </dl>

      <div>
        <h3 className="estadisticas__subtitulo">{t('stats.porEstado')}</h3>
        {/* Barra dividida en tramos: cada uno crece según cuántos juegos tiene
            (flex-grow). Los estados con 0 juegos no se pintan. */}
        <div className="barra-estados" aria-hidden="true">
          {ESTADOS
            .filter((id) => stats[id] > 0)
            .map((id) => (
              <span
                key={id}
                className={`barra-estados__tramo punto--${id}`}
                style={{ flexGrow: stats[id] }}
              />
            ))}
        </div>
        <ul className="leyenda">
          {ESTADOS.map((id) => (
            <li key={id} className="leyenda__item">
              <span className={`punto punto--${id}`} aria-hidden="true" />
              {t(`estado.${id}`)}
              <strong>{stats[id]}</strong>
            </li>
          ))}
        </ul>
      </div>

      {mejores.length > 0 && (
        <div>
          <h3 className="estadisticas__subtitulo">{t('stats.mejores')}</h3>
          <ol className="mejores">
            {mejores.map((juego) => (
              <li key={juego.id} className="mejores__item">
                <span className="mejores__portada">
                  {juego.cover_url && <img src={juego.cover_url} alt="" loading="lazy" />}
                </span>
                <span className="mejores__nombre">{juego.name}</span>
                <span className="mejores__nota">{juego.rating}<small>/10</small></span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default EstadisticasPerfil
