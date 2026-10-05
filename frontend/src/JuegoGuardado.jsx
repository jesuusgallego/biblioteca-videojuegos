// Tarjeta de un juego que ya está en la biblioteca del usuario. Más adelante
// aquí irán los botones de editar y borrar.
const ETIQUETAS_ESTADO = {
  jugando: "Jugando",
  completado: "Completado",
  abandonado: "Abandonado",
  pendiente: "Pendiente",
}

function JuegoGuardado({ juego }) {
  return (
    <li>
      {juego.cover_url && <img src={juego.cover_url} alt={juego.name} width="80" />}
      <span>{juego.name}</span>
      <span> — {ETIQUETAS_ESTADO[juego.status] ?? juego.status}</span>
    </li>
  )
}

export default JuegoGuardado
