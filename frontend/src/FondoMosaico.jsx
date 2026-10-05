// Fondo decorativo de las pantallas de acceso: una cuadrícula de "portadas"
// con degradados de colores, muy tenue. No tiene contenido (aria-hidden) ni
// intercepta clics; el CSS (.mosaico) lo coloca detrás de la tarjeta.
// Cada número elige uno de los 6 degradados (.mosaico__pieza--0 ... --5).
const PIEZAS = [0, 3, 5, 1, 4, 2, 0, 5, 3, 4, 1, 2, 4, 0, 3, 5, 2, 1, 0, 3, 5, 2, 4, 1]

function FondoMosaico() {
  return (
    <div className="mosaico" aria-hidden="true">
      {PIEZAS.map((color, i) => (
        <span key={i} className={`mosaico__pieza mosaico__pieza--${color}`} />
      ))}
    </div>
  )
}

export default FondoMosaico
