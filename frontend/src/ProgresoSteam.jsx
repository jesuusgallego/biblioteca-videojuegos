import { useIdioma } from './IdiomaContext'

// Progreso de un juego traído de Steam: horas jugadas y logros (con barra).
// No pinta nada si el juego no viene de Steam (playtime_minutes es null).
//  - juego: la fila de user_games (playtime_minutes, achievements_unlocked,
//    achievements_total)
//  - grande: tamaño de la ficha; sin él, el compacto de las tarjetas
function ProgresoSteam({ juego, grande = false }) {
  const { t, locale } = useIdioma()
  const minutos = juego.playtime_minutes

  if (minutos === null || minutos === undefined) return null

  // Total 0 = el juego no tiene logros; null = aún sin consultar. En los dos casos
  // no enseño ni el contador ni la barra.
  const desbloqueados = juego.achievements_unlocked
  const total = juego.achievements_total
  const hayLogros = total > 0
  const completo = hayLogros && desbloqueados === total

  let tiempo
  if (minutos === 0) {
    tiempo = t('progreso.sinJugar')
  } else if (minutos < 60) {
    tiempo = t('progreso.minutos', { n: minutos })
  } else {
    // Un decimal hasta 10 h ("2,5 h"); a partir de ahí no hace falta ("125 h")
    const horas = minutos / 60
    const n = new Intl.NumberFormat(locale, { maximumFractionDigits: horas < 10 ? 1 : 0 }).format(horas)
    tiempo = t('progreso.horas', { n })
  }

  return (
    <div className={grande ? "progreso progreso--grande" : "progreso"}>
      <p className="progreso__texto">
        <span>{tiempo}</span>
        {hayLogros && <span>{t('progreso.logros', { desbloqueados, total })}</span>}
      </p>

      {hayLogros && (
        <div
          className="progreso__barra"
          role="progressbar"
          aria-label={t('progreso.logrosAria', { desbloqueados, total })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((desbloqueados / total) * 100)}
        >
          {/* --p es la fracción (0 a 1) que el CSS convierte en el ancho de la barra */}
          <div
            className={completo ? "progreso__relleno progreso__relleno--completo" : "progreso__relleno"}
            style={{ '--p': desbloqueados / total }}
          />
        </div>
      )}
    </div>
  )
}

export default ProgresoSteam
