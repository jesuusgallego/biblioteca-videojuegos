import BotonAnadir from './BotonAnadir'

// Tarjeta de un resultado de la búsqueda. El botón de añadir vive en BotonAnadir
// y el padre (Buscar) me pasa yaGuardado y onAnadir.
// Toda la tarjeta abre la ficha: el ::after del botón del título se estira por
// ella (ver App.css) y el botón de añadir va por encima.
function GameCard({ nombre, portada, yaGuardado, onAnadir, onVerDetalle }) {
  return (
    <li className="tarjeta">
      <div className="portada">
        <button
          type="button"
          className="boton-portada boton-portada--llena"
          onClick={onVerDetalle}
          tabIndex={-1}
          aria-hidden="true"
        >
          {portada
            ? <img src={portada} alt="" loading="lazy" />
            : <span className="portada__vacia">Sin portada</span>}
        </button>
      </div>

      <div className="tarjeta__cuerpo">
        <h3 className="tarjeta__titulo">
          <button type="button" className="enlace-titulo" onClick={onVerDetalle}>{nombre}</button>
        </h3>

        <BotonAnadir yaGuardado={yaGuardado} onAnadir={onAnadir} />
      </div>
    </li>
  )
}

export default GameCard
