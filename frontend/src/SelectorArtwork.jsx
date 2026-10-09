import { useState } from 'react'
import RecortadorFoto from './RecortadorFoto'
import { useCambioVista } from './useCambioVista'

// Elegir una ilustración oficial (artwork) de IGDB como foto de perfil.
//  - juegos: [{ igdb_id, name, artworks: [{ thumb_url, url }] }] (GET /games/artworks)
//  - onUsar(dataUrl): recibe la foto ya recortada y reducida
// Primero se elige la ilustración en una lista agrupada por juego y luego se
// recorta en el RecortadorFoto, porque las ilustraciones son apaisadas y el
// avatar es un cuadrado. Entre las dos vistas la que sale se desvanece y después
// entra la otra (useCambioVista).
function SelectorArtwork({ juegos, onUsar }) {
  // null = se ve la lista; con una ilustración = se ve su encuadre
  const [elegida, setElegida] = useState(null)
  const { saliendo, cambiar } = useCambioVista()

  const clase = saliendo ? "vista vista--saliendo" : "vista"

  if (elegida) {
    // key: cada ilustración empieza con su propio encuadre (centrada y sin zoom)
    return (
      <div className={clase}>
        <RecortadorFoto key={elegida.url} url={elegida.url} onUsar={onUsar} onVolver={() => cambiar(() => setElegida(null))} />
      </div>
    )
  }

  return (
    <div className={clase}>
      <div className="selector-artwork">
        {juegos.map((juego) => (
          <section key={juego.igdb_id}>
            <h3 className="selector-artwork__juego">{juego.name}</h3>
            <ul className="selector-artwork__fila">
              {juego.artworks.map((artwork, i) => (
                // --i es la posición de la miniatura: el CSS la usa para que
                // aparezcan una detrás de otra
                <li key={artwork.url} style={{ '--i': i }}>
                  <Miniatura
                    artwork={artwork}
                    etiqueta={`Ilustración ${i + 1} de ${juego.name}`}
                    onElegir={() => cambiar(() => setElegida(artwork))}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

// Miniatura pulsable. Mientras llega la imagen se ve un fondo que late
// (esqueleto) y al llegar aparece con un fundido.
function Miniatura({ artwork, etiqueta, onElegir }) {
  const [cargada, setCargada] = useState(false)

  return (
    <button
      type="button"
      className={cargada ? "selector-artwork__imagen" : "selector-artwork__imagen selector-artwork__imagen--cargando"}
      aria-label={etiqueta}
      onClick={onElegir}
    >
      <img
        src={artwork.thumb_url}
        alt=""
        loading="lazy"
        onLoad={() => setCargada(true)}
        onError={() => setCargada(true)} // si falla no dejo el esqueleto latiendo para siempre
      />
    </button>
  )
}

export default SelectorArtwork
