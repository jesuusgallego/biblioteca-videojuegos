import IconoSteam from './IconoSteam'
import { useIdioma } from './IdiomaContext'

// Insignia con el logo de Steam para diferenciar, en la biblioteca, los juegos que
// vienen de Steam del resto: los importados y los que ya tenías y la
// sincronización ha emparejado (los dos llevan steam_appid; al desvincular se les
// quita). Va en la esquina superior izquierda de la portada (la nota va en la derecha), así que quien
// la use tiene que ponerla dentro de un elemento con position: relative.
// No pinta nada si el juego no es de Steam.
//  - juego: la fila de user_games (steam_appid, imported_from)
//  - pequena: tamaño de la tarjeta estrecha de "Jugando ahora"
function InsigniaSteam({ juego, pequena = false }) {
  const { t } = useIdioma()
  const esDeSteam = juego.steam_appid != null || juego.imported_from === 'steam'

  if (!esDeSteam) return null

  return (
    <span
      className={pequena ? "insignia-steam insignia-steam--pequena" : "insignia-steam"}
      role="img"
      aria-label={t('steam.insignia')}
      title={t('steam.insignia')}
    >
      {/* El círculo y el logo van en el mismo svg: así siempre quedan centrados */}
      <IconoSteam tamano={pequena ? 20 : 28} enCirculo />
    </span>
  )
}

export default InsigniaSteam
