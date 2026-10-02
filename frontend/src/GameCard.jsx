function GameCard({ nombre, portada }) {
  return (
    <li>
      {portada && <img src={portada} alt={nombre} width="80" />}
      <span>{nombre}</span>
    </li>
  )
}

export default GameCard