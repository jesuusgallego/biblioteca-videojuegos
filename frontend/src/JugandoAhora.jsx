import { ETIQUETAS_ESTADO } from './estados'
import IconoResena from './IconoResena'

// Fila "Jugando ahora" de Mi biblioteca: una tarjeta ancha por cada juego con
// estado "jugando". Solo enseño lo que guardo en la BD (portada, plataforma y
// nota); no hay horas ni progreso, así que no los dibujo. La reseña no se
// escribe aquí: un icono junto al estado avisa de que existe y se lee en la ficha.
// Toda la tarjeta es clicable, pero solo hay UN botón de verdad (el del título):
// su ::after (ver App.css) se estira por toda la tarjeta. Así no anido botones
// y el teclado y los lectores de pantalla ven un único enlace por juego.
//  - juegos: los juegos con estado "jugando"
//  - onVerDetalle(juego): abre la ficha del juego
function JugandoAhora({ juegos, onVerDetalle }) {
  return (
    <section aria-labelledby="titulo-jugando">
      <h2 id="titulo-jugando" className="titulo-seccion jugando__encabezado">
        <span className="pulso" aria-hidden="true" />
        Jugando ahora
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
                  : <span className="portada__vacia">Sin portada</span>}
              </button>
            </div>

            <div className="jugando__cuerpo">
              <div className="tarjeta__estado">
                <span className="chip chip--jugando">{ETIQUETAS_ESTADO.jugando}</span>
                {juego.review && <IconoResena />}
              </div>

              <h3 className="jugando__titulo">
                <button type="button" className="enlace-titulo" onClick={() => onVerDetalle(juego)}>
                  {juego.name}
                </button>
              </h3>

              <div className="jugando__datos">
                {juego.platform && <span className="tarjeta__meta">{juego.platform}</span>}
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
