import { useIdioma } from './IdiomaContext'
import IconoResena from './IconoResena'
import InsigniaSteam from './InsigniaSteam'
import IconoPlataforma from './IconoPlataforma'
import { esDeSteam } from './steam'

// Fila "Jugando ahora" de Mi biblioteca: una tarjeta ancha por cada juego con
// estado "jugando". Solo enseño lo que guardo en la BD (portada, icono de la plataforma,
// nota y la insignia si viene de Steam); no dibujo horas ni progreso. La reseña no se
// escribe aquí: un icono junto al estado avisa de que existe y se lee en la ficha.
// Toda la tarjeta es clicable, pero solo hay UN botón de verdad (el del título):
// su ::after (ver estilos/biblioteca.css) se estira por toda la tarjeta. Así no anido botones
// y el teclado y los lectores de pantalla ven un único enlace por juego.
//  - juegos: los juegos con estado "jugando"
//  - onVerDetalle(juego): abre la ficha del juego
function JugandoAhora({ juegos, onVerDetalle }) {
  const { t } = useIdioma()

  return (
    <section aria-labelledby="titulo-jugando">
      <h2 id="titulo-jugando" className="titulo-seccion jugando__encabezado">
        <span className="pulso" aria-hidden="true" />
        {t('jugando.titulo')}
        <span className="contador">{juegos.length}</span>
      </h2>

      <ul className="jugando">
        {juegos.map((juego) => (
          <li key={juego.id} className="jugando__tarjeta">
            {/* La misma portada, agrandada y desenfocada, hace de fondo de la tarjeta */}
            {juego.cover_url && (
              <img className="jugando__fondo" src={juego.cover_url} alt="" aria-hidden="true" loading="lazy" />
            )}

            <div className="jugando__portada">
              <button
                type="button"
                className="boton-portada boton-portada--llena"
                onClick={() => onVerDetalle(juego)}
                tabIndex={-1}
                aria-hidden="true"
              >
                {juego.cover_url
                  ? <img src={juego.cover_url} alt="" loading="lazy" />
                  : <span className="portada__vacia">{t('comun.sinPortada')}</span>}
              </button>
              <InsigniaSteam juego={juego} pequena />
            </div>

            <div className="jugando__cuerpo">
              <div className="tarjeta__estado">
                <span className="chip chip--jugando">{t('estado.jugando')}</span>
                {juego.review && <IconoResena />}
              </div>

              <h3 className="jugando__titulo">
                <button type="button" className="enlace-titulo" onClick={() => onVerDetalle(juego)}>
                  {juego.name}
                </button>
              </h3>

              <div className="jugando__datos">
                <IconoPlataforma nombre={juego.platform} tamano={18} className="icono-plataforma--fila" ocultarSteam={esDeSteam(juego)} />
                {juego.rating && <span className="contador">★ {juego.rating}/10</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default JugandoAhora
